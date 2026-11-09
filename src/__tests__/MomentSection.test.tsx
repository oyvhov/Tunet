import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MomentSection from '../modals/editCard/MomentSection';
import type { MomentConfig } from '../utils/moments';

vi.mock('../components/ui/ConditionBuilder', () => ({
  default: ({ onChange }: { onChange: (value: unknown) => void }) => (
    <button type="button" data-testid="rule" onClick={() => onChange({ rules: ['x'] })} />
  ),
}));

const renderSection = (cardId: string, moment: MomentConfig | null = null) => {
  const onChange = vi.fn();
  render(
    <MomentSection
      t={(key: string) => key}
      cardId={cardId}
      moment={moment}
      onChange={onChange}
      editSettings={{}}
      entities={{}}
    />
  );
  return onChange;
};

const on = { enabled: true, closeAfterSeconds: 60 };

describe('MomentSection', () => {
  it('speaks about playback on a media card', () => {
    renderSection('sonos_group_all');

    expect(screen.getByText('moment.media.title')).toBeInTheDocument();
  });

  it('turns on with a one-minute timeout', () => {
    const onChange = renderSection('media_player.kitchen');

    fireEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith({ enabled: true, closeAfterSeconds: 60 });
  });

  it('keeps the choices when turned off', () => {
    const onChange = renderSection('media_player.kitchen', {
      enabled: true,
      closeAfterSeconds: 120,
    });

    fireEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith({ enabled: false, closeAfterSeconds: 120 });
  });

  it('shows no choices while off', () => {
    renderSection('media_player.kitchen');

    expect(screen.queryByText('moment.closeAfterPause')).not.toBeInTheDocument();
  });

  it('saves the chosen timeout', () => {
    const onChange = renderSection('media_player.kitchen', on);

    fireEvent.click(screen.getByRole('radio', { name: 'moment.minutes2' }));

    expect(onChange).toHaveBeenCalledWith({ enabled: true, closeAfterSeconds: 120 });
  });

  it('needs no rule on a media card', () => {
    renderSection('media_player.kitchen', on);

    expect(screen.queryByTestId('rule')).not.toBeInTheDocument();
  });

  it('saves the rule of a camera', () => {
    const onChange = renderSection('camera_card_door', on);

    fireEvent.click(screen.getByTestId('rule'));

    expect(onChange).toHaveBeenCalledWith({ ...on, condition: { rules: ['x'] } });
  });

  it('offers a message on a notice only', () => {
    renderSection('camera_card_door', on);

    expect(screen.queryByLabelText('moment.message')).not.toBeInTheDocument();
  });

  it('saves the message of a notice', () => {
    const onChange = renderSection('entity_card_washer', on);

    fireEvent.change(screen.getByLabelText('moment.message'), { target: { value: 'Done' } });

    expect(onChange).toHaveBeenCalledWith({ ...on, message: 'Done' });
  });

  it('names the time on screen for a notice', () => {
    renderSection('entity_card_washer', on);

    expect(screen.getByText('moment.showFor')).toBeInTheDocument();
  });
});
