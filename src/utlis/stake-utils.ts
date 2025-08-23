/**
 * Utility functions for stake calculations and formatting
 */

export interface StakeTimingInfo {
  createdAt: Date;
  expiresAt: Date;
  timeRemaining: string;
  isExpired: boolean;
  canClaim: boolean;
  canRefund: boolean;
  status: 'Active' | 'Expired' | 'Claimed';
  statusColor: string;
}

/**
 * Calculate stake timing information
 */
export function calculateStakeTimingInfo(
  createdTimestamp: bigint,
  durationSeconds: bigint,
  isClaimed: boolean,
  isOriginalStaker: boolean = false
): StakeTimingInfo {
  const createdAt = new Date(Number(createdTimestamp) * 1000);
  const expiresAt = new Date(Number(createdTimestamp + durationSeconds) * 1000);
  const now = new Date();
  
  const isExpired = now >= expiresAt;
  const timeRemaining = isExpired ? 'EXPIRED' : formatTimeRemaining(expiresAt.getTime() - now.getTime());
  
  let status: 'Active' | 'Expired' | 'Claimed' = 'Active';
  let statusColor = 'text-green-600';
  let canClaim = false;
  let canRefund = false;
  
  if (isClaimed) {
    status = 'Claimed';
    statusColor = 'text-gray-500';
  } else if (isExpired) {
    status = 'Expired';
    statusColor = 'text-orange-600';
    canRefund = isOriginalStaker;
  } else {
    status = 'Active';
    statusColor = 'text-green-600';
    canClaim = !isOriginalStaker;
  }
  
  return {
    createdAt,
    expiresAt,
    timeRemaining,
    isExpired,
    canClaim,
    canRefund,
    status,
    statusColor
  };
}

/**
 * Format time remaining in a human-readable format
 */
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return 'EXPIRED';
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Calculate when a stake will expire based on creation time and duration
 */
export function calculateExpirationTime(createdAt: Date, durationHours: number): Date {
  return new Date(createdAt.getTime() + durationHours * 3600 * 1000);
}

/**
 * Format coordinates from contract format (scaled by 1e6) to readable format
 */
export function formatCoordinate(coordinate: bigint): string {
  return (Number(coordinate) / 1_000_000).toFixed(6);
}

/**
 * Format token amount from wei to readable format
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  
  if (fraction === 0n) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmedFraction = fractionStr.replace(/0+$/, '');
  
  return `${whole}.${trimmedFraction}`;
}

/**
 * Get claim period explanation based on stake status
 */
export function getClaimPeriodExplanation(timingInfo: StakeTimingInfo): string {
  if (timingInfo.status === 'Claimed') {
    return 'This stake has been claimed or refunded and is no longer available.';
  } else if (timingInfo.status === 'Expired') {
    return 'This stake has expired. Only the original staker can now refund the tokens.';
  } else {
    return `This stake is active for ${timingInfo.timeRemaining}. Anyone except the original staker can claim it during this period.`;
  }
}
