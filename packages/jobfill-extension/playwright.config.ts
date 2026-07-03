import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  webServer: {
    command: 'python server.py',
    url: 'http://localhost:8085/api/db',
    reuseExistingServer: true,
    timeout: 30_000,
    cwd: packageRoot
  }
});
