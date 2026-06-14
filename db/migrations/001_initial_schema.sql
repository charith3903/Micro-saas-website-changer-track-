-- ============================================================
-- Website Change Monitor — Initial Schema
-- Run: psql $DATABASE_URL -f db/migrations/001_initial_schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Users (custom auth for Phase 1; migrate to Supabase Auth later)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro')),
  timezone VARCHAR(50) DEFAULT 'UTC',
  telegram_chat_id VARCHAR(100),         -- Phase 2: Telegram integration
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Subscriptions (Phase 3 — Lemon Squeezy)
-- Created now so the schema is ready
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'paused')),
  lemonsqueezy_subscription_id VARCHAR(100),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

-- ============================================================
-- Monitors — the core entity
-- ============================================================
CREATE TABLE IF NOT EXISTS monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  url TEXT NOT NULL,
  
  -- Monitor type: determines how we extract and compare values
  type VARCHAR(30) NOT NULL DEFAULT 'full_page' 
    CHECK (type IN ('full_page', 'css_selector', 'keyword_appears', 'keyword_disappears', 'price_drop')),
  
  -- Type-specific config
  selector TEXT,              -- CSS selector for css_selector / price_drop types
  keyword TEXT,               -- keyword for keyword_appears / keyword_disappears types
  price_threshold DECIMAL,    -- threshold for price_drop type
  
  -- Rendering
  render_mode VARCHAR(10) DEFAULT 'html' CHECK (render_mode IN ('html', 'browser')),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  error_reason TEXT,
  consecutive_errors INTEGER DEFAULT 0,
  
  -- Scheduling
  last_checked_at TIMESTAMPTZ,
  next_check_at TIMESTAMPTZ DEFAULT now(),
  interval_seconds INTEGER NOT NULL DEFAULT 86400,  -- 24h default (free plan)
  
  -- Last snapshot for comparison
  last_value TEXT,
  
  -- Notification preferences (simplified for Phase 1)
  notify_email BOOLEAN DEFAULT true,
  notify_telegram BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduler queries this constantly — make it fast
CREATE INDEX idx_monitors_due ON monitors(next_check_at) 
  WHERE status = 'active';
CREATE INDEX idx_monitors_user ON monitors(user_id);
CREATE INDEX idx_monitors_status ON monitors(status);

-- ============================================================
-- Checks — history of every check performed
-- ============================================================
CREATE TABLE IF NOT EXISTS checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ DEFAULT now(),
  ok BOOLEAN NOT NULL,                -- false if fetch/parse failed
  observed_value TEXT,                 -- what we extracted this time
  changed BOOLEAN DEFAULT false,       -- did it differ from last snapshot?
  diff TEXT,                           -- human-readable diff summary
  error TEXT,                          -- error message if ok=false
  duration_ms INTEGER                  -- how long the check took
);

CREATE INDEX idx_checks_monitor ON checks(monitor_id, checked_at DESC);

-- ============================================================
-- Alerts — record of every notification sent
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'telegram', 'webhook')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  payload JSONB,                       -- what was sent
  delivered BOOLEAN DEFAULT true
);

CREATE INDEX idx_alerts_monitor ON alerts(monitor_id, sent_at DESC);
CREATE INDEX idx_alerts_user ON alerts(user_id, sent_at DESC);

-- ============================================================
-- Notification channels (Phase 2 — more flexible channel management)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'telegram', 'webhook')),
  destination VARCHAR(500) NOT NULL,   -- email address / chat id / webhook url
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_channels_user ON notification_channels(user_id);

-- ============================================================
-- Trigger to auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER monitors_updated_at BEFORE UPDATE ON monitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
