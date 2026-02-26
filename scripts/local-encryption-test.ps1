param(
  [ValidateSet('off', 'dual', 'enc_only')]
  [string]$Mode = 'dual',
  [string]$Key = '',
  [switch]$SkipTests,
  [switch]$StartServer
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

if ($Mode -ne 'off' -and [string]::IsNullOrWhiteSpace($Key)) {
  $Key = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
}

$env:TUNET_ENCRYPTION_MODE = $Mode
if ($Mode -ne 'off') {
  $env:TUNET_DATA_KEY = $Key
}

Write-Host "Mode: $Mode"
if ($Mode -ne 'off') {
  Write-Host "TUNET_DATA_KEY is set for this shell session"
}

$dbPath = Join-Path $root 'data/tunet.db'
if (Test-Path $dbPath) {
  $backupDir = Join-Path $root 'data/backups'
  if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
  }
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $backupPath = Join-Path $backupDir "tunet-$stamp.db"
  Copy-Item -Path $dbPath -Destination $backupPath -Force
  Write-Host "DB backup: $backupPath"
}

if (-not $SkipTests) {
  npm test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  npm run lint
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  node --check server/utils/dataCrypto.js
  node --check server/routes/settings.js
  node --check server/routes/profiles.js
  node --check server/db.js
}

node scripts/check-encryption-db.mjs

Write-Host ""
Write-Host "Manual verification steps:"
Write-Host "1) Start app and backend with current env vars"
Write-Host "2) Save/update profile, run sync, publish, and load revision"
Write-Host "3) Re-run: node scripts/check-encryption-db.mjs"
Write-Host ""
Write-Host "To test fallback behavior with wrong key:"
Write-Host "1) Set a different TUNET_DATA_KEY"
Write-Host "2) Keep mode as dual"
Write-Host "3) Verify app still loads data"

if ($StartServer) {
  npm run dev:server
}
