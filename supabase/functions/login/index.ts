import { createLoginHandler } from '../_shared/login.ts';
Deno.serve(createLoginHandler({
  url: Deno.env.get('SUPABASE_URL') || '',
  anonKey: Deno.env.get('SUPABASE_ANON_KEY') || '',
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  origins: (Deno.env.get('APP_ORIGINS') || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()),
}));
