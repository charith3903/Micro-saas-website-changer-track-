// ============================================================
// TypeScript interfaces for the application
// ============================================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  plan: 'free' | 'basic' | 'pro';
  timezone: string;
  telegram_chat_id: string | null;
  created_at: string;
  updated_at: string;
}

export type MonitorType =
  | 'full_page'
  | 'css_selector'
  | 'keyword_appears'
  | 'keyword_disappears'
  | 'price_drop';

export type MonitorStatus = 'active' | 'paused' | 'error';
export type RenderMode = 'html' | 'browser';

export interface Monitor {
  id: string;
  user_id: string;
  name: string | null;
  url: string;
  type: MonitorType;
  selector: string | null;
  keyword: string | null;
  price_threshold: number | null;
  render_mode: RenderMode;
  status: MonitorStatus;
  error_reason: string | null;
  consecutive_errors: number;
  last_checked_at: string | null;
  next_check_at: string | null;
  last_value: string | null;
  interval_seconds: number;
  notify_email: boolean;
  notify_telegram: boolean;
  created_at: string;
  updated_at: string;
}

export interface Check {
  id: string;
  monitor_id: string;
  checked_at: string;
  ok: boolean;
  observed_value: string | null;
  changed: boolean;
  diff: string | null;
  error: string | null;
  duration_ms: number | null;
}

export interface Alert {
  id: string;
  monitor_id: string;
  user_id: string;
  channel: 'email' | 'telegram' | 'webhook';
  sent_at: string;
  payload: Record<string, unknown>;
  delivered: boolean;
}

export interface NotificationChannel {
  id: string;
  user_id: string;
  type: 'email' | 'telegram' | 'webhook';
  destination: string;
  verified: boolean;
  created_at: string;
}

// ============================================================
// API request/response types
// ============================================================

export interface CreateMonitorRequest {
  url: string;
  name?: string;
  type?: MonitorType;
  selector?: string;
  keyword?: string;
  price_threshold?: number;
  render_mode?: RenderMode;
  notify_email?: boolean;
  notify_telegram?: boolean;
}

export interface UpdateMonitorRequest extends Partial<CreateMonitorRequest> {
  status?: MonitorStatus;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

// ============================================================
// Plan definitions
// ============================================================

export interface PlanConfig {
  name: string;
  price: number;            // monthly price in USD
  maxMonitors: number;
  minIntervalSeconds: number;
  channels: ('email' | 'telegram' | 'webhook')[];
  yearlyPrice?: number;     // yearly price in USD
}
