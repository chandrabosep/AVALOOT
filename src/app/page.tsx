"use client"
import PlayableMap from "@/components/map/playable-map";
import Login from "@/components/auth/login";
import UserProfile from "@/components/auth/user-profile";
import WalletLogger from "@/components/debug/wallet-logger";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect } from "react";

export default function Home() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  // Console log chain and wallet address whenever they change
  useEffect(() => {
    if (ready && authenticated && wallets.length > 0) {
      console.log("=== MAIN PAGE WALLET INFO ===");
      wallets.forEach((wallet, index) => {
        console.log(`Wallet ${index + 1}:`);
        console.log("  Address:", wallet.address);
        console.log("  Chain ID:", wallet.chainId);
        console.log("  Network:", getNetworkName(wallet.chainId));
      });
      console.log("=============================");
    }
  }, [ready, authenticated, wallets]);

  const getNetworkName = (chainId: string) => {
    const numericChainId = chainId.includes(':') ? parseInt(chainId.split(':')[1]) : parseInt(chainId);
    switch (numericChainId) {
      case 43114: return 'Avalanche C-Chain';
      case 43113: return 'Avalanche Fuji (Testnet)';
      case 1: return 'Ethereum Mainnet';
      default: return `Chain ID: ${chainId}`;
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Login />;
  }

  return (
    <div className="relative">
      <WalletLogger />
      {/* <UserProfile /> */}
      <PlayableMap />
    </div>
  );
}
