import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditCardModal from '../modals/EditCardModal';
import ConditionBuilder from '../components/ui/ConditionBuilder';
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

const entities = {
  'cover.garage': {
    entity_id: 'cover.garage',
    state: 'closed',
    attributes: { friendly_name: 'Garage' },
  },
  'cover.gate': { entity_id: 'cover.gate', state: 'open', attributes: { friendly_name: 'Gate' } },
  'climate.room': {
    entity_id: 'climate.room',
    state: 'heat',
    attributes: { friendly_name: 'Room' },
  },
  'light.desk': { entity_id: 'light.desk', state: 'on', attributes: { friendly_name: 'Desk' } },
  'todo.shop': { entity_id: 'todo.shop', state: '1', attributes: { friendly_name: 'Shopping' } },
};

const saveCardSetting = vi.fn();

function renderModal(extra: Record<string, unknown>) {
  const props: Record<string, unknown> = {
    isOpen: true,
    onClose: vi.fn(),
    t,
    entityId: 'cover_card_1',
    nameFallbackEntityId: 'cover.garage',
    entities,
    editSettingsKey: 'key',
    editSettings: { coverId: 'cover.garage' },
    customNames: {},
    customIcons: {},
    saveCustomName: vi.fn(),
    saveCustomIcon: vi.fn(),
    saveCardSetting,
    conn: null,
    pagesConfig: { pages: [] },
    pageSettings: {},
    ...extra,
  };
  return render(<EditCardModal {...props} />);
}

beforeEach(() => saveCardSetting.mockClear());

describe('switching on a popup trigger', () => {
  it('saves the default rule it shows', () => {
    renderModal({});
    fireEvent.click(screen.getByRole('switch', { name: en['popupTrigger.title'] }));
    expect(saveCardSetting).toHaveBeenCalledWith(
      'key',
      'popupTrigger',
      expect.objectContaining({
        enabled: true,
        condition: expect.objectContaining({
          enabled: true,
          rules: [{ type: 'state', states: ['on'], forSeconds: 0 }],
        }),
      })
    );
  }, 20_000);

  it('keeps an existing rule', () => {
    const condition = { enabled: true, rules: [{ type: 'state', states: ['open'] }] };
    renderModal({
      editSettings: {
        coverId: 'cover.garage',
        popupTrigger: { enabled: false, condition },
      },
    });
    fireEvent.click(screen.getByRole('switch', { name: en['popupTrigger.title'] }));
    expect(saveCardSetting).toHaveBeenCalledWith(
      'key',
      'popupTrigger',
      expect.objectContaining({ enabled: true, condition })
    );
  }, 20_000);
});

describe('switching on visibility', () => {
  it('defaults the rule to the current state of the entity', () => {
    renderModal({
      entityId: 'climate_card_1',
      editSettings: { climateId: 'climate.room' },
    });
    fireEvent.click(screen.getByRole('switch', { name: en['visibility.title'] }));
    expect(saveCardSetting).toHaveBeenCalledWith(
      'key',
      'visibilityCondition',
      expect.objectContaining({
        enabled: true,
        rules: [{ type: 'state', states: ['heat'], forSeconds: 0 }],
      })
    );
  }, 20_000);
});

describe('ConditionBuilder known states', () => {
  const baseProps = {
    cardId: 'light.desk',
    cardSettings: {},
    entities,
    t,
    showHeader: false,
    showEnableToggle: false,
    forceEnabled: true,
  };

  it('offers known states as chips that add the state when tapped', () => {
    const onChange = vi.fn();
    render(
      <ConditionBuilder
        {...baseProps}
        condition={{ enabled: true, rules: [{ type: 'state', states: ['on'] }] }}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'off' }));
    expect(onChange.mock.calls[0][0].rules[0].states).toEqual(['on', 'off']);
  });

  it('defaults a newly added rule to the current state of the entity', () => {
    const onChange = vi.fn();
    render(
      <ConditionBuilder
        {...baseProps}
        cardId="climate.room"
        condition={{ enabled: true, rules: [{ type: 'state', states: ['heat'] }] }}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: en['visibility.addRule'] }));
    expect(onChange.mock.calls[0][0].rules[1].states).toEqual(['heat']);
  });
});
