"""
Farcaster Gas Checker API
FastAPI backend for checking gas usage by Farcaster username
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import config
from services import (
    get_user_gas_info,
    username_to_fid,
    get_user_by_username,
    get_eth_addresses_from_neynar,
    determine_primary_wallet,
    get_tx_count,
    get_eth_balance,
    w3_eth,
    w3_base
)

app = FastAPI(
    title="Farcaster Gas Checker API",
    description="Check gas usage for Farcaster users by username",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS + ["*"],  # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Response Models
# ============================================

class WalletResponse(BaseModel):
    address: str
    eth_tx_count: int
    base_tx_count: int
    eth_balance: float
    is_primary: bool


class GasCheckResponse(BaseModel):
    success: bool
    username: str
    fid: Optional[int]
    display_name: Optional[str]
    pfp_url: Optional[str]
    wallets: List[WalletResponse]
    primary_wallet: Optional[str]
    total_gas_used_eth: float
    total_gas_used_base: float
    total_gas_usd: float
    error: Optional[str] = None


class QuickCheckResponse(BaseModel):
    success: bool
    username: str
    fid: Optional[int]
    display_name: Optional[str]
    pfp_url: Optional[str]
    primary_wallet: Optional[str]
    wallet_count: int
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    ethereum_connected: bool
    base_connected: bool
    neynar_configured: bool


# ============================================
# Endpoints
# ============================================

@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="ok",
        ethereum_connected=w3_eth.is_connected(),
        base_connected=w3_base.is_connected(),
        neynar_configured=bool(config.NEYNAR_API_KEY)
    )


@app.get("/api/health", response_model=HealthResponse)
async def api_health():
    """API health check"""
    return await health_check()


@app.get("/api/gas", response_model=GasCheckResponse)
async def check_gas(
    username: str = Query(..., description="Farcaster username (fname or ENS)")
):
    """
    Full gas check for a Farcaster user.
    Returns all wallets, transaction counts, and gas usage.
    """
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    
    result = get_user_gas_info(username)
    
    wallets = [
        WalletResponse(
            address=w.address,
            eth_tx_count=w.eth_tx_count,
            base_tx_count=w.base_tx_count,
            eth_balance=w.eth_balance,
            is_primary=w.is_primary
        )
        for w in result.wallets
    ]
    
    return GasCheckResponse(
        success=result.error is None,
        username=result.username,
        fid=result.fid,
        display_name=result.display_name,
        pfp_url=result.pfp_url,
        wallets=wallets,
        primary_wallet=result.primary_wallet,
        total_gas_used_eth=result.total_gas_used_eth,
        total_gas_used_base=result.total_gas_used_base,
        total_gas_usd=result.total_gas_usd,
        error=result.error
    )


@app.get("/api/quick", response_model=QuickCheckResponse)
async def quick_check(
    username: str = Query(..., description="Farcaster username")
):
    """
    Quick check - just get FID and primary wallet without full gas calculation.
    Faster response for basic lookups.
    """
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    
    # Clean username
    username = username.strip().lower()
    if username.startswith("@"):
        username = username[1:]
    
    # Get user info
    user_data = get_user_by_username(username)
    
    if not user_data:
        fid = username_to_fid(username)
        if not fid:
            return QuickCheckResponse(
                success=False,
                username=username,
                fid=None,
                display_name=None,
                pfp_url=None,
                primary_wallet=None,
                wallet_count=0,
                error="User not found"
            )
        # Try to get user data by FID
        from services import get_user_by_fid
        user_data = get_user_by_fid(fid)
    
    if not user_data:
        return QuickCheckResponse(
            success=False,
            username=username,
            fid=None,
            display_name=None,
            pfp_url=None,
            primary_wallet=None,
            wallet_count=0,
            error="Could not fetch user data"
        )
    
    fid = user_data.get("fid")
    display_name = user_data.get("display_name")
    pfp_url = user_data.get("pfp_url")
    
    # Get addresses
    addresses = get_eth_addresses_from_neynar(user_data)
    primary = determine_primary_wallet(addresses) if addresses else None
    
    return QuickCheckResponse(
        success=True,
        username=username,
        fid=fid,
        display_name=display_name,
        pfp_url=pfp_url,
        primary_wallet=primary,
        wallet_count=len(addresses)
    )


@app.get("/api/fid/{username}")
async def get_fid(username: str):
    """Get FID for a username"""
    username = username.strip().lower()
    if username.startswith("@"):
        username = username[1:]
    
    fid = username_to_fid(username)
    
    if not fid:
        # Try Neynar direct lookup
        user_data = get_user_by_username(username)
        if user_data:
            fid = user_data.get("fid")
    
    if not fid:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"username": username, "fid": fid}


@app.get("/api/wallets/{username}")
async def get_wallets(username: str):
    """Get all verified wallets for a username"""
    username = username.strip().lower()
    if username.startswith("@"):
        username = username[1:]
    
    user_data = get_user_by_username(username)
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    addresses = get_eth_addresses_from_neynar(user_data)
    primary = determine_primary_wallet(addresses) if addresses else None
    
    wallets = []
    for addr in addresses:
        wallets.append({
            "address": addr,
            "eth_tx_count": get_tx_count(w3_eth, addr),
            "base_tx_count": get_tx_count(w3_base, addr),
            "eth_balance": get_eth_balance(w3_eth, addr),
            "is_primary": addr.lower() == primary.lower() if primary else False
        })
    
    return {
        "username": username,
        "fid": user_data.get("fid"),
        "wallet_count": len(wallets),
        "primary_wallet": primary,
        "wallets": wallets
    }


# ============================================
# Run with: uvicorn main:app --reload --port 8000
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
