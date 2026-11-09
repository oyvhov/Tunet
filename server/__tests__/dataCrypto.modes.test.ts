// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

type Mode = 'off' | 'dual' | 'enc_only' | string;

const HEX_KEY = 'ab'.repeat(32);
const OTHER_HEX_KEY = 'cd'.repeat(32);
const PASSPHRASE = 'a long passphrase for the dashboard data';
const STUB = '{"_enc_only":true}';
const secret = JSON.stringify({ version: 1, name: 'Stue – æøå 🏠' });
const unavailable = { status: 503, code: 'DATA_ENCRYPTION_UNAVAILABLE' };

const load = async (mode: Mode | undefined, dataKey = HEX_KEY, salt = '') => {
  vi.resetModules();
  vi.stubEnv('TUNET_ENCRYPTION_MODE', mode as string);
  vi.stubEnv('TUNET_DATA_KEY', dataKey);
  vi.stubEnv('TUNET_DATA_KEY_SALT', salt);
  return import('../utils/dataCrypto.js');
};

const tamperByte = (encrypted: string, offset: number) => {
  const bytes = Buffer.from(encrypted.slice('enc:v1:'.length), 'base64');
  bytes[offset] ^= 1;
  return `enc:v1:${bytes.toString('base64')}`;
};

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('encryption modes', () => {
  it.each([
    ['off', 'off', false, true],
    ['dual', 'dual', true, true],
    ['enc_only', 'enc_only', true, false],
    [' DUAL ', 'dual', true, true],
    ['Enc_Only', 'enc_only', true, false],
    ['garbage', 'off', false, true],
    ['', 'off', false, true],
  ])('reads mode %j as %s', async (raw, mode, enabled, keepsPlaintext) => {
    const crypto = await load(raw);

    expect(crypto.getDataEncryptionMode()).toBe(mode);
    expect(crypto.isDataEncryptionEnabled()).toBe(enabled);
    expect(crypto.isEncryptionWriteRequired()).toBe(enabled);
    expect(crypto.shouldPersistPlaintextData()).toBe(keepsPlaintext);
  });

  it('never writes ciphertext in off mode, even with a key', async () => {
    const crypto = await load('off');

    expect(crypto.encryptDataText(secret)).toBeNull();
  });

  it('warns once when a mode is on without a key', async () => {
    await load('dual', '');

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Encrypted storage'));
  });
});

describe('writing and reading back', () => {
  it.each(['dual', 'enc_only'])('round-trips text in %s mode', async (mode) => {
    const crypto = await load(mode);

    const encrypted = crypto.encryptDataText(secret);

    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain('Stue');
    expect(crypto.resolveStoredDataText({ plainText: STUB, encryptedText: encrypted })).toBe(
      secret
    );
  });

  it('uses a fresh IV for each write', async () => {
    const crypto = await load('enc_only');

    expect(crypto.encryptDataText(secret)).not.toBe(crypto.encryptDataText(secret));
  });

  it.each([null, undefined, 42, { a: 1 }])('refuses to encrypt %j', async (value) => {
    const crypto = await load('enc_only');

    expect(crypto.encryptDataText(value)).toBeNull();
  });

  it('reads ciphertext written under dual after switching to enc_only and back to off', async () => {
    const dual = await load('dual');
    const encrypted = dual.encryptDataText(secret);

    const encOnly = await load('enc_only');
    const off = await load('off');

    expect(encOnly.resolveStoredDataText({ plainText: STUB, encryptedText: encrypted })).toBe(
      secret
    );
    expect(off.resolveStoredDataText({ plainText: STUB, encryptedText: encrypted })).toBe(secret);
  });
});

describe('rows without ciphertext', () => {
  it.each(['off', 'dual', 'enc_only'])('returns plaintext in %s mode', async (mode) => {
    const crypto = await load(mode);

    expect(crypto.resolveStoredDataText({ plainText: secret, encryptedText: null })).toBe(secret);
    expect(crypto.resolveStoredDataText({ plainText: secret, encryptedText: '   ' })).toBe(secret);
  });

  it('returns null when nothing is stored', async () => {
    const crypto = await load('dual');

    expect(crypto.resolveStoredDataText({ plainText: undefined, encryptedText: null })).toBeNull();
  });

  it.each(['off', 'dual', 'enc_only'])(
    'refuses to serve the enc_only stub as data in %s mode',
    async (mode) => {
      const crypto = await load(mode);

      expect(() => crypto.resolveStoredDataText({ plainText: STUB, encryptedText: null })).toThrow(
        expect.objectContaining(unavailable)
      );
    }
  );
});

describe('unreadable ciphertext', () => {
  it('rejects data written with another key rather than falling back to plaintext', async () => {
    const encrypted = (await load('dual')).encryptDataText(secret);
    const crypto = await load('dual', OTHER_HEX_KEY);

    expect(() =>
      crypto.resolveStoredDataText({ plainText: secret, encryptedText: encrypted })
    ).toThrow(expect.objectContaining(unavailable));
  });

  it.each([
    ['IV', 0],
    ['auth tag', 12],
    ['ciphertext', 28],
  ])('rejects a flipped bit in the %s', async (_part, offset) => {
    const crypto = await load('enc_only');
    const encrypted = crypto.encryptDataText(secret) as string;

    expect(() =>
      crypto.resolveStoredDataText({
        plainText: secret,
        encryptedText: tamperByte(encrypted, offset),
      })
    ).toThrow(expect.objectContaining(unavailable));
  });

  it.each([
    ['a value without the prefix', 'not-encrypted'],
    ['a truncated payload', `enc:v1:${randomBytes(28).toString('base64')}`],
  ])('rejects %s', async (_name, encryptedText) => {
    const crypto = await load('enc_only');

    expect(() => crypto.resolveStoredDataText({ plainText: secret, encryptedText })).toThrow(
      expect.objectContaining(unavailable)
    );
  });
});

describe('key formats', () => {
  it('accepts a 32-byte base64 key', async () => {
    const crypto = await load('enc_only', randomBytes(32).toString('base64'));

    expect(crypto.encryptDataText(secret)).toMatch(/^enc:v1:/);
  });

  it('reads the same key as hex or base64', async () => {
    const encrypted = (await load('enc_only', HEX_KEY)).encryptDataText(secret);
    const base64Key = Buffer.from(HEX_KEY, 'hex').toString('base64');
    const crypto = await load('enc_only', base64Key);

    expect(crypto.resolveStoredDataText({ plainText: STUB, encryptedText: encrypted })).toBe(
      secret
    );
  });

  it('derives a stable key from a passphrase with a salt', async () => {
    const encrypted = (await load('enc_only', PASSPHRASE, 'salt-a')).encryptDataText(secret);
    const crypto = await load('enc_only', PASSPHRASE, 'salt-a');

    expect(encrypted).toMatch(/^enc:v1:/);
    expect(crypto.resolveStoredDataText({ plainText: STUB, encryptedText: encrypted })).toBe(
      secret
    );
  });

  it('cannot read passphrase data with another salt', async () => {
    const encrypted = (await load('enc_only', PASSPHRASE, 'salt-a')).encryptDataText(secret);
    const crypto = await load('enc_only', PASSPHRASE, 'salt-b');

    expect(() =>
      crypto.resolveStoredDataText({ plainText: STUB, encryptedText: encrypted })
    ).toThrow(expect.objectContaining(unavailable));
  });

  it('refuses a passphrase without a salt and says so', async () => {
    const encrypted = (await load('enc_only', PASSPHRASE, 'salt-a')).encryptDataText(secret);
    vi.mocked(console.warn).mockClear();
    const crypto = await load('enc_only', PASSPHRASE, '');

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('TUNET_DATA_KEY_SALT'));
    expect(crypto.encryptDataText(secret)).toBeNull();
    expect(() =>
      crypto.resolveStoredDataText({ plainText: STUB, encryptedText: encrypted })
    ).toThrow(expect.objectContaining(unavailable));
  });

  it('refuses a key that is too short', async () => {
    const crypto = await load('enc_only', 'short', 'salt');

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('too short'));
    expect(crypto.encryptDataText(secret)).toBeNull();
  });
});

describe('protecting stored rows', () => {
  it('lets a row without ciphertext be overwritten without a key', async () => {
    const crypto = await load('off', '');

    expect(() => crypto.assertStoredDataWritable({ data: secret }, null)).not.toThrow();
    expect(() =>
      crypto.assertStoredDataWritable({ data: secret, data_enc: null }, null)
    ).not.toThrow();
  });

  it('allows an overwrite only when the new payload is encrypted too', async () => {
    const crypto = await load('dual');
    const encrypted = crypto.encryptDataText(secret) as string;
    const row = { data: secret, data_enc: encrypted };

    expect(() => crypto.assertStoredDataWritable(row, encrypted)).not.toThrow();
    expect(() => crypto.assertStoredDataWritable(row, null)).toThrow(
      expect.objectContaining(unavailable)
    );
  });
});

describe('handleDataEncryptionError', () => {
  const response = () => {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
  };

  it('answers 503 for an encryption error', async () => {
    const crypto = await load('enc_only', HEX_KEY);
    const res = response();
    const next = vi.fn();
    const error = Object.assign(new Error('nope'), { code: 'DATA_ENCRYPTION_UNAVAILABLE' });

    crypto.handleDataEncryptionError(
      error,
      {} as Request,
      res as unknown as Response,
      next as NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'nope',
      code: 'DATA_ENCRYPTION_UNAVAILABLE',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes other errors on', async () => {
    const crypto = await load('enc_only', HEX_KEY);
    const res = response();
    const next = vi.fn();
    const error = new Error('database locked');

    crypto.handleDataEncryptionError(
      error,
      {} as Request,
      res as unknown as Response,
      next as NextFunction
    );

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
