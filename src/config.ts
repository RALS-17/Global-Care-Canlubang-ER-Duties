/**
 * Secrets from .env only (Vite requires VITE_ prefix)
 */

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) || '';

export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

export const ADMIN_PASSWORD =
  (import.meta.env.VITE_ADMIN_PASSWORD as string) || 'globalcare2026';

export const DATA_REFRESH_MS = 60 * 1000;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('YOUR_PROJECT') &&
  !SUPABASE_URL.includes('placeholder') &&
  !SUPABASE_ANON_KEY.includes('paste_your') &&
  !SUPABASE_ANON_KEY.includes('YOUR_') &&
  SUPABASE_ANON_KEY.length > 20
);
