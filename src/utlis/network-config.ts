import { defineChain } from 'viem';

export const avalanche = defineChain({
  id: 43113,
  name: 'Avalanche Fuji Testnet',
  network: 'avalanche-fuji',
  nativeCurrency: {
    decimals: 18,
    name: 'Avalanche',
    symbol: 'AVAX',
  },
  rpcUrls: {
    default: {
      http: ['https://api.avax-test.network/ext/bc/C/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'SnowTrace Testnet', url: 'https://testnet.snowtrace.io' },
  },
});
