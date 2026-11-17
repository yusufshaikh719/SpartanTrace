import { loadEnv } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSupabaseConfig } from '../src/lib/supabaseConfig.ts';

export interface HealthCheck { name: string; ok: boolean; detail: string; status?: number }
export interface HealthReport { projectUrl: string; ready: boolean; checks: HealthCheck[] }

// This probe never supplies real credentials or writes application records.
export async function checkSupabase(url: string, key: string, origin = 'http://localhost:5173', requestFetch: typeof fetch = fetch): Promise<HealthReport> {
  const config = parseSupabaseConfig(url, key);
  const checks: HealthCheck[] = [];
  if (!config.isConfigured) return { projectUrl: config.url, ready: false, checks: [{ name: 'Configuration', ok: false, detail: 'Set a valid VITE_SUPABASE_URL and public VITE_SUPABASE_ANON_KEY.' }] };
  const probe = async (path: string, init: RequestInit = {}) => {
    const response = await requestFetch(`${config.url}${path}`, { ...init, headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', ...init.headers }, signal: AbortSignal.timeout(15000) });
    const body: unknown = await response.json().catch(() => null);
    return { response, body };
  };
  const run = async (name: string, inspect: () => Promise<Omit<HealthCheck, 'name'>>) => {
    try { checks.push({ name, ...await inspect() }); }
    catch { checks.push({ name, ok: false, detail: 'Request failed or timed out. Check project availability and network access.' }); }
  };
  await run('Database schema', async () => {
    const { response, body } = await probe('/rest/v1/rpc/app_version');
    return { ok: response.ok && body === 2, status: response.status, detail: response.ok && body === 2 ? 'Workflow schema version 2 is installed.' : 'Apply supabase/schema.sql, or the upgrade migration for an existing installation.' };
  });
  await run('Public listings', async () => {
    const { response } = await probe('/rest/v1/listings?select=id&limit=0');
    return { ok: response.ok, status: response.status, detail: response.ok ? 'The public key can read the listing projection.' : 'Check the public key, listing schema, and row-level security grants.' };
  });
  await run('Email authentication', async () => {
    const { response, body } = await probe('/auth/v1/settings');
    const settings = body as { external?: { email?: boolean }; disable_signup?: boolean; mailer_autoconfirm?: boolean } | null;
    const ok = response.ok && settings?.external?.email === true && settings?.disable_signup === false && settings?.mailer_autoconfirm === false;
    return { ok, status: response.status, detail: ok ? 'Email registration and email confirmation are enabled.' : 'Enable Email, allow signups, and require email confirmation in Supabase Auth.' };
  });
  await run('Login function and browser origin', async () => {
    const { response, body } = await probe('/functions/v1/login', { method: 'POST', headers: { Origin: origin }, body: JSON.stringify({ email: '', password: '' }) });
    const result = body as { error?: string } | null;
    const ok = response.status === 400 && result?.error === 'Enter your SJSU email and password.' && response.headers.get('Access-Control-Allow-Origin') === origin;
    const detail = ok ? `The login function is deployed and allows ${origin}.`
      : response.status === 404 ? 'Deploy the login Edge Function with JWT verification disabled.'
      : response.status === 403 ? `Add ${origin} to the APP_ORIGINS function secret.`
      : response.status === 503 ? 'Check the login function environment variables and deployment.'
      : 'Check the login function deployment, response, and allowed browser origins.';
    return { ok, status: response.status, detail };
  });
  return { projectUrl: config.url, ready: checks.every((check) => check.ok), checks };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const env = loadEnv('development', process.cwd(), 'VITE_');
  const originIndex = process.argv.indexOf('--origin');
  const origin = originIndex >= 0 ? process.argv[originIndex + 1] : 'http://localhost:5173';
  try {
    if (!origin || new URL(origin).origin !== origin) throw new Error('Pass an exact origin, such as http://localhost:5173, after --origin.');
    const report = await checkSupabase(env.VITE_SUPABASE_URL || '', env.VITE_SUPABASE_ANON_KEY || '', origin);
    console.log(`Supabase project: ${report.projectUrl || '(not configured)'}`);
    for (const check of report.checks) console.log(`${check.ok ? 'PASS' : 'PENDING'} ${check.name}: ${check.detail}${check.status ? ` (HTTP ${check.status})` : ''}`);
    console.log('Email delivery, authenticated writes, and role isolation still require hosted account tests.');
    process.exitCode = report.ready ? 0 : 1;
  } catch (error) { console.error(error instanceof Error ? error.message : 'Could not inspect Supabase.'); process.exitCode = 1; }
}
