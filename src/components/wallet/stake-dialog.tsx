'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { X, Plus, Coins, AlertCircle, ChevronDown, RefreshCw } from 'lucide-react';
import { createPublicClient, createWalletClient, custom, http, formatEther, parseEther, formatUnits, parseUnits } from 'viem';
import { avalanche } from '@/utlis/network-config';
import { GeoStakeABI } from '@/contracts/abi';
import { stakeOperations, type StakeInsert } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StakeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStakeSuccess?: () => void;
}

interface Token {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  logoUrl?: string;
}

export default function StakeDialog({ isOpen, onClose, onStakeSuccess }: StakeDialogProps) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('24'); // hours
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showAddToken, setShowAddToken] = useState(false);
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'approving' | 'staking' | 'success' | 'error'>('idle');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  // Contract configuration - you'll need to deploy and set the actual contract address
  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GEOSTAKE_CONTRACT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';

  // Create a public client for fetching balances
  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http()
  });

  // Helper function to convert coordinates to contract format (scaled by 1e6)
  const coordinateToContract = (coordinate: number): bigint => {
    return BigInt(Math.round(coordinate * 1_000_000));
  };

  // Helper function to get wallet client for transactions
  const getWalletClient = async () => {
    const wallet = wallets[0];
    if (!wallet) throw new Error('No wallet connected');
    
    const provider = await wallet.getEthereumProvider();
    return createWalletClient({
      account: wallet.address as `0x${string}`,
      chain: avalanche,
      transport: custom(provider)
    });
  };

  // Verified tokens on Avalanche Fuji Testnet
  // For now, we'll primarily use AVAX and add verified testnet tokens as we find them
  const tokenList: Omit<Token, 'balance'>[] = [
    {
      address: '0x0000000000000000000000000000000000000000', // Native AVAX
      symbol: 'AVAX',
      name: 'Avalanche',
    },
    // Note: Adding more testnet tokens requires verification of actual deployed contracts
    // Users can get testnet AVAX from: https://faucet.avax.network/
  ];

  // Validate if address is a valid Ethereum address
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Check if contract exists at address
  const contractExists = async (address: string): Promise<boolean> => {
    try {
      const code = await publicClient.getBytecode({ address: address as `0x${string}` });
      return code !== undefined && code !== '0x';
    } catch {
      return false;
    }
  };

  const fetchTokenBalance = async (tokenAddress: string, walletAddress: string): Promise<string> => {
    try {
      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Native AVAX
        const balance = await publicClient.getBalance({
          address: walletAddress as `0x${string}`
        });
        return formatEther(balance);
      } else {
        // Validate address format
        if (!isValidAddress(tokenAddress)) {
          console.warn(`Invalid token address format: ${tokenAddress}`);
          return '0.0';
        }

        // Check if contract exists
        const exists = await contractExists(tokenAddress);
        if (!exists) {
          console.warn(`No contract found at address: ${tokenAddress}`);
          return '0.0';
        }

        // ERC20 token balance call with better error handling
        try {
          // First, try to get decimals
          let decimals: number;
          try {
            decimals = await publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: [
                {
                  constant: true,
                  inputs: [],
                  name: 'decimals',
                  outputs: [{ name: '', type: 'uint8' }],
                  type: 'function',
                },
              ],
              functionName: 'decimals',
            }) as number;
          } catch (decimalsError) {
            console.warn(`Token at ${tokenAddress} does not implement decimals() function`);
            decimals = 18; // Default to 18 decimals
          }

          // Then try to get balance
          const balance = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: [
              {
                constant: true,
                inputs: [{ name: '_owner', type: 'address' }],
                name: 'balanceOf',
                outputs: [{ name: 'balance', type: 'uint256' }],
                type: 'function',
              },
            ],
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          }) as bigint;

          return formatUnits(balance, decimals);
        } catch (erc20Error) {
          console.warn(`Failed to fetch ERC20 balance for ${tokenAddress}:`, erc20Error);
          return '0.0';
        }
      }
    } catch (error) {
      console.error(`Error fetching token balance for ${tokenAddress}:`, error);
      return '0.0';
    }
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      setCurrentLocation({ latitude, longitude });
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Unable to get your location. Please enable location access.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Fetch token metadata (symbol, name, decimals)
  const fetchTokenInfo = async (tokenAddress: string): Promise<Omit<Token, 'balance'> | null> => {
    try {
      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        return {
          address: tokenAddress,
          symbol: 'AVAX',
          name: 'Avalanche',
        };
      }

      if (!isValidAddress(tokenAddress)) {
        return null;
      }

      const exists = await contractExists(tokenAddress);
      if (!exists) {
        return null;
      }

      // Try to fetch token metadata
      const [symbol, name, decimals] = await Promise.allSettled([
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: [{ constant: true, inputs: [], name: 'symbol', outputs: [{ name: '', type: 'string' }], type: 'function' }],
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: [{ constant: true, inputs: [], name: 'name', outputs: [{ name: '', type: 'string' }], type: 'function' }],
          functionName: 'name',
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: [{ constant: true, inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], type: 'function' }],
          functionName: 'decimals',
        }),
      ]);

      return {
        address: tokenAddress,
        symbol: symbol.status === 'fulfilled' ? (symbol.value as string) : 'UNKNOWN',
        name: name.status === 'fulfilled' ? (name.value as string) : 'Unknown Token',
      };
    } catch (error) {
      console.error('Error fetching token info:', error);
      return null;
    }
  };

  // Check ERC20 allowance
  const checkAllowance = async (tokenAddress: string, walletAddress: string, amount: string): Promise<boolean> => {
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return true; // Native AVAX doesn't need approval
    }

    try {
      const allowance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            constant: true,
            inputs: [
              { name: '_owner', type: 'address' },
              { name: '_spender', type: 'address' }
            ],
            name: 'allowance',
            outputs: [{ name: '', type: 'uint256' }],
            type: 'function',
          },
        ],
        functionName: 'allowance',
        args: [walletAddress as `0x${string}`, CONTRACT_ADDRESS],
      }) as bigint;

      const requiredAmount = parseUnits(amount, 18); // Assume 18 decimals for now
      return allowance >= requiredAmount;
    } catch (error) {
      console.error('Error checking allowance:', error);
      return false;
    }
  };

  // Approve ERC20 token
  const approveToken = async (tokenAddress: string, amount: string): Promise<string> => {
    const walletClient = await getWalletClient();
    const requiredAmount = parseUnits(amount, 18); // Assume 18 decimals for now

    const hash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: [
        {
          constant: false,
          inputs: [
            { name: '_spender', type: 'address' },
            { name: '_value', type: 'uint256' }
          ],
          name: 'approve',
          outputs: [{ name: '', type: 'bool' }],
          type: 'function',
        },
      ],
      functionName: 'approve',
      args: [CONTRACT_ADDRESS, requiredAmount],
    });

    return hash;
  };

  // Extract stake ID from transaction receipt
  const extractStakeIdFromReceipt = (receipt: any): number | null => {
    try {
      // Look for the Staked event in the logs
      const stakedEvent = receipt.logs.find((log: any) => {
        // Check if this log is from our contract and has the right number of topics
        return log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() && 
               log.topics.length >= 4; // Staked event has 4 indexed parameters
      });

      if (stakedEvent) {
        // The stake ID is the first indexed parameter (topic[1])
        // Convert from hex to number
        const stakeIdHex = stakedEvent.topics[1];
        const stakeId = parseInt(stakeIdHex, 16);
        return stakeId;
      }

      return null;
    } catch (error) {
      console.error('Error extracting stake ID from receipt:', error);
      return null;
    }
  };

  // Save stake data to Supabase
  const saveStakeToDatabase = async (
    stakeId: number,
    transactionHash: string,
    tokenAddress: string,
    tokenSymbol: string,
    amount: string,
    durationHours: number,
    latitude: number,
    longitude: number
  ) => {
    try {
      const wallet = wallets[0];
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationHours * 3600 * 1000);

      const stakeData: StakeInsert = {
        stake_id: stakeId,
        transaction_hash: transactionHash,
        staker_address: wallet.address.toLowerCase(),
        token_address: tokenAddress.toLowerCase(),
        token_symbol: tokenSymbol,
        amount: amount,
        latitude: latitude,
        longitude: longitude,
        duration_hours: durationHours,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        network: 'avalanche-fuji',
        contract_address: CONTRACT_ADDRESS.toLowerCase()
      };

      const savedStake = await stakeOperations.insertStake(stakeData);
      if (savedStake) {
        console.log('Stake saved to database:', savedStake);
        return savedStake;
      } else {
        console.error('Failed to save stake to database');
        return null;
      }
    } catch (error) {
      console.error('Error saving stake to database:', error);
      return null;
    }
  };

  const addCustomToken = async () => {
    if (!customTokenAddress.trim()) return;

    setLoading(true);
    try {
      const tokenInfo = await fetchTokenInfo(customTokenAddress.trim());
      if (tokenInfo) {
        const wallet = wallets[0];
        const balance = await fetchTokenBalance(tokenInfo.address, wallet.address);
        
        const newToken: Token = { ...tokenInfo, balance };
        
        // Add to available tokens if not already present
        setAvailableTokens(prev => {
          const exists = prev.some(token => token.address.toLowerCase() === newToken.address.toLowerCase());
          if (exists) return prev;
          return [...prev, newToken];
        });
        
        setCustomTokenAddress('');
        setShowAddToken(false);
      } else {
        alert('Invalid token address or contract does not exist');
      }
    } catch (error) {
      console.error('Error adding custom token:', error);
      alert('Failed to add token. Please check the address.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTokens = async () => {
    if (wallets.length === 0 || isClosing) return;
    
    setLoading(true);
    
    try {
      // Get the first wallet for now
      const wallet = wallets[0];
      
      // Fetch all token balances in parallel for better performance
      const balancePromises = tokenList.map(async (tokenInfo) => {
        const balance = await fetchTokenBalance(tokenInfo.address, wallet.address);
        return {
          ...tokenInfo,
          balance
        };
      });
      
      const tokensWithBalances = await Promise.all(balancePromises);
      
      // Show all tokens, but prioritize ones with balance > 0
      const tokensWithBalance = tokensWithBalances.filter(token => parseFloat(token.balance) > 0);
      const tokensWithoutBalance = tokensWithBalances.filter(token => parseFloat(token.balance) === 0);
      
      // Put tokens with balance first, then tokens without balance
      const sortedTokens = [...tokensWithBalance, ...tokensWithoutBalance];
      
      setAvailableTokens(sortedTokens);
      
      // Auto-select first token with balance, or first token if none have balance
      if (sortedTokens.length > 0 && !selectedToken) {
        const firstTokenWithBalance = tokensWithBalance.length > 0 ? tokensWithBalance[0] : sortedTokens[0];
        setSelectedToken(firstTokenWithBalance);
      }
    } catch (error) {
      console.error('Error fetching available tokens:', error);
    } finally {
      if (!isClosing) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen && wallets.length > 0) {
      setIsClosing(false);
      fetchAvailableTokens();
      getCurrentLocation();
    }
  }, [isOpen, wallets]);

  // Cleanup when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
      setLoading(false);
      setAmount('');
      setDuration('24');
      setShowTokenDropdown(false);
      setCurrentLocation(null);
      setLocationLoading(false);
      setLocationError(null);
      setShowAddToken(false);
      setCustomTokenAddress('');
      setTransactionStatus('idle');
      setTransactionHash(null);
      setTransactionError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    onClose();
  };

  const handleStake = async () => {
    if (!selectedToken || !amount || !currentLocation) return;
    
    // Validate contract address is set
    if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setTransactionError('Contract address not configured. Please set NEXT_PUBLIC_GEOSTAKE_CONTRACT_ADDRESS in your environment variables.');
      setTransactionStatus('error');
      return;
    }

    setTransactionStatus('idle');
    setTransactionError(null);
    setTransactionHash(null);

    try {
      const wallet = wallets[0];
      const walletClient = await getWalletClient();
      
      // Convert parameters for contract call
      const tokenAddress = selectedToken.address as `0x${string}`;
      const stakeAmount = parseUnits(amount, 18); // Assume 18 decimals for now
      const stakeDuration = BigInt(parseInt(duration) * 3600); // Convert hours to seconds
      const latitude = coordinateToContract(currentLocation.latitude);
      const longitude = coordinateToContract(currentLocation.longitude);

      // Step 1: Check if token needs approval (only for ERC20 tokens)
      if (tokenAddress !== '0x0000000000000000000000000000000000000000') {
        const needsApproval = !(await checkAllowance(tokenAddress, wallet.address, amount));
        
        if (needsApproval) {
          setTransactionStatus('approving');
          console.log('Approving ERC20 token...');
          
          const approvalHash = await approveToken(tokenAddress, amount);
          setTransactionHash(approvalHash);
          
          // Wait for approval transaction to be mined
          await publicClient.waitForTransactionReceipt({ hash: approvalHash as `0x${string}` });
          console.log('Token approved!');
        }
      } else {
        console.log('Native AVAX staking - no approval needed');
      }

      // Step 2: Execute stake transaction
      setTransactionStatus('staking');
      console.log('Staking tokens...');

      let stakeHash: string;

      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Native AVAX staking - send value with the transaction
        stakeHash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: GeoStakeABI,
          functionName: 'stake',
          args: [tokenAddress, stakeAmount, latitude, longitude, stakeDuration],
          value: stakeAmount, // Send AVAX value
        });
      } else {
        // ERC20 token staking
        stakeHash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: GeoStakeABI,
          functionName: 'stake',
          args: [tokenAddress, stakeAmount, latitude, longitude, stakeDuration],
        });
      }

      setTransactionHash(stakeHash);
      console.log('Stake transaction submitted:', stakeHash);

      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash: stakeHash as `0x${string}` });
      console.log('Stake transaction confirmed!', receipt);

      // Extract stake ID from transaction receipt
      const stakeId = extractStakeIdFromReceipt(receipt);
      if (stakeId !== null) {
        console.log('Extracted stake ID:', stakeId);
        
        // Save stake data to Supabase
        await saveStakeToDatabase(
          stakeId,
          stakeHash,
          tokenAddress,
          selectedToken.symbol,
          amount,
          parseInt(duration),
          currentLocation.latitude,
          currentLocation.longitude
        );
      } else {
        console.warn('Could not extract stake ID from transaction receipt');
      }

      setTransactionStatus('success');
      
      // Refresh token balances
      await fetchAvailableTokens();
      
      // Notify parent component of successful stake
      if (onStakeSuccess) {
        onStakeSuccess();
      }
      
      // Close dialog after a short delay
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error: any) {
      console.error('Staking failed:', error);
      setTransactionStatus('error');
      setTransactionError(error.message || 'Staking transaction failed');
    }
  };

  const isValidAmount = () => {
    if (!amount || !selectedToken) return false;
    const amountNum = parseFloat(amount);
    const balanceNum = parseFloat(selectedToken.balance);
    return amountNum > 0 && amountNum <= balanceNum;
  };

  const setMaxAmount = () => {
    if (selectedToken) {
      setAmount(selectedToken.balance);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 border border-black/75 text-white max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 rounded-xl border border-red-400/40">
              <Plus className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">Stake Tokens</DialogTitle>
              <p className="text-sm text-gray-400">
                {locationLoading 
                  ? 'Getting your location...'
                  : currentLocation 
                    ? `Stake at (${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)})`
                    : locationError 
                      ? 'Location unavailable'
                      : 'Location required'
                }
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-6">
          {wallets.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Wallet Connected</h3>
              <p className="text-gray-400">Connect a wallet to start staking tokens.</p>
            </div>
          ) : locationError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Location Access Required</h3>
              <p className="text-gray-400 mb-4">{locationError}</p>
              <button
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {locationLoading ? 'Getting Location...' : 'Try Again'}
              </button>
            </div>
          ) : locationLoading || !currentLocation ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-white mb-2">Getting Your Location</h3>
              <p className="text-gray-400">Please allow location access to continue.</p>
            </div>
          ) : (
            <>
              {/* Token Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">Select Token</label>
                  <button
                    onClick={fetchAvailableTokens}
                    disabled={loading}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh token balances"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                    className="w-full flex items-center justify-between p-3 border border-black/75 rounded-xl bg-black/50 hover:bg-black/70 transition-colors"
                    disabled={loading || availableTokens.length === 0}
                  >
                    {selectedToken ? (
                      <div className="flex items-center gap-3">
                        {selectedToken.logoUrl ? (
                          <img src={selectedToken.logoUrl} alt={selectedToken.symbol} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center border border-red-400/40">
                            <span className="text-xs font-bold text-red-400">{selectedToken.symbol.charAt(0)}</span>
                          </div>
                        )}
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-white">{selectedToken.symbol}</span>
                          <span className="text-xs text-gray-400">
                            Balance: {parseFloat(selectedToken.balance) > 0.001 
                              ? parseFloat(selectedToken.balance).toFixed(4)
                              : parseFloat(selectedToken.balance) === 0 
                                ? '0'
                                : parseFloat(selectedToken.balance).toExponential(2)
                            }
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Coins className="w-6 h-6 text-gray-400" />
                        <span className="text-sm text-gray-400">
                          {loading ? 'Loading tokens...' : 'Select a token'}
                        </span>
                      </div>
                    )}
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {showTokenDropdown && availableTokens.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 border border-black/75 rounded-xl bg-black/75 backdrop-blur-sm z-10 max-h-48 overflow-y-auto">
                      {availableTokens.map((token) => {
                        const hasBalance = parseFloat(token.balance) > 0;
                        return (
                          <button
                            key={token.address}
                            onClick={() => {
                              setSelectedToken(token);
                              setShowTokenDropdown(false);
                            }}
                            disabled={!hasBalance}
                            className={`w-full flex items-center gap-3 p-3 transition-colors text-left ${
                              hasBalance 
                                ? 'hover:bg-black/50' 
                                : 'opacity-50 cursor-not-allowed bg-black/25'
                            }`}
                          >
                            <div className="relative">
                              {token.logoUrl ? (
                                <img src={token.logoUrl} alt={token.symbol} className="w-6 h-6 rounded-full" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center border border-red-400/40">
                                  <span className="text-xs font-bold text-red-400">{token.symbol.charAt(0)}</span>
                                </div>
                              )}
                              {!hasBalance && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-black/75 rounded-full flex items-center justify-center">
                                  <span className="text-[8px] text-white">0</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${hasBalance ? 'text-white' : 'text-gray-400'}`}>
                                  {token.symbol}
                                </span>
                                {hasBalance && (
                                  <span className="text-xs text-green-400 font-medium">
                                    {parseFloat(token.balance) > 0.001 
                                      ? parseFloat(token.balance).toFixed(4)
                                      : parseFloat(token.balance).toExponential(2)
                                    }
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">{token.name}</span>
                                {!hasBalance && (
                                  <span className="text-xs text-gray-500">No balance</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Add Custom Token */}
                <div className="mt-2">
                  {!showAddToken ? (
                    <button
                      onClick={() => setShowAddToken(true)}
                      className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2"
                    >
                      + Add custom token
                    </button>
                  ) : (
                    <div className="space-y-2 p-3 border border-black/75 rounded-xl bg-black/50">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-white">Token Contract Address</label>
                        <button
                          onClick={() => {
                            setShowAddToken(false);
                            setCustomTokenAddress('');
                          }}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customTokenAddress}
                          onChange={(e) => setCustomTokenAddress(e.target.value)}
                          placeholder="0x..."
                          className="flex-1 px-2 py-1 text-xs border border-black/75 rounded-lg bg-black/50 text-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                          disabled={loading}
                        />
                        <button
                          onClick={addCustomToken}
                          disabled={loading || !customTokenAddress.trim()}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">
                        Enter a valid ERC20 token contract address on Fuji testnet
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">Amount</label>
                  {selectedToken && (
                    <button
                      onClick={setMaxAmount}
                      className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2"
                    >
                      Max: {selectedToken.balance}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full p-3 border border-black/75 rounded-xl bg-black/50 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    disabled={loading || !selectedToken}
                    step="0.000001"
                    min="0"
                  />
                  {selectedToken && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-sm text-gray-400">{selectedToken.symbol}</span>
                    </div>
                  )}
                </div>
                {amount && !isValidAmount() && (
                  <p className="text-xs text-red-400">
                    {parseFloat(amount) > parseFloat(selectedToken?.balance || '0') 
                      ? 'Insufficient balance' 
                      : 'Please enter a valid amount'}
                  </p>
                )}
              </div>

              {/* Duration Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Stake Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {['1', '24', '168'].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => setDuration(hours)}
                      className={`p-3 text-sm font-medium rounded-xl border transition-colors ${
                        duration === hours
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-black/50 text-gray-300 border-black/75 hover:bg-black/70'
                      }`}
                      disabled={loading}
                    >
                      {hours === '1' ? '1 Hour' : hours === '24' ? '1 Day' : '1 Week'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="flex-1 p-2 text-sm border border-black/75 rounded-lg bg-black/50 text-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    placeholder="Custom hours"
                    min="1"
                    max="8760"
                    disabled={loading}
                  />
                  <span className="text-xs text-gray-400">hours</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-black/75 pt-6 space-y-3">
          {/* Success Message with Stake Info */}
          {transactionStatus === 'success' && (
            <div className="p-4 bg-green-900/30 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">✓</span>
                </div>
                <span className="font-medium">Stake Created Successfully!</span>
              </div>
              <div className="text-sm text-green-300 space-y-1">
                <p><strong>Amount:</strong> {amount} {selectedToken?.symbol}</p>
                <p><strong>Duration:</strong> {duration} hours ({parseInt(duration) >= 24 ? `${(parseInt(duration) / 24).toFixed(1)} days` : `${duration} hours`})</p>
                <p><strong>Expires:</strong> {new Date(Date.now() + parseInt(duration) * 3600 * 1000).toLocaleString()}</p>
                <p className="mt-2 font-medium">📋 <strong>Claim Period:</strong></p>
                <p className="text-xs">• Others can claim this stake until it expires</p>
                <p className="text-xs">• After expiry, you can refund if unclaimed</p>
              </div>
            </div>
          )}

          {/* Transaction Status */}
          {(transactionStatus === 'approving' || transactionStatus === 'staking' || transactionStatus === 'error') && (
            <div className="space-y-2">
              {transactionStatus === 'approving' && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  Approving token spending...
                </div>
              )}
              {transactionStatus === 'staking' && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  Submitting stake transaction...
                </div>
              )}

              {transactionStatus === 'error' && transactionError && (
                <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400 font-medium">Transaction Failed</p>
                  <p className="text-xs text-red-300 mt-1">{transactionError}</p>
                </div>
              )}
              {transactionHash && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>Transaction:</span>
                  <a
                    href={`https://testnet.snowtrace.io/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 hover:underline font-mono break-all"
                  >
                    {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                  </a>
                </div>
              )}
            </div>
          )}

          {wallets.length > 0 && currentLocation && (
            <button
              onClick={handleStake}
              disabled={transactionStatus === 'approving' || transactionStatus === 'staking' || !selectedToken || !isValidAmount()}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:text-gray-400 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {transactionStatus === 'approving' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Approving Token...
                </>
              ) : transactionStatus === 'staking' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Staking...
                </>
              ) : transactionStatus === 'success' ? (
                <>
                  <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white">✓</span>
                  </div>
                  Success!
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Stake {amount || '0'} {selectedToken?.symbol || 'Tokens'}
                </>
              )}
            </button>
          )}
          <button
            onClick={handleClose}
            className="w-full bg-red-500/50 hover:bg-red-500/50 disabled:bg-red-500/50 disabled:text-gray-400 text-white font-medium py-3 px-4 rounded-xl transition-colors"
            disabled={transactionStatus === 'approving' || transactionStatus === 'staking'}
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
