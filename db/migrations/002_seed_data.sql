-- ============================================================
-- Seed Data — test user and sample monitor
-- Run: psql $DATABASE_URL -f db/migrations/002_seed_data.sql
-- ============================================================

-- Test user: test@example.com / password123
-- Password hash generated with bcrypt (10 rounds)
-- In production, use the signup endpoint instead
INSERT INTO users (id, email, password_hash, email_verified, plan)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'test@example.com',
  -- This is bcrypt hash of 'password123'
  '$2b$10$rQEY7xQxR7gMZPmPGg7KMu1y0lFHjGJGLPEzrNm5r0vLz5YKjGKCe',
  true,
  'free'
) ON CONFLICT (email) DO NOTHING;

-- Sample monitor watching a test page
INSERT INTO monitors (id, user_id, name, url, type, render_mode, status, interval_seconds, notify_email)
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Example.com Monitor',
  'https://example.com',
  'full_page',
  'html',
  'active',
  86400,
  true
) ON CONFLICT DO NOTHING;
