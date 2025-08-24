import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, User, Coins, ExternalLink, Loader2 } from 'lucide-react';
import { StakeMarker } from '@/hooks/useStakes';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { createWalletClient, createPublicClient, custom, http, parseEther, parseUnits } from 'viem';
import { avalanche } from '@/utlis/network-config';
import { GeoStakeABI } from '@/contracts/abi';
import { stakeOperations, stakerRewardOperations } from '@/lib/supabase';
import { safeAmountToBigInt } from '@/utlis/gas-utils';

interface StakeDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stake: StakeMarker | null;
  onClaimSuccess?: () => void;
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GEOSTAKE_CONTRACT_ADDRESS as `0x${string}`;

export default function StakeDetailsDialog({ 
  isOpen, 
  onClose, 
  stake,
  onClaimSuccess 
}: StakeDetailsDialogProps) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [isClaimingLoading, setIsClaimingLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimStatus, setClaimStatus] = useState<string>('');

  if (!stake) return null;

  const formatTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(stake.expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getExplorerUrl = (hash: string) => {
    return `https://testnet.snowtrace.io/tx/${hash}`;
  };

  const handleClaim = async () => {
    if (!user || !wallets.length || !stake.canClaim) return;

    try {
      setIsClaimingLoading(true);
      setClaimError(null);
      setClaimStatus('Getting your location...');

      // Create wallet client
      const ethereumProvider = await wallets[0].getEthereumProvider();
      const walletClient = createWalletClient({
        chain: avalanche,
        transport: custom(ethereumProvider),
        account: wallets[0].address as `0x${string}`,
      });

      // Create public client for reading
      const publicClient = createPublicClient({
        chain: avalanche,
        transport: http(),
      });

      // Get current user location
      const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            (error) => {
              reject(new Error(`Geolocation error: ${error.message}`));
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            }
          );
        });
      };

      const userLocation = await getCurrentLocation();
      setClaimStatus('Verifying your location...');

      // Calculate distance between user and stake
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Distance in meters
      };

      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        stake.latitude,
        stake.longitude
      );

      // Check if user is within claiming distance (e.g., 100 meters)
      const CLAIM_DISTANCE_METERS = 100;
      if (distance > CLAIM_DISTANCE_METERS) {
        throw new Error(`You must be within ${CLAIM_DISTANCE_METERS}m of the stake to claim it. You are ${Math.round(distance)}m away.`);
      }

      console.log(`User is ${Math.round(distance)}m from stake - within claiming range!`);
      setClaimStatus('Submitting claim transaction...');

      // Convert coordinates to contract format (scaled by 1e6)
      const coordinateToContract = (coord: number) => Math.round(coord * 1e6);

      // Estimate gas for claim function
      const gasEstimate = await publicClient.estimateContractGas({
        address: CONTRACT_ADDRESS,
        abi: GeoStakeABI,
        functionName: 'claim',
        args: [BigInt(stake.stakeId)],
        account: wallets[0].address as `0x${string}`,
      });

      // Call the claim function
      const claimHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: GeoStakeABI,
        functionName: 'claim',
        args: [BigInt(stake.stakeId)],
        gas: gasEstimate + BigInt(10000), // Add buffer for safety
      });

      setClaimStatus('Waiting for transaction confirmation...');
      
      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: claimHash as `0x${string}`,
      });

      if (receipt.status === 'success') {
        // Extract claim amounts from transaction logs
        let claimerAmount = '0';
        let stakerReward = '0';
        
        // Look for the Claimed event in the transaction logs
        const claimedEvent = receipt.logs.find(log => {
          try {
            // Check if this log matches the Claimed event signature
            return log.topics[0] === '0x...' // You would need the actual event signature hash
          } catch {
            return false;
          }
        });

        if (claimedEvent) {
          try {
            // Decode the event data to get claimerAmount and stakerReward
            // For now, we'll calculate based on the original amount and 5% reward
            // Convert decimal string to wei (BigInt) safely
            const originalAmount = safeAmountToBigInt(stake.amount);
            const rewardPercentage = BigInt(500); // 5% in basis points
            const calculatedStakerReward = (originalAmount * rewardPercentage) / BigInt(10000);
            const calculatedClaimerAmount = originalAmount - calculatedStakerReward;
            
            stakerReward = calculatedStakerReward.toString();
            claimerAmount = calculatedClaimerAmount.toString();
          } catch (error) {
            console.warn('Failed to decode claim event, using calculated amounts');
            // Fallback calculation
            // Convert decimal string to wei (BigInt) safely
            const originalAmount = safeAmountToBigInt(stake.amount);
            const calculatedStakerReward = (originalAmount * BigInt(500)) / BigInt(10000);
            stakerReward = calculatedStakerReward.toString();
            claimerAmount = (originalAmount - calculatedStakerReward).toString();
          }
        } else {
          // Fallback calculation if event not found
          // Convert decimal string to wei (BigInt) safely
          const originalAmount = safeAmountToBigInt(stake.amount);
          const calculatedStakerReward = (originalAmount * BigInt(500)) / BigInt(10000);
          stakerReward = calculatedStakerReward.toString();
          claimerAmount = (originalAmount - calculatedStakerReward).toString();
        }

        // Update database to mark stake as claimed with amounts
        const claimerAddress = wallets[0].address;
        const dbUpdateSuccess = await stakeOperations.markAsClaimed(
          stake.stakeId, 
          claimerAddress, 
          claimerAmount, 
          stakerReward
        );
        
        if (!dbUpdateSuccess) {
          console.warn('Failed to update database, but blockchain transaction succeeded');
        }

        // Update staker rewards in the database
        if (stakerReward !== '0') {
          await stakerRewardOperations.updateStakerReward(
            stake.stakerAddress,
            stake.tokenAddress,
            stake.symbol,
            stakerReward,
            'avalanche-fuji', // or get from config
            CONTRACT_ADDRESS
          );
        }

        setClaimSuccess(true);
        if (onClaimSuccess) {
          onClaimSuccess();
        }
        
        // Close dialog after showing success
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error: any) {
      console.error('Claim failed:', error);
      setClaimError(error.message || 'Failed to claim stake');
    } finally {
      setIsClaimingLoading(false);
      setClaimStatus('');
    }
  };

  // Reset state when dialog closes
  const handleClose = () => {
    setClaimError(null);
    setClaimSuccess(false);
    setClaimStatus('');
    setIsClaimingLoading(false);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-black/75 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Stake Details</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-gray-400 hover:text-white rotate-45" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-96 overflow-y-auto scrollbar-thin">
          {/* Stake Info */}
          <div className="bg-black/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{stake.amount} {stake.symbol}</h3>
                <p className="text-sm text-gray-400">Stake #{stake.stakeId}</p>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                stake.canClaim 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : stake.isOwn 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {stake.canClaim ? "Claimable" : stake.isOwn ? "Your Stake" : "Not Claimable"}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Staker:</span>
                <span className="font-mono text-white">{formatAddress(stake.stakerAddress)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Location:</span>
                <span className="text-white">{stake.latitude.toFixed(6)}, {stake.longitude.toFixed(6)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Time:</span>
                <span className={stake.status === 'expired' ? 'text-red-400' : 'text-green-400'}>
                  {formatTimeRemaining()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Transaction:</span>
                <a 
                  href={getExplorerUrl(stake.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline font-mono transition-colors"
                >
                  {formatAddress(stake.transactionHash)}
                </a>
              </div>
            </div>
          </div>

          {/* Reward Breakdown */}
          {stake.canClaim && !stake.isOwn && (
            <div className="bg-gradient-to-r from-green-900/20 to-purple-900/20 border border-green-500/30 rounded-xl p-4">
              <h4 className="font-medium text-green-400 mb-3 flex items-center gap-2">
                💰 Claim Breakdown
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Total Stake:</span>
                  <span className="font-mono text-white">
                    {parseFloat(stake.amount).toFixed(6)} {stake.symbol}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">You receive (95%):</span>
                  <span className="font-mono text-blue-300 font-semibold">
                    {(parseFloat(stake.amount) * 0.95).toFixed(6)} {stake.symbol}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Staker earns back (5%):</span>
                  <span className="font-mono text-green-300">
                    {(parseFloat(stake.amount) * 0.05).toFixed(6)} {stake.symbol}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-600/30">
                <p className="text-xs text-gray-400">
                  ℹ️ This incentive model rewards stakers for creating popular locations while you still get the majority of the stake!
                </p>
              </div>
            </div>
          )}

          {/* Claim Section */}
          {stake.canClaim && !stake.isOwn && (
            <div className="space-y-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                  🎯 How to Claim This Stake
                </h4>
                <p className="text-sm text-blue-300">
                  Go to the stake location and click "Claim" when you're within 100 meters. 
                  You'll receive the staked tokens as a reward!
                </p>
              </div>

              {isClaimingLoading && claimStatus && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-sm text-blue-300 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {claimStatus}
                  </p>
                </div>
              )}

              {claimError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <p className="text-sm text-red-300">{claimError}</p>
                </div>
              )}

              {claimSuccess && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-sm text-green-300">
                    🎉 Stake claimed successfully! Tokens have been transferred to your wallet.
                  </p>
                </div>
              )}

              <button 
                onClick={handleClaim}
                disabled={isClaimingLoading || claimSuccess}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-500 disabled:text-gray-300 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:shadow-none border-0"
              >
                {isClaimingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : claimSuccess ? (
                  'Claimed Successfully!'
                ) : (
                  'Claim Stake'
                )}
              </button>
            </div>
          )}

          {/* Own Stake Info */}
          {stake.isOwn && (
            <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-4">
              <h4 className="font-medium text-gray-300 mb-2 flex items-center gap-2">
                📍 Your Stake
              </h4>
              <p className="text-sm text-gray-400">
                This is your stake. Other users can claim it by visiting the location. 
                You can refund it after it expires if no one claims it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
