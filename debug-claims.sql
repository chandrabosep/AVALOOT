-- Debug script to check claimed stakes in the database
-- Run this in Supabase SQL Editor to see what exists

-- 1. Check all stakes and their claim status
SELECT 
    stake_id,
    staker_address,
    claimed,
    claimed_by,
    claimed_at,
    claimer_amount,
    staker_reward,
    token_symbol,
    amount,
    created_at
FROM stakes 
ORDER BY created_at DESC 
LIMIT 20;

-- 2. Check specifically for claimed stakes
SELECT 
    stake_id,
    staker_address,
    claimed_by,
    claimed_at,
    claimer_amount,
    token_symbol,
    amount
FROM stakes 
WHERE claimed = true 
ORDER BY claimed_at DESC;

-- 3. Count of stakes by status
SELECT 
    claimed,
    refunded,
    COUNT(*) as count
FROM stakes 
GROUP BY claimed, refunded;

-- 4. Check if claimed_by column has data
SELECT DISTINCT claimed_by 
FROM stakes 
WHERE claimed_by IS NOT NULL;
