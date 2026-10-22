module.exports = {
  root: true,
  env: { es2022: true, node: true },
  extends: ['eslint:recommended'],
  // react: so a component used only in JSX counts as used; react-hooks: the
  // rules the app's own eslint-disable comments already name.
  plugins: ['react', 'react-hooks'],
  settings: { react: { version: 'detect' } },
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
    alert: 'readonly',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',
    'react/jsx-uses-vars': 'error',
    'react/jsx-uses-react': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
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