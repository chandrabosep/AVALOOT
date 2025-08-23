'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect } from 'react';

export default function WalletLogger() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  // Log authentication state changes
  useEffect(() => {
    console.log("=== AUTH STATE CHANGE ===");
    console.log("Ready:", ready);
    console.log("Authenticated:", authenticated);
    console.log("========================");
  }, [ready, authenticated]);

  // Log user connection/disconnection
  useEffect(() => {
    if (ready) {
      if (authenticated && user) {
        console.log("=== USER CONNECTED ===");
        console.log("User ID:", user.id);
        console.log("Email:", user.email?.address || 'No email');
        console.log("Connected Wallets:", wallets.length);
        wallets.forEach((wallet, index) => {
          console.log(`Wallet ${index + 1}:`, wallet.address);
          console.log(`Chain ID ${index + 1}:`, wallet.chainId);
          console.log(`Network ${index + 1}:`, getNetworkName(wallet.chainId));
        });
        console.log("=====================");
      } else if (!authenticated) {
        console.log("=== USER DISCONNECTED ===");
        console.log("========================");
      }
    }
  }, [ready, authenticated, user?.id, wallets.length]);

  // Log wallet changes (connections, disconnections, chain switches)
  useEffect(() => {
    if (ready && authenticated && wallets.length > 0) {
      console.log("=== WALLET STATE CHANGE ===");
      console.log("Total Wallets:", wallets.length);
      wallets.forEach((wallet, index) => {
        console.log(`--- Wallet ${index + 1} ---`);
        console.log("Address:", wallet.address);
        console.log("Chain ID:", wallet.chainId);
        console.log("Network:", getNetworkName(wallet.chainId));
        console.log("Wallet Type:", wallet.walletClientType);
      });
      console.log("==========================");
    }
  }, [ready, authenticated, wallets]);

  const getNetworkName = (chainId: string) => {
    // Extract numeric chain ID from CAIP-2 format (e.g., 'eip155:43114' -> 43114)
    const numericChainId = chainId.includes(':') ? parseInt(chainId.split(':')[1]) : parseInt(chainId);
    
    switch (numericChainId) {
      case 43114: return 'Avalanche C-Chain (Mainnet)';
      case 43113: return 'Avalanche Fuji (Testnet)';
      case 1: return 'Ethereum Mainnet';
      case 137: return 'Polygon Mainnet';
      case 80001: return 'Polygon Mumbai (Testnet)';
      case 56: return 'BSC Mainnet';
      case 97: return 'BSC Testnet';
      default: return `Unknown Network (Chain ID: ${chainId})`;
    }
  };

  // This component doesn't render anything, it's just for logging
  return null;
}
