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

  // Helper function to compare stakes arrays for changes
  const stakesHaveChanged = useCallback((newStakes: StakeRecord[], currentStakes: StakeRecord[]): boolean => {
    if (newStakes.length !== currentStakes.length) return true;
    
    // Create a simple comparison based on stake IDs and key properties
    const newStakesMap = new Map(newStakes.map(stake => [
      stake.stake_id, 
      `${stake.claimed}-${stake.refunded}-${stake.expires_at}`
    ]));
    
    const currentStakesMap = new Map(currentStakes.map(stake => [
      stake.stake_id, 
      `${stake.claimed}-${stake.refunded}-${stake.expires_at}`
    ]));
    
    // Check if any stakes are different
    for (const [id, signature] of newStakesMap) {
      if (currentStakesMap.get(id) !== signature) return true;
    }
    
    return false;
  }, []);

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
      // Show all stakes, but you can filter in the UI components as needed
      // .filter(stake => stake.status === 'active'); // Only show active stakes
  }, [userAddress]);

  // Background fetch that doesn't trigger loading states
  const fetchActiveStakesBackground = useCallback(async () => {
    try {
      const activeStakes = await stakeOperations.getActiveStakes();
      
      // Only update if there are actual changes
      if (stakesHaveChanged(activeStakes, stakes)) {
        setStakes(activeStakes);
        const markers = convertToMarkers(activeStakes);
        setStakeMarkers(markers);
      }
      
      // Clear any existing errors on successful fetch
      if (error) {
        setError(null);
      }
      
    } catch (err: any) {
      console.error('Error fetching stakes in background:', err);
      // Only set error if we don't have existing data
      if (stakes.length === 0) {
        setError('Failed to load stakes');
      }
    }
  }, [convertToMarkers, stakes, stakesHaveChanged, error]);

  // Fetch all active stakes (with loading state for initial load)
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

  // Update local stake status every 10 seconds (for expired stakes)
  useEffect(() => {
    const updateLocalStatus = () => {
      if (stakes.length > 0) {
        const updatedMarkers = convertToMarkers(stakes);
        // Only update if markers actually changed
        if (JSON.stringify(updatedMarkers) !== JSON.stringify(stakeMarkers)) {
          setStakeMarkers(updatedMarkers);
        }
      }
    };

    const statusInterval = setInterval(updateLocalStatus, 10000); // 10 seconds
    return () => clearInterval(statusInterval);
  }, [stakes, stakeMarkers, convertToMarkers]);

  // Background fetch every 30 seconds for new/updated stakes from database
  useEffect(() => {
    const fetchInterval = setInterval(() => {
      // Use background fetch to avoid loading states and unnecessary updates
      fetchActiveStakesBackground();
    }, 10000); // 30 seconds - less frequent for actual database calls

    return () => clearInterval(fetchInterval);
  }, [fetchActiveStakesBackground]);

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
