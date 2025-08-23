'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { X, Plus, Coins, AlertCircle, ChevronDown, RefreshCw } from 'lucide-react';
import { createPublicClient, http, formatEther, parseEther, formatUnits } from 'viem';
import { avalanche } from '@/utlis/network-config';

interface StakeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Token {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  logoUrl?: string;
}

export default function StakeDialog({ isOpen, onClose }: StakeDialogProps) {
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

  // Create a public client for fetching balances
  const publicClient = createPublicClient({
    chain: avalanche,
    transport: http()
  });

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
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    onClose();
  };

  const handleStake = async () => {
    if (!selectedToken || !amount || !currentLocation) return;
    
    setLoading(true);
    try {
      // Here you would implement the actual staking logic
      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Staking:', {
        token: selectedToken.address,
        amount,
        duration: parseInt(duration) * 3600, // convert hours to seconds
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      });
      
      // Close dialog after successful stake
      handleClose();
    } catch (error) {
      console.error('Staking failed:', error);
    } finally {
      setLoading(false);
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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Stake Tokens</h2>
              <p className="text-sm text-muted-foreground">
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
          <button
            onClick={handleClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {wallets.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Wallet Connected</h3>
              <p className="text-muted-foreground">Connect a wallet to start staking tokens.</p>
            </div>
          ) : locationError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Location Access Required</h3>
              <p className="text-muted-foreground mb-4">{locationError}</p>
              <button
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {locationLoading ? 'Getting Location...' : 'Try Again'}
              </button>
            </div>
          ) : locationLoading || !currentLocation ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-foreground mb-2">Getting Your Location</h3>
              <p className="text-muted-foreground">Please allow location access to continue.</p>
            </div>
          ) : (
            <>
              {/* Token Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Select Token</label>
                  <button
                    onClick={fetchAvailableTokens}
                    disabled={loading}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh token balances"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                    className="w-full flex items-center justify-between p-3 border border-border rounded-xl bg-background hover:bg-accent transition-colors"
                    disabled={loading || availableTokens.length === 0}
                  >
                    {selectedToken ? (
                      <div className="flex items-center gap-3">
                        {selectedToken.logoUrl ? (
                          <img src={selectedToken.logoUrl} alt={selectedToken.symbol} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">{selectedToken.symbol.charAt(0)}</span>
                          </div>
                        )}
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-foreground">{selectedToken.symbol}</span>
                          <span className="text-xs text-muted-foreground">
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
                        <Coins className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {loading ? 'Loading tokens...' : 'Select a token'}
                        </span>
                      </div>
                    )}
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                  
                  {showTokenDropdown && availableTokens.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 border border-border rounded-xl bg-background shadow-lg z-10 max-h-48 overflow-y-auto">
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
                                ? 'hover:bg-accent' 
                                : 'opacity-50 cursor-not-allowed bg-muted/20'
                            }`}
                          >
                            <div className="relative">
                              {token.logoUrl ? (
                                <img src={token.logoUrl} alt={token.symbol} className="w-6 h-6 rounded-full" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-xs font-bold text-primary">{token.symbol.charAt(0)}</span>
                                </div>
                              )}
                              {!hasBalance && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-muted-foreground rounded-full flex items-center justify-center">
                                  <span className="text-[8px] text-background">0</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${hasBalance ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {token.symbol}
                                </span>
                                {hasBalance && (
                                  <span className="text-xs text-green-600 font-medium">
                                    {parseFloat(token.balance) > 0.001 
                                      ? parseFloat(token.balance).toFixed(4)
                                      : parseFloat(token.balance).toExponential(2)
                                    }
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{token.name}</span>
                                {!hasBalance && (
                                  <span className="text-xs text-muted-foreground">No balance</span>
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
                      className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
                    >
                      + Add custom token
                    </button>
                  ) : (
                    <div className="space-y-2 p-3 border border-border rounded-xl bg-muted/20">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-foreground">Token Contract Address</label>
                        <button
                          onClick={() => {
                            setShowAddToken(false);
                            setCustomTokenAddress('');
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
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
                          className="flex-1 px-2 py-1 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                          disabled={loading}
                        />
                        <button
                          onClick={addCustomToken}
                          disabled={loading || !customTokenAddress.trim()}
                          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter a valid ERC20 token contract address on Fuji testnet
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Amount</label>
                  {selectedToken && (
                    <button
                      onClick={setMaxAmount}
                      className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
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
                    className="w-full p-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={loading || !selectedToken}
                    step="0.000001"
                    min="0"
                  />
                  {selectedToken && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-sm text-muted-foreground">{selectedToken.symbol}</span>
                    </div>
                  )}
                </div>
                {amount && !isValidAmount() && (
                  <p className="text-xs text-red-500">
                    {parseFloat(amount) > parseFloat(selectedToken?.balance || '0') 
                      ? 'Insufficient balance' 
                      : 'Please enter a valid amount'}
                  </p>
                )}
              </div>

              {/* Duration Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Stake Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {['1', '24', '168'].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => setDuration(hours)}
                      className={`p-3 text-sm font-medium rounded-xl border transition-colors ${
                        duration === hours
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:bg-accent'
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
                    className="flex-1 p-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary"
                    placeholder="Custom hours"
                    min="1"
                    max="8760"
                    disabled={loading}
                  />
                  <span className="text-xs text-muted-foreground">hours</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 space-y-3">
          {wallets.length > 0 && currentLocation && (
            <button
              onClick={handleStake}
              disabled={loading || !selectedToken || !isValidAmount()}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Staking...
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
            className="w-full bg-muted hover:bg-muted/80 text-muted-foreground font-medium py-3 px-4 rounded-xl transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
