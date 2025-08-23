import React from 'react';
import { StakeMarker } from '@/hooks/useStakes';

interface StakeMarkerProps {
  stake: StakeMarker;
  onClick?: (stake: StakeMarker) => void;
}

export function createStakeMarker(stake: StakeMarker, onClick?: (stake: StakeMarker) => void): HTMLElement {
  const element = document.createElement('div');
  element.className = 'stake-marker';
  
  // Get status colors
  const getStatusColor = (status: string, isOwn: boolean) => {
    if (isOwn) {
      switch (status) {
        case 'active': return { bg: '#3b82f6', border: '#1d4ed8', text: '#ffffff' }; // Blue for own active
        case 'expired': return { bg: '#f59e0b', border: '#d97706', text: '#ffffff' }; // Orange for own expired
        case 'claimed': return { bg: '#6b7280', border: '#4b5563', text: '#ffffff' }; // Gray for claimed
        case 'refunded': return { bg: '#6b7280', border: '#4b5563', text: '#ffffff' }; // Gray for refunded
        default: return { bg: '#3b82f6', border: '#1d4ed8', text: '#ffffff' };
      }
    } else {
      switch (status) {
        case 'active': return { bg: '#10b981', border: '#059669', text: '#ffffff' }; // Green for claimable
        case 'expired': return { bg: '#ef4444', border: '#dc2626', text: '#ffffff' }; // Red for expired
        case 'claimed': return { bg: '#6b7280', border: '#4b5563', text: '#ffffff' }; // Gray for claimed
        case 'refunded': return { bg: '#6b7280', border: '#4b5563', text: '#ffffff' }; // Gray for refunded
        default: return { bg: '#10b981', border: '#059669', text: '#ffffff' };
      }
    }
  };

  const colors = getStatusColor(stake.status, stake.isOwn);
  
  // Calculate time remaining
  const getTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(stake.expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'EXPIRED';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  };

  const timeRemaining = getTimeRemaining();
  
  element.innerHTML = `
    <div class="stake-marker-container" style="
      position: relative;
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      <!-- Main marker circle -->
      <div style="
        width: 48px;
        height: 48px;
        background: ${colors.bg};
        border: 3px solid ${colors.border};
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
        position: relative;
      " class="stake-marker-circle">
        <!-- Token symbol -->
        <div style="
          color: ${colors.text};
          font-size: 10px;
          font-weight: bold;
          line-height: 1;
          text-align: center;
        ">${stake.symbol}</div>
        <!-- Amount -->
        <div style="
          color: ${colors.text};
          font-size: 8px;
          line-height: 1;
          text-align: center;
          opacity: 0.9;
        ">${parseFloat(stake.amount) > 1000 ? (parseFloat(stake.amount) / 1000).toFixed(1) + 'K' : parseFloat(stake.amount).toFixed(1)}</div>
      </div>
      
      <!-- Status indicator -->
      <div style="
        position: absolute;
        top: -2px;
        right: -2px;
        width: 16px;
        height: 16px;
        background: ${stake.isOwn ? '#3b82f6' : (stake.canClaim ? '#10b981' : '#ef4444')};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        color: white;
        font-weight: bold;
      ">
        ${stake.isOwn ? '👤' : (stake.canClaim ? '💰' : '⏰')}
      </div>
      
      <!-- Time remaining tooltip -->
      <div style="
        position: absolute;
        bottom: -25px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
      " class="stake-marker-tooltip">
        ${timeRemaining === 'EXPIRED' ? 'Expired' : `${timeRemaining} left`}
      </div>
    </div>
  `;

  // Add hover effects
  const markerCircle = element.querySelector('.stake-marker-circle') as HTMLElement;
  const tooltip = element.querySelector('.stake-marker-tooltip') as HTMLElement;
  
  element.addEventListener('mouseenter', () => {
    if (markerCircle) {
      markerCircle.style.transform = 'scale(1.1)';
      markerCircle.style.zIndex = '1000';
    }
    if (tooltip) {
      tooltip.style.opacity = '1';
    }
  });
  
  element.addEventListener('mouseleave', () => {
    if (markerCircle) {
      markerCircle.style.transform = 'scale(1)';
      markerCircle.style.zIndex = 'auto';
    }
    if (tooltip) {
      tooltip.style.opacity = '0';
    }
  });

  // Add click handler
  if (onClick) {
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick(stake);
    });
  }

  return element;
}

// React component version (for reference)
export default function StakeMarkerComponent({ stake, onClick }: StakeMarkerProps) {
  const getStatusColor = (status: string, isOwn: boolean) => {
    if (isOwn) {
      switch (status) {
        case 'active': return 'bg-blue-500 border-blue-700';
        case 'expired': return 'bg-orange-500 border-orange-700';
        case 'claimed': return 'bg-gray-500 border-gray-700';
        case 'refunded': return 'bg-gray-500 border-gray-700';
        default: return 'bg-blue-500 border-blue-700';
      }
    } else {
      switch (status) {
        case 'active': return 'bg-green-500 border-green-700';
        case 'expired': return 'bg-red-500 border-red-700';
        case 'claimed': return 'bg-gray-500 border-gray-700';
        case 'refunded': return 'bg-gray-500 border-gray-700';
        default: return 'bg-green-500 border-green-700';
      }
    }
  };

  return (
    <div 
      className="relative cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
      onClick={() => onClick?.(stake)}
    >
      <div className={`w-12 h-12 ${getStatusColor(stake.status, stake.isOwn)} border-2 rounded-full flex flex-col items-center justify-center shadow-lg hover:scale-110 transition-transform`}>
        <div className="text-white text-xs font-bold">{stake.symbol}</div>
        <div className="text-white text-xs opacity-90">
          {parseFloat(stake.amount) > 1000 ? `${(parseFloat(stake.amount) / 1000).toFixed(1)}K` : parseFloat(stake.amount).toFixed(1)}
        </div>
      </div>
      
      <div className={`absolute -top-1 -right-1 w-4 h-4 ${stake.isOwn ? 'bg-blue-500' : (stake.canClaim ? 'bg-green-500' : 'bg-red-500')} border-2 border-white rounded-full flex items-center justify-center text-xs`}>
        {stake.isOwn ? '👤' : (stake.canClaim ? '💰' : '⏰')}
      </div>
    </div>
  );
}
