import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface StakeRecord {
  id?: number
  stake_id: number
  transaction_hash: string
  staker_address: string
  token_address: string
  token_symbol: string
  amount: string
  latitude: number
  longitude: number
  duration_hours: number
  created_at: string
  expires_at: string
  claimed: boolean
  claimed_by?: string
  claimed_at?: string
  claimer_amount?: string
  staker_reward?: string
  refunded: boolean
  refunded_at?: string
  network: string
  contract_address: string
}

export interface StakerRewardRecord {
  id?: number
  staker_address: string
  token_address: string
  token_symbol: string
  total_earned: string
  total_withdrawn: string
  available_balance: string
  network: string
  contract_address: string
  created_at: string
  updated_at: string
}

export interface StakeInsert {
  stake_id: number
  transaction_hash: string
  staker_address: string
  token_address: string
  token_symbol: string
  amount: string
  latitude: number
  longitude: number
  duration_hours: number
  created_at: string
  expires_at: string
  network: string
  contract_address: string
}

// Stake operations
export const stakeOperations = {
  // Insert new stake
  async insertStake(stake: StakeInsert): Promise<StakeRecord | null> {
    try {
      const { data, error } = await supabase
        .from('stakes')
        .insert(stake)
        .select()
        .single()

      if (error) {
        console.error('Error inserting stake:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error inserting stake:', error)
      return null
    }
  },

  // Get stakes by staker address
  async getStakesByStaker(stakerAddress: string): Promise<StakeRecord[]> {
    try {
      const { data, error } = await supabase
        .from('stakes')
        .select('*')
        .eq('staker_address', stakerAddress)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching stakes:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching stakes:', error)
      return []
    }
  },

  // Get all active stakes (not claimed or refunded)
  async getActiveStakes(): Promise<StakeRecord[]> {
    try {
      const { data, error } = await supabase
        .from('stakes')
        .select('*')
        .eq('claimed', false)
        .eq('refunded', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching active stakes:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching active stakes:', error)
      return []
    }
  },

  // Get all stakes (including claimed and refunded) - useful for showing complete history
  async getAllStakes(): Promise<StakeRecord[]> {
    try {
      const { data, error } = await supabase
        .from('stakes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all stakes:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching all stakes:', error)
      return []
    }
  },

  // Get stakes that the user has claimed (where they were the claimer)
  async getStakesClaimed(claimerAddress: string): Promise<StakeRecord[]> {
    try {
      console.log('Fetching claimed stakes for claimer:', claimerAddress);
      
      // First, let's check what claimed stakes exist in the database
      const { data: allClaimedStakes, error: allError } = await supabase
        .from('stakes')
        .select('*')
        .eq('claimed', true)

      console.log('All claimed stakes in database:', allClaimedStakes);

      // Now try different case variations of the address
      const addressVariations = [
        claimerAddress,
        claimerAddress.toLowerCase(),
        claimerAddress.toUpperCase()
      ];

      console.log('Trying address variations:', addressVariations);

      for (const addr of addressVariations) {
        const { data, error } = await supabase
          .from('stakes')
          .select('*')
          .eq('claimed_by', addr)
          .eq('claimed', true)
          .order('claimed_at', { ascending: false })

        console.log(`Query result for address ${addr}:`, { data, error, count: data?.length || 0 });

        if (data && data.length > 0) {
          return data;
        }
      }

      // If no exact matches, try using ILIKE for case-insensitive search
      const { data, error } = await supabase
        .from('stakes')
        .select('*')
        .ilike('claimed_by', claimerAddress)
        .eq('claimed', true)
        .order('claimed_at', { ascending: false })

      console.log('ILIKE query result:', { data, error, count: data?.length || 0 });

      if (error) {
        console.error('Error fetching claimed stakes:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching claimed stakes:', error)
      return []
    }
  },

  // Get stakes in a geographic area
  async getStakesInArea(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number
  ): Promise<StakeRecord[]> {
    try {
      const { data, error } = await supabase
        .from('stakes')
        .select('*')
        .gte('latitude', minLat)
        .lte('latitude', maxLat)
        .gte('longitude', minLng)
        .lte('longitude', maxLng)
        .eq('claimed', false)
        .eq('refunded', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching stakes in area:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching stakes in area:', error)
      return []
    }
  },

  // Update stake as claimed with reward amounts
  async markAsClaimed(
    stakeId: number, 
    claimerAddress: string, 
    claimerAmount: string, 
    stakerReward: string
  ): Promise<boolean> {
    try {
      console.log('Marking stake as claimed:', {
        stakeId,
        claimerAddress,
        claimerAmount,
        stakerReward
      });

      const { data, error } = await supabase
        .from('stakes')
        .update({
          claimed: true,
          claimed_by: claimerAddress.toLowerCase(), // Ensure lowercase for consistency
          claimed_at: new Date().toISOString(),
          claimer_amount: claimerAmount,
          staker_reward: stakerReward
        })
        .eq('stake_id', stakeId)
        .select()

      console.log('markAsClaimed result:', { data, error });

      if (error) {
        console.error('Error marking stake as claimed:', error)
        return false
      }

      // Verify the update worked
      if (data && data.length > 0) {
        console.log('Successfully updated stake:', data[0]);
      } else {
        console.warn('No rows were updated - stake might not exist');
      }

      return true
    } catch (error) {
      console.error('Error marking stake as claimed:', error)
      return false
    }
  },

  // Update stake as refunded
  async markAsRefunded(stakeId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('stakes')
        .update({
          refunded: true,
          refunded_at: new Date().toISOString()
        })
        .eq('stake_id', stakeId)

      if (error) {
        console.error('Error marking stake as refunded:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error marking stake as refunded:', error)
      return false
    }
  },

  // Get stake by transaction hash
  async getStakeByTxHash(txHash: string): Promise<StakeRecord | null> {
    try {
      const { data, error } = await supabase
        .from('stakes')
        .select('*')
        .eq('transaction_hash', txHash)
        .single()

      if (error) {
        console.error('Error fetching stake by tx hash:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching stake by tx hash:', error)
      return null
    }
  },

  // Debug function to check all stakes with claim status
  async debugAllStakes(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('stakes')
        .select('stake_id, staker_address, claimed, claimed_by, claimed_at, claimer_amount, token_symbol, amount')
        .order('created_at', { ascending: false })
        .limit(10)

      console.log('=== DEBUG: Recent Stakes ===');
      console.log('Total stakes found:', data?.length || 0);
      
      if (data) {
        data.forEach(stake => {
          console.log(`Stake #${stake.stake_id}:`, {
            staker: stake.staker_address,
            claimed: stake.claimed,
            claimed_by: stake.claimed_by,
            claimed_at: stake.claimed_at,
            amount: `${stake.amount} ${stake.token_symbol}`
          });
        });
      }

      if (error) {
        console.error('Debug query error:', error);
      }
    } catch (error) {
      console.error('Error in debug function:', error);
    }
  }
}

// Staker rewards operations
export const stakerRewardOperations = {
  // Get staker rewards by address
  async getStakerRewards(stakerAddress: string, network: string = 'avalanche-fuji'): Promise<StakerRewardRecord[]> {
    try {
      console.log('Querying staker rewards for:', { stakerAddress, network });
      
      const { data, error } = await supabase
        .from('staker_rewards')
        .select('*')
        .ilike('staker_address', stakerAddress) // Use case-insensitive matching
        .eq('network', network)
        .order('updated_at', { ascending: false })

      console.log('Database query result:', { data, error });

      if (error) {
        console.error('Error fetching staker rewards:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching staker rewards:', error)
      return []
    }
  },

  // Update staker reward (called when a stake is claimed)
  async updateStakerReward(
    stakerAddress: string,
    tokenAddress: string,
    tokenSymbol: string,
    rewardAmount: string,
    network: string = 'avalanche-fuji',
    contractAddress: string = ''
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_staker_reward', {
        p_staker_address: stakerAddress.toLowerCase(), // Ensure lowercase
        p_token_address: tokenAddress.toLowerCase(), // Ensure lowercase
        p_token_symbol: tokenSymbol,
        p_reward_amount: rewardAmount,
        p_network: network,
        p_contract_address: contractAddress.toLowerCase() // Ensure lowercase
      })

      if (error) {
        console.error('Error updating staker reward:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating staker reward:', error)
      return false
    }
  },

  // Record reward withdrawal
  async recordRewardWithdrawal(
    stakerAddress: string,
    tokenAddress: string,
    withdrawalAmount: string,
    network: string = 'avalanche-fuji',
    contractAddress: string = ''
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('record_reward_withdrawal', {
        p_staker_address: stakerAddress,
        p_token_address: tokenAddress,
        p_withdrawal_amount: withdrawalAmount,
        p_network: network,
        p_contract_address: contractAddress
      })

      if (error) {
        console.error('Error recording reward withdrawal:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error recording reward withdrawal:', error)
      return false
    }
  },

  // Get total rewards earned by a staker
  async getTotalRewardsEarned(stakerAddress: string, network: string = 'avalanche-fuji'): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('staker_rewards')
        .select('total_earned')
        .eq('staker_address', stakerAddress)
        .eq('network', network)

      if (error) {
        console.error('Error fetching total rewards:', error)
        return '0'
      }

      if (!data || data.length === 0) return '0'

      // Sum all total_earned amounts
      const total = data.reduce((sum, record) => {
        return sum + parseFloat(record.total_earned || '0')
      }, 0)

      return total.toString()
    } catch (error) {
      console.error('Error fetching total rewards:', error)
      return '0'
    }
  }
}
