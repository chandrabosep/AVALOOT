'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';

export default function WalletCreator() {
  const { user, ready, authenticated, createWallet } = usePrivy();
  const { wallets } = useWallets();
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [walletCreated, setWalletCreated] = useState(false);

  useEffect(() => {
    const createEmbeddedWallet = async () => {
      // Only create wallet if:
      // 1. Privy is ready
      // 2. User is authenticated
      // 3. User exists
      // 4. User has no wallets
      // 5. We're not already creating a wallet
      // 6. We haven't already created a wallet in this session
      if (
        ready && 
        authenticated && 
        user && 
        wallets.length === 0 && 
        !isCreatingWallet && 
        !walletCreated &&
        createWallet
      ) {
        console.log('=== CREATING EMBEDDED WALLET ===');
        console.log('User ID:', user.id);
        console.log('Email:', user.email?.address);
        
        setIsCreatingWallet(true);
        
        try {
          const wallet = await createWallet();
          console.log('=== WALLET CREATED SUCCESSFULLY ===');
          console.log('Wallet Address:', wallet.address);
          console.log('===================================');
          setWalletCreated(true);
        } catch (error) {
          console.error('=== WALLET CREATION FAILED ===');
          console.error('Error:', error);
          console.error('===============================');
        } finally {
          setIsCreatingWallet(false);
        }
      }
    };

    createEmbeddedWallet();
  }, [ready, authenticated, user, wallets.length, isCreatingWallet, walletCreated, createWallet]);

  // Reset wallet created flag when user changes (logout/login)
  useEffect(() => {
    if (!user) {
      setWalletCreated(false);
      setIsCreatingWallet(false);
    }
  }, [user]);

  // This component doesn't render anything visible
  return null;
}
