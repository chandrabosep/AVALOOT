"use client";

import mapboxgl from "mapbox-gl";
import { useRef, useEffect } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { createTokenMarker, createUserMarker } from "@/utlis/markers";
import { createStakeMarker } from "./stake-marker";
import type { StakeMarker } from "@/hooks/useStakes";


interface MapComponentProps {
  tokens: any[];
  currentUser: any;
  stakeMarkers?: StakeMarker[];
  onUserClick?: (user: any) => void;
  onStakeClick?: (stake: StakeMarker) => void;
}

export default function MapComponent({
  tokens,
  currentUser,
  stakeMarkers = [],
  onUserClick,
  onStakeClick,
}: MapComponentProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const currentUserMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const tokenMarkers = useRef<mapboxgl.Marker[]>([]);
  const stakeMarkersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
      console.error("Mapbox token is required");
      return;
    }

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current!,
        zoom: 18,
        pitch: 60,
        bearing: 0,
        attributionControl: false,
        projection: "globe",
        logoPosition: "top-left",
      });

      const currentUserElement = createUserMarker(currentUser);
      if (onUserClick) {
        currentUserElement.addEventListener("click", () =>
          onUserClick(currentUser)
        );
      }

      currentUserMarkerRef.current = new mapboxgl.Marker({
        element: currentUserElement,
        anchor: "center",
      });

      tokens?.forEach((token) => {
        const tokenElement = createTokenMarker(token);
        if (onUserClick) {
          tokenElement.addEventListener("click", () => onUserClick(token));
        }

        tokenMarkers.current.push(new mapboxgl.Marker({
          element: tokenElement,
          anchor: "center",
        }));
      });

      tokens.forEach((token) => {
        const marker = new mapboxgl.Marker({
          element: createTokenMarker(token),
          anchor: "center",
        })
          .setLngLat([token.longitude, token.latitude])
          .addTo(mapRef.current!);

        tokenMarkers.current.push(marker);
      });

      // Create user markers with click handlers
      tokens.forEach((token) => {
        const userElement = createUserMarker(token);
        if (onUserClick) {
          userElement.addEventListener("click", () => onUserClick(token));
        }
      });
      

    }



    // Get and watch current user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation: [number, number] = [longitude, latitude];

          mapRef.current?.flyTo({
            center: newLocation,
            zoom: 16,
            essential: true,
          });

          currentUserMarkerRef.current
            ?.setLngLat(newLocation)
            .addTo(mapRef.current!);
        },
        (error) => console.error("Error getting location:", error)
      );

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation: [number, number] = [longitude, latitude];

          if (currentUserMarkerRef.current) {
            currentUserMarkerRef.current.setLngLat(newLocation);
          }

          mapRef.current?.easeTo({
            center: newLocation,
            duration: 1000,
          });
        },
        (error) => console.error("Error watching position:", error),
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 5000,
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        currentUserMarkerRef.current?.remove();
      };
    }
    }, [ tokens, currentUser, onUserClick]);

  // Update stake markers when stakeMarkers prop changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing stake markers
    stakeMarkersRef.current.forEach(marker => marker.remove());
    stakeMarkersRef.current = [];

    // Add new stake markers
    stakeMarkers.forEach((stake) => {
      const stakeElement = createStakeMarker(stake, onStakeClick);
      
      const marker = new mapboxgl.Marker({
        element: stakeElement,
        anchor: "center",
      })
        .setLngLat([stake.longitude, stake.latitude])
        .addTo(mapRef.current!);

      stakeMarkersRef.current.push(marker);
    });
  }, [stakeMarkers, onStakeClick]);

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <style jsx global>{`
        .mapboxgl-control-container {
          display: none !important;
        }
        .mapboxgl-canvas {
          cursor: default !important;
        }
      `}</style>
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
    </main>
  );
}