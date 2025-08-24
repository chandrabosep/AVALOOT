'use client';

import { useEffect, useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { stakeOperations, type StakeRecord } from '@/lib/supabase';
import { Clock, MapPin, Coins, User, ExternalLink, RefreshCw } from 'lucide-react';
import { formatTokenAmount, calculateStakeTimingInfo, formatCoordinate } from '@/utlis/stake-utils';
import { formatUnits } from 'viem';

export default function StakesList() {
  const { wallets } = useWallets();
  const [stakes, setStakes] = useState<StakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-stakes' | 'all-stakes' | 'my-claims'>('my-stakes');

  // Helper function to convert wei string to decimal number for display
  const weiToDecimal = (weiString: string, decimals: number = 18): number => {
    try {
      if (!weiString || weiString === '0') return 0;
      return parseFloat(formatUnits(BigInt(weiString), decimals));
    } catch (error) {
      console.error('Error converting wei to decimal:', weiString, error);
      return 0;
    }
  };

  const fetchMyStakes = async () => {
    if (wallets.length === 0) {
      setStakes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const wallet = wallets[0];
      const userStakes = await stakeOperations.getStakesByStaker(wallet.address.toLowerCase());
      setStakes(userStakes);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching user stakes:', err);
      setError('Failed to load your stakes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStakes = async () => {
    try {
      setLoading(true);
      const allStakes = await stakeOperations.getActiveStakes();
      setStakes(allStakes);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching all stakes:', err);
      setError('Failed to load stakes');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClaims = async () => {
    if (wallets.length === 0) {
      setStakes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const wallet = wallets[0];
      console.log('Fetching claims for wallet:', wallet.address);
      
      // Debug: Check all stakes in the database
      await stakeOperations.debugAllStakes();
      
      const claimedStakes = await stakeOperations.getStakesClaimed(wallet.address.toLowerCase());
      console.log('Retrieved claimed stakes:', claimedStakes);
      setStakes(claimedStakes);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching claimed stakes:', err);
      setError('Failed to load your claimed stakes');
    } finally {
      setLoading(false);
    }
  };

  const refreshStakes = () => {
    if (activeTab === 'my-stakes') {
      fetchMyStakes();
    } else if (activeTab === 'all-stakes') {
      fetchAllStakes();
    } else if (activeTab === 'my-claims') {
      fetchMyClaims();
    }
  };

  useEffect(() => {
    refreshStakes();
  }, [activeTab, wallets]);

  const getStakeStatus = (stake: StakeRecord) => {
    const now = new Date();
    const expiresAt = new Date(stake.expires_at);
    const isExpired = now >= expiresAt;
    
    if (stake.claimed) {
      return { status: 'Claimed', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    } else if (stake.refunded) {
      return { status: 'Refunded', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    } else if (isExpired) {
      return { status: 'Expired', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    } else {
      return { status: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'EXPIRED';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const isMyStake = (stake: StakeRecord) => {
    if (wallets.length === 0) return false;
    return stake.staker_address.toLowerCase() === wallets[0].address.toLowerCase();
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-2">Loading stakes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-black/50">
          <button
            onClick={() => setActiveTab('my-stakes')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'my-stakes'
                ? 'bg-red-500/20 text-red-400 border border-red-400/60 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Stakes
          </button>
          <button
            onClick={() => setActiveTab('my-claims')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'my-claims'
                ? 'bg-green-500/20 text-green-400 border border-green-400/60 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Claims
          </button>
          <button
            onClick={() => setActiveTab('all-stakes')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'all-stakes'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-400/60 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Stakes
          </button>
        </div>
        
        <button
          onClick={refreshStakes}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && stakes.length === 0 && !error && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
            <Coins className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {activeTab === 'my-stakes' ? 'No Stakes Yet' : 
             activeTab === 'my-claims' ? 'No Claims Yet' : 
             'No Active Stakes'}
          </h3>
          <p className="text-gray-400">
            {activeTab === 'my-stakes'
              ? 'Create your first stake to get started!'
              : activeTab === 'my-claims'
              ? 'You haven\'t claimed any stakes yet. Find stakes on the map to claim!'
              : 'No active stakes available to claim right now.'}
          </p>
        </div>
      )}

      {/* Stakes Grid */}
      {stakes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stakes.map((stake) => {
            const { status, color, bgColor } = getStakeStatus(stake);
            const timeRemaining = formatTimeRemaining(stake.expires_at);
            const isOwner = isMyStake(stake);

            return (
              <div
                key={stake.id}
                className="border border-gray-700 rounded-xl p-4 bg-black/50 hover:bg-black/60 transition-all duration-300 hover:shadow-md hover:shadow-red-500/20 hover:border-red-500/40"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      Stake #{stake.stake_id}
                    </span>
                    {isOwner && (
                      <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                        Mine
                      </span>
                    )}
                    {activeTab === 'my-claims' && (
                      <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                        Claimed
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    status === 'Claimed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    status === 'Refunded' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                    status === 'Expired' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}>
                    {status}
                  </span>
                </div>

                {/* Amount & Token */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-red-500/20 rounded-lg border border-red-400/40">
                    <Coins className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {stake.amount} {stake.token_symbol}
                    </p>
                    <p className="text-xs text-gray-400">
                      {stake.duration_hours}h duration
                    </p>
                  </div>
                </div>

                {/* Claim Details (for My Claims tab) */}
                {activeTab === 'my-claims' && stake.claimed && stake.claimer_amount && (
                  <div className="flex items-center gap-2 mb-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="p-1.5 bg-green-500/20 rounded-lg border border-green-400/40">
                      <User className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-400">
                        Claimed: {weiToDecimal(stake.claimer_amount).toFixed(6)} {stake.token_symbol}
                      </p>
                      <p className="text-xs text-gray-400">
                        {stake.claimed_at ? `On ${new Date(stake.claimed_at).toLocaleDateString()}` : 'Recently claimed'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-red-500/20 rounded-lg border border-red-400/40">
                    <MapPin className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">
                      {stake.latitude.toFixed(4)}, {stake.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>

                {/* Time Info */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-red-500/20 rounded-lg border border-red-400/40">
                    <Clock className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white font-medium">
                      {timeRemaining === 'EXPIRED' ? 'Expired' : `${timeRemaining} left`}
                    </p>
                    <p className="text-xs text-gray-400">
                      Expires: {new Date(stake.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <a
                    href={`https://testnet.snowtrace.io/tx/${stake.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-black/50 hover:bg-black/70 text-gray-400 hover:text-white rounded-lg transition-colors border border-gray-700"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Tx
                  </a>
                  
                  {status === 'Active' && !isOwner && (
                    <button className="flex-1 px-3 py-2 text-xs bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-lg transition-all duration-300 shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40">
                      Claim
                    </button>
                  )}
                  
                  {status === 'Expired' && isOwner && !stake.claimed && (
                    <button className="flex-1 px-3 py-2 text-xs bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-lg transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40">
                      Refund
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
