-- Referral System Tables
-- Enables providers to refer new agents and track their success

-- Main referrals table - stores referral codes for each provider
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    provider TEXT NOT NULL UNIQUE, -- Provider's wallet address
    referral_code TEXT NOT NULL UNIQUE, -- Generated referral code (e.g., "AXIO123ABC")
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral registrations - tracks when someone uses a referral code
CREATE TABLE IF NOT EXISTS referral_registrations (
    id SERIAL PRIMARY KEY,
    referral_code TEXT NOT NULL REFERENCES referrals(referral_code),
    referred_provider TEXT NOT NULL, -- New provider's wallet address
    referrer_provider TEXT NOT NULL, -- Existing provider's wallet address  
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate referrals for same provider
    UNIQUE(referred_provider)
);

-- Referral rewards - tracks points/rewards earned by referrers
CREATE TABLE IF NOT EXISTS referral_rewards (
    id SERIAL PRIMARY KEY,
    provider TEXT NOT NULL, -- Referrer's wallet address
    referred_provider TEXT NOT NULL, -- Who they referred
    reward_type TEXT NOT NULL, -- 'registration', 'first_signal', 'active_30_days'
    points INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_provider ON referrals(provider);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_registrations_code ON referral_registrations(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_registrations_referred ON referral_registrations(referred_provider);
CREATE INDEX IF NOT EXISTS idx_referral_registrations_referrer ON referral_registrations(referrer_provider);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_provider ON referral_rewards(provider);

-- Updated at trigger for referrals table
CREATE OR REPLACE FUNCTION update_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_referrals_updated_at
    BEFORE UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referrals_updated_at();

-- View for referral leaderboard
CREATE OR REPLACE VIEW referral_leaderboard AS
SELECT 
    r.provider,
    r.referral_code,
    p.provider_name,
    COUNT(rr.id) as total_referrals,
    COUNT(CASE WHEN active_providers.signal_count > 0 THEN 1 END) as active_referrals,
    COUNT(CASE WHEN rr.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_referrals,
    COALESCE(SUM(rewards.points), 0) as total_points,
    r.created_at as referral_program_joined
FROM referrals r
LEFT JOIN providers p ON r.provider = p.wallet_address OR r.provider = p.provider_name
LEFT JOIN referral_registrations rr ON r.referral_code = rr.referral_code  
LEFT JOIN (
    SELECT provider_name, COUNT(*) as signal_count
    FROM signals 
    GROUP BY provider_name
) active_providers ON rr.referred_provider = active_providers.provider_name
LEFT JOIN referral_rewards rewards ON r.provider = rewards.provider
GROUP BY r.provider, r.referral_code, p.provider_name, r.created_at
ORDER BY active_referrals DESC, total_referrals DESC;

-- Sample data for testing (only if tables are empty)
INSERT INTO referrals (provider, referral_code) 
SELECT '0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5', 'AXIOM523ABC'
WHERE NOT EXISTS (SELECT 1 FROM referrals WHERE provider = '0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5');

-- Auto-reward function (call this from app when events happen)
CREATE OR REPLACE FUNCTION award_referral_points(
    referrer_addr TEXT,
    referred_addr TEXT, 
    reward_type TEXT,
    points_amount INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO referral_rewards (provider, referred_provider, reward_type, points, description, created_at)
    VALUES (
        referrer_addr, 
        referred_addr, 
        reward_type, 
        points_amount,
        CASE 
            WHEN reward_type = 'registration' THEN 'Referred new provider registration'
            WHEN reward_type = 'first_signal' THEN 'Referred provider published first signal'
            WHEN reward_type = 'active_30_days' THEN 'Referred provider active for 30 days'
            ELSE 'Referral reward'
        END,
        NOW()
    );
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;