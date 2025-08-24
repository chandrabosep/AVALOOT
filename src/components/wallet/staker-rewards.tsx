'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, createPublicClient, custom, http } from 'viem';
import { avalanche } from '@/utlis/network-config';
import { GeoStakeABI } from '@/contracts/abi';
import { stakerRewardOperations, StakerRewardRecord } from '@/lib/supabase';
import { RefreshCw, Coins, TrendingUp, Wallet } from 'lucide-react';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

interface StakerRewardsProps {
  className?: string;
}

export default function StakerRewards({ className }: StakerRewardsProps) {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [rewards, setRewards] = useState<StakerRewardRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [stakerRewardPercentage, setStakerRewardPercentage] = useState<number>(5);

  // Create wallet and public clients
  const [walletClient, setWalletClient] = useState<any>(null);

  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http(),
  });

  // Initialize wallet client
  useEffect(() => {
    const initWalletClient = async () => {
      if (wallets && wallets.length > 0 && wallets[0]) {
        try {
          const provider = await wallets[0].getEthereumProvider();
          const client = createWalletClient({
            account: wallets[0].address as `0x${string}`,
            chain: avalanche,
            transport: custom(provider),
          });
          setWalletClient(client);
        } catch (error) {
          console.error('Failed to create wallet client:', error);
          setWalletClient(null);
        }
      } else {
        setWalletClient(null);
      }
    };

    initWalletClient();
  }, [wallets]);

  // Fetch staker rewards
  const fetchRewards = async () => {
    if (!authenticated || !wallets || wallets.length === 0 || !wallets[0]) return;

    setLoading(true);
    try {
      const userRewards = await stakerRewardOperations.getStakerRewards(
        wallets[0].address,
        'avalanche-fuji'
      );
      setRewards(userRewards);

      // Fetch current staker reward percentage from contract
      try {
        const percentage = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: GeoStakeABI,
          functionName: 'stakerRewardPercentage',
        }) as bigint;
        setStakerRewardPercentage(Number(percentage) / 100); // Convert from basis points to percentage
      } catch (error) {
        console.warn('Failed to fetch staker reward percentage:', error);
      }
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  // Withdraw rewards for a specific token
  const withdrawRewards = async (tokenAddress: string, tokenSymbol: string, availableBalance: string) => {
    if (!walletClient || !wallets || wallets.length === 0 || !wallets[0]) return;

    setWithdrawing(tokenAddress);
    try {
      // Estimate gas for withdraw function
      const gasEstimate = await publicClient.estimateContractGas({
        address: CONTRACT_ADDRESS,
        abi: GeoStakeABI,
        functionName: 'withdrawRewards',
        args: [tokenAddress as `0x${string}`],
        account: wallets[0].address as `0x${string}`,
      });

      // Call contract withdraw function
      const withdrawHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: GeoStakeABI,
        functionName: 'withdrawRewards',
        args: [tokenAddress as `0x${string}`],
        gas: gasEstimate + BigInt(5000), // Add buffer for safety
      });

      console.log('Withdrawal transaction submitted:', withdrawHash);

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: withdrawHash as `0x${string}`,
      });

      if (receipt.status === 'success') {
        // Update database to record withdrawal
        await stakerRewardOperations.recordRewardWithdrawal(
          wallets[0].address,
          tokenAddress,
          availableBalance,
          'avalanche-fuji',
          CONTRACT_ADDRESS
        );

        // Refresh rewards
        await fetchRewards();
        
        console.log('Rewards withdrawn successfully!');
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      alert(`Withdrawal failed: ${error.message || 'Unknown error'}`);
    } finally {
      setWithdrawing(null);
    }
  };

  useEffect(() => {
    if (authenticated && wallets && wallets.length > 0) {
      fetchRewards();
    }
  }, [authenticated, wallets, walletClient]);

  if (!authenticated) {
    return (
      <div className={`bg-black/90 border border-gray-700 rounded-xl p-6 text-center ${className}`}>
        <div className="p-3 bg-red-500/20 rounded-xl border border-red-400/40 w-fit mx-auto mb-4">
          <Wallet className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-gray-400">Connect your wallet to view staker rewards</p>
      </div>
    );
  }

  if (!wallets || wallets.length === 0) {
    return (
      <div className={`bg-black/90 border border-gray-700 rounded-xl p-6 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading wallet...</p>
      </div>
    );
  }

  const totalEarningsUSD = rewards.reduce((sum, reward) => {
    // For demo purposes, assuming 1:1 USD conversion
    // In production, you'd fetch real exchange rates
    return sum + parseFloat(reward.total_earned || '0');
  }, 0);

  const totalAvailableUSD = rewards.reduce((sum, reward) => {
    return sum + parseFloat(reward.available_balance || '0');
  }, 0);

  return (
    <div className={`bg-black/90 border border-gray-700 rounded-xl text-white ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 rounded-xl border border-red-400/40">
              <TrendingUp className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Staker Rewards</h2>
              <p className="text-sm text-gray-400">
                Earn {stakerRewardPercentage}% when people claim your stakes
              </p>
            </div>
          </div>
          <button
            onClick={fetchRewards}
            disabled={loading}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh rewards"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-green-900/20 to-green-800/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-medium text-green-400">Total Earned</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              ${totalEarningsUSD.toFixed(4)}
            </p>
            <p className="text-green-300 text-xs mt-1">All-time rewards</p>
          </div>

          <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-blue-400">Available to Withdraw</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              ${totalAvailableUSD.toFixed(4)}
            </p>
            <p className="text-blue-300 text-xs mt-1">Ready to claim</p>
          </div>
        </div>

        {/* Rewards List */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white">Reward Breakdown</h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500 mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">Loading rewards...</p>
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-600/30 w-fit mx-auto mb-3">
                <Coins className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-gray-400">No rewards yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Create stakes and wait for people to claim them to start earning!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) => {
                const availableBalance = parseFloat(reward.available_balance || '0');
                const totalEarned = parseFloat(reward.total_earned || '0');
                const totalWithdrawn = parseFloat(reward.total_withdrawn || '0');
                
                return (
                  <div
                    key={`${reward.token_address}-${reward.staker_address}`}
                    className="bg-black/50 border border-gray-600/30 rounded-lg p-4 hover:border-gray-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-lg flex items-center justify-center">
                          <span className="text-purple-300 font-bold text-xs">
                            {reward.token_symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-white text-sm">{reward.token_symbol}</h4>
                          <p className="text-xs text-gray-400 font-mono">
                            {reward.token_address.slice(0, 6)}...{reward.token_address.slice(-4)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="mb-2">
                          <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded-full border border-gray-600/30">
                            Available: {availableBalance.toFixed(6)} {reward.token_symbol}
                          </span>
                        </div>
                        
                        {availableBalance > 0 ? (
                          <button
                            onClick={() => withdrawRewards(
                              reward.token_address, 
                              reward.token_symbol, 
                              reward.available_balance
                            )}
                            disabled={withdrawing === reward.token_address}
                            className="bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:text-gray-400 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
                          >
                            {withdrawing === reward.token_address ? 'Withdrawing...' : 'Withdraw'}
                          </button>
                        ) : (
                          <button 
                            disabled 
                            className="bg-gray-700/50 text-gray-500 text-xs font-medium py-1.5 px-3 rounded-lg border border-gray-600/30"
                          >
                            No rewards
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-600/30">
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="text-gray-400 mb-1">Total Earned</p>
                          <p className="font-medium text-white">{totalEarned.toFixed(6)}</p>
                          <p className="text-gray-500">{reward.token_symbol}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-1">Withdrawn</p>
                          <p className="font-medium text-white">{totalWithdrawn.toFixed(6)}</p>
                          <p className="text-gray-500">{reward.token_symbol}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-1">Available</p>
                          <p className="font-medium text-green-400">{availableBalance.toFixed(6)}</p>
                          <p className="text-gray-500">{reward.token_symbol}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-4 mt-6">
          <h3 className="text-sm font-medium text-white mb-3">💡 How Staker Rewards Work</h3>
          <div className="space-y-2 text-xs text-gray-300">
            <p>• When you create a stake, you're investing in foot traffic to that location</p>
            <p>• When someone claims your stake, they get {100 - stakerRewardPercentage}% and you get {stakerRewardPercentage}% back as a reward</p>
            <p>• Your rewards accumulate here and can be withdrawn anytime</p>
            <p>• The more popular your stake locations, the more you earn!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
