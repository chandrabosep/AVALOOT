-- Create stakes table
CREATE TABLE stakes (
  id BIGSERIAL PRIMARY KEY,
  stake_id BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL UNIQUE,
  staker_address VARCHAR(42) NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  amount VARCHAR(100) NOT NULL, -- Store as string to handle large numbers
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  duration_hours INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_by VARCHAR(42),
  claimed_at TIMESTAMPTZ,
  claimer_amount VARCHAR(100), -- Amount received by claimer
  staker_reward VARCHAR(100), -- Amount earned by staker as reward
  refunded BOOLEAN NOT NULL DEFAULT FALSE,
  refunded_at TIMESTAMPTZ,
  network VARCHAR(50) NOT NULL DEFAULT 'avalanche-fuji',
  contract_address VARCHAR(42) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_stakes_staker_address ON stakes(staker_address);
CREATE INDEX idx_stakes_location ON stakes(latitude, longitude);
CREATE INDEX idx_stakes_active ON stakes(claimed, refunded) WHERE claimed = FALSE AND refunded = FALSE;
CREATE INDEX idx_stakes_expires_at ON stakes(expires_at);
CREATE INDEX idx_stakes_created_at ON stakes(created_at);
CREATE INDEX idx_stakes_stake_id ON stakes(stake_id);
CREATE INDEX idx_stakes_network_contract ON stakes(network, contract_address);

-- Enable Row Level Security (RLS)
ALTER TABLE stakes ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Anyone can read stakes (for public claiming)
CREATE POLICY "Anyone can read stakes" ON stakes
  FOR SELECT USING (true);

-- Anyone can insert stakes (for creating new stakes)
CREATE POLICY "Anyone can insert stakes" ON stakes
  FOR INSERT WITH CHECK (true);

-- Anyone can update stakes (for claiming/refunding)
CREATE POLICY "Anyone can update stakes" ON stakes
  FOR UPDATE USING (true);

-- Create a function to automatically calculate expires_at
CREATE OR REPLACE FUNCTION calculate_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at = NEW.created_at + (NEW.duration_hours || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set expires_at
CREATE TRIGGER set_expires_at
  BEFORE INSERT ON stakes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_expires_at();

-- Create a view for active stakes with calculated status
CREATE VIEW active_stakes_view AS
SELECT 
  *,
  CASE 
    WHEN claimed = TRUE OR refunded = TRUE THEN 'completed'
    WHEN NOW() >= expires_at THEN 'expired'
    ELSE 'active'
  END AS status,
  EXTRACT(EPOCH FROM (expires_at - NOW())) AS seconds_remaining
FROM stakes
WHERE claimed = FALSE AND refunded = FALSE;

-- Create a function to get stakes in geographic bounds
CREATE OR REPLACE FUNCTION get_stakes_in_bounds(
  min_lat DECIMAL,
  max_lat DECIMAL,
  min_lng DECIMAL,
  max_lng DECIMAL
)
RETURNS TABLE (
  id BIGINT,
  stake_id BIGINT,
  transaction_hash VARCHAR,
  staker_address VARCHAR,
  token_address VARCHAR,
  token_symbol VARCHAR,
  amount VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL,
  duration_hours INTEGER,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  claimed BOOLEAN,
  claimed_by VARCHAR,
  claimed_at TIMESTAMPTZ,
  refunded BOOLEAN,
  refunded_at TIMESTAMPTZ,
  network VARCHAR,
  contract_address VARCHAR,
  status TEXT,
  seconds_remaining NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM active_stakes_view
  WHERE 
    active_stakes_view.latitude BETWEEN min_lat AND max_lat
    AND active_stakes_view.longitude BETWEEN min_lng AND max_lng
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create staker_rewards table to track accumulated rewards
CREATE TABLE staker_rewards (
  id BIGSERIAL PRIMARY KEY,
  staker_address VARCHAR(42) NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  total_earned VARCHAR(100) NOT NULL DEFAULT '0', -- Total rewards earned
  total_withdrawn VARCHAR(100) NOT NULL DEFAULT '0', -- Total rewards withdrawn
  available_balance VARCHAR(100) NOT NULL DEFAULT '0', -- Available to withdraw
  network VARCHAR(50) NOT NULL DEFAULT 'avalanche-fuji',
  contract_address VARCHAR(42) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for staker_rewards
CREATE INDEX idx_staker_rewards_address ON staker_rewards(staker_address);
CREATE INDEX idx_staker_rewards_token ON staker_rewards(token_address);
CREATE INDEX idx_staker_rewards_network_contract ON staker_rewards(network, contract_address);
CREATE UNIQUE INDEX idx_staker_rewards_unique ON staker_rewards(staker_address, token_address, network, contract_address);

-- Enable RLS for staker_rewards
ALTER TABLE staker_rewards ENABLE ROW LEVEL SECURITY;

-- Create policies for staker_rewards
CREATE POLICY "Users can read their own rewards" ON staker_rewards
  FOR SELECT USING (true); -- Allow reading for analytics, but could be restricted to staker_address = auth.uid() if using auth

CREATE POLICY "Anyone can insert rewards" ON staker_rewards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update rewards" ON staker_rewards
  FOR UPDATE USING (true);

-- Function to update staker rewards
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

-- Function to record reward withdrawal
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
