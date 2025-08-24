'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { avalanche } from '@/utlis/network-config';
import { GeoStakeABI } from '@/contracts/abi';
import { formatBalance } from '@/utlis/gas-utils';
import { Clock, MapPin, Coins, User, AlertCircle } from 'lucide-react';

interface StakeInfoProps {
  stakeId: number;
  contractAddress: `0x${string}`;
}

interface StakeData {
  staker: string;
  token: string;
  amount: bigint;
  latitude: bigint;
  longitude: bigint;
  expiresAt: bigint;
  claimed: boolean;
}

export default function StakeInfo({ stakeId, contractAddress }: StakeInfoProps) {
  const [stakeData, setStakeData] = useState<StakeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http()
  });

  const fetchStakeInfo = async () => {
    try {
      setLoading(true);
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: GeoStakeABI,
        functionName: 'getStake',
        args: [BigInt(stakeId)],
      }) as StakeData;

      setStakeData(result);
    } catch (err: any) {
      console.error('Error fetching stake info:', err);
      setError(err.message || 'Failed to fetch stake information');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeRemaining = () => {
    if (!stakeData) return '';

    const now = BigInt(Math.floor(Date.now() / 1000)); // Current timestamp in seconds
    const expiresAt = stakeData.expiresAt;
    
    if (now >= expiresAt) {
      return 'EXPIRED';
    }

    const secondsRemaining = Number(expiresAt - now);
    const days = Math.floor(secondsRemaining / 86400);
    const hours = Math.floor((secondsRemaining % 86400) / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatCoordinate = (coordinate: bigint): string => {
    return (Number(coordinate) / 1_000_000).toFixed(6);
  };

  const formatAmount = (amount: bigint): string => {
    // Assuming 18 decimals
    const formatted = Number(amount) / 1e18;
    return formatBalance(formatted.toString());
  };

  const formatDate = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const getStakeStatus = (): { status: string; color: string; canClaim: boolean; canRefund: boolean } => {
    if (!stakeData) return { status: 'Unknown', color: 'text-gray-500', canClaim: false, canRefund: false };

    const now = BigInt(Math.floor(Date.now() / 1000));
    const isExpired = now >= stakeData.expiresAt;
    const isClaimed = stakeData.claimed;

    if (isClaimed) {
      return { status: 'Claimed/Refunded', color: 'text-gray-500', canClaim: false, canRefund: false };
    } else if (isExpired) {
      return { status: 'Expired - Refund Available', color: 'text-orange-600', canClaim: false, canRefund: true };
    } else {
      return { status: 'Active - Claimable', color: 'text-green-600', canClaim: true, canRefund: false };
    }
  };

  useEffect(() => {
    fetchStakeInfo();
  }, [stakeId, contractAddress]);

  useEffect(() => {
    if (stakeData) {
      const interval = setInterval(() => {
        setTimeRemaining(calculateTimeRemaining());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [stakeData]);

  if (loading) {
    return (
      <div className="p-6 border border-border rounded-xl bg-card">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-center text-sm text-muted-foreground mt-2">Loading stake info...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 rounded-xl bg-red-50">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Error loading stake</span>
        </div>
        <p className="text-sm text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!stakeData) return null;

  const { status, color, canClaim, canRefund } = getStakeStatus();

  return (
    <div className="p-6 border border-border rounded-xl bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Stake #{stakeId}</h3>
        <span className={`text-sm font-medium ${color}`}>{status}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amount & Token */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-sm font-medium text-foreground">
              {formatAmount(stakeData.amount)} {stakeData.token === '0x0000000000000000000000000000000000000000' ? 'AVAX' : 'Tokens'}
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="text-sm font-medium text-foreground">
              {formatCoordinate(stakeData.latitude)}, {formatCoordinate(stakeData.longitude)}
            </p>
          </div>
        </div>

        {/* Staker */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Staker</p>
            <p className="text-sm font-medium text-foreground font-mono">
              {stakeData.staker.slice(0, 6)}...{stakeData.staker.slice(-4)}
            </p>
          </div>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time Remaining</p>
            <p className={`text-sm font-medium ${timeRemaining === 'EXPIRED' ? 'text-red-600' : 'text-foreground'}`}>
              {timeRemaining || 'Calculating...'}
            </p>
          </div>
        </div>
      </div>

      {/* Expiration Details */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Expires At:</span>
          <span className="text-foreground font-medium">{formatDate(stakeData.expiresAt)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {canClaim && (
          <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Claim Stake
          </button>
        )}
        {canRefund && (
          <button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Refund Stake
          </button>
        )}
        {!canClaim && !canRefund && stakeData.claimed && (
          <div className="flex-1 bg-gray-100 text-gray-500 font-medium py-2 px-4 rounded-lg text-center">
            Already Claimed/Refunded
          </div>
        )}
      </div>

      {/* Claim Period Info */}
      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <p className="font-medium text-foreground mb-1">📋 Claim Period Rules:</p>
        <ul className="text-muted-foreground space-y-1">
          <li>• <strong>Active Period:</strong> Anyone except the staker can claim</li>
          <li>• <strong>After Expiry:</strong> Only the original staker can refund</li>
          <li>• <strong>Claimed Stakes:</strong> Cannot be claimed or refunded again</li>
        </ul>
      </div>
    </div>
  );
}
