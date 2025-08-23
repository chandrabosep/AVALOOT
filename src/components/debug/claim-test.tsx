import React from 'react';
import { Button } from '@/components/ui/button';

export default function ClaimTest() {
  const testLocationAccuracy = () => {
    if (!navigator.geolocation) {
      console.log('❌ Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('📍 Current Location:', {
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          accuracy: `${Math.round(accuracy)}m`,
        });
        
        // Test distance calculation
        const testStakeLat = latitude + 0.001; // ~111m north
        const testStakeLng = longitude;
        
        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371e3;
          const φ1 = lat1 * Math.PI / 180;
          const φ2 = lat2 * Math.PI / 180;
          const Δφ = (lat2 - lat1) * Math.PI / 180;
          const Δλ = (lon2 - lon1) * Math.PI / 180;

          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

          return R * c;
        };

        const distance = calculateDistance(latitude, longitude, testStakeLat, testStakeLng);
        console.log('🎯 Distance to test stake:', `${Math.round(distance)}m`);
        
        if (distance <= 100) {
          console.log('✅ Within claiming range!');
        } else {
          console.log('❌ Too far to claim');
        }
      },
      (error) => {
        console.error('❌ Location error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="font-bold mb-2">🧪 Claim Test Tools</h3>
      <Button onClick={testLocationAccuracy} size="sm">
        Test Location & Distance
      </Button>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
        Check browser console for results
      </p>
    </div>
  );
}
