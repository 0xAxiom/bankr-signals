-- Migration: Follow System Implementation
-- Creates necessary database functions and updates for the follow system

-- Create function to count followers for a provider
CREATE OR REPLACE FUNCTION count_provider_followers(provider_address TEXT)
RETURNS INTEGER AS $$
DECLARE
    follower_count INTEGER;
BEGIN
    SELECT COUNT(*)
    FROM user_portfolios
    WHERE followed_providers @> ARRAY[LOWER(provider_address)]::TEXT[]
    INTO follower_count;
    
    RETURN COALESCE(follower_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to update all provider follower counts (for maintenance)
CREATE OR REPLACE FUNCTION refresh_all_follower_counts()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    provider_record RECORD;
    new_count INTEGER;
BEGIN
    FOR provider_record IN 
        SELECT address FROM signal_providers
    LOOP
        -- Count followers for this provider
        SELECT count_provider_followers(provider_record.address) INTO new_count;
        
        -- Update the provider record
        UPDATE signal_providers 
        SET followers = new_count, updated_at = CURRENT_TIMESTAMP
        WHERE address = provider_record.address;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get followed providers with details
CREATE OR REPLACE FUNCTION get_user_followed_providers(user_wallet TEXT)
RETURNS TABLE(
    address VARCHAR(42),
    name VARCHAR(100),
    bio TEXT,
    avatar TEXT,
    twitter VARCHAR(64),
    followers INTEGER,
    total_signals INTEGER,
    win_rate DECIMAL(5,2),
    total_pnl_pct DECIMAL(8,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.address,
        sp.name,
        sp.bio,
        sp.avatar,
        sp.twitter,
        sp.followers,
        sp.total_signals,
        sp.win_rate,
        sp.avg_roi as total_pnl_pct
    FROM signal_providers sp
    INNER JOIN user_portfolios up ON 
        up.user_id = LOWER(user_wallet) AND 
        up.followed_providers @> ARRAY[sp.address]::TEXT[]
    ORDER BY sp.followers DESC, sp.total_signals DESC;
END;
$$ LANGUAGE plpgsql;

-- Create indexes to improve follow query performance
CREATE INDEX IF NOT EXISTS idx_user_portfolios_followed_providers 
ON user_portfolios USING GIN (followed_providers);

CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id 
ON user_portfolios(user_id);

-- Add constraint to ensure followed_providers array contains valid addresses
-- (Optional - uncomment if you want strict validation)
-- ALTER TABLE user_portfolios ADD CONSTRAINT valid_followed_providers 
-- CHECK (array_length(followed_providers, 1) IS NULL OR 
--        (SELECT bool_and(address ~ '^0x[a-fA-F0-9]{40}$') FROM unnest(followed_providers) AS address));

-- Update existing provider follower counts
SELECT refresh_all_follower_counts();

-- Add comments
COMMENT ON FUNCTION count_provider_followers(TEXT) IS 'Counts total followers for a given provider address';
COMMENT ON FUNCTION refresh_all_follower_counts() IS 'Updates follower counts for all providers - use for maintenance';
COMMENT ON FUNCTION get_user_followed_providers(TEXT) IS 'Returns detailed info for all providers followed by a user';