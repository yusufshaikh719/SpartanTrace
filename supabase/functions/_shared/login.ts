export interface LoginEnvironment { url: string; anonKey: string; serviceKey: string; origins: string[] }

// Passwords go only to Supabase Auth. Service-only RPCs control account lockout
// and grant the verified Auth session access to application data.
export function createLoginHandler(env: LoginEnvironment, requestFetch: typeof fetch = fetch) {
  const baseUrl = env.url.replace(/\/+$/, '');
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') || '';
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': env.origins.includes(origin) ? origin : '',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin', 'Cache-Control': 'no-store',
    };
    const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (origin && !env.origins.includes(origin)) return respond({ error: 'Origin is not allowed.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return respond({ error: 'POST required.' }, 405);
    if (!baseUrl || !env.anonKey || !env.serviceKey) return respond({ error: 'Login service is not configured.' }, 503);
    if (Number(request.headers.get('content-length') || 0) > 10000) return respond({ error: 'Request too large.' }, 413);
    let email: string, password: string;
    try {
      const text = await request.text();
      if (text.length > 10000) return respond({ error: 'Request too large.' }, 413);
      const input = JSON.parse(text);
      if (typeof input?.email !== 'string' || typeof input?.password !== 'string') return respond({ error: 'Enter your SJSU email and password.' }, 400);
      email = input.email.trim().toLowerCase(); password = input.password;
    } catch { return respond({ error: 'Invalid request.' }, 400); }
    if (!/^[^\s@]+@sjsu\.edu$/.test(email) || !password) return respond({ error: 'Enter your SJSU email and password.' }, 400);
    const rpc = async (name: string, payload: object) => {
      const response = await requestFetch(`${baseUrl}/rest/v1/rpc/${name}`, {
        method: 'POST', headers: { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Login database request failed.');
      return response.status === 204 ? null : response.json();
    };
    let attempt: { user_id: string; attempt_id: string; error?: string } | undefined;
    const cancel = async () => {
      if (attempt?.attempt_id) await rpc('login_cancel', { user_id: attempt.user_id, attempt: attempt.attempt_id });
    };
    try {
      attempt = await rpc('login_begin', { email_address: email });
      if (!attempt) throw new Error('Login attempt is missing.');
      if (attempt.error) return respond({ error: attempt.error }, 429);
      const authResponse = await requestFetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: { apikey: env.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(15000),
      });
      const session = await authResponse.json();
      if (!authResponse.ok) {
        const invalidPassword = [400, 401].includes(authResponse.status) && (session.error_code === 'invalid_credentials' || session.code === 'invalid_credentials');
        if (invalidPassword) {
          const failed = await rpc('login_finish', { user_id: attempt.user_id, attempt: attempt.attempt_id, succeeded: false });
          attempt = undefined;
          return respond({ error: failed.error || 'Invalid login credentials.' }, 401);
        }
        await cancel(); attempt = undefined;
        return respond({ error: authResponse.status === 429 ? 'Sign-in service is busy. Please wait before trying again.' : 'Sign-in is temporarily unavailable. Please try again.' }, authResponse.status === 429 ? 429 : 503);
      }
      // Supabase returned and signed this token; SQL checks session ownership.
      const encoded = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const claims = JSON.parse(atob(encoded));
      await rpc('login_finish', { user_id: attempt.user_id, attempt: attempt.attempt_id, succeeded: true, session_id: claims.session_id });
      attempt = undefined;
      return respond(session);
    } catch {
      await cancel().catch(() => undefined);
      return respond({ error: 'Sign-in is temporarily unavailable. Please try again.' }, 503);
    }
  };
}
