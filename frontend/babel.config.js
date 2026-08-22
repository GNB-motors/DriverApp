// Expo's Metro transformer wires this file in via `extends`, so it must supply
// babel-preset-expo. In this project the Expo toolchain (and babel-preset-expo)
// is nested under node_modules/expo, so we require the preset object directly
// (via Expo's internal re-export, with a fallback) instead of by bare name,
// which Babel cannot resolve from the project root.
function expoPreset() {
  try {
    return require('expo/internal/babel-preset');
  } catch {
    return require('babel-preset-expo');
  }
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [expoPreset()],
    // Production-only: strip console.* from the bundle so release builds don't
    // leak logs / PII. console.error and console.warn are kept so genuine
    // failures still surface. Expo's transformer sets BABEL_ENV=production for
    // non-dev builds (`expo export`, EAS release), which activates this env.
    env: {
      production: {
        plugins: [['transform-remove-console', { exclude: ['error', 'warn'] }]],
      },
    },
  };
};
