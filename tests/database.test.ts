import { beforeAll, afterAll, describe, test, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

let db: PGlite;
const ids = {
 finder: '10000000-0000-0000-0000-000000000001',
 looker: '10000000-0000-0000-0000-000000000002',
 other: '10000000-0000-0000-0000-000000000003',
 admin: '10000000-0000-0000-0000-000000000004',
 unverified: '10000000-0000-0000-0000-000000000005',
};
const sessions = Object.fromEntries(Object.entries(ids).map(([key, value]) => [key, value.replace('10000000', '20000000')]));
async function as(who: keyof typeof ids | 'anon') {
 await db.exec('RESET ROLE');
 await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify(who === 'anon' ? {} : { sub: ids[who], session_id: sessions[who] })]);
 await db.exec(`SET ROLE ${who === 'anon' ? 'anon' : 'authenticated'}`);
}
async function act<T = any>(action: string, payload = {}): Promise<T> {
 const result = await db.query<{ result: T }>('SELECT public.app_action($1,$2::jsonb) AS result', [action, JSON.stringify(payload)]);
 return result.rows[0].result;
}
async function count(table: string, where = 'true') {
 const result = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.${table} WHERE ${where}`);
 return result.rows[0].n;
}
const validListing = () => ({ title: 'Blue campus backpack', description: 'A blue bag with books and keys inside', category: 'Bags & Backpacks', photoUrl: 'https://example.com/bag.jpg', locationFound: 'Student Union', dateFound: '2026-01-01' });
let listing: any, claim: any, conversation: any, alert: any, second: any, report: any, message: any;

beforeAll(async () => {
 db = new PGlite();
 await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE supabase_auth_admin; CREATE ROLE service_role;
 CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb DEFAULT '{}');
 CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz DEFAULT now());
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO anon,authenticated;
 GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO anon,authenticated;
 `);
 await db.exec(readFileSync('supabase/schema.sql', 'utf8'));
 for (const [key, id] of Object.entries(ids)) {
  await db.query('INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES($1,$2,$3,$4)', [id, `${key}@sjsu.edu`, key === 'unverified' ? null : new Date().toISOString(), JSON.stringify({ full_name: key, is_admin: true })]);
  await db.query('INSERT INTO auth.sessions(id,user_id) VALUES($1,$2)', [sessions[key], id]);
  if (key !== 'unverified') await db.query('INSERT INTO private.app_sessions(session_id,user_id) VALUES($1,$2)', [sessions[key], id]);
 }
 await db.query('UPDATE public.profiles SET is_admin=true WHERE id=$1', [ids.admin]);
}, 30000);
afterAll(async () => { await db?.close(); });

describe('Supabase SQL workflows and authorization (real PostgreSQL engine)', () => {
 test('schema and upgrade migration can be applied repeatedly', async () => {
  await db.exec(readFileSync('supabase/schema.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/202611170001_secure_workflows.sql', 'utf8'));
 });
 test('only verified SJSU users get profiles; metadata cannot grant admin', async () => {
  expect(await count('profiles')).toBe(4);
  const result = await db.query<{ is_admin: boolean }>('SELECT is_admin FROM public.profiles WHERE id=$1', [ids.finder]);
  expect(result.rows[0].is_admin).toBe(false);
  await expect(db.query("INSERT INTO auth.users(id,email) VALUES(gen_random_uuid(),'fake@example.com')")).rejects.toThrow(/sjsu/);
 });
 test('anonymous and unverified users cannot write or impersonate users', async () => {
  await as('anon'); await expect(act('create_listing',validListing())).rejects.toThrow(/permission/);
  await as('unverified'); await expect(act('create_listing',validListing())).rejects.toThrow(/verified/);
 });
 test('looker creates persistent alert; empty alerts are rejected', async () => {
  await as('looker'); await act('session');
  await expect(act('create_alert', {})).rejects.toThrow(/criterion/);
  alert = await act('create_alert', { keywords:'blue missing', category:'Bags & Backpacks', location:'Student Union' });
  expect(alert.user_id).toBe(ids.looker);
 });
 test('finder posts; identity is server assigned and matching notification is generated', async () => {
  await as('finder'); await act('session');
  listing = await act('create_listing', { ...validListing(), finderId:ids.admin, finderName:'forged' });
  expect(listing.finder_id).toBe(ids.finder);
  expect(listing.status).toBe('Available');
  await as('looker'); expect(await count('notifications')).toBe(1);
 });
 test('missing photo, invalid dates and future dates are rejected', async () => {
  await as('finder');
  for (const change of [{photoUrl:''},{dateFound:'2099-01-01'},{dateFound:'2026-02-30'},{title:''},{description:'short'},{category:'fake'}]) {
   await expect(act('create_listing', { ...validListing(), ...change })).rejects.toThrow();
  }
 });
 test('anonymous reads active listings but not profiles or private data', async () => {
  await as('anon'); expect(await count('listings')).toBe(1);
  await expect(count('profiles')).rejects.toThrow(/permission/);
  await expect(count('claims')).rejects.toThrow(/permission/);
 });
 test('only finder can edit listing; matching is not duplicated by edits', async () => {
  await as('looker'); await expect(act('update_listing', { ...validListing(), id:listing.id })).rejects.toThrow(/Finder/);
  await as('finder'); const edited = await act('update_listing', { ...validListing(), title:'Blue backpack edited', id:listing.id });
  expect(edited.title).toContain('edited'); expect(await count('listings')).toBe(1);
  await as('looker'); expect(await count('notifications')).toBe(1);
 });
 test('finder cannot claim own listing; proof is required', async () => {
  await as('finder'); await expect(act('create_claim', {listingId:listing.id,proofDescription:'ownership proof'})).rejects.toThrow(/another/);
  await as('looker'); await expect(act('create_claim',{listingId:listing.id,proofDescription:'x'})).rejects.toThrow(/evidence/);
 });
 test('claim, conversation, first message and finder notification persist atomically', async () => {
  const result = await act('create_claim',{listingId:listing.id,claimantId:ids.admin,proofDescription:'There is a red notebook inside'});
  claim=result.claim; conversation=result.conversation;
  expect(claim.claimant_id).toBe(ids.looker); expect(claim.status).toBe('Pending');
  expect(await count('messages')).toBe(1);
  await as('finder'); expect(await count('claims')).toBe(1); expect(await count('notifications')).toBe(1);
 });
 test('duplicate active claims are blocked; other users cannot inspect claims/conversations', async () => {
  await as('looker'); await expect(act('create_claim',{listingId:listing.id,proofDescription:'There is a red notebook inside'})).rejects.toThrow(/active claim/);
  await as('other'); await act('session');
  expect(await count('claims')).toBe(0); expect(await count('messages')).toBe(0); expect(await act('conversations')).toEqual([]);
  await expect(act('send_message',{id:conversation.id,content:'intruder'})).rejects.toThrow(/participants/);
 });
 test('another looker can claim an Available listing', async () => {
  second=await act('create_claim',{listingId:listing.id,proofDescription:'My keys have a yellow ring'});
 });
 test('participant messages notify only the other participant with server identity', async () => {
  await as('looker');
  message=await act('send_message',{id:conversation.id,content:'Can we meet at noon?',senderId:ids.admin});
  expect(message.sender_id).toBe(ids.looker);
  await as('finder'); expect(await count('messages')).toBe(3); expect(await count('notifications')).toBe(3);
  const convs=await act('conversations'); expect(convs.find((v:any)=>v.id===conversation.id).last_message).toBe('Can we meet at noon?');
 });
 test('accepting requires review, and only owner can change claim status', async () => {
  await expect(act('claim_status',{id:claim.id,status:'Accepted'})).rejects.toThrow(/Pending/);
  await as('looker'); await expect(act('claim_status',{id:claim.id,status:'Accepted'})).rejects.toThrow(/cannot/);
  await expect(act('listing_status',{id:listing.id,status:'Pending'})).rejects.toThrow(/Finder/);
 });
 test('Finder review moves Available to Pending and blocks additional claims', async () => {
  await as('finder'); const pending=await act('listing_status',{id:listing.id,status:'Pending'}); expect(pending.status).toBe('Pending');
  await as('other'); await expect(act('create_claim',{listingId:listing.id,proofDescription:'Another proof attempt'})).rejects.toThrow(/Available/);
 });
 test('acceptance claims listing and rejects other pending claims atomically', async () => {
  await as('finder'); await act('claim_status',{id:claim.id,status:'Accepted'});
  const claims=await db.query<{status:string}>('SELECT status FROM public.claims ORDER BY status'); expect(claims.rows.map(c=>c.status)).toEqual(['Accepted','Rejected']);
  const l=await db.query<{status:string}>('SELECT status FROM public.listings'); expect(l.rows[0].status).toBe('Claimed');
 });
 test('confirmed return records timestamp; Returned item leaves public search but remains in participant histories', async () => {
  await expect(act('listing_status',{id:listing.id,status:'Returned'})).rejects.toThrow(/confirmed/);
  const returned=await act('listing_status',{id:listing.id,status:'Returned',confirmed:true}); expect(returned.return_date).toBeTruthy();
  await expect(act('update_listing',{...validListing(),id:listing.id})).rejects.toThrow(/active listing/);
  await expect(act('listing_status',{id:listing.id,status:'Available'})).rejects.toThrow();
  await expect(act('send_message',{id:conversation.id,content:'after return'})).rejects.toThrow(/read-only/);
  await as('anon'); expect(await count('listings')).toBe(0);
  await as('looker'); expect(await count('listings')).toBe(1); expect(await count('claims')).toBe(1);
  await as('finder'); expect(await count('listings')).toBe(1);
 });
 test('users can read only their notifications; read state persists', async () => {
  await as('looker'); const all=await db.query<{id:string}>('SELECT id FROM public.notifications'); expect(all.rows.length).toBeGreaterThan(1);
  await act('read_notification',{id:all.rows[0].id}); expect(await count('notifications','is_read')).toBe(1);
  await act('read_all_notifications'); expect(await count('notifications','NOT is_read')).toBe(0);
  await as('other'); await expect(act('read_notification',{id:all.rows[0].id})).rejects.toThrow(/not found/);
 });
 test('authenticated report stores trusted owner, reporter and content', async () => {
  await as('looker');
  report=await act('create_report',{contentType:'message',contentId:message.id,reason:'Message is inappropriate',ownerId:ids.admin,contentSnippet:'forged'});
  expect(report.content_snippet).toBe(message.content); expect(report.owner_id).toBe(ids.looker);
  expect(await count('reports')).toBe(0);
  await as('other'); await expect(act('create_report',{contentType:'message',contentId:message.id,reason:'spy'})).rejects.toThrow(/unavailable/);
 });
 test('non-admin cannot moderate, suspend, resolve or write directly', async () => {
  for (const action of ['remove_listing','remove_message','resolve_report','suspend_user','report_context']) await expect(act(action,{id:listing.id,reason:'invalid'})).rejects.toThrow(/Administrator/);
  await expect(db.query("UPDATE public.profiles SET is_admin=true WHERE id=$1",[ids.other])).rejects.toThrow(/permission/);
  await expect(db.query('DELETE FROM public.admin_audit_logs')).rejects.toThrow(/permission/);
 });
 test('admin can review actual reported message and related conversation/listing', async () => {
  await as('admin'); await act('session'); expect(await count('reports')).toBe(1);
  const context=await act('report_context',{id:report.id}); expect(context.content).toBe(message.content); expect(context.conversation.id).toBe(conversation.id); expect(context.listing.id).toBe(listing.id);
 });
 test('report resolution requires reason, retains administrator and timestamp, cannot be repeated', async () => {
  await expect(act('resolve_report',{id:report.id,status:'Confirmed'})).rejects.toThrow(/reason/);
  const resolved=await act('resolve_report',{id:report.id,status:'Confirmed',reason:'Harassing message'}); expect(resolved.resolved_by).toBe(ids.admin); expect(resolved.resolved_at).toBeTruthy();
  await expect(act('resolve_report',{id:report.id,status:'Dismissed',reason:'repeat'})).rejects.toThrow(/not found/);
 });
 test('admin removes message, retains audit record and notifies content owner', async () => {
  await act('remove_message',{id:message.id,reason:'Harassing message'});
  expect(await count('admin_audit_logs')).toBe(2);
  await as('looker'); expect(await count('messages',`id='${message.id}'`)).toBe(0); expect(await count('notifications',"type='content_removed'")).toBe(1);
  await as('admin'); expect(await count('messages',`id='${message.id}'`)).toBe(1);
 });
 test('admin removes listing; hidden from normal users including direct lookup', async () => {
  await act('remove_listing',{id:listing.id,reason:'Invalid listing'});
  await as('finder'); expect(await count('listings')).toBe(0); expect(await count('notifications',"type='content_removed'")).toBe(1);
  await as('admin'); expect(await count('listings')).toBe(1);
 });
 test('account reports are supported; accounts can be suspended and restored with audit', async () => {
  await as('finder'); await act('create_report',{contentType:'user',contentId:ids.other,reason:'Fraudulent claims'});
  await as('admin'); await act('suspend_user',{id:ids.other,isSuspended:true,reason:'Repeated fraudulent claims'});
  await as('other'); await expect(act('create_alert',{keywords:'keys'})).rejects.toThrow(/active/); expect(await count('claims')).toBe(0);
  await as('admin'); await act('suspend_user',{id:ids.other,isSuspended:false,reason:'Review complete'});
  await as('other'); await expect(act('session')).rejects.toThrow(/expired/);
  await db.exec('RESET ROLE'); await db.query('INSERT INTO auth.sessions(id,user_id) VALUES($1,$2)', ['30000000-0000-0000-0000-000000000003',ids.other]);
  await db.query('INSERT INTO private.app_sessions(session_id,user_id) VALUES($1,$2)', ['30000000-0000-0000-0000-000000000003',ids.other]);
  sessions.other='30000000-0000-0000-0000-000000000003';
  await as('other'); expect((await act('session')).id).toBe(ids.other);
 });
 test('expired sessions cannot resume activity using an old access token', async () => {
  await db.exec('RESET ROLE'); await db.query("UPDATE private.app_sessions SET last_activity=now()-interval '31 minutes' WHERE user_id=$1",[ids.other]);
  await as('other'); await expect(act('session')).rejects.toThrow(/expired/); await expect(act('create_alert',{keywords:'keys'})).rejects.toThrow(/expired/);
 });
 test('login gateway is server-only and blocks after five failed attempts', async () => {
  await expect(db.query('SELECT public.login_begin($1)', ['finder@sjsu.edu'])).rejects.toThrow(/permission/);
  await db.exec('RESET ROLE; SET ROLE service_role');
  for (let i=0;i<5;i++) {
   const begin=await db.query<{r:any}>('SELECT public.login_begin($1) r',['finder@sjsu.edu']);
   const end=await db.query<{r:any}>('SELECT public.login_finish($1,$2,false) r',[ids.finder,begin.rows[0].r.attempt_id]);
   expect(end.rows[0].r.error).toMatch(i===4 ? /locked/ : /Invalid/);
  }
  const locked=await db.query<{r:any}>('SELECT public.login_begin($1) r',['finder@sjsu.edu']); expect(locked.rows[0].r.error).toMatch(/locked/);
 });
 test('lockout expiry permits login; success requires a real new Auth session and resets counters', async () => {
  await db.exec('RESET ROLE'); await db.query("UPDATE private.login_attempts SET locked_until=now()-interval '1 minute' WHERE user_id=$1",[ids.finder]);
  await db.exec('SET ROLE service_role');
  const begin=await db.query<{r:any}>('SELECT public.login_begin($1) r',['finder@sjsu.edu']);
  const attempt=begin.rows[0].r.attempt_id;
  await expect(db.query('SELECT public.login_finish($1,$2,true,$3)',[ids.finder,attempt,sessions.looker])).rejects.toThrow(/Invalid/);
  await db.exec('RESET ROLE');
  const sid='40000000-0000-0000-0000-000000000001'; await db.query('INSERT INTO auth.sessions(id,user_id) VALUES($1,$2)',[sid,ids.finder]);
  await db.exec('SET ROLE service_role'); await db.query('SELECT public.login_finish($1,$2,true,$3)',[ids.finder,attempt,sid]);
  await db.exec('RESET ROLE'); const state=await db.query<{failures:number}>('SELECT failures FROM private.login_attempts WHERE user_id=$1',[ids.finder]); expect(state.rows[0].failures).toBe(0);
 });
 test('native Auth tokens without a gateway session grant cannot use protected data', async () => {
  await db.exec('RESET ROLE'); const sid='50000000-0000-0000-0000-000000000001';
  await db.query('INSERT INTO auth.sessions(id,user_id) VALUES($1,$2)',[sid,ids.finder]);
  await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:ids.finder,session_id:sid})]); await db.exec('SET ROLE authenticated');
  await expect(act('session')).rejects.toThrow(/active/); expect(await count('claims')).toBe(0);
 });
 test('alert matching combines keywords/category/location/date and deduplicates per pair', async () => {
  await as('looker');
  const a=await act('create_alert',{keywords:'orange absent',category:'Electronics',location:'Engineering Building (ENG)',dateLost:'2026-01-02'});
  await expect(act('create_alert',{keywords:'keys',dateLost:'2099-01-01'})).rejects.toThrow(/future/);
  await as('finder');
  const data={...validListing(),title:'Orange headphones',description:'Orange wireless headphones found',category:'Electronics',locationFound:'Engineering Building (ENG)'};
  const early=await act('create_listing',data);
  const wrongCategory=await act('create_listing',{...data,dateFound:'2026-01-03',category:'Other'});
  const wrongLocation=await act('create_listing',{...data,dateFound:'2026-01-03',locationFound:'Student Union'});
  const match=await act('create_listing',{...data,dateFound:'2026-01-03'});
  await as('looker');
  expect(await count('notifications',`link_id='${early.id}'`)).toBe(0);
  expect(await count('notifications',`link_id='${wrongCategory.id}'`)).toBe(0);
  expect(await count('notifications',`link_id='${wrongLocation.id}'`)).toBe(0);
  expect(await count('notifications',`link_id='${match.id}'`)).toBe(1);
  await db.exec('RESET ROLE'); await db.query('SELECT private.match_alerts($1,$2)',[match.id,a.id]);
  await as('looker'); expect(await count('notifications',`link_id='${match.id}'`)).toBe(1);
  await act('delete_alert',{id:a.id}); expect(await count('lost_item_alerts',`id='${a.id}'`)).toBe(0);
 });
 test('public listing projection does not reveal Finder email; direct notification writes are forbidden', async () => {
  await as('anon'); await expect(db.query('SELECT finder_email FROM public.listings')).rejects.toThrow(/permission/);
  await as('looker'); await expect(db.query("INSERT INTO public.notifications(id,user_id,type,title,message,link_type,link_id) VALUES('forged',$1,'alert_match','forged','forged','listing','forged')",[ids.finder])).rejects.toThrow(/permission/);
 });

 test('server cancellation releases only its own login lease and does not add a failed password', async () => {
  await as('looker');
  await expect(db.query('SELECT public.login_cancel($1,$2)',[ids.finder,'forged'])).rejects.toThrow(/permission/);
  await db.exec('RESET ROLE; SET ROLE service_role');
  const first=await db.query<{r:any}>('SELECT public.login_begin($1) r',['finder@sjsu.edu']);
  await db.query('SELECT public.login_cancel($1,$2)',[ids.finder,'wrong-ticket']);
  const busy=await db.query<{r:any}>('SELECT public.login_begin($1) r',['finder@sjsu.edu']);expect(busy.rows[0].r.error).toMatch(/in progress/);
  await db.query('SELECT public.login_cancel($1,$2)',[ids.finder,first.rows[0].r.attempt_id]);
  const next=await db.query<{r:any}>('SELECT public.login_begin($1) r',['finder@sjsu.edu']);expect(next.rows[0].r.attempt_id).toBeTruthy();
  await db.query('SELECT public.login_cancel($1,$2)',[ids.finder,next.rows[0].r.attempt_id]);
  await db.exec('RESET ROLE');const state=await db.query<{failures:number}>('SELECT failures FROM private.login_attempts WHERE user_id=$1',[ids.finder]);expect(state.rows[0].failures).toBe(0);
 });

 test('logout revokes the database grant even while the signed Auth session still exists', async () => {
  await as('finder'); expect((await act('session')).id).toBe(ids.finder);
  await act('logout');
  await expect(act('session')).rejects.toThrow(/active/);
  await expect(act('create_alert',{keywords:'headphones'})).rejects.toThrow(/active/);
  expect(await count('notifications')).toBe(0);
  await act('logout'); // Logging out is also safe after the grant has expired.
 });

});
