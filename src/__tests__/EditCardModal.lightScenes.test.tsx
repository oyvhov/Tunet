import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
vi.mock('../components/ui/IconPicker', () => ({ default: () => <div /> }));

const translations: Record<string, string> = en;
const t = (key: string) => translations[key] || key;

const entity = (entity_id: string, state: string, friendly_name: string) => ({
  [entity_id]: { entity_id, state, attributes: { friendly_name } },
});

const entities = {
  ...entity('light.desk', 'on', 'Desk'),
  ...entity('scene.evening', 'unknown', 'Evening'),
  ...entity('scene.movie', 'unknown', 'Movie'),
  ...entity('scene.reading', 'unknown', 'Reading'),
  ...entity('script.bedtime', 'off', 'Bedtime'),
};

const saveCardSetting = vi.fn();
const SETTINGS_KEY = 'settings-key';

function Harness({ settings }: { settings: Record<string, unknown> }) {
  const editProps = useEditModalProps({
    showEditCardModal: 'light.desk',
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
      entityId="light.desk"
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

const open = (settings: Record<string, unknown> = {}) => render(<Harness settings={settings} />);
const addButton = () => screen.queryByRole('button', { name: en['light.addScene'] });
const TIMEOUT = 20_000;

beforeEach(() => saveCardSetting.mockClear());

describe('EditCardModal light scenes', () => {
  it(
    'adds a scene from the scene picker',
    () => {
      open();

      expect(screen.getByText(en['light.scenes'])).toBeInTheDocument();
      fireEvent.click(addButton() as HTMLElement);

      expect(screen.queryByRole('button', { name: /Bedtime/ })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Evening/ }));

      expect(saveCardSetting).toHaveBeenCalledWith(SETTINGS_KEY, 'lightScenes', ['scene.evening']);
    },
    TIMEOUT
  );

  it(
    'lists chosen scenes, leaves them out of the picker and removes one',
    () => {
      open({ lightScenes: ['scene.evening', 'scene.movie'] });

      expect(screen.getByText('Evening')).toBeInTheDocument();
      fireEvent.click(addButton() as HTMLElement);
      expect(screen.getAllByRole('button', { name: /Evening/ })).toHaveLength(1);
      expect(screen.getByRole('button', { name: /Reading/ })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: `${en['light.removeScene']}: Evening` }));

      expect(saveCardSetting).toHaveBeenCalledWith(SETTINGS_KEY, 'lightScenes', ['scene.movie']);
    },
    TIMEOUT
  );

  it(
    'stops offering more scenes at three',
    () => {
      open({ lightScenes: ['scene.evening', 'scene.movie', 'scene.reading', 'scene.extra'] });

      expect(screen.getByText('Reading')).toBeInTheDocument();
      expect(addButton()).not.toBeInTheDocument();
      expect(
        screen.getAllByRole('button', { name: new RegExp(en['light.removeScene']) })
      ).toHaveLength(3);
    },
    TIMEOUT
  );
});
