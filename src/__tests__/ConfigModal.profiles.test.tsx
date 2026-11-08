import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConfigModal from '../modals/ConfigModal';

const t = (key: string) => key;

const makeAutoSync = (overrides: Record<string, unknown> = {}) => ({
  enabled: true,
  setEnabled: vi.fn(),
  status: 'synced',
  error: '',
  backgroundSyncSuspended: false,
  lastSyncedAt: null,
  deviceId: 'this-device',
  currentRevision: 5,
  knownDevices: [],
  history: [],
  publishing: false,
  publishConflicts: [],
  removingDeviceId: '',
  updatingDeviceId: '',
  loadCurrentFromServer: vi.fn().mockResolvedValue(undefined),
  loadFromDevice: vi.fn().mockResolvedValue(undefined),
  overwriteServerWithLocal: vi.fn().mockResolvedValue(undefined),
  publishCurrentToDevices: vi.fn().mockResolvedValue(undefined),
  removeKnownDevice: vi.fn(),
  renameKnownDevice: vi.fn(),
  ...overrides,
});

const makeProfiles = (overrides: Record<string, unknown> = {}) => ({
  profiles: [{ id: 'p1', name: 'Kitchen', device_label: '', updated_at: '2026-01-01', data: {} }],
  loading: false,
  error: null,
  loadSummary: null,
  backendAvailable: true,
  haUser: { id: 'u1', name: 'Owner' },
  saveProfile: vi.fn(),
  editProfile: vi.fn(),
  loadProfile: vi.fn(),
  removeProfile: vi.fn(),
  importDashboard: vi.fn(),
  exportDashboard: vi.fn(),
  startBlank: vi.fn(),
  autoSync: makeAutoSync(),
  ...overrides,
});

const renderProfiles = (profiles: ReturnType<typeof makeProfiles>) =>
  render(
    <ConfigModal
      open
      t={t}
      configTab="profiles"
      setConfigTab={vi.fn()}
      config={{ url: '' }}
      themes={{}}
      onClose={vi.fn()}
      profiles={profiles}
    />
  );

const expandSyncPanel = () => fireEvent.click(screen.getByTitle('common.show'));

// The confirm dialog renders after the page, so its button is the last match.
const clickConfirm = (label: string) => {
  const buttons = screen.getAllByText(label);
  fireEvent.click(buttons[buttons.length - 1] as HTMLElement);
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('offline')))
  );
});

describe('ConfigModal confirmations', () => {
  it('asks before loading a profile', async () => {
    const profiles = makeProfiles();
    renderProfiles(profiles);

    fireEvent.click(screen.getByText('profiles.load'));
    expect(profiles.loadProfile).not.toHaveBeenCalled();
    expect(await screen.findByText('profiles.confirmLoad')).toBeInTheDocument();

    clickConfirm('profiles.load');
    await waitFor(() => expect(profiles.loadProfile).toHaveBeenCalledWith(profiles.profiles[0]));
  });

  it('keeps the dashboard when a profile load is cancelled', async () => {
    const profiles = makeProfiles();
    renderProfiles(profiles);

    fireEvent.click(screen.getByText('profiles.load'));
    await screen.findByText('profiles.confirmLoad');
    fireEvent.click(screen.getByText('common.cancel'));

    await waitFor(() => expect(screen.queryByText('profiles.confirmLoad')).toBeNull());
    expect(profiles.loadProfile).not.toHaveBeenCalled();
  });

  it('asks before applying an imported file', async () => {
    const profiles = makeProfiles();
    const { container } = renderProfiles(profiles);
    const file = new File(['{"version":1}'], 'dash.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve('{"version":1}') });

    await act(async () => {
      fireEvent.change(container.ownerDocument.querySelector('input[type="file"]') as Element, {
        target: { files: [file] },
      });
    });

    expect(await screen.findByText('profiles.confirmImport')).toBeInTheDocument();
    expect(profiles.importDashboard).not.toHaveBeenCalled();

    clickConfirm('profiles.import');
    await waitFor(() => expect(profiles.importDashboard).toHaveBeenCalledWith({ version: 1 }));
  });

  it('asks before loading from the server', async () => {
    const autoSync = makeAutoSync();
    renderProfiles(makeProfiles({ autoSync }));
    expandSyncPanel();

    fireEvent.click(screen.getByText('profiles.autoSyncLoadServer'));
    expect(autoSync.loadCurrentFromServer).not.toHaveBeenCalled();
    expect(await screen.findByText('profiles.autoSyncLoadServerConfirm')).toBeInTheDocument();

    clickConfirm('profiles.load');
    await waitFor(() => expect(autoSync.loadCurrentFromServer).toHaveBeenCalledWith(undefined));
  });
});

describe('ConfigModal browser-only actions', () => {
  it('keeps Export and Import when the backend is down', () => {
    renderProfiles(makeProfiles({ backendAvailable: false }));

    expect(screen.getByText('profiles.export')).toBeInTheDocument();
    expect(screen.getByText('profiles.import')).toBeInTheDocument();
  });
});

describe('ConfigModal sync status', () => {
  it('shows a conflict as a warning without expanding the panel', () => {
    renderProfiles(makeProfiles({ autoSync: makeAutoSync({ status: 'conflict' }) }));

    expect(screen.getByText('profiles.autoSyncConflictHint')).toBeInTheDocument();
    expect(screen.getByText('profiles.autoSyncStatusConflict').className).toContain(
      '--status-warning-fg'
    );
    expect(screen.getByText('profiles.autoSyncOverwrite')).toBeInTheDocument();
    expect(screen.getByText('profiles.autoSyncLoadServer')).toBeInTheDocument();
  });

  it('shows a suspended sync without expanding the panel', () => {
    renderProfiles(makeProfiles({ autoSync: makeAutoSync({ backgroundSyncSuspended: true }) }));

    expect(screen.getByText('profiles.autoSyncSuspended')).toBeInTheDocument();
  });

  it('shows no notice when sync is healthy', () => {
    renderProfiles(makeProfiles());

    expect(screen.queryByText('profiles.autoSyncSuspended')).toBeNull();
    expect(screen.queryByText('profiles.autoSyncConflictHint')).toBeNull();
  });
});

describe('ConfigModal known devices', () => {
  const devices = [
    { device_id: 'this-device', device_label: 'Here', revision: 1 },
    { device_id: 'old-device', device_label: 'Old browser', revision: 40 },
  ];

  it('loads from another device after confirming', async () => {
    const autoSync = makeAutoSync({ knownDevices: devices });
    renderProfiles(makeProfiles({ autoSync }));
    expandSyncPanel();

    const buttons = screen.getAllByTitle('profiles.autoSyncLoadFromDevice');
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);

    expect(autoSync.loadFromDevice).not.toHaveBeenCalled();
    expect(await screen.findByText('profiles.autoSyncLoadFromDeviceConfirm')).toBeInTheDocument();
    clickConfirm('profiles.load');
    await waitFor(() => expect(autoSync.loadFromDevice).toHaveBeenCalledWith('old-device'));
  });
});

describe('ConfigModal translated errors', () => {
  it('translates sync and profile error keys and load notes', () => {
    const translated = (key: string) => `translated:${key}`;
    render(
      <ConfigModal
        open
        t={translated}
        configTab="profiles"
        setConfigTab={vi.fn()}
        config={{ url: '' }}
        themes={{}}
        onClose={vi.fn()}
        profiles={makeProfiles({
          error: 'profiles.errorSaveFailed',
          loadSummary: ['profiles.loadNotePagesRebuilt', 'profiles.loadNotePagesRecovered'],
          autoSync: makeAutoSync({ status: 'error', error: 'profiles.errorSyncFailed' }),
        })}
      />
    );

    expect(screen.getByText('translated:profiles.errorSyncFailed')).toBeInTheDocument();
    expect(screen.getByText('translated:profiles.errorSaveFailed')).toBeInTheDocument();
    expect(
      screen.getByText(
        'translated:profiles.loadNotePagesRebuilt translated:profiles.loadNotePagesRecovered'
      )
    ).toBeInTheDocument();
  });
});
