import { PublicClient } from 'viem';

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
