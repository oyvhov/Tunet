import { spawnSync } from 'node:child_process';

// Skip when running inside Docker build or CI
if (process.env.SKIP_POSTBUILD || process.env.CI) {
  console.log('Skipping postbuild (SKIP_POSTBUILD or CI set).');
  process.exit(0);
}

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
