-- Migration: Copy Trading Subscriptions
-- Adds table to track copy-trading subscriptions

CREATE TABLE IF NOT EXISTS copy_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  provider_address TEXT NOT NULL,
  telegram_username TEXT,
  webhook_url TEXT,
  position_size_pct INTEGER DEFAULT 10 CHECK (position_size_pct >= 1 AND position_size_pct <= 50),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique email + provider combination
  UNIQUE(email, provider_address)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_copy_subscriptions_email ON copy_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_copy_subscriptions_provider ON copy_subscriptions(provider_address);
CREATE INDEX IF NOT EXISTS idx_copy_subscriptions_status ON copy_subscriptions(status);

-- Update providers table to track subscriber count
ALTER TABLE providers ADD COLUMN subscriber_count INTEGER DEFAULT 0;

-- Create trigger to update subscriber count
CREATE TRIGGER IF NOT EXISTS update_subscriber_count
AFTER INSERT ON copy_subscriptions
BEGIN
  UPDATE providers 
  SET subscriber_count = (
    SELECT COUNT(*) 
    FROM copy_subscriptions 
    WHERE LOWER(provider_address) = LOWER(NEW.provider_address) 
    AND status = 'active'
  )
  WHERE LOWER(address) = LOWER(NEW.provider_address);
END;

CREATE TRIGGER IF NOT EXISTS update_subscriber_count_delete
AFTER UPDATE ON copy_subscriptions
BEGIN
  UPDATE providers 
  SET subscriber_count = (
    SELECT COUNT(*) 
    FROM copy_subscriptions 
    WHERE LOWER(provider_address) = LOWER(NEW.provider_address) 
    AND status = 'active'
  )
  WHERE LOWER(address) = LOWER(NEW.provider_address);
END;