-- Migration: Add Telegram notifications support
-- File: 003_telegram_subscribers.sql

CREATE TABLE IF NOT EXISTS telegram_subscribers (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  provider_filter TEXT[], -- Array of provider addresses to follow
  token_filter TEXT[], -- Array of tokens to watch  
  min_confidence DECIMAL(3,2), -- Minimum confidence threshold (0.00 to 1.00)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_telegram_subscribers_active ON telegram_subscribers(active);
CREATE INDEX IF NOT EXISTS idx_telegram_subscribers_chat_id ON telegram_subscribers(chat_id);

-- Add comments
COMMENT ON TABLE telegram_subscribers IS 'Telegram bot subscribers for signal notifications';
COMMENT ON COLUMN telegram_subscribers.chat_id IS 'Telegram chat ID (can be negative for groups)';
COMMENT ON COLUMN telegram_subscribers.provider_filter IS 'Array of provider addresses to follow (NULL = all providers)';
COMMENT ON COLUMN telegram_subscribers.token_filter IS 'Array of token symbols to watch (NULL = all tokens)';
COMMENT ON COLUMN telegram_subscribers.min_confidence IS 'Minimum confidence threshold 0-1 (NULL = no filter)';