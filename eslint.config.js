// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Test files and the Jest setup run under Jest's globals.
    files: ["**/*.test.ts", "**/*.test.tsx", "jest.setup.js"],
    languageOptions: {
      globals: { ...require("globals").jest },
    },
  }
]);
