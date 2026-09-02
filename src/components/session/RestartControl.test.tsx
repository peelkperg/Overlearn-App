import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RestartControl } from './RestartControl';

// [Review][Patch] Found via UAT: at a fixed 8px from the bottom, this
// control landed directly under the Android 3-button nav bar's Home button
// on-device, unreliably tappable. Must sit above whatever the device
// actually reserves at the bottom.
describe('RestartControl [Review][Patch]', () => {
  it('sits just above the bottom safe-area inset, not at a fixed offset', async () => {
    const view = await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 34 } }}>
        <RestartControl onPress={jest.fn()} />
      </SafeAreaProvider>,
    );

    const style: { bottom?: number }[] = view.getByTestId('restart-control').props.style;

    expect(style[1]?.bottom).toBe(34 + 8);
  });

  it('falls back to a small fixed offset when the device reserves no bottom inset', async () => {
    const view = await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
        <RestartControl onPress={jest.fn()} />
      </SafeAreaProvider>,
    );

    const style: { bottom?: number }[] = view.getByTestId('restart-control').props.style;

    expect(style[1]?.bottom).toBe(8);
  });
});
