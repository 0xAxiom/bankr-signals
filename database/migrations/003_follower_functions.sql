-- Migration 003: Add follower count management functions
-- Created: March 11, 2026
-- Purpose: Database functions for managing provider follower counts

-- Function to increment follower count
CREATE OR REPLACE FUNCTION increment_follower_count(provider_addr VARCHAR(42))
RETURNS void AS $$
BEGIN
  UPDATE signal_providers 
  SET followers = COALESCE(followers, 0) + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE address = provider_addr;
  
  -- If provider doesn't exist, this will silently do nothing
  -- which is appropriate for this use case
END;
$$ LANGUAGE plpgsql;

-- Function to decrement follower count (with minimum of 0)
CREATE OR REPLACE FUNCTION decrement_follower_count(provider_addr VARCHAR(42))
RETURNS void AS $$
BEGIN
  UPDATE signal_providers 
  SET followers = GREATEST(COALESCE(followers, 0) - 1, 0),
      updated_at = CURRENT_TIMESTAMP
  WHERE address = provider_addr;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate follower count (for data consistency)
CREATE OR REPLACE FUNCTION recalculate_follower_count(provider_addr VARCHAR(42))
RETURNS INTEGER AS $$
DECLARE
  follower_count INTEGER;
BEGIN
  -- Count how many users are following this provider
  SELECT COUNT(*)
  INTO follower_count
  FROM user_portfolios 
  WHERE followed_providers @> ARRAY[provider_addr];
  
  -- Update the provider's follower count
  UPDATE signal_providers 
  SET followers = follower_count,
      updated_at = CURRENT_TIMESTAMP
  WHERE address = provider_addr;
  
  RETURN follower_count;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate all follower counts (for maintenance)
CREATE OR REPLACE FUNCTION recalculate_all_follower_counts()
RETURNS void AS $$
DECLARE
  provider_record RECORD;
BEGIN
  FOR provider_record IN 
    SELECT address FROM signal_providers
  LOOP
    PERFORM recalculate_follower_count(provider_record.address);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION increment_follower_count(VARCHAR) IS 'Safely increment follower count for a provider';
COMMENT ON FUNCTION decrement_follower_count(VARCHAR) IS 'Safely decrement follower count for a provider (minimum 0)';
COMMENT ON FUNCTION recalculate_follower_count(VARCHAR) IS 'Recalculate exact follower count for a provider from user_portfolios';
COMMENT ON FUNCTION recalculate_all_follower_counts() IS 'Maintenance function to recalculate all provider follower counts';