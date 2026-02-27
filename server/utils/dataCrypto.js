import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const SUPPORTED_MODES = new Set(['off', 'dual', 'enc_only']);
const ENCRYPTION_PREFIX = 'enc:v1:';
const PASSPHRASE_SALT = process.env.TUNET_DATA_KEY_SALT || '';
const warnedMessages = new Set();

const warnOnce = (message) => {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
};

const normalizeMode = (rawMode) => {
  if (typeof rawMode !== 'string') return 'off';
  const mode = rawMode.trim().toLowerCase();
  return SUPPORTED_MODES.has(mode) ? mode : 'off';
};

const decodeBase64Candidate = (rawKey) => {
  try {
    const decoded = Buffer.from(rawKey, 'base64');
    return decoded.length === 32 ? decoded : null;
  } catch {
    return null;
  }
};

const decodeHexCandidate = (rawKey) => {
  const cleaned = rawKey.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) return null;
  try {
    const decoded = Buffer.from(cleaned, 'hex');
    return decoded.length === 32 ? decoded : null;
  } catch {
    return null;
  }
};

const deriveEncryptionKey = (rawKey) => {
  if (typeof rawKey !== 'string' || !rawKey.trim()) return null;

  const trimmed = rawKey.trim();
  const fromHex = decodeHexCandidate(trimmed);
  if (fromHex) return fromHex;

  const fromBase64 = decodeBase64Candidate(trimmed);
  if (fromBase64) return fromBase64;

  if (trimmed.length < 16) {
    warnOnce('[data-crypto] TUNET_DATA_KEY is too short. Use a 32-byte base64/hex key or a long passphrase.');
    return null;
  }

  if (!PASSPHRASE_SALT) {
    warnOnce('[data-crypto] TUNET_DATA_KEY_SALT is required when TUNET_DATA_KEY is a passphrase. Use a 32-byte base64/hex key to avoid salt requirements.');
    return null;
  }

  try {
    return scryptSync(trimmed, PASSPHRASE_SALT, 32, { N: 16384, r: 8, p: 1 });
  } catch {
    warnOnce('[data-crypto] Failed to derive encryption key from TUNET_DATA_KEY.');
    return null;
  }
};

const DATA_ENCRYPTION_MODE = normalizeMode(process.env.TUNET_ENCRYPTION_MODE);
const DATA_ENCRYPTION_KEY = deriveEncryptionKey(process.env.TUNET_DATA_KEY || '');

if (DATA_ENCRYPTION_MODE !== 'off' && !DATA_ENCRYPTION_KEY) {
  warnOnce('[data-crypto] TUNET_ENCRYPTION_MODE is enabled but TUNET_DATA_KEY is missing. Falling back to plaintext reads/writes.');
}

export const getDataEncryptionMode = () => DATA_ENCRYPTION_MODE;
export const isDataEncryptionEnabled = () => DATA_ENCRYPTION_MODE !== 'off';
export const isEncryptionWriteRequired = () => DATA_ENCRYPTION_MODE === 'enc_only';
export const shouldPersistPlaintextData = () => DATA_ENCRYPTION_MODE !== 'enc_only';
export const getEncryptedOnlyPlaintextStub = () => '{"_enc_only":true}';

const canWriteEncryptedData = () => DATA_ENCRYPTION_MODE !== 'off' && Boolean(DATA_ENCRYPTION_KEY);

const decryptPayload = (encryptedValue) => {
  if (!DATA_ENCRYPTION_KEY) return null;
  if (typeof encryptedValue !== 'string' || !encryptedValue.startsWith(ENCRYPTION_PREFIX)) return null;

  try {
    const payload = Buffer.from(encryptedValue.slice(ENCRYPTION_PREFIX.length), 'base64');
    if (payload.length <= 28) return null;

    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);

    const decipher = createDecipheriv('aes-256-gcm', DATA_ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    return null;
  }
};

export const encryptDataText = (plainText) => {
  if (!canWriteEncryptedData()) return null;
  if (typeof plainText !== 'string') return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', DATA_ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}${Buffer.concat([iv, authTag, encrypted]).toString('base64')}`;
};

export const resolveStoredDataText = ({ plainText, encryptedText, context = 'unknown' }) => {
  const plain = typeof plainText === 'string' ? plainText : null;
  const encrypted = typeof encryptedText === 'string' && encryptedText.trim() ? encryptedText : null;

  if (DATA_ENCRYPTION_MODE === 'off') {
    if (plain) return plain;
    return encrypted ? decryptPayload(encrypted) : null;
  }

  if (encrypted) {
    const decrypted = decryptPayload(encrypted);
    if (decrypted !== null) return decrypted;
    if (DATA_ENCRYPTION_MODE === 'enc_only') {
      warnOnce(`[data-crypto] Failed to decrypt payload in ${context} while in enc_only mode.`);
      return null;
    }
    warnOnce(`[data-crypto] Failed to decrypt payload in ${context}. Falling back to plaintext data.`);
  }

  return plain;
};