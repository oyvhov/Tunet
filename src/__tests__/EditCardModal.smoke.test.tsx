import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditCardModal from '../modals/EditCardModal';
import { useEditModalProps } from '../rendering/useEditModalProps';
import en from '../i18n/en.json';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({
    connected: false,
    haConfig: { unit_system: { temperature: '°C' } },
  }),
}));
vi.mock('../components/ui/AccessibleModalShell', () => ({
  default: ({ open, children }: { open: boolean; children: (id: string) => ReactNode }) =>
    open ? <div>{children('edit-modal-title')}</div> : null,
  useModalShell: () => null,
}));
vi.mock('../components/cards/SensorCard', () => ({ default: () => <div /> }));
vi.mock('../components/ui/IconPicker', () => ({ default: () => <div /> }));

const translations: Record<string, string> = en;
const t = (key: string) => translations[key] || key;

const entity = (entity_id: string, state: string, friendly_name: string, extra = {}) => ({
  [entity_id]: { entity_id, state, attributes: { friendly_name, ...extra } },
});

const entities = {
  ...entity('light.desk', 'on', 'Desk'),
  ...entity('climate.room', 'heat', 'Room', { hvac_modes: ['heat', 'off'] }),
  ...entity('cover.garage', 'closed', 'Garage'),
  ...entity('media_player.tv', 'playing', 'Living room TV'),
  ...entity('alarm_control_panel.house', 'disarmed', 'House alarm'),
  ...entity('todo.shop', '1', 'Shopping'),
  ...entity('calendar.family', 'off', 'Family'),
  ...entity('sensor.cost_today', '4', 'Cost today'),
  ...entity('sensor.cost_month', '90', 'Cost month'),
  ...entity('sensor.car_battery', '80', 'Car battery', {
    device_class: 'battery',
    unit_of_measurement: '%',
  }),
};

const saveCardSetting = vi.fn();
const SETTINGS_KEY = 'settings-key';

function Harness({ cardId, settings }: { cardId: string; settings: Record<string, unknown> }) {
  const editProps = useEditModalProps({
    showEditCardModal: cardId,
    editCardSettingsKey: SETTINGS_KEY,
    getCardSettingsKey: () => SETTINGS_KEY,
    cardSettings: { [SETTINGS_KEY]: settings },
    entities,
    resolveCarSettings: (_id: string, carSettings: Record<string, unknown>) => carSettings,
  });
  return (
    <EditCardModal
      isOpen
      onClose={vi.fn()}
      t={t}
      entityId={cardId}
      entities={entities}
      customNames={{}}
      customIcons={{}}
      saveCustomName={vi.fn()}
      saveCustomIcon={vi.fn()}
      saveCardSetting={saveCardSetting}
      conn={null}
      pagesConfig={{ pages: [] }}
      pageSettings={{}}
      {...editProps}
    />
  );
}

const open = (cardId: string, settings: Record<string, unknown> = {}) =>
  render(<Harness cardId={cardId} settings={settings} />);

const SMOKE_TIMEOUT = 20_000;
const entityRequired = en['editCard.entityRequired'];

beforeEach(() => saveCardSetting.mockClear());

describe('EditCardModal per card type', () => {
  it(
    'light: toggles the use-light-color setting',
    () => {
      open('light.desk');

      fireEvent.click(screen.getByRole('switch', { name: en['light.useLightColor'] }));

      expect(saveCardSetting).toHaveBeenCalledWith(SETTINGS_KEY, 'useLightColor', true);
      expect(screen.getByText(entityRequired)).toBeInTheDocument();
    },
    SMOKE_TIMEOUT
  );

  it(
    'climate: shows the entity and sets the tap action',
    () => {
      open('climate_card_1', { climateId: 'climate.room' });

      expect(screen.getByText(entityRequired)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: en['editCard.tapActionModal'] })).toHaveAttribute(
        'aria-pressed',
        'true'
      );

      fireEvent.click(screen.getByRole('button', { name: en['editCard.tapActionToggle'] }));

      expect(saveCardSetting).toHaveBeenCalledWith(SETTINGS_KEY, 'tapAction', 'toggle');
    },
    SMOKE_TIMEOUT
  );

  it(
    'cover: shows the required cover entity',
    () => {
      open('cover_card_1', { coverId: 'cover.garage' });

      expect(screen.getByText(entityRequired)).toBeInTheDocument();
      expect(screen.getAllByText('Garage').length).toBeGreaterThan(0);
    },
    SMOKE_TIMEOUT
  );

  it(
    'media: chooses the artwork mode',
    () => {
      open('media_player.tv');

      fireEvent.click(screen.getByRole('button', { name: en['media.artwork.cover'] }));

      expect(saveCardSetting).toHaveBeenCalledWith(SETTINGS_KEY, 'artworkMode', 'cover');
    },
    SMOKE_TIMEOUT
  );

  it(
    'room: turns off a card feature',
    () => {
      open('room_card_1', { areaId: 'living', areaName: 'Living room' });

      expect(screen.getByText(t('room.cardFeatures'))).toBeInTheDocument();
      const feature = screen.getByText(t('room.showIconWatermark'));

      fireEvent.click(within(feature.parentElement as HTMLElement).getByRole('button'));

      expect(saveCardSetting).toHaveBeenCalledWith(SETTINGS_KEY, 'showIconWatermark', false);
    },
    SMOKE_TIMEOUT
  );

  it(
    'alarm: shows the required alarm entity',
    () => {
      open('alarm_card_1', { alarmId: 'alarm_control_panel.house' });

      expect(screen.getByText(entityRequired)).toBeInTheDocument();
      expect(screen.getAllByText('House alarm').length).toBeGreaterThan(0);
    },
    SMOKE_TIMEOUT
  );

  it(
    'todo: selects a list',
    () => {
      open('todo_card_1');

      expect(screen.getByText(`${en['todo.selectList']} *`)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Shopping/ }));

      expect(saveCardSetting).toHaveBeenCalledWith(SETTINGS_KEY, 'todoEntityId', 'todo.shop');
    },
    SMOKE_TIMEOUT
  );

  it(
    'calendar: adds a calendar to the selection',
    () => {
      open('calendar_card_1');

      expect(screen.getByText(`${en['calendar.selectCalendars']} *`)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Family/ }));

      expect(saveCardSetting).toHaveBeenCalledWith(SETTINGS_KEY, 'calendars', ['calendar.family']);
    },
    SMOKE_TIMEOUT
  );

  it(
    'cost: edits the today label',
    () => {
      open('cost_card_1', { todayId: 'sensor.cost_today', monthId: 'sensor.cost_month' });
      const input = screen.getByPlaceholderText(en['energyCost.today']);

      fireEvent.change(input, { target: { value: 'I dag' } });
      fireEvent.blur(input);

      expect(saveCardSetting).toHaveBeenCalledWith(SETTINGS_KEY, 'todayLabel', 'I dag');
    },
    SMOKE_TIMEOUT
  );

  it(
    'car: shows a mapped sensor and can remove it',
    () => {
      open('car_card_1', { batteryId: 'sensor.car_battery' });

      expect(screen.getByText(`${en['car.select.battery']}:`)).toBeInTheDocument();
      expect(screen.getByText('sensor.car_battery')).toBeInTheDocument();

      fireEvent.click(screen.getByTitle(t('tooltip.removeCard')));

      expect(saveCardSetting).toHaveBeenCalledWith(SETTINGS_KEY, 'batteryId', null);
    },
    SMOKE_TIMEOUT
  );

  it(
    'spacer: switches to the divider variant and offers no name field',
    () => {
      open('spacer_card_1');

      fireEvent.click(screen.getByRole('button', { name: en['spacer.divider'] }));

      expect(saveCardSetting).toHaveBeenCalledWith(SETTINGS_KEY, 'variant', 'divider');
      expect(screen.queryByText(entityRequired)).not.toBeInTheDocument();
    },
    SMOKE_TIMEOUT
  );

  it(
    'renders nothing while closed',
    () => {
      const { container } = render(
        <EditCardModal isOpen={false} t={t} entityId="light.desk" entities={entities} />
      );

      expect(container).toBeEmptyDOMElement();
    },
    SMOKE_TIMEOUT
  );
});
