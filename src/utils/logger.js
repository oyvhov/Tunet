const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;

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
  }
};
