import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Mock gas data generator (since Base API not available yet)
function generateMockGasData(txCount: number, chain: 'eth' | 'base') {
  if (txCount === 0) return { gasUsed: 0, gasCostETH: 0, gasCostUSD: 0 };
  
  // Average gas per tx: ETH ~21000-100000, Base ~21000-50000
  const avgGasPerTx = chain === 'eth' 
    ? Math.floor(Math.random() * 80000) + 21000
    : Math.floor(Math.random() * 30000) + 21000;
  
  // Gas price: ETH ~20-50 gwei, Base ~0.001-0.01 gwei
  const gasPrice = chain === 'eth'
    ? (Math.random() * 30 + 20) * 1e9 // gwei to wei
    : (Math.random() * 0.009 + 0.001) * 1e9;
  
  const totalGasUsed = avgGasPerTx * txCount;
  const gasCostWei = totalGasUsed * gasPrice;
  const gasCostETH = gasCostWei / 1e18;
  const ethPrice = 3500; // Mock ETH price
  const gasCostUSD = gasCostETH * ethPrice;
  
  return {
    gasUsed: totalGasUsed,
    gasCostETH: Number(gasCostETH.toFixed(6)),
    gasCostUSD: Number(gasCostUSD.toFixed(2))
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username || username.trim() === '') {
    return NextResponse.json(
      { success: false, error: 'Username is required' },
      { status: 400 }
    );
  }

  try {
    // Call Python backend for real user data
    const response = await fetch(
      `${BACKEND_URL}/api/gas?username=${encodeURIComponent(username.trim())}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    
    // If backend returned successfully, add mock gas data
    if (data.success && data.wallets) {
      let totalGasETH = 0;
      let totalGasBase = 0;
      let totalGasUSD = 0;
      
      // Add mock gas data to each wallet
      data.wallets = data.wallets.map((wallet: any) => {
        const ethGas = generateMockGasData(wallet.eth_tx_count, 'eth');
        const baseGas = generateMockGasData(wallet.base_tx_count, 'base');
        
        totalGasETH += ethGas.gasCostETH;
        totalGasBase += baseGas.gasCostETH;
        totalGasUSD += ethGas.gasCostUSD + baseGas.gasCostUSD;
        
        return {
          ...wallet,
          gas_eth: ethGas,
          gas_base: baseGas
        };
      });
      
      data.total_gas_used_eth = Number(totalGasETH.toFixed(6));
      data.total_gas_used_base = Number(totalGasBase.toFixed(6));
      data.total_gas_usd = Number(totalGasUSD.toFixed(2));
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Backend connection error:', error);
    
    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Could not connect to backend. Make sure Python server is running on port 8000.',
        username: username
      },
      { status: 503 }
    );
  }
}
