import { useState, useEffect, useCallback } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { stakeOperations, type StakeRecord } from '@/lib/supabase';

export interface StakeMarker {
  id: string;
  stakeId: number;
  latitude: number;
  longitude: number;
  symbol: string;
  amount: string;
  status: 'active' | 'expired' | 'claimed' | 'refunded';
  expiresAt: string;
  stakerAddress: string;
  isOwn: boolean;
  canClaim: boolean;
  canRefund: boolean;
  transactionHash: string;
  tokenAddress: string;
  durationHours: number;
  createdAt: string;
}

export function useStakes() {
  const { wallets } = useWallets();
  const [stakes, setStakes] = useState<StakeRecord[]>([]);
  const [stakeMarkers, setStakeMarkers] = useState<StakeMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userAddress = wallets.length > 0 ? wallets[0].address.toLowerCase() : null;

  // Convert stake records to map markers (only active stakes)
  const convertToMarkers = useCallback((stakeRecords: StakeRecord[]): StakeMarker[] => {
    const now = new Date();
    
    return stakeRecords
      .map(stake => {
        const expiresAt = new Date(stake.expires_at);
        const isExpired = now >= expiresAt;
        const isOwn = userAddress ? stake.staker_address.toLowerCase() === userAddress : false;
        
        let status: 'active' | 'expired' | 'claimed' | 'refunded' = 'active';
        if (stake.claimed) status = 'claimed';
        else if (stake.refunded) status = 'refunded';
        else if (isExpired) status = 'expired';

        const canClaim = status === 'active' && !isOwn;
        const canRefund = status === 'expired' && isOwn;

        return {
          id: `stake-${stake.stake_id}`,
          stakeId: stake.stake_id,
          latitude: stake.latitude,
          longitude: stake.longitude,
          symbol: stake.token_symbol,
          amount: stake.amount,
          status,
          expiresAt: stake.expires_at,
          stakerAddress: stake.staker_address,
          isOwn,
          canClaim,
          canRefund,
          transactionHash: stake.transaction_hash,
          tokenAddress: stake.token_address,
          durationHours: stake.duration_hours,
          createdAt: stake.created_at
        };
      })
      .filter(stake => stake.status === 'active'); // Only show active stakes
  }, [userAddress]);

  // Fetch all active stakes
  const fetchActiveStakes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const activeStakes = await stakeOperations.getActiveStakes();
      setStakes(activeStakes);
      
      const markers = convertToMarkers(activeStakes);
      setStakeMarkers(markers);
      
    } catch (err: any) {
      console.error('Error fetching stakes:', err);
      setError('Failed to load stakes');
    } finally {
      setLoading(false);
    }
  }, [convertToMarkers]);

  // Fetch stakes in a specific geographic area
  const fetchStakesInArea = useCallback(async (
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const areaStakes = await stakeOperations.getStakesInArea(minLat, maxLat, minLng, maxLng);
      setStakes(areaStakes);
      
      const markers = convertToMarkers(areaStakes);
      setStakeMarkers(markers);
      
    } catch (err: any) {
      console.error('Error fetching stakes in area:', err);
      setError('Failed to load stakes in area');
    } finally {
      setLoading(false);
    }
  }, [convertToMarkers]);

  // Refresh stakes data
  const refreshStakes = useCallback(() => {
    fetchActiveStakes();
  }, [fetchActiveStakes]);

  // Auto-fetch on mount and when user changes
  useEffect(() => {
    fetchActiveStakes();
  }, [fetchActiveStakes]);

  // Auto-refresh every 30 seconds to update status
  useEffect(() => {
    const interval = setInterval(() => {
      if (stakes.length > 0) {
        // Update markers status without refetching from database
        const updatedMarkers = convertToMarkers(stakes);
        setStakeMarkers(updatedMarkers);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [stakes, convertToMarkers]);

  return {
    stakes,
    stakeMarkers,
    loading,
    error,
    refreshStakes,
    fetchStakesInArea,
    fetchActiveStakes
  };
}
