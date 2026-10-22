/**
 * Jest config for the DriverApp.
 *
 * The app had no test runner until A6, so this starts from an empty suite and
 * `npm test` is allowed to pass on one. That is a deliberate, temporary state:
 * it is here so that the FIRST test that lands is enforced from day one, rather
 * than waiting for someone to build a harness later.
 *
 * jest-expo is the preset that understands the Expo/React Native module map.
 * When tests that render components are added, `jest-expo` + `@testing-library/
 * react-native` + `react-test-renderer` are the three packages to add.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.js?(x)', '**/?(*.)+(spec|test).js?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg))',
  ],
  collectCoverageFrom: ['src/**/*.{js,jsx}'],
};