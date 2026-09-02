import { fireEvent, render } from '@testing-library/react-native';

import { ResumeDiscardDialog } from './ResumeDiscardDialog';

describe('ResumeDiscardDialog [Story 2.10, FR24]', () => {
  it('is not visible when visible=false', async () => {
    const view = await render(
      <ResumeDiscardDialog visible={false} segmentName="Bar 24 arpeggio" onDiscard={jest.fn()} onResume={jest.fn()} />,
    );

    expect(view.queryByTestId('resume-discard-resume')).toBeNull();
  });

  it('prompts by segment name when visible', async () => {
    const view = await render(
      <ResumeDiscardDialog visible segmentName="Bar 24 arpeggio" onDiscard={jest.fn()} onResume={jest.fn()} />,
    );

    expect(view.getByText(/Bar 24 arpeggio/)).toBeTruthy();
    expect(view.getByTestId('resume-discard-resume')).toBeTruthy();
    expect(view.getByTestId('resume-discard-discard')).toBeTruthy();
  });

  it('calls onResume when Resume is tapped', async () => {
    const onResume = jest.fn();
    const view = await render(
      <ResumeDiscardDialog visible segmentName="Bar 24 arpeggio" onDiscard={jest.fn()} onResume={onResume} />,
    );

    await fireEvent.press(view.getByTestId('resume-discard-resume'));

    expect(onResume).toHaveBeenCalled();
  });

  it('calls onDiscard when Discard is tapped', async () => {
    const onDiscard = jest.fn();
    const view = await render(
      <ResumeDiscardDialog visible segmentName="Bar 24 arpeggio" onDiscard={onDiscard} onResume={jest.fn()} />,
    );

    await fireEvent.press(view.getByTestId('resume-discard-discard'));

    expect(onDiscard).toHaveBeenCalled();
  });

  it('does not dismiss on the Android back button — only an explicit choice ends it (FR24)', async () => {
    const onResume = jest.fn();
    const onDiscard = jest.fn();
    const view = await render(
      <ResumeDiscardDialog visible segmentName="Bar 24 arpeggio" onDiscard={onDiscard} onResume={onResume} />,
    );

    view.getByTestId('resume-discard-modal').props.onRequestClose();

    expect(onResume).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
  });
});
