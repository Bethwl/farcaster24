'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { shortenAddress, formatETH, formatUSD, formatNumber } from '@/lib/utils';

// Types
interface GasInfo {
  gasUsed: number;
  gasCostETH: number;
  gasCostUSD: number;
}

interface Wallet {
  address: string;
  eth_tx_count: number;
  base_tx_count: number;
  eth_balance: number;
  is_primary: boolean;
  gas_eth?: GasInfo;
  gas_base?: GasInfo;
}

interface GasData {
  success: boolean;
  username: string;
  fid: number | null;
  display_name: string | null;
  pfp_url: string | null;
  wallets: Wallet[];
  primary_wallet: string | null;
  total_gas_used_eth: number;
  total_gas_used_base: number;
  total_gas_usd: number;
  error?: string;
}

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const WalletIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const GasIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

export default function GasChecker() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GasData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/gas?username=${encodeURIComponent(username.trim())}`);
      const result = await res.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'User not found');
      }
    } catch (err) {
      setError('Failed to connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Search Form */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-900/50 to-pink-900/50">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <GasIcon />
            </div>
            Farcaster Gas Checker
          </CardTitle>
          <p className="text-gray-400 text-sm mt-2">
            Check gas spent by any Farcaster user across Ethereum & Base
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter username (e.g., dwr.eth, vitalik.eth)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                icon={<SearchIcon />}
                disabled={loading}
              />
            </div>
            <Button type="submit" isLoading={loading} className="min-w-[120px]">
              {loading ? 'Searching...' : 'Check Gas'}
            </Button>
          </form>
          
          {/* Quick Examples */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-gray-500 text-sm">Try:</span>
            {['dwr.eth', 'vitalik.eth', 'jessepollak'].map((name) => (
              <button
                key={name}
                onClick={() => setUsername(name)}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                @{name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-500/30 bg-red-900/10">
          <CardContent className="py-4">
            <p className="text-red-400 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-6 animate-fadeIn">
          {/* User Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                  {data.pfp_url ? (
                    <img
                      src={data.pfp_url}
                      alt={data.display_name || data.username}
                      className="w-20 h-20 rounded-full ring-4 ring-purple-500/30"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl font-bold">
                      {data.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Primary badge */}
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">
                    {data.display_name || data.username}
                  </h2>
                  <p className="text-gray-400">@{data.username}</p>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-gray-500">FID: <span className="text-purple-400">{data.fid}</span></span>
                    <span className="text-gray-500">Wallets: <span className="text-purple-400">{data.wallets.length}</span></span>
                  </div>
                </div>

                {/* Farcaster Link */}
                <a
                  href={`https://warpcast.com/${data.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <ExternalLinkIcon />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Gas Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Gas USD */}
            <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30">
              <CardContent className="pt-6">
                <p className="text-gray-400 text-sm mb-1">Total Gas Spent</p>
                <p className="text-3xl font-bold text-white">
                  {formatUSD(data.total_gas_usd)}
                </p>
                <p className="text-gray-500 text-xs mt-2">*Estimated based on tx count</p>
              </CardContent>
            </Card>

            {/* Ethereum Gas */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-xs">Ξ</span>
                  </div>
                  <p className="text-gray-400 text-sm">Ethereum</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatETH(data.total_gas_used_eth)} ETH
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {formatUSD(data.total_gas_used_eth * 3500)}
                </p>
              </CardContent>
            </Card>

            {/* Base Gas */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <span className="text-xs">🔵</span>
                  </div>
                  <p className="text-gray-400 text-sm">Base</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatETH(data.total_gas_used_base)} ETH
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {formatUSD(data.total_gas_used_base * 3500)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Wallets List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <WalletIcon />
                Connected Wallets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.wallets.map((wallet, index) => (
                  <div
                    key={wallet.address}
                    className={`p-4 rounded-lg border transition-all ${
                      wallet.is_primary
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Address */}
                        <div className="flex items-center gap-2">
                          <code className="text-white font-mono text-sm">
                            {shortenAddress(wallet.address, 8)}
                          </code>
                          {wallet.is_primary && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                              Primary
                            </span>
                          )}
                          <button
                            onClick={() => copyToClipboard(wallet.address)}
                            className="text-gray-500 hover:text-white transition-colors"
                            title="Copy address"
                          >
                            {copied === wallet.address ? (
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <CopyIcon />
                            )}
                          </button>
                          <a
                            href={`https://etherscan.io/address/${wallet.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-white transition-colors"
                            title="View on Etherscan"
                          >
                            <ExternalLinkIcon />
                          </a>
                        </div>

                        {/* Stats */}
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">ETH Balance</p>
                            <p className="text-white font-medium">{formatETH(wallet.eth_balance)} ETH</p>
                          </div>
                          <div>
                            <p className="text-gray-500">ETH Txns</p>
                            <p className="text-white font-medium">{formatNumber(wallet.eth_tx_count, 0)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Base Txns</p>
                            <p className="text-white font-medium">{formatNumber(wallet.base_tx_count, 0)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Est. Gas</p>
                            <p className="text-white font-medium">
                              {formatUSD((wallet.gas_eth?.gasCostUSD || 0) + (wallet.gas_base?.gasCostUSD || 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <p className="text-center text-gray-500 text-sm">
            ⚠️ Gas estimates are approximate and based on transaction counts. 
            Actual gas usage may vary.
          </p>
        </div>
      )}
    </div>
  );
}
