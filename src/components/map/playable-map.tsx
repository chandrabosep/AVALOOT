"use client"
import React, { useMemo, useState, useEffect } from 'react'
import MapComponent from './map'



export default function PlayableMap() {
    const [currentUser, setCurrentUser] = useState<any>({
        id: "current",
        latitude: 0,
        longitude: 0,
        name: "You",
        avatarUrl: "/game-assets/user.jpg",
      });
    

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
    <div><MapComponent
        {...mapProps}
      />
    <div className='absolute  top-0 left-0 w-full h-full bg-black/50 z-10'>
        <div className='map-overlay-content'>
            <h1>Hello</h1>
            <p>This is a test overlay</p>
        </div>
    </div>
    </div>
  )
}
