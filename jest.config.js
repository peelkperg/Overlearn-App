/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  moduleNameMapper: { '\\.css$': '<rootDir>/__mocks__/styleMock.js' },
  // Screens and components are in scope: the defects that reach users live
  // there, and excluding them made coverage look healthy while the two
  // worst Epic 1 bugs sat in unmeasured code.
  collectCoverageFrom: ['src/lib/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}', 'src/app/**/*.tsx', 'src/components/**/*.tsx'],
};
