// Must use the same specifier the source uses: requiring './src/lib/storage'
// resolves to a second module instance with its own MMKV mock, so clearing
// it would leave the store the code under test actually reads untouched.
const { storage } = require('@/lib/storage');

// Every suite shares one MMKV mock instance. Without a global reset, a file
// that forgets its own beforeEach inherits whatever the previous one wrote,
// which makes the suite order-dependent.
beforeEach(() => {
  storage.clearAll();
});
