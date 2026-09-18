// Hostinger Node.js Production Entry Point
// This file delegates execution to the compiled server bundle in dist/server.cjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const bundledServer = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(bundledServer)) {
  require(bundledServer);
} else {
  console.log('[Hostinger Starter] dist/server.cjs not found yet. Running build...');
  try {
    const { execSync } = require('child_process');
    execSync('npm run build', { stdio: 'inherit' });
    require(bundledServer);
  } catch (err) {
    console.error('[Hostinger Starter] Failed to start server:', err);
    process.exit(1);
  }
}

