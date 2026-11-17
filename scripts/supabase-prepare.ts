import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function prepareSupabase(root: string, destination = resolve(root, 'deployment/supabase')) {
  const migrationName = '202611170001_secure_workflows.sql';
  const [schema, migration, shared, entry] = await Promise.all([
    readFile(resolve(root, 'supabase/schema.sql'), 'utf8'),
    readFile(resolve(root, 'supabase/migrations', migrationName), 'utf8'),
    readFile(resolve(root, 'supabase/functions/_shared/login.ts'), 'utf8'),
    readFile(resolve(root, 'supabase/functions/login/index.ts'), 'utf8'),
  ]);
  const standaloneLogin = shared + '\n' + entry.replace(/^import \{ createLoginHandler \} from ['"]\.\.\/_shared\/login\.ts['"];\r?\n/, '');
  const files = { 'schema.sql': schema, [migrationName]: migration, 'login.ts': standaloneLogin };
  await mkdir(destination, { recursive: true });
  const manifest: Record<string, { sha256: string; bytes: number }> = {};
  for (const [name, content] of Object.entries(files)) {
    await writeFile(resolve(destination, name), content);
    manifest[name] = { sha256: createHash('sha256').update(content).digest('hex'), bytes: Buffer.byteLength(content) };
  }
  await writeFile(resolve(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(resolve(destination, 'README.txt'), `SpartanTrace Supabase deployment package\n\nGenerated only from repository source. No .env or API keys are included.\n\n1. In the project's SQL Editor, run schema.sql for a fresh install, or ${migrationName} if the original tables already exist.\n2. Create an Edge Function named login. Paste login.ts into its index.ts editor and deploy. Disable Verify JWT for this login endpoint.\n3. The function uses Supabase's built-in server environment variables. Set APP_ORIGINS to a comma-separated list of exact app origins; its default allows http://localhost:5173 and http://127.0.0.1:5173.\n4. Enable Email signups and Confirm email in Auth. Configure allowed callback URLs and email delivery.\n5. Run npm run supabase:check to verify public readiness. Real email delivery and authenticated workflows still need hosted verification.\n\nThe migration preserves records, replaces permissive policies, and installs server-authorized transactional workflows. Review it before running it against an existing project. See SUPABASE_SETUP.md in the repository for full instructions.\n`);
  return { destination, manifest };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await prepareSupabase(process.cwd());
  console.log(`Prepared ${relative(process.cwd(), result.destination)} with schema, upgrade migration, standalone login function, instructions, and SHA-256 manifest. No hosted changes were made.`);
}
