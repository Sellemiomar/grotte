/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

export function normalizeSupabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.includes('.supabase.co')) {
      url = `https://${url}`;
    } else {
      url = `https://${url}.supabase.co`;
    }
  }
  return url.replace(/\/+$/, '');
}

const env = (import.meta as any).env || {};
const rawSupabaseUrl: string = env.VITE_SUPABASE_URL || '';
const rawSupabaseAnonKey: string = env.VITE_SUPABASE_ANON_KEY || '';

export const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
export const supabaseAnonKey = typeof rawSupabaseAnonKey === 'string' ? rawSupabaseAnonKey.trim() : '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 20
  );
};

// Route browser queries through our secure server proxy to protect secret keys
// and prevent "Forbidden use of secret API key in browser" errors
export const getActiveSupabaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/supabase`;
  }
  return supabaseUrl;
};

// Create the client singleton if configured, or a dummy/null client
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured()
  ? createClient<Database>(getActiveSupabaseUrl(), supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

