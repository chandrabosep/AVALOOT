'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { X, Copy, ExternalLink, Wallet, AlertCircle } from 'lucide-react';
import { createPublicClient, http, formatEther } from 'viem';
import { avalanche } from '@/utlis/network-config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [isClosing, setIsClosing] = useState(false);

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
      
      // Only fetch balance for Avalanche Fuji Testnet
      if (numericChainId === 43113) {
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
    if (wallets.length === 0 || isClosing) return;
    
    setLoading(true);
    const newBalances: { [address: string]: string } = {};
    
    try {
      // Fetch balances in parallel for better performance
      const balancePromises = wallets.map(async (wallet) => {
        const balance = await fetchBalance(wallet.address, wallet.chainId);
        return { address: wallet.address, balance };
      });
      
      const results = await Promise.all(balancePromises);
      
      // Only update state if dialog is still open
      if (!isClosing) {
        results.forEach(({ address, balance }) => {
          newBalances[address] = balance;
        });
        setBalances(newBalances);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      if (!isClosing) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen && wallets.length > 0) {
      setIsClosing(false);
      fetchAllBalances();
    }
  }, [isOpen, wallets]);

  // Cleanup when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
      setLoading(false);
      setCopiedAddress(null);
    }
  }, [isOpen]);

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

  const handleClose = () => {
    setIsClosing(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 border border-gray-700 text-white max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 rounded-xl border border-red-400/40">
              <Wallet className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">Wallet Funds</DialogTitle>
              <p className="text-sm text-gray-400">Account balances and details</p>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-5 max-h-96 overflow-y-auto scrollbar-thin">
          {/* User Info */}
          {user && (
            <div className="bg-black/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-white mb-3">Account Information</h3>
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs text-gray-400 mb-1">User ID</p>
                  <p className="text-sm font-mono text-white">{user.id.slice(0, 20)}...</p>
                </div>
                {user.email && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Email</p>
                    <p className="text-sm text-white">{user.email.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wallets */}
          {wallets.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white">Connected Wallets</h3>
              {wallets.map((wallet, index) => (
                <div key={index} className="border border-gray-700 rounded-xl p-4 space-y-3 bg-black/50">
                  {/* Network Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getNetworkColor(wallet.chainId)}`}>
                      {getNetworkName(wallet.chainId)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {wallets.length > 1 ? `Wallet ${index + 1}` : 'Wallet'}
                    </span>
                  </div>

                  {/* Address */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Address</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-white flex-1 break-all">
                        {wallet.address}
                      </p>
                      <button
                        onClick={() => copyToClipboard(wallet.address)}
                        className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Copy address"
                      >
                        <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                      </button>
                      <button
                        onClick={() => openInExplorer(wallet.address, wallet.chainId)}
                        className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                        title="View in explorer"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400 hover:text-white" />
                      </button>
                    </div>
                    {copiedAddress === wallet.address && (
                      <p className="text-xs text-green-400 mt-1">Address copied!</p>
                    )}
                  </div>

                  {/* Balance */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">AVAX Balance</p>
                    <div className="flex items-center gap-2">
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                          <span className="text-sm text-gray-400">Loading...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-white">
                            {balances[wallet.address] || '0.0'} AVAX
                          </span>
                          <button
                            onClick={() => !loading && fetchAllBalances()}
                            disabled={loading}
                            className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Refresh
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chain ID */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Chain ID</p>
                    <p className="text-sm font-mono text-gray-400">{wallet.chainId}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Wallets Connected</h3>
              <p className="text-gray-400">Connect a wallet to view your funds and balances.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 pt-6">
          <button
            onClick={handleClose}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
