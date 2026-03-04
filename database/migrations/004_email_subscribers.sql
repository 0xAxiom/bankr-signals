-- Migration: Add email subscribers for weekly digest
-- File: 004_email_subscribers.sql

CREATE TABLE IF NOT EXISTS email_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  unsubscribe_token VARCHAR(64) UNIQUE NOT NULL,
  
  -- Subscription preferences
  weekly_digest BOOLEAN DEFAULT true,
  signal_alerts BOOLEAN DEFAULT false, -- Future: individual signal emails
  provider_updates BOOLEAN DEFAULT false, -- Future: provider newsletters
  
  -- Metadata
  source VARCHAR(50), -- 'website', 'twitter', 'farcaster', etc.
  referrer TEXT, -- UTM or referral source
  ip_address INET,
  user_agent TEXT,
  
  -- Status tracking
  confirmed_at TIMESTAMP WITH TIME ZONE,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  bounce_count INTEGER DEFAULT 0,
  complaint_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_subscribers_active ON email_subscribers(active);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_token ON email_subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_weekly_digest ON email_subscribers(weekly_digest, active);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_subscribers_updated_at
  BEFORE UPDATE ON email_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_email_subscribers_updated_at();

-- Add comments
COMMENT ON TABLE email_subscribers IS 'Email subscribers for weekly digest and notifications';
COMMENT ON COLUMN email_subscribers.unsubscribe_token IS 'Random token for unsubscribe links';
COMMENT ON COLUMN email_subscribers.confirmed_at IS 'When user confirmed their email (NULL = unconfirmed)';
COMMENT ON COLUMN email_subscribers.bounce_count IS 'Number of email bounces (auto-unsubscribe at 3)';
COMMENT ON COLUMN email_subscribers.complaint_count IS 'Number of spam complaints (auto-unsubscribe at 1)';