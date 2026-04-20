#!/usr/bin/env node
/**
 * CI bundle-size gate.
 * Fails the build if any chunk exceeds its size threshold.
 *
 * Thresholds are in KB (uncompressed).  Adjust as the app grows.
 */
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const DIST_DIR = join(process.cwd(), 'dist', 'assets');

/** Maximum allowed size per chunk pattern (KB). */
const THRESHOLDS = {
  'index':            850,
  'vendor-react':     200,
  'vendor-router':    100,
  'vendor-ha-ws':     80,
  'vendor-leaflet':   200,
  'vendor-utils':     200,
  'vendor-icons':     500, // per-icon chunk; none should be huge
};

const KB = 1024;

function matchThreshold(name) {
  for (const [pattern, limit] of Object.entries(THRESHOLDS)) {
    if (name.startsWith(pattern)) return { pattern, limit };
  }
  return null;
}

let exitCode = 0;
const files = readdirSync(DIST_DIR).filter((f) => f.endsWith('.js'));

console.log('\n  Bundle size report');
console.log('  ' + '─'.repeat(58));

for (const file of files.sort()) {
  const sizeBytes = statSync(join(DIST_DIR, file)).size;
  const sizeKB = (sizeBytes / KB).toFixed(1);
  const chunkName = file.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
  const match = matchThreshold(chunkName);

  let status = '  ';
  if (match) {
    if (sizeBytes > match.limit * KB) {
      status = '❌';
      exitCode = 1;
      console.error(
        `  ${status} ${file.padEnd(42)} ${String(sizeKB).padStart(8)} KB  (limit: ${match.limit} KB)`
      );
    } else {
      status = '✓ ';
      console.log(
        `  ${status} ${file.padEnd(42)} ${String(sizeKB).padStart(8)} KB  (limit: ${match.limit} KB)`
      );
    }
  } else {
    console.log(`  ${status} ${file.padEnd(42)} ${String(sizeKB).padStart(8)} KB`);
  }
}

console.log('  ' + '─'.repeat(58));

if (exitCode) {
  console.error('\n  ❌ One or more chunks exceed the size threshold.\n');
} else {
  console.log('\n  ✓  All chunks within size limits.\n');
}

process.exit(exitCode);
