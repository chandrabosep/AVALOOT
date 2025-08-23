'use client';

import { useEffect, useState } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { stakeOperations, type StakeRecord } from '@/lib/supabase';
import { Clock, MapPin, Coins, User, ExternalLink, RefreshCw } from 'lucide-react';
import { formatTokenAmount, calculateStakeTimingInfo, formatCoordinate } from '@/utlis/stake-utils';

export default function StakesList() {
  const { wallets } = useWallets();
  const [stakes, setStakes] = useState<StakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-stakes' | 'all-stakes'>('my-stakes');

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

  const refreshStakes = () => {
    if (activeTab === 'my-stakes') {
      fetchMyStakes();
    } else {
      fetchAllStakes();
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
        <div className="flex space-x-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab('my-stakes')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'my-stakes'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            My Stakes
          </button>
          <button
            onClick={() => setActiveTab('all-stakes')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'all-stakes'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Stakes
          </button>
        </div>
        
        <button
          onClick={refreshStakes}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && stakes.length === 0 && !error && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Coins className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {activeTab === 'my-stakes' ? 'No Stakes Yet' : 'No Active Stakes'}
          </h3>
          <p className="text-muted-foreground">
            {activeTab === 'my-stakes'
              ? 'Create your first stake to get started!'
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
                className="border border-border rounded-xl p-4 bg-card hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Stake #{stake.stake_id}
                    </span>
                    {isOwner && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                        Mine
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${bgColor} ${color}`}>
                    {status}
                  </span>
                </div>

                {/* Amount & Token */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Coins className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {stake.amount} {stake.token_symbol}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stake.duration_hours}h duration
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {stake.latitude.toFixed(4)}, {stake.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>

                {/* Time Info */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground font-medium">
                      {timeRemaining === 'EXPIRED' ? 'Expired' : `${timeRemaining} left`}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Tx
                  </a>
                  
                  {status === 'Active' && !isOwner && (
                    <button className="flex-1 px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                      Claim
                    </button>
                  )}
                  
                  {status === 'Expired' && isOwner && !stake.claimed && (
                    <button className="flex-1 px-3 py-2 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
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
