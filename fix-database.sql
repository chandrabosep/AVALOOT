-- Fix missing database schema for geo-cache
-- Run this script in your Supabase SQL editor

-- 1. Add missing columns to stakes table if they don't exist
DO $$
BEGIN
    -- Add claimer_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stakes' AND column_name = 'claimer_amount') THEN
        ALTER TABLE stakes ADD COLUMN claimer_amount VARCHAR(100);
    END IF;
    
    -- Add staker_reward column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stakes' AND column_name = 'staker_reward') THEN
        ALTER TABLE stakes ADD COLUMN staker_reward VARCHAR(100);
    END IF;
    
    -- Add claimed_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stakes' AND column_name = 'claimed_by') THEN
        ALTER TABLE stakes ADD COLUMN claimed_by VARCHAR(42);
    END IF;
    
    -- Add claimed_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'stakes' AND column_name = 'claimed_at') THEN
        ALTER TABLE stakes ADD COLUMN claimed_at TIMESTAMPTZ;
    END IF;
END$$;

-- 2. Create staker_rewards table if it doesn't exist
CREATE TABLE IF NOT EXISTS staker_rewards (
  id BIGSERIAL PRIMARY KEY,
  staker_address VARCHAR(42) NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  total_earned VARCHAR(100) NOT NULL DEFAULT '0',
  total_withdrawn VARCHAR(100) NOT NULL DEFAULT '0',
  available_balance VARCHAR(100) NOT NULL DEFAULT '0',
  network VARCHAR(50) NOT NULL DEFAULT 'avalanche-fuji',
  contract_address VARCHAR(42) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint for staker_rewards
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'staker_rewards' 
                   AND constraint_name = 'staker_rewards_unique_key') THEN
        ALTER TABLE staker_rewards 
        ADD CONSTRAINT staker_rewards_unique_key 
        UNIQUE (staker_address, token_address, network, contract_address);
    END IF;
END$$;

-- 3. Enable RLS on staker_rewards table
ALTER TABLE staker_rewards ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for staker_rewards table
DROP POLICY IF EXISTS "Anyone can read rewards" ON staker_rewards;
CREATE POLICY "Anyone can read rewards" ON staker_rewards
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert rewards" ON staker_rewards;
CREATE POLICY "Anyone can insert rewards" ON staker_rewards
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update rewards" ON staker_rewards;
CREATE POLICY "Anyone can update rewards" ON staker_rewards
  FOR UPDATE USING (true);

-- 5. Create the update_staker_reward function
CREATE OR REPLACE FUNCTION update_staker_reward(
  p_staker_address VARCHAR(42),
  p_token_address VARCHAR(42),
  p_token_symbol VARCHAR(20),
  p_reward_amount VARCHAR(100),
  p_network VARCHAR(50) DEFAULT 'avalanche-fuji',
  p_contract_address VARCHAR(42) DEFAULT ''
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO staker_rewards (
    staker_address, 
    token_address, 
    token_symbol, 
    total_earned, 
    available_balance,
    network,
    contract_address
  )
  VALUES (
    p_staker_address, 
    p_token_address, 
    p_token_symbol, 
    p_reward_amount, 
    p_reward_amount,
    p_network,
    p_contract_address
  )
  ON CONFLICT (staker_address, token_address, network, contract_address)
  DO UPDATE SET
    total_earned = (staker_rewards.total_earned::NUMERIC + p_reward_amount::NUMERIC)::VARCHAR,
    available_balance = (staker_rewards.available_balance::NUMERIC + p_reward_amount::NUMERIC)::VARCHAR,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. Create the record_reward_withdrawal function
CREATE OR REPLACE FUNCTION record_reward_withdrawal(
  p_staker_address VARCHAR(42),
  p_token_address VARCHAR(42),
  p_withdrawal_amount VARCHAR(100),
  p_network VARCHAR(50) DEFAULT 'avalanche-fuji',
  p_contract_address VARCHAR(42) DEFAULT ''
)
RETURNS VOID AS $$
BEGIN
  UPDATE staker_rewards 
  SET 
    total_withdrawn = (total_withdrawn::NUMERIC + p_withdrawal_amount::NUMERIC)::VARCHAR,
    available_balance = (available_balance::NUMERIC - p_withdrawal_amount::NUMERIC)::VARCHAR,
    updated_at = NOW()
  WHERE 
    staker_address = p_staker_address 
    AND token_address = p_token_address
    AND network = p_network
    AND contract_address = p_contract_address;
END;
$$ LANGUAGE plpgsql;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staker_rewards_address ON staker_rewards(staker_address);
CREATE INDEX IF NOT EXISTS idx_staker_rewards_token ON staker_rewards(token_address);
CREATE INDEX IF NOT EXISTS idx_staker_rewards_network ON staker_rewards(network);
CREATE INDEX IF NOT EXISTS idx_staker_rewards_updated ON staker_rewards(updated_at);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema has been updated successfully!';
    RAISE NOTICE 'Added missing columns to stakes table';
    RAISE NOTICE 'Created staker_rewards table and functions';
    RAISE NOTICE 'You can now claim stakes and update rewards properly';
END$$;
