-- ============================================================
-- Website Change Monitor — Webhooks & Settings
-- Run: psql $DATABASE_URL -f db/migrations/003_webhooks_and_settings.sql
-- ============================================================

-- Per-monitor opt-in for webhook alerts (Pro plan feature — see src/lib/plans.ts).
-- Delivery channel details live in notification_channels, already created in
-- 001_initial_schema.sql.
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS notify_webhook BOOLEAN DEFAULT false;
