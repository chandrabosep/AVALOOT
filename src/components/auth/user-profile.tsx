'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect } from 'react';

export default function UserProfile() {
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();

  // Log wallet info whenever user or wallet changes
  useEffect(() => {
    if (user && wallets.length > 0) {
      console.log("=== USER PROFILE WALLET INFO ===");
      console.log("User ID:", user.id);
      console.log("Email:", user.email?.address || 'No email');
      wallets.forEach((wallet, index) => {
        console.log(`Wallet ${index + 1}:`);
        console.log("  Address:", wallet.address);
        console.log("  Chain ID:", wallet.chainId);
        console.log("  Network:", getNetworkName(wallet.chainId));
      });
      console.log("================================");
    }
  }, [user?.id, wallets]);

  if (!user) return null;

  const getNetworkName = (chainId: string) => {
    const numericChainId = chainId.includes(':') ? parseInt(chainId.split(':')[1]) : parseInt(chainId);
    switch (numericChainId) {
      case 43114: return 'Avalanche C-Chain';
      case 43113: return 'Avalanche Fuji (Testnet)';
      case 1: return 'Ethereum Mainnet';
      default: return `Chain ID: ${chainId}`;
    }
  };

  return (
    <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Profile</h3>
        <button
          onClick={logout}
          className="text-xs text-red-600 hover:text-red-800 font-medium"
        >
          Logout
        </button>
      </div>
      
      <div className="space-y-2">
        <div>
          <p className="text-xs text-gray-500">Email</p>
          <p className="text-sm font-medium text-gray-900">
            {user.email?.address || 'No email'}
          </p>
        </div>
        
        {wallets.length > 0 && (
          <>
            {wallets.map((wallet, index) => (
              <div key={index}>
                <div>
                  <p className="text-xs text-gray-500">Network {wallets.length > 1 ? `${index + 1}` : ''}</p>
                  <p className="text-xs font-medium text-gray-900">
                    {getNetworkName(wallet.chainId)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Wallet {wallets.length > 1 ? `${index + 1}` : ''}</p>
                  <p className="text-xs font-mono text-gray-700 break-all">
                    {wallet.address}
                  </p>
                </div>
                {index < wallets.length - 1 && <div className="border-t border-gray-200 my-2"></div>}
              </div>
            ))}
          </>
        )}
        
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            User ID: {user.id.slice(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  );
}
