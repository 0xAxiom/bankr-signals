-- Enhanced database schema for bankr-signals platform
-- This represents the target schema after all enhancements

-- Drop existing tables if recreating (CAUTION: Data loss!)
-- DROP TABLE IF EXISTS signals CASCADE;
-- DROP TABLE IF EXISTS signal_providers CASCADE;
-- DROP TABLE IF EXISTS webhooks CASCADE;

-- Enhanced signal_providers table
CREATE TABLE IF NOT EXISTS signal_providers (
  address VARCHAR(42) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  bio TEXT,
  description TEXT,
  avatar TEXT,
  chain VARCHAR(20) DEFAULT 'base',
  agent VARCHAR(100),
  website TEXT,
  twitter VARCHAR(64),
  farcaster VARCHAR(64),
  github VARCHAR(64),
  
  -- Enhanced fields
  verified BOOLEAN DEFAULT FALSE,
  verification_level INTEGER DEFAULT 0, -- 0-100 score
  tier VARCHAR(20) DEFAULT 'basic', -- basic, verified, premium, institutional
  reputation INTEGER DEFAULT 0, -- 0-1000 score
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  
  -- Subscription model
  subscription_fee DECIMAL(10,2), -- USD per month
  free_signals_per_month INTEGER DEFAULT 10,
  
  -- Performance metrics (cached)
  total_signals INTEGER DEFAULT 0,
  active_signals INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
  avg_roi DECIMAL(8,4) DEFAULT 0, -- Average ROI percentage
  max_drawdown DECIMAL(5,2) DEFAULT 0,
  sharpe_ratio DECIMAL(6,3),
  profit_factor DECIMAL(8,4),
  
  -- Specialization
  specialties TEXT[], -- Array of categories
  preferred_timeframes TEXT[], -- Array of timeframes
  average_hold_time DECIMAL(8,2) DEFAULT 0, -- Hours
  
  -- Activity tracking
  last_signal_at TIMESTAMP WITH TIME ZONE,
  avg_signals_per_week DECIMAL(5,2) DEFAULT 0,
  
  -- Verification data (JSON)
  badges TEXT[],
  verification_data JSONB,
  
  -- Timestamps
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced signals table
CREATE TABLE IF NOT EXISTS signals (
  id VARCHAR(50) PRIMARY KEY,
  provider VARCHAR(42) NOT NULL REFERENCES signal_providers(address),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Core signal data
  action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL', 'LONG', 'SHORT', 'HOLD')),
  token VARCHAR(20) NOT NULL,
  chain VARCHAR(20) DEFAULT 'base',
  entry_price DECIMAL(20,8) NOT NULL,
  leverage INTEGER DEFAULT 1,
  confidence DECIMAL(3,2), -- 0.00 to 1.00
  reasoning TEXT,
  
  -- Transaction data
  tx_hash VARCHAR(66),
  exit_tx_hash VARCHAR(66),
  
  -- Position management
  stop_loss_pct DECIMAL(5,2),
  take_profit_pct DECIMAL(5,2),
  collateral_usd DECIMAL(12,2) NOT NULL,
  position_size DECIMAL(5,2), -- Percentage of portfolio
  
  -- Enhanced categorization
  category VARCHAR(20) DEFAULT 'spot' CHECK (category IN ('spot', 'futures', 'options', 'defi', 'nft', 'macro', 'swing', 'scalp', 'arbitrage')),
  risk_level VARCHAR(10) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'extreme')),
  time_frame VARCHAR(5) DEFAULT '1d' CHECK (time_frame IN ('1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M')),
  tags TEXT[],
  
  -- Status and lifecycle
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired', 'cancelled', 'stopped', 'partial')),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Performance tracking
  exit_price DECIMAL(20,8),
  exit_timestamp TIMESTAMP WITH TIME ZONE,
  pnl_pct DECIMAL(8,4),
  pnl_usd DECIMAL(12,2),
  
  -- Real-time metrics (for open positions)
  current_price DECIMAL(20,8),
  unrealized_pnl_pct DECIMAL(8,4),
  unrealized_pnl_usd DECIMAL(12,2),
  max_drawdown_pct DECIMAL(5,2),
  
  -- Enhanced metrics
  holding_hours DECIMAL(8,2),
  slippage_pct DECIMAL(5,4),
  fees_usd DECIMAL(10,4),
  roi DECIMAL(8,4), -- Return on investment
  risk_reward_ratio DECIMAL(6,3),
  
  -- Relationships
  parent_signal_id VARCHAR(50) REFERENCES signals(id),
  signal_chain_id VARCHAR(50), -- Group related signals
  
  -- Market context
  market_condition VARCHAR(20), -- bullish, bearish, sideways, volatile
  volume_profile VARCHAR(10), -- high, medium, low
  
  -- Technical indicators (JSON)
  technical_indicators JSONB,
  support_level DECIMAL(20,8),
  resistance_level DECIMAL(20,8),
  
  -- Close reason for audit trail
  close_reason VARCHAR(50), -- auto_sell_signal, stop_loss, take_profit, expired, manual, etc.
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  version INTEGER DEFAULT 1 -- For signal amendments
);

-- Enhanced webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  
  -- Enhanced filters
  provider_filter VARCHAR(42),
  token_filter VARCHAR(20),
  category_filter VARCHAR(20),
  risk_level_filter VARCHAR(10),
  min_confidence DECIMAL(3,2),
  min_collateral_usd DECIMAL(12,2),
  action_filters TEXT[], -- Array of actions to include
  
  -- Delivery configuration
  retry_attempts INTEGER DEFAULT 3,
  retry_delay_ms INTEGER DEFAULT 1000,
  timeout_ms INTEGER DEFAULT 10000,
  max_failures INTEGER DEFAULT 10,
  
  -- Statistics
  last_triggered TIMESTAMP WITH TIME ZONE,
  last_failure TIMESTAMP WITH TIME ZONE,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- New table: User portfolios and positions
CREATE TABLE IF NOT EXISTS user_portfolios (
  user_id VARCHAR(42) PRIMARY KEY, -- Could be wallet address or user ID
  total_value DECIMAL(15,2) DEFAULT 0,
  total_pnl DECIMAL(15,2) DEFAULT 0,
  total_pnl_pct DECIMAL(8,4) DEFAULT 0,
  
  -- Risk allocation by level (percentages)
  risk_allocation JSONB DEFAULT '{"low": 0, "medium": 0, "high": 0, "extreme": 0}',
  
  -- Following/subscription data
  followed_providers TEXT[],
  subscription_data JSONB,
  
  -- Settings
  auto_copy_signals BOOLEAN DEFAULT FALSE,
  max_position_size DECIMAL(5,2) DEFAULT 5, -- Max % per signal
  risk_tolerance VARCHAR(10) DEFAULT 'medium',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- New table: Individual positions derived from signals
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(42) NOT NULL REFERENCES user_portfolios(user_id),
  signal_id VARCHAR(50) NOT NULL REFERENCES signals(id),
  
  -- Position details
  entry_price DECIMAL(20,8) NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  collateral_usd DECIMAL(12,2) NOT NULL,
  
  -- Current state
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'partial')),
  current_price DECIMAL(20,8),
  unrealized_pnl DECIMAL(12,2),
  unrealized_pnl_pct DECIMAL(8,4),
  
  -- Closure data
  exit_price DECIMAL(20,8),
  exit_quantity DECIMAL(20,8),
  realized_pnl DECIMAL(12,2),
  realized_pnl_pct DECIMAL(8,4),
  
  -- Timestamps
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- New table: Signal analytics and engagement
CREATE TABLE IF NOT EXISTS signal_analytics (
  signal_id VARCHAR(50) PRIMARY KEY REFERENCES signals(id),
  
  -- Engagement metrics
  views INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0, -- Users following this specific signal
  copiers INTEGER DEFAULT 0, -- Users who copied this signal
  avg_copy_size DECIMAL(12,2) DEFAULT 0,
  
  -- Sentiment and social
  sentiment_score DECIMAL(4,3) DEFAULT 0, -- -1.000 to 1.000
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  
  -- Market impact (advanced metric)
  market_impact DECIMAL(8,6), -- Estimated price impact from signal
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- New table: Provider analytics (time-series data)
CREATE TABLE IF NOT EXISTS provider_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_address VARCHAR(42) NOT NULL REFERENCES signal_providers(address),
  period VARCHAR(10) NOT NULL, -- '1d', '7d', '30d', '90d', '1y'
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Performance metrics for this period
  win_rate DECIMAL(5,2),
  avg_roi DECIMAL(8,4),
  total_pnl DECIMAL(15,2),
  best_signal_id VARCHAR(50),
  worst_signal_id VARCHAR(50),
  
  -- Activity metrics
  signal_count INTEGER DEFAULT 0,
  avg_signals_per_week DECIMAL(5,2),
  consistency_score DECIMAL(5,2), -- How regular their signals are
  
  -- Social metrics
  new_followers INTEGER DEFAULT 0,
  follower_churn INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4),
  
  -- Risk metrics
  max_drawdown DECIMAL(5,2),
  volatility DECIMAL(8,4),
  sharpe_ratio DECIMAL(6,3),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- New table: Rate limiting and abuse tracking
CREATE TABLE IF NOT EXISTS rate_limits (
  identifier VARCHAR(100) PRIMARY KEY, -- IP:action or provider:action
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_request TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Abuse tracking
  abuse_flags INTEGER DEFAULT 0,
  abuse_score INTEGER DEFAULT 0,
  blocked_until TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_signals_provider ON signals(provider);
CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signals_token ON signals(token);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_category ON signals(category);
CREATE INDEX IF NOT EXISTS idx_signals_risk_level ON signals(risk_level);
CREATE INDEX IF NOT EXISTS idx_signals_compound ON signals(provider, status, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_providers_verified ON signal_providers(verified);
CREATE INDEX IF NOT EXISTS idx_providers_tier ON signal_providers(tier);
CREATE INDEX IF NOT EXISTS idx_providers_reputation ON signal_providers(reputation DESC);

CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
CREATE INDEX IF NOT EXISTS idx_webhooks_filters ON webhooks(provider_filter, token_filter) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_signal ON positions(signal_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);

CREATE INDEX IF NOT EXISTS idx_analytics_period ON provider_analytics(provider_address, period, period_start);

-- Add useful database functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at timestamps
CREATE TRIGGER update_signal_providers_updated_at BEFORE UPDATE ON signal_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_signals_updated_at BEFORE UPDATE ON signals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_portfolios_updated_at BEFORE UPDATE ON user_portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_signal_analytics_updated_at BEFORE UPDATE ON signal_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for leaderboard (better performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_leaderboard AS
SELECT 
  sp.*,
  COALESCE(stats.total_signals, 0) as signal_count,
  COALESCE(stats.closed_signals, 0) as closed_count,
  COALESCE(stats.win_rate, 0) as calculated_win_rate,
  COALESCE(stats.avg_pnl, 0) as avg_pnl_pct,
  COALESCE(stats.total_pnl_usd, 0) as total_pnl_usd,
  COALESCE(stats.max_drawdown, 0) as calculated_max_drawdown,
  ROW_NUMBER() OVER (ORDER BY COALESCE(stats.total_pnl_usd, 0) DESC, COALESCE(stats.total_signals, 0) DESC) as rank
FROM signal_providers sp
LEFT JOIN (
  SELECT 
    provider,
    COUNT(*) as total_signals,
    COUNT(*) FILTER (WHERE status = 'closed') as closed_signals,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'closed' AND pnl_pct IS NOT NULL) > 0 
      THEN (COUNT(*) FILTER (WHERE status = 'closed' AND pnl_pct > 0)::DECIMAL / COUNT(*) FILTER (WHERE status = 'closed' AND pnl_pct IS NOT NULL)) * 100
      ELSE 0 
    END as win_rate,
    COALESCE(AVG(pnl_pct) FILTER (WHERE status = 'closed'), 0) as avg_pnl,
    COALESCE(SUM(pnl_usd) FILTER (WHERE status = 'closed'), 0) as total_pnl_usd,
    COALESCE(MIN(max_drawdown_pct), 0) as max_drawdown
  FROM signals
  GROUP BY provider
) stats ON sp.address = stats.provider;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_leaderboard_address ON provider_leaderboard(address);

-- Create function to refresh leaderboard (call periodically)
CREATE OR REPLACE FUNCTION refresh_provider_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) for sensitive tables
-- ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (uncomment to enable)
-- CREATE POLICY user_portfolio_policy ON user_portfolios FOR ALL USING (user_id = current_user);
-- CREATE POLICY user_positions_policy ON positions FOR ALL USING (user_id = current_user);

-- Add comments for documentation
COMMENT ON TABLE signal_providers IS 'Enhanced signal providers with verification tiers and reputation system';
COMMENT ON TABLE signals IS 'Trading signals with comprehensive categorization and performance tracking';
COMMENT ON TABLE webhooks IS 'Webhook configurations with advanced filtering and delivery options';
COMMENT ON TABLE user_portfolios IS 'User portfolio tracking and risk management settings';
COMMENT ON TABLE positions IS 'Individual position tracking derived from signals';
COMMENT ON TABLE signal_analytics IS 'Engagement and social metrics for signals';
COMMENT ON TABLE provider_analytics IS 'Time-series performance analytics for providers';
COMMENT ON MATERIALIZED VIEW provider_leaderboard IS 'Optimized leaderboard view with calculated metrics';

-- Grant permissions (adjust as needed)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;