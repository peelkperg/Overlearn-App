import { fireEvent, render } from '@testing-library/react-native';

import { RestartConfirmDialog } from './RestartConfirmDialog';

describe('RestartConfirmDialog [Story 2.4, FR21]', () => {
  it('is not visible when visible=false', async () => {
    const view = await render(<RestartConfirmDialog visible={false} onCancel={jest.fn()} onConfirm={jest.fn()} />);

    expect(view.queryByTestId('restart-confirm-confirm')).toBeNull();
  });

  it('shows the exact required confirmation text when visible', async () => {
    const view = await render(<RestartConfirmDialog visible onCancel={jest.fn()} onConfirm={jest.fn()} />);

    expect(view.getByText('Restart session? Progress will be lost.')).toBeTruthy();
  });

  it('calls onConfirm when Restart is tapped', async () => {
    const onConfirm = jest.fn();
    const view = await render(<RestartConfirmDialog visible onCancel={jest.fn()} onConfirm={onConfirm} />);

    await fireEvent.press(view.getByTestId('restart-confirm-confirm'));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is tapped, leaving the caller to leave state unchanged', async () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const view = await render(<RestartConfirmDialog visible onCancel={onCancel} onConfirm={onConfirm} />);

    await fireEvent.press(view.getByTestId('restart-confirm-cancel'));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

});
