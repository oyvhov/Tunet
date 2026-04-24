import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../components/cards/StatusPill', () => ({
  default: () => <div data-testid="status-pill-preview" />,
}));

import StatusPillsConfigModal from '../modals/StatusPillsConfigModal';

const t = (key) => {
  const values = {
    'statusPills.title': 'Status Pills',
    'statusPills.yourPills': 'Your Pills',
    'statusPills.editor': 'Edit Pill',
    'statusPills.addNewPill': 'Add new pill',
    'statusPills.typeSensor': 'Sensor',
    'statusPills.show': 'Show',
    'statusPills.hide': 'Hide',
    'statusPills.newPill': 'New Pill',
    'statusPills.selectPillHint': 'Select a pill',
    'statusPills.pillNamePlaceholder': 'Pill name',
    'statusPills.cancel': 'Cancel',
    'statusPills.save': 'Save',
    'statusPills.animationLabel': 'Animation',
    'statusPills.animationNone': 'None',
    'statusPills.animationPulseSoft': 'Pulse soft',
    'statusPills.animationPulseMedium': 'Pulse medium',
    'statusPills.animationRotateSlow': 'Rotate slow',
    'statusPills.animationRotateMediumSlow': 'Rotate medium slow',
    'statusPills.headingVisible': 'Heading',
    'statusPills.subtitleVisible': 'Subtitle',
    'statusPills.automatic': 'Automatic',
    'statusPills.colorLabel': 'Color',
    'statusPills.colorCyan': 'Cyan',
    'statusPills.conditional': 'Conditional',
    'statusPills.addValuePlaceholder': 'Add value (e.g. on) + Enter',
    'statusPills.searchEntity': 'Search for entity...',
    'statusPills.entityRequired': 'Select an entity to show this pill.',
    'common.close': 'Close',
    form: 'Search',
  };
  return values[key] || key;
};

describe('StatusPillsConfigModal', () => {
  it('keeps a new pill draft open across parent rerenders', async () => {
    const props = {
      show: true,
      onClose: () => {},
      onSave: () => {},
      entities: {
        'sensor.living_room': {
          attributes: { friendly_name: 'Living Room Sensor' },
        },
      },
      statusPillsConfig: [],
      t,
    };

    let rendered;
    await act(async () => {
      rendered = render(<StatusPillsConfigModal {...props} />);
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByTitle('Add new pill'));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Sensor'));
    });

    const pillNameInput = screen.getByPlaceholderText('Pill name');

    await act(async () => {
      fireEvent.change(pillNameInput, { target: { value: 'Draft pill' } });
    });

    await act(async () => {
      rendered.rerender(<StatusPillsConfigModal {...props} statusPillsConfig={[]} />);
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText('Pill name')).toHaveValue('Draft pill');
  });

  it('keeps the editor open when the selected pill is clicked again', async () => {
    await act(async () => {
      render(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={() => {}}
          entities={{
            'sensor.living_room': {
              attributes: { friendly_name: 'Living Room Sensor' },
            },
          }}
          statusPillsConfig={[
            {
              id: 'pill-1',
              type: 'conditional',
              entityId: 'sensor.living_room',
              label: 'Living Room',
              icon: 'Activity',
              iconBgColor: 'rgba(59, 130, 246, 0.1)',
              iconColor: 'text-[var(--accent-color)]',
              visible: true,
              conditionEnabled: false,
            },
          ]}
          t={t}
        />
      );
      await Promise.resolve();
    });

    const pillButton = screen.getByText('Living Room').closest('button');
    expect(screen.getByText('Select a pill')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(pillButton);
    });
    expect(screen.getByPlaceholderText('Pill name')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(pillButton);
    });
    expect(screen.getByPlaceholderText('Pill name')).toBeInTheDocument();
    expect(screen.queryByText('Select a pill')).not.toBeInTheDocument();
  });

  it('saves animation preset, icon-only text visibility, and selected color preset', async () => {
    const onSave = vi.fn();

    await act(async () => {
      render(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': {
              attributes: { friendly_name: 'Living Room Sensor' },
            },
          }}
          statusPillsConfig={[
            {
              id: 'pill-1',
              type: 'conditional',
              entityId: 'sensor.living_room',
              label: 'Living Room',
              icon: 'Activity',
              iconBgColor: 'rgba(59, 130, 246, 0.1)',
              iconColor: 'text-[var(--accent-color)]',
              visible: true,
              conditionEnabled: false,
            },
          ]}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Living Room').closest('button'));
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Animation'), {
        target: { value: 'rotate-medium-slow' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Heading/ }));
      fireEvent.click(screen.getByRole('button', { name: /Subtitle/ }));
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Color: Cyan'));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'pill-1',
          animationPreset: 'rotate-medium-slow',
          animated: true,
          showLabel: false,
          showSublabel: false,
          iconBgColor: 'rgba(34, 211, 238, 0.18)',
          iconColor: 'text-cyan-400',
        }),
      ])
    );
  });

  it('commits a typed status value when Save is clicked without pressing Enter', async () => {
    const onSave = vi.fn();

    await act(async () => {
      render(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': {
              attributes: { friendly_name: 'Living Room Sensor' },
            },
          }}
          statusPillsConfig={[
            {
              id: 'pill-1',
              type: 'conditional',
              entityId: 'sensor.living_room',
              label: 'Living Room',
              icon: 'Activity',
              iconBgColor: 'rgba(59, 130, 246, 0.1)',
              iconColor: 'text-[var(--accent-color)]',
              visible: true,
              conditionEnabled: true,
              condition: { type: 'state', states: [] },
            },
          ]}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Living Room').closest('button'));
    });

    const stateInput = screen.getByPlaceholderText('Add value (e.g. on) + Enter');
    await act(async () => {
      fireEvent.change(stateInput, { target: { value: 'home' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0][0]).toMatchObject({
      id: 'pill-1',
      condition: expect.objectContaining({
        states: expect.arrayContaining(['home']),
      }),
    });
  });

  it('persists Heading/Subtitle toggles across a reopen of the modal', async () => {
    const onSave = vi.fn();
    const initialPill = {
      id: 'pill-1',
      type: 'conditional',
      entityId: 'sensor.living_room',
      label: 'Living Room',
      icon: 'Activity',
      iconBgColor: 'rgba(59, 130, 246, 0.1)',
      iconColor: 'text-[var(--accent-color)]',
      visible: true,
      conditionEnabled: false,
    };

    let rendered;
    await act(async () => {
      rendered = render(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': { attributes: { friendly_name: 'Living Room Sensor' } },
          }}
          statusPillsConfig={[initialPill]}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Living Room').closest('button'));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Heading/ }));
      fireEvent.click(screen.getByRole('button', { name: /Subtitle/ }));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedPills = onSave.mock.calls[0][0];
    expect(savedPills[0]).toMatchObject({ showLabel: false, showSublabel: false });

    // Simulate a page refresh: close the modal, then reopen with the persisted
    // config (what saveStatusPillsConfig writes to localStorage).
    await act(async () => {
      rendered.rerender(
        <StatusPillsConfigModal
          show={false}
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': { attributes: { friendly_name: 'Living Room Sensor' } },
          }}
          statusPillsConfig={savedPills}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      rendered.rerender(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': { attributes: { friendly_name: 'Living Room Sensor' } },
          }}
          statusPillsConfig={savedPills}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Living Room').closest('button'));
    });

    // After reopen the toggles must still read as "off" (i.e. the buttons
    // must NOT contain the ✓ checkmark prefix).
    const headingBtn = screen.getByRole('button', { name: /Heading/ });
    const subtitleBtn = screen.getByRole('button', { name: /Subtitle/ });
    expect(headingBtn.textContent).not.toContain('✓');
    expect(subtitleBtn.textContent).not.toContain('✓');

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave.mock.calls[1][0][0]).toMatchObject({
      showLabel: false,
      showSublabel: false,
    });
  });

  it('persists Heading/Subtitle toggles for automatic sensor text across reopen', async () => {
    const onSave = vi.fn();
    const initialPill = {
      id: 'pill-1',
      type: 'conditional',
      entityId: 'sensor.living_room',
      label: '',
      sublabel: '',
      name: '',
      icon: 'Activity',
      iconBgColor: 'rgba(59, 130, 246, 0.1)',
      iconColor: 'text-[var(--accent-color)]',
      visible: true,
      conditionEnabled: false,
      showLabel: true,
      showSublabel: true,
    };

    let rendered;
    await act(async () => {
      rendered = render(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': { attributes: { friendly_name: 'Living Room Sensor' } },
          }}
          statusPillsConfig={[initialPill]}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Living Room Sensor').closest('button'));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Heading/ }));
      fireEvent.click(screen.getByRole('button', { name: /Subtitle/ }));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedPills = onSave.mock.calls[0][0];
    expect(savedPills[0]).toMatchObject({
      name: '',
      label: '',
      sublabel: '',
      showLabel: false,
      showSublabel: false,
    });

    await act(async () => {
      rendered.rerender(
        <StatusPillsConfigModal
          show={false}
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': { attributes: { friendly_name: 'Living Room Sensor' } },
          }}
          statusPillsConfig={savedPills}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      rendered.rerender(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': { attributes: { friendly_name: 'Living Room Sensor' } },
          }}
          statusPillsConfig={savedPills}
          t={t}
        />
      );
      await Promise.resolve();
    });

    expect(screen.getByText('Icon only')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByText('Icon only').closest('button'));
    });

    const headingBtn = screen.getByRole('button', { name: /Heading/ });
    const subtitleBtn = screen.getByRole('button', { name: /Subtitle/ });
    expect(headingBtn.textContent).not.toContain('✓');
    expect(subtitleBtn.textContent).not.toContain('✓');
  });

  it('dispatches the global edit checkpoint when saving pills', async () => {
    const onSave = vi.fn();
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    await act(async () => {
      render(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': {
              attributes: { friendly_name: 'Living Room Sensor' },
            },
          }}
          statusPillsConfig={[
            {
              id: 'pill-1',
              type: 'conditional',
              entityId: 'sensor.living_room',
              label: 'Living Room',
              icon: 'Activity',
              iconBgColor: 'rgba(59, 130, 246, 0.1)',
              iconColor: 'text-[var(--accent-color)]',
              visible: true,
              conditionEnabled: false,
            },
          ]}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    expect(dispatchSpy.mock.calls.some((call) => call[0]?.type === 'tunet:edit-done')).toBe(true);

    dispatchSpy.mockRestore();
  });

  it('turns off visible text when heading and subtitle inputs are cleared', async () => {
    const onSave = vi.fn();

    await act(async () => {
      render(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': {
              attributes: { friendly_name: 'Living Room Sensor' },
            },
          }}
          statusPillsConfig={[
            {
              id: 'pill-1',
              type: 'conditional',
              entityId: 'sensor.living_room',
              label: 'Living Room',
              sublabel: '21 C',
              icon: 'Activity',
              iconBgColor: 'rgba(59, 130, 246, 0.1)',
              iconColor: 'text-[var(--accent-color)]',
              visible: true,
              conditionEnabled: false,
              showLabel: true,
              showSublabel: true,
            },
          ]}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Living Room').closest('button'));
    });

    const inputs = screen.getAllByRole('textbox');
    const headingInput = inputs.find((input) => input.value === 'Living Room');
    const subtitleInput = inputs.find((input) => input.value === '21 C');

    await act(async () => {
      fireEvent.change(headingInput, { target: { value: '' } });
      fireEvent.change(subtitleInput, { target: { value: '' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0][0]).toMatchObject({
      label: '',
      sublabel: '',
      showLabel: false,
      showSublabel: false,
    });
  });

  it('turns off visible heading text when the Name field is cleared', async () => {
    const onSave = vi.fn();

    await act(async () => {
      render(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': {
              attributes: { friendly_name: 'Living Room Sensor' },
            },
          }}
          statusPillsConfig={[
            {
              id: 'pill-1',
              type: 'conditional',
              entityId: 'sensor.living_room',
              name: 'Custom pill',
              icon: 'Activity',
              iconBgColor: 'rgba(59, 130, 246, 0.1)',
              iconColor: 'text-[var(--accent-color)]',
              visible: true,
              conditionEnabled: false,
              showLabel: true,
            },
          ]}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Custom pill').closest('button'));
    });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('Pill name'), {
        target: { value: '' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0][0]).toMatchObject({
      name: '',
      showLabel: false,
    });
  });

  it('uses a manual heading even when an existing name is present', async () => {
    const onSave = vi.fn();

    await act(async () => {
      render(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': {
              attributes: { friendly_name: 'Living Room Sensor' },
            },
          }}
          statusPillsConfig={[
            {
              id: 'pill-1',
              type: 'conditional',
              entityId: 'sensor.living_room',
              name: 'Living Room Sensor',
              label: '',
              icon: 'Activity',
              iconBgColor: 'rgba(59, 130, 246, 0.1)',
              iconColor: 'text-[var(--accent-color)]',
              visible: true,
              conditionEnabled: false,
              showLabel: true,
            },
          ]}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Living Room Sensor').closest('button'));
    });

    const [headingInput] = screen.getAllByPlaceholderText('Automatic');

    await act(async () => {
      fireEvent.change(headingInput, { target: { value: 'Manual heading' } });
    });

    expect(screen.getByText('Manual heading')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0][0]).toMatchObject({
      name: 'Living Room Sensor',
      label: 'Manual heading',
      showLabel: true,
    });
  });

  it('disables save for a visible new sensor pill until an entity is selected', async () => {
    await act(async () => {
      render(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={() => {}}
          entities={{
            'sensor.living_room': {
              state: '21',
              attributes: { friendly_name: 'Living Room Sensor' },
            },
          }}
          statusPillsConfig={[]}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByTitle('Add new pill'));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Sensor'));
    });

    expect(screen.getByText('Select an entity to show this pill.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves a newly added sensor pill after selecting an entity', async () => {
    const onSave = vi.fn();

    await act(async () => {
      render(
        <StatusPillsConfigModal
          show
          onClose={() => {}}
          onSave={onSave}
          entities={{
            'sensor.living_room': {
              state: '21',
              attributes: { friendly_name: 'Living Room Sensor' },
            },
          }}
          statusPillsConfig={[]}
          t={t}
        />
      );
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByTitle('Add new pill'));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Sensor'));
    });

    const entitySearchInput = screen.getByPlaceholderText('Search for entity...');

    await act(async () => {
      fireEvent.focus(entitySearchInput);
      fireEvent.change(entitySearchInput, { target: { value: 'living' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Living Room Sensor').closest('button'));
    });

    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0][0]).toMatchObject({
      type: 'conditional',
      entityId: 'sensor.living_room',
      visible: true,
      conditionEnabled: false,
    });
  });
});