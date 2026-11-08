import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AlarmCard from '../components/cards/AlarmCard';
import AlarmModal from '../modals/AlarmModal';

const alarm = (state, attributes = {}) => ({
  entity_id: 'alarm_control_panel.hus',
  state,
  attributes: { friendly_name: 'Hus', code_format: null, supported_features: 3, ...attributes },
});

const renderCard = (entity, props = {}) => {
  const onAction = vi.fn();
  render(
    <AlarmCard
      cardId="alarm_card_1"
      entityId={entity.entity_id}
      entity={entity}
      dragProps={{}}
      controls={null}
      settings={{}}
      cardStyle={{}}
      editMode={false}
      customNames={{}}
      onOpen={vi.fn()}
      onAction={onAction}
      t={(key) => key}
      {...props}
    />
  );
  return { onAction };
};

const renderPopup = (entity) => {
  const callService = vi.fn(async () => ({}));
  render(
    <AlarmModal
      show
      onClose={vi.fn()}
      entityId={entity.entity_id}
      entity={entity}
      callService={callService}
      t={(key) => key}
    />
  );
  return { callService };
};

describe('alarm card', () => {
  it.each(['pending', 'arming'])('can still be disarmed while %s', (state) => {
    const { onAction } = renderCard(alarm(state, { code_disarm_required: false }));
    fireEvent.click(screen.getByRole('button', { name: /alarm\.action\.disarm/ }));
    expect(onAction).toHaveBeenCalledWith('disarm');
  });

  it('offers nothing while it is already disarming', () => {
    renderCard(alarm('disarming'));
    expect(screen.queryByRole('button', { name: /alarm\.action\.disarm/ })).toBeNull();
  });
});

describe('alarm popup', () => {
  it('runs an action straight away when no code is needed', async () => {
    const { callService } = renderPopup(alarm('disarmed'));
    fireEvent.click(screen.getByRole('button', { name: /alarm\.action\.armAway/ }));
    await waitFor(() =>
      expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_arm_away', {
        entity_id: 'alarm_control_panel.hus',
      })
    );
  });

  it('hides the keypad when no action needs a code', () => {
    renderPopup(alarm('disarmed'));
    expect(screen.queryByRole('button', { name: '1' })).toBeNull();
  });

  it('waits for the code when the action needs one', async () => {
    const { callService } = renderPopup(
      alarm('disarmed', { code_format: 'number', code_arm_required: true })
    );
    fireEvent.click(screen.getByRole('button', { name: /alarm\.action\.armAway/ }));
    expect(callService).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '✓' }));
    await waitFor(() =>
      expect(callService).toHaveBeenCalledWith('alarm_control_panel', 'alarm_arm_away', {
        entity_id: 'alarm_control_panel.hus',
        code: '1',
      })
    );
  });
});
