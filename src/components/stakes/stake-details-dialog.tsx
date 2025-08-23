import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, User, Coins, ExternalLink, Loader2 } from 'lucide-react';
import { StakeMarker } from '@/hooks/useStakes';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { createWalletClient, createPublicClient, custom, http, parseEther } from 'viem';
import { avalanche } from '@/utlis/network-config';
import { GeoStakeABI } from '@/contracts/abi';

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

      // Create wallet client
      const walletClient = createWalletClient({
        chain: avalanche,
        transport: custom(wallets[0].getEthereumProvider()),
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

      // Convert coordinates to contract format (scaled by 1e6)
      const coordinateToContract = (coord: number) => Math.round(coord * 1e6);

      // Call the claim function
      const claimHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: GeoStakeABI,
        functionName: 'claim',
        args: [
          BigInt(stake.stakeId),
          coordinateToContract(userLocation.latitude),
          coordinateToContract(userLocation.longitude),
        ],
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: claimHash as `0x${string}`,
      });

      if (receipt.status === 'success') {
        setClaimSuccess(true);
        if (onClaimSuccess) {
          onClaimSuccess();
        }
        
        // Close dialog after showing success
        setTimeout(() => {
          onClose();
          setClaimSuccess(false);
        }, 3000);
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error: any) {
      console.error('Claim failed:', error);
      setClaimError(error.message || 'Failed to claim stake');
    } finally {
      setIsClaimingLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Stake Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stake Info */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{stake.amount} {stake.symbol}</h3>
              <p className="text-sm text-muted-foreground">Stake #{stake.stakeId}</p>
            </div>
            <Badge variant={stake.canClaim ? "default" : "secondary"}>
              {stake.canClaim ? "Claimable" : stake.isOwn ? "Your Stake" : "Not Claimable"}
            </Badge>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Staker:</span>
              <span className="font-mono">{formatAddress(stake.stakerAddress)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Location:</span>
              <span>{stake.latitude.toFixed(6)}, {stake.longitude.toFixed(6)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Time:</span>
              <span className={stake.status === 'expired' ? 'text-red-500' : 'text-green-500'}>
                {formatTimeRemaining()}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Transaction:</span>
              <a 
                href={getExplorerUrl(stake.transactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline font-mono"
              >
                {formatAddress(stake.transactionHash)}
              </a>
            </div>
          </div>

          {/* Claim Section */}
          {stake.canClaim && !stake.isOwn && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    🎯 How to Claim This Stake
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Go to the stake location and click "Claim" when you're within 100 meters. 
                    You'll receive the staked tokens as a reward!
                  </p>
                </div>

                {claimError && (
                  <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">{claimError}</p>
                  </div>
                )}

                {claimSuccess && (
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      🎉 Stake claimed successfully! Tokens have been transferred to your wallet.
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleClaim}
                  disabled={isClaimingLoading || claimSuccess}
                  className="w-full"
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
                </Button>
              </div>
            </>
          )}

          {/* Own Stake Info */}
          {stake.isOwn && (
            <>
              <Separator />
              <div className="bg-gray-50 dark:bg-gray-950 p-3 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  📍 Your Stake
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  This is your stake. Other users can claim it by visiting the location. 
                  You can refund it after it expires if no one claims it.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
