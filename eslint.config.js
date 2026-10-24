import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  fetch: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  FileReader: 'readonly',
  Image: 'readonly',
  HTMLElement: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  AbortController: 'readonly',
  IntersectionObserver: 'readonly',
  ResizeObserver: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  __APP_VERSION__: 'readonly',
};

const unusedVarsOptions = {
  argsIgnorePattern: '^_',
  varsIgnorePattern: '^_',
  caughtErrorsIgnorePattern: '^_',
};

const sharedRules = {
  'react/jsx-uses-vars': 'error',
  'react/jsx-uses-react': 'error',
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'error',
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'no-debugger': 'error',
  'no-empty': ['warn', { allowEmptyCatch: true }],
};

const tsFiles = ['src/**/*.{ts,tsx}'];

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: browserGlobals,
    },
    rules: {
      ...sharedRules,
      'no-unused-vars': ['warn', unusedVarsOptions],
    },
  },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: tsFiles })),
  {
    files: tsFiles,
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: browserGlobals,
    },
    rules: {
      ...sharedRules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', unusedVarsOptions],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'scripts/', 'src/__tests__/'],
  },
];
