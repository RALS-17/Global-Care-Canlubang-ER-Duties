/**
 * Secrets from .env only (Vite requires VITE_ prefix)
 */

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) || '';

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

export const ADMIN_PASSWORD =
  (import.meta.env.VITE_ADMIN_PASSWORD as string) || 'globalcare2026';

/** Backup poll interval (realtime is primary for live updates) */
export const DATA_REFRESH_MS = 30 * 1000; // 30 seconds

/** How long each staff group is shown on the TV (ms) */
export const STAFF_GROUP_ROTATE_MS = 3 * 60 * 1000; // 3 minutes

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('YOUR_PROJECT') &&
  !SUPABASE_URL.includes('placeholder') &&
  !SUPABASE_ANON_KEY.includes('paste_your') &&
  !SUPABASE_ANON_KEY.includes('YOUR_') &&
  SUPABASE_ANON_KEY.length > 20
);
