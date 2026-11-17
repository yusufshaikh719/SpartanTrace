import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { parseSupabaseConfig } from './supabaseConfig';
export { parseSupabaseConfig } from './supabaseConfig';

export function getSupabaseConfig() {
  return parseSupabaseConfig(
    localStorage.getItem('spartantrace_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '',
    localStorage.getItem('spartantrace_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  );
}
let cachedClient: SupabaseClient | null = null;
let lastUsedConfig = '';
export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;
  const signature = `${url}_${key}`;
  if (cachedClient && signature === lastUsedConfig) return cachedClient;
  cachedClient = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  lastUsedConfig = signature;
  return cachedClient;
}
export function saveSupabaseConfig(url: string, key: string) {
  const config = parseSupabaseConfig(url, key);
  if (!config.isConfigured) throw new Error('Enter a valid project URL and public publishable/anon key.');
  localStorage.setItem('spartantrace_supabase_url', config.url);
  localStorage.setItem('spartantrace_supabase_key', config.key);
  cachedClient = null; lastUsedConfig = '';
}
export function clearSupabaseConfig() {
  localStorage.removeItem('spartantrace_supabase_url'); localStorage.removeItem('spartantrace_supabase_key');
  cachedClient = null; lastUsedConfig = '';
}
