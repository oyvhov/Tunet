// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCipheriv } from 'node:crypto';
import Database from 'better-sqlite3';

const key = 'ab'.repeat(32);
const plainText = JSON.stringify({ version: 1, layout: { pages: ['home'] } });
const encryptFixture = () => {
  const iv = Buffer.alloc(12, 7);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const payload = Buffer.concat([cipher.update(plainText), cipher.final()]);
  return 'enc:v1:' + Buffer.concat([iv, cipher.getAuthTag(), payload]).toString('base64');
};
const loadCrypto = async (mode, dataKey = key) => {
  vi.resetModules();
  vi.stubEnv('TUNET_ENCRYPTION_MODE', mode);
  vi.stubEnv('TUNET_DATA_KEY', dataKey);
  vi.stubEnv('TUNET_DATA_KEY_SALT', '');
  return import('../utils/dataCrypto.js');
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('encrypted storage protection', () => {
  it('lets an unencrypted deployment start while protecting unreadable encrypted rows', async () => {
    const crypto = await loadCrypto('off', '');
    expect(() => crypto.verifyStoredEncryption(null)).not.toThrow();
    expect(() =>
      crypto.resolveStoredDataText({ plainText, encryptedText: encryptFixture() })
    ).toThrow(expect.objectContaining({ status: 503 }));
  });
  it.each(['off', 'dual', 'enc_only'])(
    'reads encrypted data in %s mode instead of the plaintext stub',
    async (mode) => {
      const crypto = await loadCrypto(mode);
      expect(
        crypto.resolveStoredDataText({
          plainText: '{"_enc_only":true}',
          encryptedText: encryptFixture(),
        })
      ).toBe(plainText);
    }
  );

  it.each(['off', 'dual', 'enc_only'])(
    'rejects wrong keys in %s mode even if plaintext exists',
    async (mode) => {
      const crypto = await loadCrypto(mode, 'cd'.repeat(32));
      expect(() =>
        crypto.resolveStoredDataText({ plainText, encryptedText: encryptFixture() })
      ).toThrow(expect.objectContaining({ status: 503, code: 'DATA_ENCRYPTION_UNAVAILABLE' }));
    }
  );

  it('rejects a tampered authentication tag', async () => {
    const crypto = await loadCrypto('enc_only');
    const bytes = Buffer.from(encryptFixture().slice(7), 'base64');
    bytes[12] ^= 1;
    expect(() =>
      crypto.resolveStoredDataText({
        plainText,
        encryptedText: 'enc:v1:' + bytes.toString('base64'),
      })
    ).toThrow();
  });

  it('refuses to erase ciphertext when encryption has been disabled', async () => {
    const crypto = await loadCrypto('off');
    expect(() =>
      crypto.assertStoredDataWritable({ data: plainText, data_enc: encryptFixture() }, null)
    ).toThrow(expect.objectContaining({ status: 503 }));
  });

  it.each(['dual', 'enc_only'])('requires a working key for %s writes', async (mode) => {
    const crypto = await loadCrypto(mode, 'a long passphrase without a salt');
    expect(crypto.encryptDataText(plainText)).toBeNull();
    expect(crypto.isEncryptionWriteRequired()).toBe(true);
    expect(() => crypto.verifyStoredEncryption(null)).toThrow();
  });

  it('detects a wrong key against existing storage before the server starts', async () => {
    const database = new Database(':memory:');
    try {
      for (const table of ['profiles', 'current_settings', 'current_settings_history']) {
        database.exec(`CREATE TABLE ${table} (data TEXT, data_enc TEXT)`);
      }
      database
        .prepare('INSERT INTO current_settings VALUES (?, ?)')
        .run(plainText, encryptFixture());
      const good = await loadCrypto('enc_only');
      expect(() => good.verifyStoredEncryption(database)).not.toThrow();
      const bad = await loadCrypto('enc_only', 'cd'.repeat(32));
      expect(() => bad.verifyStoredEncryption(database)).toThrow();
      expect(database.prepare('SELECT data_enc FROM current_settings').get().data_enc).toBe(
        encryptFixture()
      );
    } finally {
      database.close();
    }
  });
});
