-- Create table for tracking outreach attempts to prevent spam
-- and measure conversion from outreach to first signal

CREATE TABLE IF NOT EXISTS outreach_attempts (
  id SERIAL PRIMARY KEY,
  provider_address TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  channels_used TEXT[] DEFAULT '{}', -- ['twitter', 'farcaster']
  message_type TEXT NOT NULL DEFAULT 'initial', -- 'initial', 'follow_up'
  days_since_registration INTEGER,
  response_received BOOLEAN DEFAULT FALSE,
  converted_to_signal BOOLEAN DEFAULT FALSE,
  conversion_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_outreach_provider_address ON outreach_attempts(provider_address);
CREATE INDEX IF NOT EXISTS idx_outreach_last_attempt ON outreach_attempts(last_attempt DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_converted ON outreach_attempts(converted_to_signal);

-- Add RLS (Row Level Security) if needed
-- ALTER TABLE outreach_attempts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE outreach_attempts IS 'Tracks automated outreach attempts to inactive providers to prevent spam and measure conversion rates';
COMMENT ON COLUMN outreach_attempts.channels_used IS 'Array of channels used: twitter, farcaster, discord, etc';
COMMENT ON COLUMN outreach_attempts.message_type IS 'Type of message: initial welcome, follow_up, final_attempt';
COMMENT ON COLUMN outreach_attempts.converted_to_signal IS 'TRUE when provider publishes their first signal after outreach';