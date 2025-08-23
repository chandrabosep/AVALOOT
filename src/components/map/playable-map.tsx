"use client"
import React, { useMemo, useState, useEffect } from 'react'
import MapComponent from './map'
import FundsDialog from '@/components/wallet/funds-dialog'
import { MapPin, Plus, TrendingUp, Wallet } from 'lucide-react';



export default function PlayableMap() {
    const [currentUser, setCurrentUser] = useState<any>({
        id: "current",
        latitude: 0,
        longitude: 0,
        name: "You",
        avatarUrl: "/game-assets/user.jpg",
      });
    
    const [isFundsDialogOpen, setIsFundsDialogOpen] = useState(false);
    

    const tokens = [{
        id: "1",
        latitude: 17.4424859636273,
        longitude: 78.35865481413879,
        symbol: "USDC",
        name: "USDC",
        logoUrl: "/game-assets/usdc.webp",
        backgroundColor: "#8A2BE2",
      },
     ]

    const handleUserClick = () => {
        console.log("user clicked")
    }
    


    const mapProps = useMemo(
        () => ({
          tokens,
          currentUser,
          onUserClick: handleUserClick,
        }),
        [tokens, currentUser, handleUserClick]
      );
    
  return (
    <div>
      <MapComponent
        {...mapProps}
      />
      <div className='absolute bottom-0 left-0 w-full h-18 bg-black/20 backdrop-blur-md border-t border-white/10 z-10 flex items-center justify-around px-4'>
        <div className='flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity'>
          <MapPin className='w-6 h-6 text-gray-700 mb-1' />
          <span className='text-xs text-gray-700'>Map</span>
        </div>
        <div className='flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity'>
          <Plus className='w-6 h-6 text-gray-700 mb-1' />
          <span className='text-xs text-gray-700'>Stake</span>
        </div>
        <div 
          className='flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity'
          onClick={() => setIsFundsDialogOpen(true)}
        >
          <Wallet className='w-6 h-6 text-gray-700 mb-1' />
          <span className='text-xs text-gray-700'>Funds</span>
        </div>
      </div>
      
      <FundsDialog 
        isOpen={isFundsDialogOpen}
        onClose={() => setIsFundsDialogOpen(false)}
      />
    </div>
  )
}
