import { PublicClient, parseUnits } from 'viem';

/**
 * Estimates gas for a contract function call with fallback
 * @param publicClient - The viem public client
 * @param contractCall - The contract call parameters
 * @param fallbackGas - Fallback gas limit if estimation fails
 * @returns Estimated gas with buffer or fallback gas
 */
export async function estimateGasWithFallback(
  publicClient: PublicClient,
  contractCall: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args: any[];
    account: `0x${string}`;
    value?: bigint;
  },
  fallbackGas: bigint = BigInt(200000)
): Promise<bigint> {
  try {
    const gasEstimate = await publicClient.estimateContractGas(contractCall);
    // Add 10% buffer for safety
    const buffer = gasEstimate / BigInt(10);
    return gasEstimate + buffer;
  } catch (error) {
    console.warn('Gas estimation failed, using fallback:', error);
    return fallbackGas;
  }
}

/**
 * Safely converts a decimal string amount to BigInt wei
 * @param amount - The amount as a decimal string (e.g., "0.01")
 * @param decimals - The number of decimals (default: 18 for ETH/AVAX)
 * @returns BigInt representation in wei
 */
export function safeAmountToBigInt(amount: string, decimals: number = 18): bigint {
  try {
    return parseUnits(amount, decimals);
  } catch (error) {
    console.error('Failed to convert amount to BigInt:', amount, error);
    throw new Error(`Invalid amount format: ${amount}`);
  }
}

/**
 * Formats a balance string for consistent display across the app
 * @param balance - The balance as a decimal string
 * @param maxDecimals - Maximum number of decimal places to show (default: 6)
 * @returns Formatted balance string
 */
export function formatBalance(balance: string, maxDecimals: number = 6): string {
  const num = parseFloat(balance);
  
  if (num === 0) return '0';
  
  // For very small amounts, use exponential notation
  if (num < 0.000001) {
    return num.toExponential(2);
  }
  
  // For small amounts, show more precision
  if (num < 0.001) {
    return num.toFixed(6);
  }
  
  // For normal amounts, show reasonable precision
  if (num < 1) {
    return num.toFixed(4);
  }
  
  // For larger amounts, show fewer decimals
  return num.toFixed(Math.min(maxDecimals, 4));
}

/**
 * Formats a balance for display with symbol
 * @param balance - The balance as a decimal string
 * @param symbol - The token symbol
 * @param maxDecimals - Maximum number of decimal places to show
 * @returns Formatted balance with symbol
 */
export function formatBalanceWithSymbol(balance: string, symbol: string, maxDecimals: number = 6): string {
  return `${formatBalance(balance, maxDecimals)} ${symbol}`;
}

/**
 * Common gas limits for different operations
 */
export const GAS_LIMITS = {
  ERC20_APPROVE: BigInt(60000),
  ERC20_TRANSFER: BigInt(65000),
  NATIVE_TRANSFER: BigInt(21000),
  STAKE_NATIVE: BigInt(200000),
  STAKE_ERC20: BigInt(250000),
  CLAIM_STAKE: BigInt(180000),
  WITHDRAW_REWARDS: BigInt(150000),
} as const;
