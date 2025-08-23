"use client"
import PlayableMap from "@/components/map/playable-map";
import Login from "@/components/auth/login";
import UserProfile from "@/components/auth/user-profile";
import WalletLogger from "@/components/debug/wallet-logger";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect } from "react";

export default function Home() {
  const { ready, authenticated } = usePrivy();

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
      <PlayableMap />
    </div>
  );
}
