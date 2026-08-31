/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  collectCoverageFrom: ['src/lib/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
};
