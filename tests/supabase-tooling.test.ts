import { test, expect } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import vm from 'node:vm';
import { checkSupabase } from '../scripts/supabase-check.ts';
import { prepareSupabase } from '../scripts/supabase-prepare.ts';

const key = 'sb_publishable_test_only';
function healthyTransport(calls: {path: string; init?: RequestInit}[]): typeof fetch {
  return async (input, init) => {
    const path = new URL(String(input)).pathname;
    calls.push({path,init});
    if (path.endsWith('app_version')) return Response.json(2);
    if (path.endsWith('/listings')) return Response.json([]);
    if (path.endsWith('/settings')) return Response.json({external:{email:true},disable_signup:false,mailer_autoconfirm:false});
    return Response.json({error:'Enter your SJSU email and password.'},{status:400,headers:{'Access-Control-Allow-Origin':'http://localhost:5173'}});
  };
}
test('public readiness probe checks schema/Auth/function without attempting a real login or mutation', async () => {
  const calls: {path:string; init?:RequestInit}[]=[];
  const report=await checkSupabase('https://project.supabase.co/',key,undefined,healthyTransport(calls));
  expect(report.ready).toBe(true); expect(report.checks).toHaveLength(4);
  expect(calls.filter((call)=>call.init?.method==='POST').map((call)=>({path:call.path,body:JSON.parse(String(call.init?.body))})))
    .toEqual([{path:'/functions/v1/login',body:{email:'',password:''}}]);
  expect(JSON.stringify(report)).not.toContain(key);
});
test('old schema and undeployed login function remain pending even if listings are readable', async () => {
  const healthy=healthyTransport([]);
  const report=await checkSupabase('https://project.supabase.co',key,undefined,async(input,init)=>
    /app_version|functions/.test(String(input)) ? Response.json({code:'NOT_FOUND'},{status:404}) : healthy(input,init));
  expect(report.ready).toBe(false);
  expect(report.checks.filter((check)=>!check.ok).map((check)=>check.name)).toEqual(['Database schema','Login function and browser origin']);
});
test('diagnostic errors never expose transport credentials', async () => {
  const report=await checkSupabase('https://project.supabase.co',key,undefined,async()=>{throw new Error(key);});
  expect(report.ready).toBe(false);expect(JSON.stringify(report)).not.toContain(key);
});
test('deployment package is self-contained, reproducible, and excludes local configuration', async () => {
  const directory=await mkdtemp(join(tmpdir(),'spartantrace-deploy-'));
  try {
    const prepared=await prepareSupabase(process.cwd(),directory);
    expect(Object.keys(prepared.manifest).sort()).toEqual(['202611170001_secure_workflows.sql','login.ts','schema.sql']);
    for (const [name,metadata] of Object.entries(prepared.manifest)) {
      const bytes=await readFile(join(directory,name));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(metadata.sha256);
    }
    const source=await readFile(join(directory,'login.ts'),'utf8');
    expect(source).not.toMatch(/^import /m);
    let handler: ((request:Request)=>Promise<Response>) | undefined;
    const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
    vm.runInNewContext(compiled,{
      exports:{},Request,Response,AbortSignal,atob,
      fetch:async()=>{throw new Error('Health request should not contact Auth');},
      Deno:{env:{get:(name:string)=>({SUPABASE_URL:'https://project.supabase.co',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server'} as Record<string,string>)[name]},serve:(fn:typeof handler)=>{handler=fn;}},
    });
    expect(handler).toBeTypeOf('function');
    const response=await handler!(new Request('https://project.supabase.co/functions/v1/login',{method:'POST',headers:{origin:'http://localhost:5173'},body:JSON.stringify({email:'',password:''})}));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Enter your SJSU email and password.');
  } finally { await rm(directory,{recursive:true,force:true}); }
});
