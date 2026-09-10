// Lives outside src/app/ deliberately — see index.test.tsx in this same
// directory for why (expo-router scans src/app/ for route files during
// bundling; a co-located *.test.tsx there breaks the production bundle).
import { fireEvent, render } from '@testing-library/react-native';

import { readSettings, setOverlearningPercent } from '@/lib/settings';
import { storage } from '@/lib/storage';

import SettingsScreen from '@/app/settings';

// Story 5.1: Configure the Overlearning Target (FR35, FR36, UX-DR13-16).
describe('SettingsScreen [Story 5.1]', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('renders the current overlearningPercent (default 50%) as the stepper value on mount', async () => {
    const view = await render(<SettingsScreen />);
    expect(view.getByText('50%')).toBeTruthy();
  });

  it('tapping + increments the displayed value by 10 and persists it', async () => {
    const view = await render(<SettingsScreen />);

    await fireEvent.press(view.getByTestId('settings-increase'));

    expect(view.getByText('60%')).toBeTruthy();
    expect(readSettings().overlearningPercent).toBe(60);
  });

  it('tapping − decrements the displayed value by 10 and persists it', async () => {
    setOverlearningPercent(100);
    const view = await render(<SettingsScreen />);

    await fireEvent.press(view.getByTestId('settings-decrease'));

    expect(view.getByText('90%')).toBeTruthy();
    expect(readSettings().overlearningPercent).toBe(90);
  });

  it('at 50% (the default), the − button carries accessibilityState disabled: true', async () => {
    const view = await render(<SettingsScreen />);
    expect(view.getByTestId('settings-decrease').props.accessibilityState).toEqual({ disabled: true });
  });

  it('at 300%, the + button carries accessibilityState disabled: true', async () => {
    setOverlearningPercent(300);
    const view = await render(<SettingsScreen />);
    expect(view.getByTestId('settings-increase').props.accessibilityState).toEqual({ disabled: true });
  });

  it("the stepper value's ThemedText carries accessibilityLiveRegion=\"polite\"", async () => {
    const view = await render(<SettingsScreen />);
    expect(view.getByText('50%').props.accessibilityLiveRegion).toBe('polite');
  });

  it('the worked example line updates its text when the value changes', async () => {
    const view = await render(<SettingsScreen />);
    expect(
      view.getByText('At 50%, 10 mistakes in a session sets a target of 5 correct in a row.'),
    ).toBeTruthy();

    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));
    await fireEvent.press(view.getByTestId('settings-increase'));

    expect(
      view.getByText('At 150%, 10 mistakes in a session sets a target of 15 correct in a row.'),
    ).toBeTruthy();
  });

  it("the floor note's exact copy is present and unconditional", async () => {
    const view = await render(<SettingsScreen />);
    expect(view.getByText('A session never targets fewer than 5 correct in a row.')).toBeTruthy();

    await fireEvent.press(view.getByTestId('settings-increase'));

    expect(view.getByText('A session never targets fewer than 5 correct in a row.')).toBeTruthy();
  });

  it('has no confirmation dialog or Save button anywhere on the screen', async () => {
    const view = await render(<SettingsScreen />);
    expect(view.queryByText('Save')).toBeNull();
    expect(view.queryByText(/confirm/i)).toBeNull();
  });
});
