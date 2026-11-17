import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 60000,
 use: { baseURL: 'http://127.0.0.1:5173', headless: true, viewport: { width: 1280, height: 900 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
 webServer: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: false, env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' } },
});
