// Browser test adapter: real SQL/RLS, simulated Supabase Auth and PostgREST transport.
// This fixture is never included in the app bundle and does not send email.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import type { BrowserContext, Route } from '@playwright/test';
import { createLoginHandler } from '../../supabase/functions/_shared/login';
import { randomUUID } from 'node:crypto';
export async function backend() {
 const db = new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE supabase_auth_admin; CREATE ROLE service_role; CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb DEFAULT '{}');
 CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz DEFAULT now());
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO anon,authenticated;`);
 await db.exec(readFileSync('supabase/schema.sql','utf8'));
 const users: Record<string, any> = {};
 for (const name of ['finder','looker','admin']) {
  const id=randomUUID();
  users[`${name}@sjsu.edu`]={id,email:`${name}@sjsu.edu`,email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated',user_metadata:{full_name:name},created_at:new Date().toISOString()};
  await db.query('INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES($1,$2,now(),$3)',[id,`${name}@sjsu.edu`,JSON.stringify({full_name:name})]);
 }
 await db.query('UPDATE public.profiles SET is_admin=true WHERE id=$1',[users['admin@sjsu.edu'].id]);
 const tokenUser = new Map<string, any>();
 let queue=Promise.resolve();
 const handler=async (route:Route) => {
  const run=async () => {
   const request=route.request(); const url=new URL(request.url());
   const respond=(data:any,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   const token=request.headers().authorization?.replace('Bearer ',''); const identity=token ? tokenUser.get(token) : null;
   let body:any={}; try {body=request.postDataJSON()||{};} catch {}
   await db.exec('RESET ROLE');
   const issueSession = async (body:any) => {
    const user=users[body.email];
    if (!user || body.password!=='correct-password') return new Response(JSON.stringify({msg:'Invalid login credentials',error_code:'invalid_credentials'}),{status:400});
    const session_id=randomUUID(); await db.query('INSERT INTO auth.sessions(id,user_id) VALUES($1,$2)',[session_id,user.id]);
    const claims={sub:user.id,session_id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600};
    const encode=(o:any)=>Buffer.from(JSON.stringify(o)).toString('base64url');
    const access_token=`${encode({alg:'HS256',typ:'JWT'})}.${encode(claims)}.test-signature`;
    tokenUser.set(access_token,{user,claims});
    return new Response(JSON.stringify({access_token,refresh_token:randomUUID(),expires_in:3600,token_type:'bearer',user}));
   };
   if (url.pathname==='/functions/v1/login') {
    const login=createLoginHandler({url:'https://test-project.supabase.co',anonKey:'test',serviceKey:'test-service',origins:['http://127.0.0.1:5173']},async (input:any,init:any)=>{
     const endpoint=new URL(String(input)); const payload=JSON.parse(init.body);
     await db.exec('RESET ROLE');
     if(endpoint.pathname==='/auth/v1/token') return issueSession(payload);
     await db.exec('SET ROLE service_role');
     let result;
     if(endpoint.pathname.endsWith('login_begin')) result=await db.query<{r:any}>('SELECT public.login_begin($1) r',[payload.email_address]);
     else if(endpoint.pathname.endsWith('login_cancel')) result=await db.query<{r:any}>('SELECT public.login_cancel($1,$2) r',[payload.user_id,payload.attempt]);
     else result=await db.query<{r:any}>('SELECT public.login_finish($1,$2,$3,$4) r',[payload.user_id,payload.attempt,payload.succeeded,payload.session_id||null]);
     return new Response(JSON.stringify(result.rows[0].r));
    });
    const response=await login(new Request(url,{method:'POST',headers:{origin:'http://127.0.0.1:5173'},body:JSON.stringify(body)}));
    return route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
   }
   if (url.pathname==='/auth/v1/user') return identity ? respond(identity.user) : respond({msg:'No session'},401);
   if (url.pathname==='/auth/v1/logout') { if(token) tokenUser.delete(token); return route.fulfill({status:204}); }
   if (url.pathname==='/auth/v1/signup') return respond({id:randomUUID(),email:body.email,identities:[],user_metadata:body.data});
   await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify(identity?.claims||{})]);
   await db.exec(`SET ROLE ${identity?'authenticated':'anon'}`);
   try {
    if(url.pathname==='/rest/v1/rpc/app_version') return respond(2);
    if(url.pathname==='/rest/v1/rpc/app_action') {
     const result=await db.query<{value:any}>('SELECT public.app_action($1,$2) AS value',[body.action,JSON.stringify(body.payload||{})]);
     return respond(result.rows[0].value);
    }
    const table=url.pathname.split('/').pop()!;
    if(!['profiles','listings','claims','messages','notifications','lost_item_alerts','reports','admin_audit_logs'].includes(table)) throw new Error('Unexpected test endpoint '+url.pathname);
    const requested=url.searchParams.get('select')||'*';
    const projection=requested==='*'?'*':requested.split(',').filter(x=>/^[a-z_]+$/.test(x)).join(',');
    let sql=`SELECT ${projection} FROM public.${table}`;const predicates:string[]=[];const values:any[]=[];
    for(const [field,value] of url.searchParams) {
     if(!/^[a-z_]+$/.test(field) || ['select','order','limit','offset'].includes(field)) continue;
     const [op,...rest]=value.split('.');const raw=rest.join('.');
     if(op==='in') {values.push(raw.slice(1,-1).split(','));predicates.push(`${field}=ANY($${values.length})`);}
     else {values.push(raw);predicates.push(`${field}${op==='neq'?'<>':'='}$${values.length}`);}
    }
    if(predicates.length) sql+=' WHERE '+predicates.join(' AND ');
    const order=url.searchParams.get('order'); if(order && order.split(',').every((part)=>/^[a-z_]+\.(asc|desc)$/.test(part))) sql+=' ORDER BY '+order.split(',').map((part)=>part.replace('.',' ')).join(',');
    if(url.searchParams.has('limit')) sql+=' LIMIT '+Number(url.searchParams.get('limit'));
    if(url.searchParams.has('offset')) sql+=' OFFSET '+Number(url.searchParams.get('offset'));
    const result=await db.query(sql,values);
    for(const row of result.rows as any[]) for(const key of ['date_found','date_lost']) if(row[key]) row[key]=new Date(row[key]).toISOString().slice(0,10);
    const single=request.headers().accept?.includes('vnd.pgrst.object');
    return respond(single ? result.rows[0]||null : result.rows);
   } catch(error:any) { return respond({message:error.message,code:error.code||'P0001'},400); }
  };
  const task=queue.then(run,run);queue=task.then(()=>undefined,()=>undefined);await task;
 };
 return {
  async attach(context:BrowserContext) {
   await context.addInitScript(()=>{localStorage.setItem('spartantrace_supabase_url','https://test-project.supabase.co');localStorage.setItem('spartantrace_supabase_key','sb_publishable_test_key');});
   await context.route('https://test-project.supabase.co/**',handler);
   await context.route('https://example.com/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#0055a5"/></svg>'}));
  },
  async seed() {
   for(const name of ['finder','looker']) {
    await db.exec('RESET ROLE'); const sid=randomUUID(),id=users[`${name}@sjsu.edu`].id;
    await db.query('INSERT INTO auth.sessions(id,user_id) VALUES($1,$2)',[sid,id]);await db.query('INSERT INTO private.app_sessions(session_id,user_id) VALUES($1,$2)',[sid,id]);
    await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,session_id:sid})]);await db.exec('SET ROLE authenticated');
    if(name==='finder') await db.query("SELECT public.app_action('create_listing',$1)",[JSON.stringify({title:'Silver laptop',description:'A silver laptop with stickers on the lid',category:'Electronics',locationFound:'Duncan Hall (DH)',dateFound:'2026-01-01',photoUrl:'https://example.com/laptop.jpg'})]);
    else { const l=await db.query<{id:string}>('SELECT id FROM public.listings'); await db.query("SELECT public.app_action('create_claim',$1)",[JSON.stringify({listingId:l.rows[0].id,proofDescription:'There is a red sticker under the lid'})]); }
   }
   await db.exec('RESET ROLE');const v=await db.query<{id:string,finder_id:string}>('SELECT id,finder_id FROM public.conversations');
   await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:v.rows[0].finder_id,session_id:(await db.query<{session_id:string}>('SELECT session_id FROM private.app_sessions WHERE user_id=$1',[v.rows[0].finder_id])).rows[0].session_id})]);await db.exec('SET ROLE authenticated');
   await db.query("SELECT public.app_action('send_message',$1)",[JSON.stringify({id:v.rows[0].id,content:'This message should be reviewed by an administrator'})]);
  },
  async close(){await queue;await db.close();},
 };
}
