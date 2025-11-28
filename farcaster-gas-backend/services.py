"""
Farcaster Gas Checker Service
- Convert username (fname/ENS) -> FID
- Get verified ETH addresses from FID
- Determine primary wallet
- Calculate gas usage
"""

import requests
from web3 import Web3
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import config

# Initialize Web3 connections
w3_eth = Web3(Web3.HTTPProvider(config.ETHEREUM_RPC))
w3_base = Web3(Web3.HTTPProvider(config.BASE_RPC))
w3_optimism = Web3(Web3.HTTPProvider(config.OPTIMISM_RPC))


@dataclass
class WalletInfo:
    address: str
    eth_tx_count: int
    base_tx_count: int
    eth_balance: float
    is_primary: bool


@dataclass
class UserGasInfo:
    username: str
    fid: Optional[int]
    display_name: Optional[str]
    pfp_url: Optional[str]
    wallets: List[WalletInfo]
    primary_wallet: Optional[str]
    total_gas_used_eth: float
    total_gas_used_base: float
    total_gas_usd: float
    error: Optional[str] = None


# ============================================
# STEP 1: Username -> FID
# ============================================

def fname_to_fid(fname: str) -> Optional[int]:
    """Convert Farcaster fname to FID using fnames registry"""
    try:
        url = f"https://fnames.farcaster.xyz/transfers/current?name={fname}"
        r = requests.get(url, timeout=10)
        if r.status_code != 200:
            return None
        data = r.json()
        return data.get("transfer", {}).get("to")
    except Exception as e:
        print(f"fname_to_fid error: {e}")
        return None


def ens_to_fid(ens_name: str) -> Optional[int]:
    """Resolve ENS name to ETH address, then find FID"""
    try:
        # Resolve ENS to ETH address
        eth_addr = w3_eth.ens.address(ens_name)
        if not eth_addr:
            return None
        
        # Look up FID by ETH address via Neynar
        url = f"https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses={eth_addr}"
        headers = {
            "accept": "application/json",
            "x-api-key": config.NEYNAR_API_KEY
        }
        
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code != 200:
            return None
        
        data = r.json()
        users = data.get(eth_addr.lower())
        if not users:
            return None
        return users[0].get("fid")
    except Exception as e:
        print(f"ens_to_fid error: {e}")
        return None


def username_to_fid(username: str) -> Optional[int]:
    """Try fname first, then ENS"""
    # Clean username
    username = username.strip().lower()
    if username.startswith("@"):
        username = username[1:]
    
    # Try fname first
    fid = fname_to_fid(username)
    if fid:
        return fid
    
    # Try ENS if it looks like one
    if username.endswith(".eth"):
        fid = ens_to_fid(username)
    
    return fid


# ============================================
# STEP 2: Get User Info from Neynar
# ============================================

def get_user_by_fid(fid: int) -> Optional[Dict[str, Any]]:
    """Get full user info from Neynar API"""
    try:
        url = f"https://api.neynar.com/v2/farcaster/user/bulk?fids={fid}"
        headers = {
            "accept": "application/json",
            "x-api-key": config.NEYNAR_API_KEY
        }
        
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code != 200:
            return None
        
        data = r.json()
        users = data.get("users", [])
        return users[0] if users else None
    except Exception as e:
        print(f"get_user_by_fid error: {e}")
        return None


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Get user info directly by username from Neynar"""
    try:
        url = f"https://api.neynar.com/v2/farcaster/user/by_username?username={username}"
        headers = {
            "accept": "application/json",
            "x-api-key": config.NEYNAR_API_KEY
        }
        
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code != 200:
            return None
        
        data = r.json()
        return data.get("user")
    except Exception as e:
        print(f"get_user_by_username error: {e}")
        return None


# ============================================
# STEP 3: FID -> Verified ETH Addresses
# ============================================

def get_eth_addresses_from_hub(fid: int) -> List[str]:
    """Get verified ETH addresses from Pinata Hub"""
    try:
        url = f"https://hub.pinata.cloud/v1/verificationsByFid?fid={fid}"
        r = requests.get(url, timeout=10)
        if r.status_code != 200:
            return []
        
        data = r.json()
        messages = data.get("messages", [])
        eth_addresses = []
        
        for msg in messages:
            body = msg.get("data", {}).get("verificationAddAddressBody", {})
            if body.get("protocol") == "PROTOCOL_ETHEREUM" and body.get("address"):
                eth_addresses.append(body["address"])
        
        return eth_addresses
    except Exception as e:
        print(f"get_eth_addresses_from_hub error: {e}")
        return []


def get_eth_addresses_from_neynar(user_data: Dict[str, Any]) -> List[str]:
    """Extract verified addresses from Neynar user data"""
    addresses = []
    
    # Get from verified_addresses
    verified = user_data.get("verified_addresses", {})
    eth_addresses = verified.get("eth_addresses", [])
    addresses.extend(eth_addresses)
    
    # Also get from verifications (legacy)
    verifications = user_data.get("verifications", [])
    for v in verifications:
        if v and v not in addresses:
            addresses.append(v)
    
    # Get custody address
    custody = user_data.get("custody_address")
    if custody and custody not in addresses:
        addresses.append(custody)
    
    return addresses


# ============================================
# STEP 4: Transaction Count & Balance
# ============================================

def get_tx_count(w3: Web3, address: str) -> int:
    """Get transaction count for an address"""
    try:
        addr = Web3.to_checksum_address(address)
        return w3.eth.get_transaction_count(addr)
    except Exception as e:
        print(f"get_tx_count error: {e}")
        return 0


def get_eth_balance(w3: Web3, address: str) -> float:
    """Get ETH balance in ETH units"""
    try:
        addr = Web3.to_checksum_address(address)
        balance_wei = w3.eth.get_balance(addr)
        return float(Web3.from_wei(balance_wei, 'ether'))
    except Exception as e:
        print(f"get_eth_balance error: {e}")
        return 0.0


# ============================================
# STEP 5: Gas Usage Calculation
# ============================================

def get_gas_used_etherscan(address: str, api_key: str, base_url: str) -> float:
    """Calculate total gas used from Etherscan/Basescan API"""
    try:
        url = f"{base_url}/api"
        params = {
            "module": "account",
            "action": "txlist",
            "address": address,
            "startblock": 0,
            "endblock": 99999999,
            "sort": "desc",
            "apikey": api_key
        }
        
        r = requests.get(url, params=params, timeout=15)
        if r.status_code != 200:
            return 0.0
        
        data = r.json()
        if data.get("status") != "1":
            return 0.0
        
        transactions = data.get("result", [])
        total_gas_wei = 0
        
        for tx in transactions:
            # Only count transactions FROM this address (sender pays gas)
            if tx.get("from", "").lower() == address.lower():
                gas_used = int(tx.get("gasUsed", 0))
                gas_price = int(tx.get("gasPrice", 0))
                total_gas_wei += gas_used * gas_price
        
        return float(Web3.from_wei(total_gas_wei, 'ether'))
    except Exception as e:
        print(f"get_gas_used_etherscan error: {e}")
        return 0.0


def get_gas_used_ethereum(address: str) -> float:
    """Get total gas used on Ethereum mainnet"""
    return get_gas_used_etherscan(
        address,
        config.ETHERSCAN_API_KEY,
        "https://api.etherscan.io"
    )


def get_gas_used_base(address: str) -> float:
    """Get total gas used on Base"""
    return get_gas_used_etherscan(
        address,
        config.BASESCAN_API_KEY,
        "https://api.basescan.org"
    )


# ============================================
# STEP 6: Determine Primary Wallet
# ============================================

def determine_primary_wallet(addresses: List[str]) -> Optional[str]:
    """
    Determine primary wallet based on transaction activity.
    Logic: 
    - If any wallet has 0 ETH mainnet txns, check Base txns and pick highest
    - Otherwise, pick wallet with lowest ETH txns (likely signing wallet)
    """
    if not addresses:
        return None
    
    if len(addresses) == 1:
        return addresses[0]
    
    # Get ETH mainnet tx counts
    eth_tx_map = {addr: get_tx_count(w3_eth, addr) for addr in addresses}
    
    # Find addresses with 0 ETH transactions
    zero_eth_addresses = [addr for addr, tx in eth_tx_map.items() if tx == 0]
    
    if zero_eth_addresses:
        # Check Base transactions for zero-ETH addresses
        base_tx_map = {addr: get_tx_count(w3_base, addr) for addr in zero_eth_addresses}
        # Return the one with most Base activity
        return max(base_tx_map, key=lambda a: base_tx_map[a])
    else:
        # All have ETH txns - return one with lowest (likely signing wallet)
        return min(eth_tx_map, key=lambda a: eth_tx_map[a])


# ============================================
# MAIN: Get Complete Gas Info
# ============================================

def get_user_gas_info(username: str) -> UserGasInfo:
    """Main function to get complete gas info for a Farcaster user"""
    
    # Clean username
    username = username.strip().lower()
    if username.startswith("@"):
        username = username[1:]
    
    # Get user info from Neynar first (more reliable)
    user_data = get_user_by_username(username)
    
    if not user_data:
        # Try FID lookup
        fid = username_to_fid(username)
        if fid:
            user_data = get_user_by_fid(fid)
    
    if not user_data:
        return UserGasInfo(
            username=username,
            fid=None,
            display_name=None,
            pfp_url=None,
            wallets=[],
            primary_wallet=None,
            total_gas_used_eth=0,
            total_gas_used_base=0,
            total_gas_usd=0,
            error="User not found"
        )
    
    fid = user_data.get("fid")
    display_name = user_data.get("display_name")
    pfp_url = user_data.get("pfp_url")
    
    # Get verified addresses
    addresses = get_eth_addresses_from_neynar(user_data)
    
    # Also try hub for more addresses
    hub_addresses = get_eth_addresses_from_hub(fid) if fid else []
    for addr in hub_addresses:
        if addr and addr not in addresses:
            addresses.append(addr)
    
    if not addresses:
        return UserGasInfo(
            username=username,
            fid=fid,
            display_name=display_name,
            pfp_url=pfp_url,
            wallets=[],
            primary_wallet=None,
            total_gas_used_eth=0,
            total_gas_used_base=0,
            total_gas_usd=0,
            error="No verified wallets found"
        )
    
    # Determine primary wallet
    primary = determine_primary_wallet(addresses)
    
    # Get wallet info for each address
    wallets = []
    total_gas_eth = 0.0
    total_gas_base = 0.0
    
    for addr in addresses:
        eth_tx = get_tx_count(w3_eth, addr)
        base_tx = get_tx_count(w3_base, addr)
        eth_balance = get_eth_balance(w3_eth, addr)
        
        # Get gas usage (if API keys available)
        gas_eth = 0.0
        gas_base = 0.0
        
        if config.ETHERSCAN_API_KEY:
            gas_eth = get_gas_used_ethereum(addr)
        if config.BASESCAN_API_KEY:
            gas_base = get_gas_used_base(addr)
        
        total_gas_eth += gas_eth
        total_gas_base += gas_base
        
        wallets.append(WalletInfo(
            address=addr,
            eth_tx_count=eth_tx,
            base_tx_count=base_tx,
            eth_balance=eth_balance,
            is_primary=(addr.lower() == primary.lower() if primary else False)
        ))
    
    # Calculate USD value (rough estimate: ETH at ~$3500, Base gas much cheaper)
    eth_price_usd = 3500  # You should fetch real price
    total_gas_usd = (total_gas_eth * eth_price_usd) + (total_gas_base * eth_price_usd * 0.01)
    
    return UserGasInfo(
        username=username,
        fid=fid,
        display_name=display_name,
        pfp_url=pfp_url,
        wallets=wallets,
        primary_wallet=primary,
        total_gas_used_eth=total_gas_eth,
        total_gas_used_base=total_gas_base,
        total_gas_usd=total_gas_usd
    )


# Quick test
if __name__ == "__main__":
    import sys
    username = sys.argv[1] if len(sys.argv) > 1 else "dwr.eth"
    result = get_user_gas_info(username)
    print(f"\n=== Gas Info for {username} ===")
    print(f"FID: {result.fid}")
    print(f"Display Name: {result.display_name}")
    print(f"Primary Wallet: {result.primary_wallet}")
    print(f"Wallets: {len(result.wallets)}")
    for w in result.wallets:
        print(f"  - {w.address[:10]}... | ETH TX: {w.eth_tx_count} | Base TX: {w.base_tx_count} | Primary: {w.is_primary}")
    print(f"Total Gas ETH: {result.total_gas_used_eth:.6f} ETH")
    print(f"Total Gas Base: {result.total_gas_used_base:.6f} ETH")
    print(f"Total Gas USD: ${result.total_gas_usd:.2f}")
