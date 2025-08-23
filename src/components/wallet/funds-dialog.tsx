'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { X, Copy, ExternalLink, Wallet, AlertCircle } from 'lucide-react';
import { createPublicClient, http, formatEther } from 'viem';
import { avalanche } from '@/utlis/network-config';

interface FundsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FundsDialog({ isOpen, onClose }: FundsDialogProps) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [balances, setBalances] = useState<{ [address: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Create a public client for fetching balances
  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http()
  });

  const getNetworkName = (chainId: string) => {
    const numericChainId = chainId.includes(':') ? parseInt(chainId.split(':')[1]) : parseInt(chainId);
    switch (numericChainId) {
      case 43114: return 'Avalanche C-Chain';
      case 43113: return 'Avalanche Fuji (Testnet)';
      case 1: return 'Ethereum Mainnet';
      default: return `Chain ID: ${chainId}`;
    }
  };

  const getNetworkColor = (chainId: string) => {
    const numericChainId = chainId.includes(':') ? parseInt(chainId.split(':')[1]) : parseInt(chainId);
    switch (numericChainId) {
      case 43114: return 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20';
      case 43113: return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20';
      case 1: return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const fetchBalance = async (address: string, chainId: string) => {
    try {
      const numericChainId = chainId.includes(':') ? parseInt(chainId.split(':')[1]) : parseInt(chainId);
      
      // Only fetch balance for Avalanche C-Chain
      if (numericChainId === 43114) {
        const balance = await publicClient.getBalance({
          address: address as `0x${string}`
        });
        return formatEther(balance);
      }
      return '0.0';
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0.0';
    }
  };

  const fetchAllBalances = async () => {
    if (wallets.length === 0) return;
    
    setLoading(true);
    const newBalances: { [address: string]: string } = {};
    
    for (const wallet of wallets) {
      const balance = await fetchBalance(wallet.address, wallet.chainId);
      newBalances[wallet.address] = balance;
    }
    
    setBalances(newBalances);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && wallets.length > 0) {
      fetchAllBalances();
    }
  }, [isOpen, wallets]);

  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const openInExplorer = (address: string, chainId: string) => {
    const numericChainId = chainId.includes(':') ? parseInt(chainId.split(':')[1]) : parseInt(chainId);
    let explorerUrl = '';
    
    switch (numericChainId) {
      case 43114:
        explorerUrl = `https://snowtrace.io/address/${address}`;
        break;
      case 43113:
        explorerUrl = `https://testnet.snowtrace.io/address/${address}`;
        break;
      case 1:
        explorerUrl = `https://etherscan.io/address/${address}`;
        break;
      default:
        return;
    }
    
    window.open(explorerUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Wallet Funds</h2>
              <p className="text-sm text-muted-foreground">Account balances and details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-96 overflow-y-auto">
          {/* User Info */}
          {user && (
            <div className="bg-muted/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Account Information</h3>
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">User ID</p>
                  <p className="text-sm font-mono text-foreground">{user.id.slice(0, 20)}...</p>
                </div>
                {user.email && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                    <p className="text-sm text-foreground">{user.email.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wallets */}
          {wallets.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Connected Wallets</h3>
              {wallets.map((wallet, index) => (
                <div key={index} className="border border-border rounded-xl p-4 space-y-3 bg-card">
                  {/* Network Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getNetworkColor(wallet.chainId)}`}>
                      {getNetworkName(wallet.chainId)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {wallets.length > 1 ? `Wallet ${index + 1}` : 'Wallet'}
                    </span>
                  </div>

                  {/* Address */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Address</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-foreground flex-1 break-all">
                        {wallet.address}
                      </p>
                      <button
                        onClick={() => copyToClipboard(wallet.address)}
                        className="p-1.5 hover:bg-accent rounded-lg transition-colors"
                        title="Copy address"
                      >
                        <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button
                        onClick={() => openInExplorer(wallet.address, wallet.chainId)}
                        className="p-1.5 hover:bg-accent rounded-lg transition-colors"
                        title="View in explorer"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                    {copiedAddress === wallet.address && (
                      <p className="text-xs text-green-600 mt-1">Address copied!</p>
                    )}
                  </div>

                  {/* Balance */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">AVAX Balance</p>
                    <div className="flex items-center gap-2">
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span className="text-sm text-muted-foreground">Loading...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-foreground">
                            {balances[wallet.address] || '0.0'} AVAX
                          </span>
                          <button
                            onClick={fetchAllBalances}
                            className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
                          >
                            Refresh
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chain ID */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Chain ID</p>
                    <p className="text-sm font-mono text-muted-foreground">{wallet.chainId}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Wallets Connected</h3>
              <p className="text-muted-foreground">Connect a wallet to view your funds and balances.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6">
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
