import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const root = process.cwd();

const paths = {
  pkg: path.join(root, 'package.json'),
  lock: path.join(root, 'package-lock.json'),
  changelog: path.join(root, 'CHANGELOG.md'),
  addonConfig: path.join(root, 'hassio-addon', 'config.yaml'),
  addonChangelog: path.join(root, 'hassio-addon', 'CHANGELOG.md'),
  addonDockerfile: path.join(root, 'hassio-addon', 'Dockerfile'),
};

function usage() {
  console.log(`\nUsage:\n  npm run release:check\n  npm run release:prep -- --version 1.1.0 [--date 2026-02-14]\n  npm run release:publish\n`);
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function extractAddonVersion(configYaml) {
  const match = configYaml.match(/^version:\s*"([^"]+)"/m);
  return match ? match[1] : null;
}

function upsertTopSection(changelog, heading, body) {
  if (changelog.includes(heading)) return changelog;

  const headerMatch = changelog.match(/^#\s+Changelog\s*\n+/i);
  if (!headerMatch) {
    return `# Changelog\n\n${heading}\n\n${body}\n\n${changelog}`;
  }

  const insertAt = headerMatch[0].length;
  return `${changelog.slice(0, insertAt)}${heading}\n\n${body}\n\n${changelog.slice(insertAt)}`;
}

function upsertMainChangelogEntry(changelog, appVersion, releaseDate) {
  const heading = `## [${appVersion}] — ${releaseDate}`;
  const body = ['### Changed', '- Release metadata sync.'].join('\n');

  if (changelog.includes(`## [${appVersion}]`)) return changelog;

  const semverAnchor = 'and this project adheres to [Semantic Versioning](https://semver.org/).';
  const idx = changelog.indexOf(semverAnchor);
  if (idx === -1) {
    return `${changelog.trimEnd()}\n\n${heading}\n\n${body}\n`;
  }

  const insertAt = idx + semverAnchor.length;
  return `${changelog.slice(0, insertAt)}\n\n${heading}\n\n${body}\n${changelog.slice(insertAt)}`;
}

function extractMainChangelogNotes(changelog, appVersion) {
  const headingRegex = new RegExp(`^## \\[${appVersion.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\].*$`, 'm');
  const headingMatch = changelog.match(headingRegex);
  if (!headingMatch || headingMatch.index === undefined) {
    return `Release ${appVersion}`;
  }

  const start = headingMatch.index + headingMatch[0].length;
  const rest = changelog.slice(start);
  const nextHeadingMatch = rest.match(/^##\s+/m);
  const end = nextHeadingMatch && nextHeadingMatch.index !== undefined
    ? start + nextHeadingMatch.index
    : changelog.length;

  const sectionBody = changelog.slice(start, end).trim();
  return sectionBody || `Release ${appVersion}`;
}

function isPreRelease(version) {
  return /-(alpha|beta|rc)/i.test(version);
}

async function runPublish() {
  const [pkg, changelog] = await Promise.all([
    readJson(paths.pkg),
    readFile(paths.changelog, 'utf8'),
  ]);

  const appVersion = pkg.version;
  if (!appVersion) fail('Missing package.json version.');

  const tag = `v${appVersion}`;

  try {
    await execFileAsync('git', ['rev-parse', '--verify', tag], { cwd: root });
  } catch {
    fail(`Tag ${tag} does not exist locally. Create/tag before running release:publish.`);
  }

  try {
    await execFileAsync('gh', ['release', 'view', tag], { cwd: root });
    console.log(`ℹ️ GitHub release ${tag} already exists. Skipping publish.`);
    return;
  } catch {
    // not found, continue with create
  }

  const notes = extractMainChangelogNotes(changelog, appVersion);
  const createArgs = ['release', 'create', tag, '--title', tag, '--notes', notes];
  if (isPreRelease(appVersion)) {
    createArgs.push('--prerelease');
  }

  await execFileAsync('gh', createArgs, { cwd: root, maxBuffer: 1024 * 1024 * 4 });
  console.log(`✅ Published GitHub release ${tag}${isPreRelease(appVersion) ? ' (pre-release)' : ''}.`);
}

async function runCheck() {
  const [pkg, lock, mainChangelog, addonConfig, addonChangelog, addonDockerfile] = await Promise.all([
    readJson(paths.pkg),
    readJson(paths.lock),
    readFile(paths.changelog, 'utf8'),
    readFile(paths.addonConfig, 'utf8'),
    readFile(paths.addonChangelog, 'utf8'),
    readFile(paths.addonDockerfile, 'utf8'),
  ]);

  const errors = [];
  const pkgVersion = pkg.version;
  const lockVersion = lock.version;
  const lockRootVersion = lock.packages?.['']?.version;
  const addonVersion = extractAddonVersion(addonConfig);

  if (!pkgVersion) errors.push('Missing package.json version.');
  if (lockVersion !== pkgVersion) errors.push(`package-lock.json version (${lockVersion}) != package.json (${pkgVersion}).`);
  if (lockRootVersion !== pkgVersion) errors.push(`package-lock.json root package version (${lockRootVersion}) != package.json (${pkgVersion}).`);
  if (!mainChangelog.includes(`## [${pkgVersion}]`)) errors.push(`CHANGELOG.md is missing entry for ${pkgVersion}.`);

  if (!addonVersion) {
    errors.push('Could not read hassio-addon/config.yaml version.');
  } else {
    if (pkgVersion !== addonVersion) {
      errors.push(`package.json version (${pkgVersion}) must equal hassio-addon/config.yaml version (${addonVersion}) for lockstep versioning.`);
    }
    if (!addonChangelog.includes(`## ${addonVersion}`)) {
      errors.push(`hassio-addon/CHANGELOG.md is missing entry for ${addonVersion}.`);
    }
  }

  if (!addonDockerfile.includes('--branch main')) {
    errors.push('hassio-addon/Dockerfile should build from --branch main for predictable updates.');
  }

  if (errors.length) {
    console.error('❌ Release check failed:\n');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log('✅ Release check passed. Versions and changelogs are in sync.');
}

async function runPrep(args) {
  const version = args.version;
  const releaseDate = args.date || new Date().toISOString().slice(0, 10);

  if (!version) {
    usage();
    fail('release:prep requires --version.');
  }

  const [pkg, lock, mainChangelog, addonConfig, addonChangelog] = await Promise.all([
    readJson(paths.pkg),
    readJson(paths.lock),
    readFile(paths.changelog, 'utf8'),
    readFile(paths.addonConfig, 'utf8'),
    readFile(paths.addonChangelog, 'utf8'),
  ]);

  pkg.version = version;
  lock.version = version;
  if (!lock.packages) lock.packages = {};
  if (!lock.packages['']) lock.packages[''] = {};
  lock.packages[''].version = version;

  const nextAddonConfig = addonConfig.replace(/^version:\s*"[^"]+"/m, `version: "${version}"`);
  const nextMainChangelog = upsertMainChangelogEntry(mainChangelog, version, releaseDate);
  const nextAddonChangelog = upsertTopSection(
    addonChangelog,
    `## ${version}`,
    '- Release metadata sync.'
  );

  await Promise.all([
    writeJson(paths.pkg, pkg),
    writeJson(paths.lock, lock),
    writeFile(paths.addonConfig, nextAddonConfig, 'utf8'),
    writeFile(paths.changelog, nextMainChangelog, 'utf8'),
    writeFile(paths.addonChangelog, nextAddonChangelog, 'utf8'),
  ]);

  console.log(`✅ Prepared release files: version=${version}, date=${releaseDate}`);
}

async function main() {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));

  if (!command || command === '--help' || command === '-h') {
    usage();
    return;
  }

  if (command === 'check') {
    await runCheck();
    return;
  }

  if (command === 'prep') {
    await runPrep(args);
    return;
  }

  if (command === 'publish') {
    await runPublish();
    return;
  }

  usage();
  fail(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
