// [Review][Patch] found via code review 2026-09-12 (Story 4.6): formatRowDate
// (src/components/SegmentListItem.tsx) uses local-time Date getters on UTC
// ISO timestamps by deliberate choice (a practice logged at 23:30 local
// time should read as "today," not roll to UTC's next day). Every fixture
// date in the suite used 12:00:00.000Z specifically because that is the one
// band safe at nearly every real-world offset — without pinning TZ, the
// suite would still pass locally but go red on a CI runner at UTC+13/-13,
// and the failure would look like a product bug rather than an environment
// one. Set here (config load time, before Jest forks workers) rather than
// in jest.setup.js, which runs per-worker after the environment is already
// established.
process.env.TZ = 'UTC';

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
