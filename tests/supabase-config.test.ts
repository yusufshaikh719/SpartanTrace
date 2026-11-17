import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { getSupabaseConfig, parseSupabaseConfig, saveSupabaseConfig } from '../src/lib/supabase';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubEnv('VITE_SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

test('environment URL trailing slashes cannot create a double-slash login path', () => {
  vi.stubEnv('VITE_SUPABASE_URL', ' https://project.supabase.co/ ');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_public_key');
  const config = getSupabaseConfig();
  expect(config.isConfigured).toBe(true);
  expect(`${config.url}/functions/v1/login`).toBe('https://project.supabase.co/functions/v1/login');
});
test('saved browser settings are normalized and override environment settings', () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://environment.supabase.co');
  saveSupabaseConfig(' https://browser.supabase.co/// ', ' sb_publishable_public_key ');
  expect(getSupabaseConfig()).toEqual({url:'https://browser.supabase.co',key:'sb_publishable_public_key',isConfigured:true});
});
test('invalid settings do not replace the previous valid connection', () => {
  saveSupabaseConfig('https://project.supabase.co', 'sb_publishable_public_key');
  expect(() => saveSupabaseConfig('invalid', 'secret')).toThrow(/valid project URL/);
  expect(getSupabaseConfig().url).toBe('https://project.supabase.co');
});
test('public anon JWTs are allowed, but service-role and secret keys are rejected', () => {
  const token = (role: string) => `header.${btoa(JSON.stringify({role}))}.signature`;
  expect(parseSupabaseConfig('https://project.supabase.co', token('anon')).isConfigured).toBe(true);
  expect(parseSupabaseConfig('https://project.supabase.co', token('service_role')).isConfigured).toBe(false);
  expect(parseSupabaseConfig('https://project.supabase.co', 'sb_secret_private_key').isConfigured).toBe(false);
});
test('local development HTTP is allowed while remote HTTP and missing settings are rejected', () => {
  expect(parseSupabaseConfig('http://127.0.0.1:54321/', 'sb_publishable_public_key').isConfigured).toBe(true);
  expect(parseSupabaseConfig('http://remote.example', 'sb_publishable_public_key').isConfigured).toBe(false);
  expect(getSupabaseConfig().isConfigured).toBe(false);
});
