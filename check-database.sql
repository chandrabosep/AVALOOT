-- Diagnostic script to check current database state
-- Run this in Supabase SQL Editor to see what exists

-- Check if stakes table has the required columns
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'stakes' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if staker_rewards table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'staker_rewards'
) AS staker_rewards_table_exists;

-- Check if the function exists
SELECT EXISTS (
    SELECT FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_staker_reward'
) AS update_staker_reward_function_exists;

-- Show any errors from previous migrations
SELECT * FROM information_schema.tables WHERE table_name IN ('stakes', 'staker_rewards');
