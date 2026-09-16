import { deleteKey, getNumber, getObject, getString, migrations, SCHEMA_VERSION, setNumber, setObject, setString, storage } from './storage';
import { isSegmentArray, isSessionState } from './types';

// Smoke test validating the Jest + jest-expo setup itself (R3 mitigation,
// per test-design-qa.md). react-native-mmkv v4 auto-mocks via createMMKV()'s
// isTest() check, so this runs without a real device/emulator.
describe('lib/storage smoke test', () => {
  it('round-trips a string value', () => {
    setString('smoke-test-string', 'hello');
    expect(getString('smoke-test-string')).toBe('hello');
  });

  it('round-trips a number value', () => {
    setNumber('smoke-test-number', 42);
    expect(getNumber('smoke-test-number')).toBe(42);
  });

  it('returns undefined for a deleted key', () => {
    setString('smoke-test-delete', 'temp');
    deleteKey('smoke-test-delete');
    expect(getString('smoke-test-delete')).toBeUndefined();
  });
});

describe('lib/storage getObject corruption handling', () => {
  const KEY = 'corrupt-test.list';

  const corruptBackups = () =>
    storage.getAllKeys().filter((key) => key.startsWith(`${KEY}.corrupt.`));

  beforeEach(() => {
    storage.clearAll();
  });

  it('round-trips a valid object that passes its shape guard', () => {
    const segments = [{ id: 'a', name: 'Bar 24', createdAt: '2026-01-01T00:00:00.000Z' }];
    setObject(KEY, segments);

    expect(getObject(KEY, isSegmentArray)).toEqual(segments);
    expect(corruptBackups()).toHaveLength(0);
  });

  it('returns undefined and quarantines unparseable JSON', () => {
    setString(KEY, '[{"id":"a","na');

    expect(getObject(KEY, isSegmentArray)).toBeUndefined();
    expect(corruptBackups()).toHaveLength(1);
    expect(getString(corruptBackups()[0])).toBe('[{"id":"a","na');
  });

  it('returns undefined and quarantines parseable JSON of the wrong shape', () => {
    setString(KEY, '{}');

    expect(getObject(KEY, isSegmentArray)).toBeUndefined();
    expect(corruptBackups()).toHaveLength(1);
    expect(getString(corruptBackups()[0])).toBe('{}');
  });

  it('rejects an array whose items are missing required fields', () => {
    setString(KEY, '[{"id":"a","name":"Bar 24"}]');

    expect(getObject(KEY, isSegmentArray)).toBeUndefined();
    expect(corruptBackups()).toHaveLength(1);
  });

  it('preserves the earliest quarantined snapshot across repeated corrupt reads', () => {
    setString(KEY, 'first-corruption');
    getObject(KEY, isSegmentArray);

    setString(KEY, 'second-corruption');
    getObject(KEY, isSegmentArray);

    const backups = corruptBackups();
    expect(backups).toHaveLength(1);
    expect(getString(backups[0])).toBe('first-corruption');
  });

  it('does not quarantine an absent key', () => {
    expect(getObject(KEY, isSegmentArray)).toBeUndefined();
    expect(corruptBackups()).toHaveLength(0);
  });

  it('parses without a shape guard, preserving the untyped call path', () => {
    setObject(KEY, { anything: true });
    expect(getObject(KEY)).toEqual({ anything: true });
  });
});

describe('lib/storage schema-version envelope [NFR assessment 2026-09-05]', () => {
  const KEY = 'schema-version-test.list';

  const corruptBackups = () => storage.getAllKeys().filter((key) => key.startsWith(`${KEY}.corrupt.`));

  beforeEach(() => {
    storage.clearAll();
  });

  // [Review][Patch] found via code review 2026-09-12 (round 2): this used
  // to assert against SCHEMA_VERSION itself, making the check tautological
  // — it would pass no matter what SCHEMA_VERSION was bumped to, silently
  // removing the tripwire that forces a developer to confront the
  // migration registry on the next bump (the exact gap that shipped
  // completedTarget with no migration in the first place). Back to the
  // literal current value; bump it deliberately alongside a new migrations
  // entry, never as a drive-by find-and-replace.
  it('wraps written values in a { __v, data } envelope', () => {
    setObject(KEY, { anything: true });
    expect(JSON.parse(getString(KEY)!)).toEqual({ __v: 2, data: { anything: true } });
  });

  // [Review][Patch] found via code review 2026-09-12 (round 2): the
  // registry itself has no test forcing it to stay complete as
  // SCHEMA_VERSION grows — this fails the moment a version bump omits its
  // migrations[oldVersion] entry, rather than only failing indirectly (and
  // silently quarantining real data) the next time getObject reads an
  // un-migrated payload.
  it('has a migration registered for every version from 0 up to SCHEMA_VERSION - 1', () => {
    for (let version = 0; version < SCHEMA_VERSION; version += 1) {
      expect(migrations[version]).toBeDefined();
    }
  });

  // [Review][Patch] found via code review 2026-09-11: SessionState.completedTarget
  // (Story 5.2) became a required field with no migration — this reproduces
  // and confirms the fix for a session persisted before that change.
  it('migrates an in-progress v1 session missing completedTarget by defaulting it to null [Review][Patch] 2026-09-11', () => {
    const preStory52Session = {
      segmentId: 'segment-1',
      segmentName: 'Bar 24 arpeggio',
      currentStreak: 3,
      totalCorrectThisSession: 3,
      totalIncorrectThisSession: 11,
      sessionComplete: false,
      sessionStartTimestamp: '2026-09-10T00:00:00.000Z',
      // no completedTarget key — this is what every session written before
      // Story 5.2 looks like on disk.
    };
    setString(KEY, JSON.stringify({ __v: 1, data: preStory52Session }));

    expect(getObject(KEY, isSessionState)).toEqual({ ...preStory52Session, completedTarget: null });
    expect(corruptBackups()).toHaveLength(0);
  });

  // [Review][Patch] found via code review 2026-09-12 (round 2, two layers
  // independently): the original migration keyed only on the *presence* of
  // completedTarget, so an already-*complete* v1 session was defaulted to
  // completedTarget: null exactly like an in-progress one, and nothing
  // ever backfills it afterward — reviving the display/history divergence
  // Story 5.2's Task 2 was written to prevent. Fixed by backfilling from
  // currentStreak (every pre-Story-5.2 completion path always completed
  // with currentStreak === the target in force, so the achieved streak IS
  // the target that was met).
  it('migrates an already-complete v1 session by backfilling completedTarget from currentStreak', () => {
    const preStory52CompletedSession = {
      segmentId: 'segment-1',
      segmentName: 'Bar 24 arpeggio',
      currentStreak: 6,
      totalCorrectThisSession: 6,
      totalIncorrectThisSession: 11,
      sessionComplete: true,
      sessionStartTimestamp: '2026-09-10T00:00:00.000Z',
      // no completedTarget key — this is what every completed session
      // written before Story 5.2 looks like on disk.
    };
    setString(KEY, JSON.stringify({ __v: 1, data: preStory52CompletedSession }));

    expect(getObject(KEY, isSessionState)).toEqual({ ...preStory52CompletedSession, completedTarget: 6 });
    expect(corruptBackups()).toHaveLength(0);
  });

  it('leaves non-session array shapes untouched by the v1 -> v2 migration', () => {
    const segments = [{ id: 'a', name: 'Bar 24', createdAt: '2026-01-01T00:00:00.000Z' }];
    setString(KEY, JSON.stringify({ __v: 1, data: segments }));

    expect(getObject(KEY, isSegmentArray)).toEqual(segments);
    expect(corruptBackups()).toHaveLength(0);
  });

  // [Review][Patch] found via code review 2026-09-12 (round 2): the prior
  // "leaves non-session shapes untouched" test seeded an array, which is
  // rejected by migrations[1]'s `!Array.isArray(data)` clause before ever
  // reaching the `'sessionComplete' in data` heuristic that actually
  // carries risk. A non-array object with no sessionComplete field
  // (settings' shape) exercises the clause that clause is guarding.
  it('leaves a non-array object with no sessionComplete field untouched by the v1 -> v2 migration', () => {
    const settings = { overlearningPercent: 150 };
    setString(KEY, JSON.stringify({ __v: 1, data: settings }));

    expect(getObject(KEY)).toEqual(settings);
    expect(corruptBackups()).toHaveLength(0);
  });

  it('reads a pre-versioning (un-enveloped) payload as version 0 and migrates it through unchanged [Review][Patch, CRITICAL]', () => {
    // Simulates data written before this feature existed. migrations[0] is
    // registered as an identity passthrough — v1 only added the envelope,
    // it didn't reshape any field — so this must NOT be quarantined; doing
    // so would silently discard every user's pre-existing on-device data
    // the first time this build reads it.
    const segments = [{ id: 'a', name: 'Bar 24', createdAt: '2026-01-01T00:00:00.000Z' }];
    setString(KEY, JSON.stringify(segments));

    expect(getObject(KEY, isSegmentArray)).toEqual(segments);
    expect(corruptBackups()).toHaveLength(0);
  });

  // [Review][Patch] found via code review 2026-09-12 (round 2): the v0
  // passthrough test above only exercised an array (segments); nothing
  // pinned that a pre-versioning session chains through *both* steps
  // (0 -> 1 identity, then 1 -> 2's completedTarget backfill) to reach
  // SCHEMA_VERSION. These are exactly the oldest sessions on disk — the
  // ones most in need of the migration — and the only way to reach
  // migrations[1] from an un-enveloped read.
  it('chains a pre-versioning (un-enveloped) session through both migration steps to gain completedTarget', () => {
    const preEnvelopeSession = {
      segmentId: 'segment-1',
      segmentName: 'Bar 24 arpeggio',
      currentStreak: 2,
      totalCorrectThisSession: 2,
      totalIncorrectThisSession: 4,
      sessionComplete: false,
      sessionStartTimestamp: '2026-09-01T00:00:00.000Z',
    };
    setString(KEY, JSON.stringify(preEnvelopeSession));

    expect(getObject(KEY, isSessionState)).toEqual({ ...preEnvelopeSession, completedTarget: null });
    expect(corruptBackups()).toHaveLength(0);
  });

  it('quarantines an envelope from a future schema version this build does not understand', () => {
    setString(KEY, JSON.stringify({ __v: 99, data: { anything: true } }));

    expect(getObject(KEY)).toBeUndefined();
    expect(corruptBackups()).toHaveLength(1);
  });

  it('round-trips a current-version envelope through the shape guard unchanged', () => {
    const segments = [{ id: 'a', name: 'Bar 24', createdAt: '2026-01-01T00:00:00.000Z' }];
    setObject(KEY, segments);

    expect(getObject(KEY, isSegmentArray)).toEqual(segments);
    expect(corruptBackups()).toHaveLength(0);
  });
});

// [Story 6.1] Investigation before writing any web-specific code found
// react-native-mmkv@4.3.2 already ships createMMKV.web.ts — a complete
// localStorage-backed implementation Metro substitutes automatically for
// real web bundles (confirmed: `npx expo export --platform web` against the
// unmodified storage.ts built clean and its bundle contains the web
// module's `mmkv.default` prefix). storage.ts itself needs no Platform.OS
// branch. This suite instead proves storage.ts's own logic (getObject's
// parse/validate/migrate/quarantine chain, subscribeToKeys) holds when the
// raw store IS that web implementation — by mocking the `react-native-mmkv`
// package import directly to the library's own web module, not by trying to
// make Jest's platform-file resolution (a Metro-bundler-time mechanism,
// inactive under this project's plain `jest-expo` preset) pick it.
// Minimal in-memory Storage shim. The dependency's getLocalStorage() checks
// `typeof window !== 'undefined' && window.document?.createElement != null`
// before trusting `window.localStorage` — this project's default Jest
// preset runs under Node (no DOM), so without a global.window at all, every
// call throws "Tried to access storage on the server" rather than
// exercising the real localStorage-backed code path. No jsdom pulled in
// (a `jest.config.js`/preset change is out of scope for this story) — a
// plain object satisfying the Storage shape is enough for storage.ts's own
// logic to be exercised the same way a real browser would drive it.
function createLocalStorageStub(): Storage {
  // Real `localStorage` exposes each stored entry as an own enumerable
  // property (that's what lets `Object.keys(localStorage)` enumerate stored
  // keys) — the dependency's web adapter relies on exactly that for
  // getAllKeys()/clearAll(). Methods live on a prototype via Object.create
  // so they stay off the instance's own-property list and don't pollute
  // that enumeration; `this[key] = value` on the instance is what makes a
  // stored entry show up in Object.keys() the same way a real browser does.
  const proto = {
    getItem(this: Record<string, string>, key: string): string | null {
      return Object.prototype.hasOwnProperty.call(this, key) ? this[key] : null;
    },
    setItem(this: Record<string, string>, key: string, value: string): void {
      this[key] = value;
    },
    removeItem(this: Record<string, string>, key: string): void {
      delete this[key];
    },
    clear(this: Record<string, string>): void {
      for (const key of Object.keys(this)) delete this[key];
    },
    key(this: Record<string, string>, index: number): string | null {
      return Object.keys(this)[index] ?? null;
    },
    get length(): number {
      return Object.keys(this).length;
    },
  };
  return Object.create(proto) as Storage;
}

describe('lib/storage web-path [Story 6.1]', () => {
  // A fresh module instance per describe block, isolated from the
  // already-imported native `storage` at the top of this file (that binding
  // was captured before any mocking here and is unaffected by
  // jest.resetModules(), which only changes what a *future* require()
  // returns).
  let web: typeof import('./storage');
  let webRawStore: { getAllKeys(): string[]; clearAll(): void };
  let localStorageStub: Storage;

  beforeAll(() => {
    localStorageStub = createLocalStorageStub();
    (globalThis as unknown as { window: unknown }).window = {
      document: { createElement: () => ({}) },
      localStorage: localStorageStub,
    };

    jest.resetModules();
    // Dynamic require is the point here, not an oversight: a fresh module
    // instance under a mock can only be obtained at runtime, after
    // resetModules(), never via a static top-of-file import.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.doMock('react-native-mmkv', () => require('react-native-mmkv/lib/createMMKV/createMMKV.web'));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    web = require('./storage');
    webRawStore = web.storage as unknown as { getAllKeys(): string[]; clearAll(): void };
  });

  afterAll(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
    jest.dontMock('react-native-mmkv');
    jest.resetModules();
  });

  beforeEach(() => {
    webRawStore.clearAll();
  });

  it('round-trips an object through getObject/setObject on the web store', () => {
    const segments = [{ id: 'a', name: 'Bar 24', createdAt: '2026-01-01T00:00:00.000Z' }];
    web.setObject('web-test.list', segments);

    expect(web.getObject('web-test.list', isSegmentArray)).toEqual(segments);
  });

  it('quarantines corrupt JSON under the same {key}.corrupt.{timestamp} convention as native', () => {
    web.setString('web-test.corrupt', '[{"id":"a","na');

    expect(web.getObject('web-test.corrupt', isSegmentArray)).toBeUndefined();
    const backups = webRawStore.getAllKeys().filter((key) => key.startsWith('web-test.corrupt.corrupt.'));
    expect(backups).toHaveLength(1);
  });

  it('migrates a pre-versioning payload through the same chain as native', () => {
    const segments = [{ id: 'a', name: 'Bar 24', createdAt: '2026-01-01T00:00:00.000Z' }];
    web.setString('web-test.migrate', JSON.stringify(segments));

    expect(web.getObject('web-test.migrate', isSegmentArray)).toEqual(segments);
  });

  it("fires subscribeToKeys' listener synchronously on the same tick as a write", () => {
    const onChange = jest.fn();
    web.subscribeToKeys(onChange);

    web.setString('web-test.notify', 'value');

    expect(onChange).toHaveBeenCalledWith('web-test.notify');
  });

  it('stops notifying after unsubscribe', () => {
    const onChange = jest.fn();
    const unsubscribe = web.subscribeToKeys(onChange);
    unsubscribe();

    web.setString('web-test.unsub', 'value');

    expect(onChange).not.toHaveBeenCalled();
  });

  // [Story 6.1] ARCHITECTURE-SPINE.md AD-2 requires that one throwing
  // listener not block sibling notification or the write itself. The
  // dependency's own fan-out (`listeners.forEach((l) => l(key))`) has no
  // per-callback try/catch, so this is a genuine open question the plan
  // could not settle by reading source alone — resolved here by test.
  it('does not let one throwing listener block sibling notification or the write', () => {
    const good = jest.fn();
    web.subscribeToKeys(() => {
      throw new Error('listener boom');
    });
    web.subscribeToKeys(good);

    expect(() => web.setString('web-test.isolation', 'value')).not.toThrow();
    expect(good).toHaveBeenCalledWith('web-test.isolation');
    expect(web.getString('web-test.isolation')).toBe('value');
  });

  it('degrades a write to no-op rather than crashing when the underlying store throws (quota exceeded)', () => {
    // Override the shared prototype method, not an own property on the
    // instance — assigning directly onto the instance would itself become
    // a spurious enumerable "stored key" named `setItem`, corrupting
    // getAllKeys()/clearAll() for the same reason a real stub needs the
    // Object.create(proto) split in the first place.
    const proto = Object.getPrototypeOf(localStorageStub) as { setItem: Storage['setItem'] };
    const originalSetItem = proto.setItem;
    proto.setItem = () => {
      throw new Error('QuotaExceededError');
    };

    expect(() => web.setString('web-test.quota', 'value')).not.toThrow();

    proto.setItem = originalSetItem;
  });

  it('degrades setObject to no-op rather than crashing when the underlying store throws (quota exceeded)', () => {
    const proto = Object.getPrototypeOf(localStorageStub) as { setItem: Storage['setItem'] };
    const originalSetItem = proto.setItem;
    proto.setItem = () => {
      throw new Error('QuotaExceededError');
    };

    expect(() => web.setObject('web-test.quota-object', { a: 1 })).not.toThrow();

    proto.setItem = originalSetItem;
  });
});
