'use client';

import {PrivyProvider} from '@privy-io/react-auth';
import { avalanche } from '@/utlis/network-config';

export default function WalletProvider({children}: {children: React.ReactNode}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={{
      defaultChain: avalanche,
    }}
    >
      {children}
    </PrivyProvider>
  );
}