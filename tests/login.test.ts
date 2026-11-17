import { test, expect } from 'vitest';
import { createLoginHandler } from '../supabase/functions/_shared/login';
const env={url:'https://project.supabase.co',anonKey:'public-test',serviceKey:'private-test',origins:['http://localhost:5173']};
const request=(body:unknown,origin='http://localhost:5173')=>new Request('https://project.supabase.co/functions/v1/login',{method:'POST',headers:{origin},body:JSON.stringify(body)});
test('login gateway validates origin, method, body and email before contacting Auth',async()=>{
 let calls=0;const handler=createLoginHandler(env,async()=>{calls++;throw new Error('unexpected');});
 expect((await handler(request({email:'user@sjsu.edu',password:'x'},'https://foreign.example'))).status).toBe(403);
 expect((await handler(request({email:'user@example.com',password:'x'}))).status).toBe(400);
 expect((await handler(new Request('https://project.supabase.co'))).status).toBe(405);
 expect(calls).toBe(0);
});
test('lockout stops password verification and returns no session or private keys',async()=>{
 const handler=createLoginHandler(env,async()=>new Response(JSON.stringify({error:'Account locked for 15 minutes'})));
 const result=await handler(request({email:'user@sjsu.edu',password:'x'}));expect(result.status).toBe(429);
 const text=await result.text();expect(text).toContain('locked');expect(text).not.toContain('private-test');
});
test('network failure reports a failed login without creating a session',async()=>{
 const handler=createLoginHandler(env,async()=>{throw new Error('secret connection detail');});
 const result=await handler(request({email:'user@sjsu.edu',password:'x'}));expect(result.status).toBe(503);
 expect(await result.text()).not.toContain('secret');
});
test('failed password attempts are completed on the server; passwords are sent only to Auth',async()=>{
 const calls:{url:string,body:any}[]=[];
 const handler=createLoginHandler(env,async(input,init)=>{
  const url=String(input),body=JSON.parse(String(init?.body));calls.push({url,body});
  if(url.endsWith('login_begin')) return new Response(JSON.stringify({user_id:'user',attempt_id:'ticket'}));
  if(url.includes('/auth/v1/token')) return new Response(JSON.stringify({error_code:'invalid_credentials'}),{status:400});
  return new Response(JSON.stringify({error:'Invalid login credentials.'}));
 });
 const response=await handler(request({email:'USER@sjsu.edu',password:'bad-password'}));expect(response.status).toBe(401);
 expect(calls.map(c=>c.body)).toEqual([{email_address:'user@sjsu.edu'},{email:'user@sjsu.edu',password:'bad-password'},{user_id:'user',attempt:'ticket',succeeded:false}]);
});

test('Auth outages and rate limits release the attempt without adding a password failure', async () => {
 for (const status of [429, 500, 503]) {
  const operations: string[] = [];
  const handler = createLoginHandler(env, async (input) => {
   const url = String(input); operations.push(url);
   if (url.endsWith('login_begin')) return new Response(JSON.stringify({user_id:'user',attempt_id:'ticket'}));
   if (url.includes('/auth/v1/token')) return new Response(JSON.stringify({error_code:'over_request_rate_limit'}), {status});
   return new Response('null');
  });
  expect((await handler(request({email:'user@sjsu.edu',password:'password'}))).status).toBe(status === 429 ? 429 : 503);
  expect(operations.some((url) => url.endsWith('login_cancel'))).toBe(true);
  expect(operations.some((url) => url.endsWith('login_finish'))).toBe(false);
 }
});
test('network failure after reserving a login attempt releases the reservation', async () => {
 const operations: string[] = [];
 const handler = createLoginHandler(env, async (input) => {
  const url = String(input); operations.push(url);
  if (url.endsWith('login_begin')) return new Response(JSON.stringify({user_id:'user',attempt_id:'ticket'}));
  if (url.includes('/auth/v1/token')) throw new Error('network unavailable');
  return new Response('null');
 });
 expect((await handler(request({email:'user@sjsu.edu',password:'password'}))).status).toBe(503);
 expect(operations.at(-1)).toContain('login_cancel');
});
test('CORS preflight supports the public login request without creating attempts', async () => {
 let calls=0;
 const handler=createLoginHandler(env, async()=>{calls++;throw new Error('unexpected');});
 const response=await handler(new Request('https://project.supabase.co/functions/v1/login',{method:'OPTIONS',headers:{origin:'http://localhost:5173'}}));
 expect(response.status).toBe(204);expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');expect(calls).toBe(0);
});
