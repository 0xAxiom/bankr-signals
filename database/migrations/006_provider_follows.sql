-- Provider Follow System Migration
-- Date: March 9, 2026
-- Purpose: Allow users to follow providers and get personalized feeds

-- Create follows table to track which users follow which providers
CREATE TABLE IF NOT EXISTS provider_follows (
  id SERIAL PRIMARY KEY,
  user_identifier VARCHAR(255) NOT NULL, -- Can be wallet address, email, or anonymous session ID
  provider_address VARCHAR(42) NOT NULL REFERENCES signal_providers(address) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Notification preferences for this follow
  notify_telegram BOOLEAN DEFAULT TRUE,
  notify_email BOOLEAN DEFAULT FALSE,
  notify_webhook BOOLEAN DEFAULT FALSE,
  
  -- Follow metadata
  notes TEXT, -- User's private notes about this provider
  tags TEXT[], -- User's custom tags for this provider
  
  UNIQUE(user_identifier, provider_address)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_follows_user ON provider_follows(user_identifier);
CREATE INDEX IF NOT EXISTS idx_provider_follows_provider ON provider_follows(provider_address);
CREATE INDEX IF NOT EXISTS idx_provider_follows_created ON provider_follows(created_at);

-- Create following_activity table to track activity for followed providers
CREATE TABLE IF NOT EXISTS following_activity (
  id SERIAL PRIMARY KEY,
  user_identifier VARCHAR(255) NOT NULL,
  provider_address VARCHAR(42) NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'new_signal', 'signal_closed', 'win', 'loss'
  signal_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE, -- When user acknowledged the activity
  
  FOREIGN KEY (provider_address) REFERENCES signal_providers(address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_following_activity_user ON following_activity(user_identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_following_activity_unread ON following_activity(user_identifier, read_at) WHERE read_at IS NULL;

-- Function to update follower count when follow/unfollow happens
CREATE OR REPLACE FUNCTION update_provider_followers()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE signal_providers 
        SET followers = followers + 1 
        WHERE address = NEW.provider_address;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE signal_providers 
        SET followers = GREATEST(0, followers - 1) 
        WHERE address = OLD.provider_address;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update follower counts
DROP TRIGGER IF EXISTS trigger_update_provider_followers ON provider_follows;
CREATE TRIGGER trigger_update_provider_followers
    AFTER INSERT OR DELETE ON provider_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_followers();

-- Function to create following activity when signals are created/updated
CREATE OR REPLACE FUNCTION create_following_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New signal from a followed provider
        INSERT INTO following_activity (user_identifier, provider_address, activity_type, signal_id)
        SELECT f.user_identifier, f.provider_address, 'new_signal', NEW.id
        FROM provider_follows f
        WHERE f.provider_address = NEW.provider_address;
        
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'closed' AND NEW.status = 'closed' THEN
        -- Signal closed - determine if win or loss
        DECLARE
            activity_type_val VARCHAR(50);
        BEGIN
            IF NEW.pnl > 0 THEN
                activity_type_val := 'win';
            ELSE
                activity_type_val := 'loss';
            END IF;
            
            INSERT INTO following_activity (user_identifier, provider_address, activity_type, signal_id)
            SELECT f.user_identifier, f.provider_address, activity_type_val, NEW.id
            FROM provider_follows f
            WHERE f.provider_address = NEW.provider_address;
        END;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for signal activity tracking
DROP TRIGGER IF EXISTS trigger_create_following_activity ON signals;
CREATE TRIGGER trigger_create_following_activity
    AFTER INSERT OR UPDATE ON signals
    FOR EACH ROW
    EXECUTE FUNCTION create_following_activity();

-- Create view for easy following stats
CREATE OR REPLACE VIEW provider_following_stats AS
SELECT 
    p.address,
    p.name,
    COUNT(pf.user_identifier) as follower_count,
    COUNT(DISTINCT CASE WHEN fa.created_at > NOW() - INTERVAL '7 days' THEN fa.user_identifier END) as active_followers_7d,
    COUNT(CASE WHEN fa.activity_type = 'new_signal' AND fa.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as signals_last_7d
FROM signal_providers p
LEFT JOIN provider_follows pf ON p.address = pf.provider_address
LEFT JOIN following_activity fa ON p.address = fa.provider_address
GROUP BY p.address, p.name;

COMMENT ON TABLE provider_follows IS 'Tracks which users follow which signal providers';
COMMENT ON TABLE following_activity IS 'Activity feed for users based on their followed providers';
COMMENT ON VIEW provider_following_stats IS 'Aggregated stats about provider following activity';