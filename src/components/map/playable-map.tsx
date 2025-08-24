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
        avatarUrl: "/game-assets/user.webp",
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
        <div className="min-h-screen bg-black/90 p-4 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">Stakes</h1>
              <p className="text-gray-400">View and manage your stakes</p>
            </div>
            <StakesList />
          </div>
        </div>
      )}
      
      {/* Bottom Navigation */}
      <div className='absolute bottom-0 left-0 w-full h-20 bg-black/90 backdrop-blur-lg border-t border-gray-700 z-10 flex items-center justify-around px-4 shadow-2xl shadow-black/40'>
        <div 
          className={`relative flex flex-col items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all duration-300 p-2.5 rounded-2xl ${
            activeView === 'map' 
              ? 'text-red-400 bg-gradient-to-br from-red-500/30 to-red-600/20 border border-red-400/60 backdrop-blur-sm' 
              : 'text-gray-300 hover:text-red-300 hover:bg-gradient-to-br hover:from-red-500/20 hover:to-red-600/10 hover:shadow-lg hover:shadow-red-500/30 hover:border hover:border-red-500/40'
          }`}
          onClick={() => setActiveView('map')}
        >
          <MapPin className={`w-6 h-6 mb-1 ${activeView === 'map' ? 'drop-shadow-lg filter drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''}`} />
        </div>
        <div 
          className='relative flex flex-col items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all duration-300 p-2.5 rounded-2xl text-gray-300 hover:text-red-300 hover:bg-gradient-to-br hover:from-red-500/20 hover:to-red-600/10 hover:shadow-lg hover:shadow-red-500/30 hover:border hover:border-red-500/40'
          onClick={() => setIsStakeDialogOpen(true)}
        >
          <Plus className='w-6 h-6 mb-1' />
        </div>
        <div 
          className={`relative flex flex-col items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all duration-300 p-2.5 rounded-2xl ${
            activeView === 'stakes' 
            ? 'text-red-400 bg-gradient-to-br from-red-500/30 to-red-600/20 border border-red-400/60 backdrop-blur-sm' 
            : 'text-gray-300 hover:text-red-300 hover:bg-gradient-to-br hover:from-red-500/20 hover:to-red-600/10 hover:shadow-lg hover:shadow-red-500/30 hover:border hover:border-red-500/40'
          }`}
          onClick={() => setActiveView('stakes')}
        >
          <List className={`w-6 h-6 mb-1 ${activeView === 'stakes' ? 'drop-shadow-lg filter drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''}`} />
        </div>
        <div 
          className='relative flex flex-col items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all duration-300 p-2.5 rounded-2xl text-gray-300 hover:text-red-300 hover:bg-gradient-to-br hover:from-red-500/20 hover:to-red-600/10 hover:shadow-lg hover:shadow-red-500/30 hover:border hover:border-red-500/40'
          onClick={() => setIsFundsDialogOpen(true)}
        >
          <Wallet className='w-6 h-6 mb-1' />
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
