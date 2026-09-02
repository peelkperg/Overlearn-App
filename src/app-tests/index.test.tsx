// Lives outside src/app/ deliberately: expo-router scans that directory
// for route files during bundling, and .test.tsx files there get pulled
// into the production Android/iOS bundle along with @testing-library —
// which fails Metro bundling (it imports Node's `console` module, which
// doesn't exist in the RN runtime). Confirmed on an EAS build. Import the
// screen under test via the @/app alias instead of colocating.
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { createSegment } from '@/lib/segments';

import HomeScreen from '@/app/index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

const pushed = router.push as jest.Mock;

describe('HomeScreen [Story 1.3]', () => {
  beforeEach(() => {
    pushed.mockClear();
  });

  it('shows the empty state with a create action when no segments exist', async () => {
    const view = await render(<HomeScreen />);

    expect(view.getByTestId('segment-list-empty')).toBeTruthy();
    await fireEvent.press(view.getByTestId('segment-list-create'));
    expect(pushed).toHaveBeenCalledWith('/segment/new');
  });

  it('keeps creation reachable once segments exist (FR1, FR4)', async () => {
    createSegment('Bar 24 arpeggio');
    const view = await render(<HomeScreen />);

    expect(view.queryByTestId('segment-list-empty')).toBeNull();
    await fireEvent.press(view.getByTestId('segment-list-create-more'));
    expect(pushed).toHaveBeenCalledWith('/segment/new');
  });

  it('lists every segment, with no enforced limit (FR2, FR4)', async () => {
    for (let index = 0; index < 12; index += 1) {
      createSegment(`Segment ${index}`);
    }
    const view = await render(<HomeScreen />);

    // Asserted on the list's data rather than the rendered rows: FlatList
    // virtualizes, so only the first window is mounted at any time.
    expect(view.getByTestId('segment-list').props.data).toHaveLength(12);
    expect(view.getAllByTestId(/^segment-row-segment-/).length).toBeGreaterThan(0);
  });

  it('reflects a segment created while the screen is already mounted', async () => {
    const view = await render(<HomeScreen />);
    expect(view.getByTestId('segment-list-empty')).toBeTruthy();

    // The list screen stays mounted while segment/new is pushed over it, so
    // this is exactly what a create from that screen looks like from here.
    const created = createSegment('Bar 24 arpeggio');

    expect(await view.findByTestId(`segment-row-${created.id}`)).toBeTruthy();
  });

  it('drops an archived segment from the list while it is mounted (FR5)', async () => {
    const created = createSegment('Bar 24 arpeggio');
    const view = await render(<HomeScreen />);

    await fireEvent.press(view.getByTestId(`segment-row-menu-${created.id}`));
    await fireEvent.press(view.getByTestId(`segment-row-archive-${created.id}`));

    expect(view.queryByTestId(`segment-row-${created.id}`)).toBeNull();
  });

  it('drops a deleted segment from the list while it is mounted (FR6)', async () => {
    const created = createSegment('Bar 24 arpeggio');
    const view = await render(<HomeScreen />);

    await fireEvent.press(view.getByTestId(`segment-row-menu-${created.id}`));
    await fireEvent.press(view.getByTestId(`segment-row-delete-${created.id}`));

    expect(view.queryByTestId(`segment-row-${created.id}`)).toBeNull();
  });
});
