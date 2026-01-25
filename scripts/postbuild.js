import { spawnSync } from 'node:child_process';

const result = spawnSync('docker', ['compose', 'build'], { stdio: 'inherit' });

if (result.error) {
  if (result.error.code === 'ENOENT') {
    console.warn('Docker not available. Skipping docker compose build.');
    process.exit(0);
  }
  console.error('Docker build failed:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
