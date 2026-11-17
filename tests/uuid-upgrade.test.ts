import { expect, test } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const schema = readFileSync('supabase/schema.sql', 'utf8');
// Reproduce the earlier hosted schema, including UUID-dependent RLS and FKs.
const legacySchema = schema.split('-- Applies to both the original SpartanTrace schema')[0]
  .replace(/^BEGIN;\s*/, '')
  .replace(/\bid TEXT PRIMARY KEY DEFAULT [^\n]+/g, 'id UUID PRIMARY KEY DEFAULT gen_random_uuid(),')
  .replace(/\b(\w+) TEXT(?= REFERENCES )/g, '$1 UUID')
  .replace('content_id TEXT NOT NULL', 'content_id UUID NOT NULL')
  .replace('resolved_by TEXT,', 'resolved_by UUID REFERENCES profiles(id),');

test.each(['supabase/migrations/202611170001_secure_workflows.sql', 'supabase/schema.sql'])('%s upgrades UUID tables without losing records or relationships', async (script) => {
 const db = new PGlite();
 try {
  await db.exec(`
   CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
   CREATE SCHEMA auth;
   CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb DEFAULT '{}');
   CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz DEFAULT now());
   CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
   GRANT USAGE ON SCHEMA auth TO anon,authenticated;
   GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO anon,authenticated;
  `);
  await db.exec(legacySchema);
  await db.exec(`
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   CREATE POLICY legacy_profile ON public.profiles USING (id=auth.uid());
   INSERT INTO public.profiles(id,email,name) VALUES
    ('10000000-0000-0000-0000-000000000001','finder@sjsu.edu','Finder'),
    ('10000000-0000-0000-0000-000000000002','looker@sjsu.edu','Looker');
   INSERT INTO auth.users(id,email,email_confirmed_at) SELECT id,email,now() FROM public.profiles;
   INSERT INTO public.listings(id,finder_id,finder_name,finder_email,title,description,photo_url,category,location_found,date_found)
    VALUES('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Finder','finder@sjsu.edu','Blue backpack','Blue backpack with books','https://example.com/bag.jpg','Bags & Backpacks','Student Union','2026-01-01');
   INSERT INTO public.claims(id,listing_id,claimant_id,claimant_name,claimant_email,proof_description)
    VALUES('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Looker','looker@sjsu.edu','A red notebook inside');
   INSERT INTO public.conversations(id,claim_id,listing_id,finder_id,claimant_id)
    SELECT '40000000-0000-0000-0000-000000000001',c.id,c.listing_id,l.finder_id,c.claimant_id FROM public.claims c JOIN public.listings l ON l.id=c.listing_id;
   INSERT INTO public.messages(id,conversation_id,sender_id,sender_name,content)
    VALUES('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Looker','Existing ownership message');
   INSERT INTO public.reports(id,reporter_id,reporter_name,content_type,content_id,owner_id,owner_name,reason,resolved_by)
    VALUES('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Looker','listing','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Finder','Existing report','10000000-0000-0000-0000-000000000001');
  `);
  const before = await db.query<{ n: number }>("SELECT count(*)::int n FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace");
  await db.exec(readFileSync(script, 'utf8'));
  await db.exec(readFileSync(script, 'utf8')); // The upgraded installation remains rerunnable.
  expect((await db.query("SELECT * FROM information_schema.columns WHERE table_schema='public' AND data_type='uuid'")).rows).toHaveLength(0);
  expect((await db.query<{ n: number }>("SELECT count(*)::int n FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace")).rows).toEqual(before.rows);
  expect((await db.query('SELECT content FROM public.messages')).rows).toEqual([{content:'Existing ownership message'}]);
  expect((await db.query('SELECT content_id,resolved_by FROM public.reports')).rows).toEqual([{content_id:'20000000-0000-0000-0000-000000000001',resolved_by:'10000000-0000-0000-0000-000000000001'}]);
  await expect(db.exec("INSERT INTO public.messages(conversation_id,sender_name,content) VALUES('missing','Unknown','Invalid relationship')")).rejects.toThrow(/foreign key/);
  await db.exec(`
   INSERT INTO auth.sessions(id,user_id) VALUES('70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
   INSERT INTO private.app_sessions(session_id,user_id) VALUES('70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
   SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","session_id":"70000000-0000-0000-0000-000000000001"}',false);
   SET ROLE authenticated;
  `);
  const edited = await db.query<{ result: { title: string } }>("SELECT public.app_action('update_listing',$1::jsonb) result", [JSON.stringify({id:'20000000-0000-0000-0000-000000000001',title:'Updated blue backpack',description:'Blue backpack with books',photoUrl:'https://example.com/bag.jpg',category:'Bags & Backpacks',locationFound:'Student Union',dateFound:'2026-01-01'})]);
  expect(edited.rows[0].result.title).toBe('Updated blue backpack');
  const sent = await db.query<{ result: { content: string } }>("SELECT public.app_action('send_message',$1::jsonb) result", [JSON.stringify({id:'40000000-0000-0000-0000-000000000001',content:'The conversation still works'})]);
  expect(sent.rows[0].result.content).toBe('The conversation still works');
  await db.exec('RESET ROLE; SET ROLE anon');
  await expect(db.query('SELECT * FROM public.profiles')).rejects.toThrow(/permission/);
 } finally { await db.close(); }
}, 30000);
