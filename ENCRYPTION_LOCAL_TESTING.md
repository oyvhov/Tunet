# Local Encryption Testing

Use this flow on the bugfixes branch to validate encryption migration safety with no data loss.

## 1) Run in dual mode

PowerShell:

./scripts/local-encryption-test.ps1 -Mode dual

This does:
- sets local shell env vars
- backs up data/tunet.db to data/backups
- runs tests and lint
- prints encrypted vs plaintext row counts

## 2) Manual app checks

- Open the app
- Save a new profile
- Update an existing profile
- Run settings auto-sync
- Publish settings from one device to another
- Load an older revision

Then run:

node scripts/check-encryption-db.mjs

Expected in dual mode:
- plaintextRows > 0
- encryptedRows > 0 for tables with newly written rows

## 3) Fallback safety check

Keep mode as dual, but set a temporary wrong key for one run and verify data still loads:

$env:TUNET_ENCRYPTION_MODE = 'dual'
$env:TUNET_DATA_KEY = 'wrong-key-test'
npm run dev:server

Expected:
- app still works via plaintext fallback

Restore the correct key after this check.

## 4) Off mode compatibility check

$env:TUNET_ENCRYPTION_MODE = 'off'
npm run dev:server

Expected:
- existing data still loads

## Notes

- Do not move to enc_only until dual has been running safely for at least one release cycle.
- Keep DB backups in data/backups before changing mode or key.
