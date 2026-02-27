const importMetaEnv =
  typeof import.meta !== 'undefined'
    ? /** @type {{ DEV?: boolean } | undefined} */ (/** @type {any} */ (import.meta).env)
    : undefined;
const isDev = Boolean(importMetaEnv?.DEV);

export const logger = {
  debug: (...args) => {
    if (isDev) console.warn('[DEBUG]', ...args);
  },
  info: (...args) => {
    if (isDev) console.warn('[INFO]', ...args);
  },
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
};
