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

describe('changing the entity on an existing card', () => {
  it('saves a searched entity to the key the renderer reads', () => {
    renderModal({});
    fireEvent.click(screen.getByRole('button', { name: 'Garage' }));
    fireEvent.change(screen.getByPlaceholderText(en['form.search']), {
      target: { value: 'gate' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Gate/ }));
    expect(saveCardSetting).toHaveBeenCalledWith('key', 'coverId', 'cover.gate');
  }, 20_000);

  it('moves rules that point at the old entity', () => {
    renderModal({
      editSettings: {
        coverId: 'cover.garage',
        visibilityCondition: {
          enabled: true,
          rules: [{ type: 'state', entityId: 'cover.garage', states: ['open'] }],
        },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Garage' }));
    fireEvent.click(screen.getByRole('button', { name: /Gate/ }));
    expect(saveCardSetting).toHaveBeenCalledWith(
      'key',
      'visibilityCondition',
      expect.objectContaining({
        rules: [{ type: 'state', entityId: 'cover.gate', states: ['open'] }],
      })
    );
  }, 20_000);

  it('does not clear a required entity', () => {
    renderModal({});
    fireEvent.click(screen.getByRole('button', { name: 'Garage' }));
    fireEvent.click(screen.getByRole('button', { name: en['dropdown.noneSelected'] }));
    expect(saveCardSetting).not.toHaveBeenCalled();
  }, 20_000);

  it('shows no picker for cards with their own entity settings', () => {
    renderModal({ entityId: 'todo_card_1', isEditTodo: true, editSettings: {} });
    expect(screen.queryByText(en['editCard.entityRequired'])).not.toBeInTheDocument();
  }, 20_000);
});

describe('required setup', () => {
  const followsIn = (first: Element, second: Element) =>
    Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('shows the todo list first and marks it required', () => {
    renderModal({ entityId: 'todo_card_1', isEditTodo: true, editSettings: {}, canEditName: true });
    const todoLabel = screen.getByText(`${en['todo.selectList']} *`);
    expect(followsIn(todoLabel, screen.getByText(en['form.name']))).toBe(true);
    expect(followsIn(todoLabel, screen.getByText(en['visibility.title']))).toBe(true);
    expect(followsIn(todoLabel, screen.getByText(en['popupTrigger.title']))).toBe(true);
  }, 20_000);

  it('shows the entity picker before the name', () => {
    renderModal({ canEditName: true });
    expect(
      followsIn(screen.getByText(en['editCard.entityRequired']), screen.getByText(en['form.name']))
    ).toBe(true);
  }, 20_000);
});

describe('touch targets', () => {
  it('gives every small toggle a 44px hit area', () => {
    renderModal({
      entityId: 'fan.bedroom',
      canEditStatus: true,
      isEditFan: true,
      editSettings: {},
    });
    const toggles = screen
      .getAllByRole('button')
      .concat(screen.getAllByRole('switch'))
      .filter((button) => button.className.includes('w-12'));
    expect(toggles.length).toBeGreaterThan(3);
    for (const toggle of toggles) {
      const isRowSwitch = Boolean(toggle.closest('label'));
      if (!isRowSwitch) expect(toggle.className).toContain('before:-inset-2.5');
    }
  }, 20_000);

  it('makes condition actions and state chips 44px tall', () => {
    render(
      <ConditionBuilder
        cardId="light.desk"
        cardSettings={{}}
        entities={entities}
        t={t}
        showHeader={false}
        showEnableToggle={false}
        forceEnabled
        condition={{ enabled: true, rules: [{ type: 'state', states: ['on'] }] }}
        onChange={vi.fn()}
      />
    );
    for (const name of [en['addCard.add'], en['visibility.addRule'], 'off']) {
      expect(screen.getByRole('button', { name }).className).toContain('min-h-11');
    }
  });
});

describe('popup trigger number fields', () => {
  const editSettings = {
    coverId: 'cover.garage',
    popupTrigger: {
      enabled: true,
      condition: { enabled: true, rules: [{ type: 'state', states: ['open'] }] },
      cooldownSeconds: 30,
      autoCloseSeconds: 5,
    },
  };

  it('keeps a typed cooldown and clamps it when the field is left', () => {
    renderModal({ editSettings });
    const [cooldown] = screen.getAllByRole('spinbutton');
    fireEvent.change(cooldown, { target: { value: '6' } });
    expect(cooldown).toHaveValue(6);
    expect(saveCardSetting).not.toHaveBeenCalled();
    fireEvent.change(cooldown, { target: { value: '60' } });
    fireEvent.blur(cooldown);
    expect(saveCardSetting).toHaveBeenCalledWith(
      'key',
      'popupTrigger',
      expect.objectContaining({ cooldownSeconds: 60, autoCloseSeconds: 5 })
    );
  }, 20_000);

  it('turns auto-close off when the field is emptied', () => {
    renderModal({ editSettings });
    const autoClose = screen.getAllByRole('spinbutton')[1];
    fireEvent.change(autoClose, { target: { value: '' } });
    fireEvent.blur(autoClose);
    expect(saveCardSetting).toHaveBeenCalledWith(
      'key',
      'popupTrigger',
      expect.objectContaining({ cooldownSeconds: 30, autoCloseSeconds: 0 })
    );
  }, 20_000);
});
