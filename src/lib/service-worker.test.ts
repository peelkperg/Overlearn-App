// Covers all four registration branches from spec-6-3's I/O & Edge-Case
// Matrix. Platform.OS and __DEV__ are module-load-time-relevant globals, so
// each branch resets modules and re-mocks 'react-native' before re-importing
// registerServiceWorker -- a single shared import can't observe different
// Platform.OS values across cases.

describe('lib/service-worker registerServiceWorker', () => {
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    jest.resetModules();
    jest.dontMock('react-native');
    delete (globalThis as { navigator?: unknown }).navigator;
  });

  function setUp(platformOS: string, isDev: boolean) {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: platformOS } }));
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: { experiments: { baseUrl: '/Overlearn-App/' } } },
    }));
    (globalThis as { __DEV__?: boolean }).__DEV__ = isDev;
  }

  it('dev web session: returns without registering', () => {
    setUp('web', true);
    const register = jest.fn().mockReturnValue(Promise.resolve());
    (globalThis as unknown as { navigator: unknown }).navigator = {
      serviceWorker: { register },
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerServiceWorker } = require('./service-worker');
    registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it('production web, SW supported: registers once at the base path, no scope', () => {
    setUp('web', false);
    const register = jest.fn().mockReturnValue(Promise.resolve());
    (globalThis as unknown as { navigator: unknown }).navigator = {
      serviceWorker: { register },
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerServiceWorker } = require('./service-worker');
    registerServiceWorker();
    expect(register).toHaveBeenCalledTimes(1);
    // Absolute, base-path-prefixed (AD-8 amended): a relative path would
    // resolve against the document and 404 on a deep-link first visit.
    expect(register).toHaveBeenCalledWith('/Overlearn-App/service-worker.js');
  });

  it('production web, registration rejects: swallowed, no unhandled rejection', async () => {
    setUp('web', false);
    const register = jest.fn().mockReturnValue(Promise.reject(new Error('404')));
    (globalThis as unknown as { navigator: unknown }).navigator = {
      serviceWorker: { register },
    };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const onUnhandled = jest.fn();
    process.on('unhandledRejection', onUnhandled);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { registerServiceWorker } = require('./service-worker');
      registerServiceWorker();
      await new Promise<void>((resolve) => setImmediate(() => resolve()));
      expect(onUnhandled).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', onUnhandled);
      warn.mockRestore();
    }
  });

  it('production web, SW unsupported: no registration call attempted', () => {
    setUp('web', false);
    (globalThis as unknown as { navigator: unknown }).navigator = {};
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerServiceWorker } = require('./service-worker');
    expect(() => registerServiceWorker()).not.toThrow();
  });

  it('navigator undefined: returns without throwing', () => {
    setUp('web', false);
    delete (globalThis as { navigator?: unknown }).navigator;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerServiceWorker } = require('./service-worker');
    expect(() => registerServiceWorker()).not.toThrow();
  });

  it('native platform: returns immediately, no web API touched', () => {
    setUp('ios', false);
    const register = jest.fn().mockReturnValue(Promise.resolve());
    (globalThis as unknown as { navigator: unknown }).navigator = {
      serviceWorker: { register },
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerServiceWorker } = require('./service-worker');
    registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });
});
