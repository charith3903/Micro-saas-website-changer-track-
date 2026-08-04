-- ============================================================
-- Website Change Monitor — Subscription & Free-Trial Reminder
-- Run: psql $DATABASE_URL -f db/migrations/004_subscription_tracker.sql
-- ============================================================
-- A second, independently-priced product in the same account: track
-- personal subscriptions/free trials and remind before they renew.
--
-- Named `tracked_subscriptions` (not `subscriptions`) to avoid colliding
-- with the existing `subscriptions` table, which is this app's OWN
-- billing record (Phase 3 — Lemon Squeezy), not something a user tracks.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tracker_plan VARCHAR(20)
  DEFAULT 'free' CHECK (subscription_tracker_plan IN ('free', 'pro'));

CREATE TABLE IF NOT EXISTS tracked_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  is_trial BOOLEAN DEFAULT false,        -- free trial about to start charging vs. an existing paid sub
  amount DECIMAL,
  currency VARCHAR(3) DEFAULT 'EUR',

  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly', 'one_time')),
  next_renewal_date DATE NOT NULL,
  reminder_days_before INTEGER NOT NULL DEFAULT 3,

  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  last_reminded_for_date DATE,           -- renewal date the last reminder was sent for (avoids re-sending mid-cycle)

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracked_subs_user ON tracked_subscriptions(user_id);

-- The reminder worker scans this constantly — make it fast
CREATE INDEX IF NOT EXISTS idx_tracked_subs_due ON tracked_subscriptions(next_renewal_date)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS tracked_subscriptions_updated_at ON tracked_subscriptions;
CREATE TRIGGER tracked_subscriptions_updated_at BEFORE UPDATE ON tracked_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
