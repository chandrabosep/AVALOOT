"use client"
import React, { useMemo, useState, useEffect } from 'react'
import MapComponent from './map'
import FundsDialog from '@/components/wallet/funds-dialog'
import StakeDialog from '@/components/wallet/stake-dialog'
import StakesList from '@/components/stakes/stakes-list'
import StakeDetailsDialog from '@/components/stakes/stake-details-dialog'
import { useStakes, type StakeMarker } from '@/hooks/useStakes'
import { MapPin, Plus, TrendingUp, Wallet, List } from 'lucide-react';



export default function PlayableMap() {
    const [currentUser, setCurrentUser] = useState<any>({
        id: "current",
        latitude: 0,
        longitude: 0,
        name: "You",
        avatarUrl: "/game-assets/user.jpg",
      });
    
    const [isFundsDialogOpen, setIsFundsDialogOpen] = useState(false);
    const [isStakeDialogOpen, setIsStakeDialogOpen] = useState(false);
    const [isStakeDetailsDialogOpen, setIsStakeDetailsDialogOpen] = useState(false);
    const [selectedStake, setSelectedStake] = useState<StakeMarker | null>(null);
    const [activeView, setActiveView] = useState<'map' | 'stakes'>('map');
    
    // Fetch stakes data
    const { stakeMarkers, loading: stakesLoading, refreshStakes } = useStakes();
    

    const tokens = [{
        id: "1",
        latitude: 17.4424859636273,
        longitude: 18.35865481413879,
        symbol: "USDC",
        name: "USDC",
        logoUrl: "/game-assets/usdc.webp",
        backgroundColor: "#8A2BE2",
      },
     ]

    const handleUserClick = () => {
        console.log("user clicked")
    }
    
    const handleStakeClick = (stake: StakeMarker) => {
        console.log("Stake clicked:", stake);
        setSelectedStake(stake);
        setIsStakeDetailsDialogOpen(true);
    }
    

    


    const mapProps = useMemo(
        () => ({
          tokens,
          currentUser,
          stakeMarkers,
          onUserClick: handleUserClick,
          onStakeClick: handleStakeClick,
        }),
        [tokens, currentUser, stakeMarkers, handleUserClick, handleStakeClick]
      );
    
  return (
    <div className="relative">
      {/* Main Content */}
      {activeView === 'map' ? (
        <MapComponent {...mapProps} />
      ) : (
        <div className="min-h-screen bg-background p-4 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">Stakes</h1>
              <p className="text-muted-foreground">View and manage your stakes</p>
            </div>
            <StakesList />
          </div>
        </div>
      )}
      
      {/* Bottom Navigation */}
      <div className='absolute bottom-0 left-0 w-full h-18 bg-black/20 backdrop-blur-md border-t border-white/10 z-10 flex items-center justify-around px-4'>
        <div 
          className={`flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${
            activeView === 'map' ? 'text-white' : 'text-gray-700'
          }`}
          onClick={() => setActiveView('map')}
        >
          <MapPin className='w-6 h-6 mb-1' />
          <span className='text-xs'>Map</span>
        </div>
        <div 
          className='flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity text-gray-700'
          onClick={() => setIsStakeDialogOpen(true)}
        >
          <Plus className='w-6 h-6 mb-1' />
          <span className='text-xs'>Stake</span>
        </div>
        <div 
          className={`flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${
            activeView === 'stakes' ? 'text-white' : 'text-gray-700'
          }`}
          onClick={() => setActiveView('stakes')}
        >
          <List className='w-6 h-6 mb-1' />
          <span className='text-xs'>Stakes</span>
        </div>
        <div 
          className='flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity text-gray-700'
          onClick={() => setIsFundsDialogOpen(true)}
        >
          <Wallet className='w-6 h-6 mb-1' />
          <span className='text-xs'>Funds</span>
        </div>
      </div>
      
      <FundsDialog 
        isOpen={isFundsDialogOpen}
        onClose={() => setIsFundsDialogOpen(false)}
      />
      
      <StakeDialog 
        isOpen={isStakeDialogOpen}
        onClose={() => setIsStakeDialogOpen(false)}
        onStakeSuccess={refreshStakes}
      />

      <StakeDetailsDialog
        isOpen={isStakeDetailsDialogOpen}
        onClose={() => {
          setIsStakeDetailsDialogOpen(false);
          setSelectedStake(null);
        }}
        stake={selectedStake}
        onClaimSuccess={refreshStakes}
      />
    </div>
  )
}
