export function parseSupabaseConfig(rawUrl: string, rawKey: string) {
  const url = rawUrl.trim().replace(/\/+$/, '');
  const key = rawKey.trim();
  let validUrl = false;
  try { const parsed = new URL(url); validUrl = parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)); } catch { /* incomplete configuration */ }
  let publicKey = key.startsWith('sb_publishable_');
  try { publicKey ||= JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'; } catch { /* not a legacy public JWT */ }
  return { url, key, isConfigured: validUrl && publicKey && !url.includes('your-project') };
}
