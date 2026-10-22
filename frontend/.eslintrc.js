module.exports = {
  root: true,
  env: { es2022: true, node: true },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  globals: {
    // React Native / Expo runtime globals that eslint:recommended does not know.
    __DEV__: 'readonly',
    fetch: 'readonly',
    console: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    Promise: 'readonly',
    URL: 'readonly',
    FormData: 'readonly',
    Blob: 'readonly',
    AbortController: 'readonly',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'coverage/'],
  overrides: [
    {
      // Scripts run in node, not in the RN runtime.
      files: ['scripts/**/*.js'],
      env: { node: true },
    },
  ],
};