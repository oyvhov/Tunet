import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DraftNumberInput from '../modals/editCard/DraftNumberInput';
import SensorNumericStyle from '../modals/editCard/SensorNumericStyle';
import ConditionBuilder from '../components/ui/ConditionBuilder';
import EditPageModal from '../modals/EditPageModal';
import en from '../i18n/en.json';

vi.mock('../contexts', () => ({
  usePages: () => ({ pagesConfig: { pages: ['home', 'other'] } }),
}));
vi.mock('../components/ui/AccessibleModalShell', () => ({
  default: ({ open, children }: { open: boolean; children: () => React.ReactNode }) =>
    open ? <div>{children()}</div> : null,
  useModalShell: () => null,
}));
vi.mock('../components/ui/IconPicker', () => ({ default: () => <div /> }));

const translations: Record<string, string> = en;
const t = (key: string) => translations[key] || key;

describe('DraftNumberInput', () => {
  it('keeps what is typed and commits it on blur', () => {
    const onCommit = vi.fn();
    render(<DraftNumberInput aria-label="n" value={10} onCommit={onCommit} />);
    const input = screen.getByLabelText('n');
    fireEvent.change(input, { target: { value: '6' } });
    expect(input).toHaveValue(6);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '60' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('60');
  });

  it('shows the saved value again when left empty', () => {
    const onCommit = vi.fn();
    render(<DraftNumberInput aria-label="n" value={10} onCommit={onCommit} />);
    const input = screen.getByLabelText('n');
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue(null);
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue(10);
  });

  it('commits an empty value when asked to', () => {
    const onCommit = vi.fn();
    render(<DraftNumberInput aria-label="n" value={10} onCommit={onCommit} commitEmpty />);
    const input = screen.getByLabelText('n');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('');
  });

  it('commits a pending draft when the field goes away without a blur', () => {
    const onCommit = vi.fn();
    const { unmount } = render(<DraftNumberInput aria-label="n" value={10} onCommit={onCommit} />);
    fireEvent.change(screen.getByLabelText('n'), { target: { value: '60' } });
    unmount();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('60');
  });

  it('does not commit when nothing changed', () => {
    const onCommit = vi.fn();
    render(<DraftNumberInput aria-label="n" value={10} onCommit={onCommit} />);
    fireEvent.blur(screen.getByLabelText('n'));
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('sensor colour thresholds', () => {
  const settings = {
    sensorVariant: 'gauge',
    sensorColorThresholds: [
      { limit: 10, color: 'blue' },
      { limit: 20, color: 'green' },
      { limit: 30, color: 'red' },
    ],
  };
  const entities = {
    'sensor.a': {
      entity_id: 'sensor.a',
      state: '5',
      attributes: { unit_of_measurement: 'W' },
    },
  };

  it('lets a threshold be cleared while typing and saves on blur', () => {
    const saveCardSetting = vi.fn();
    render(
      <SensorNumericStyle
        primaryId="sensor.a"
        settings={settings}
        settingsKey="key"
        entities={entities}
        numericEntityOptions={[]}
        saveCardSetting={saveCardSetting}
        t={t}
      />
    );
    const input = screen.getByLabelText(`${en['sensor.step']} 1`);
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue(null);
    expect(saveCardSetting).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.blur(input);
    expect(saveCardSetting).toHaveBeenCalledWith('key', 'sensorColorThresholds', [
      { limit: 15, color: 'blue' },
      { limit: 20, color: 'green' },
      { limit: 30, color: 'red' },
    ]);
  });
});

describe('condition duration', () => {
  it('commits the duration on blur', () => {
    const onChange = vi.fn();
    render(
      <ConditionBuilder
        cardId="light.a"
        cardSettings={{}}
        entities={{}}
        t={t}
        showHeader={false}
        showEnableToggle={false}
        forceEnabled
        condition={{ enabled: true, rules: [{ type: 'state', states: ['on'] }] }}
        onChange={onChange}
      />
    );
    const input = screen.getByTitle(en['visibility.forSeconds']);
    fireEvent.change(input, { target: { value: '30' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onChange.mock.calls[0][0].rules[0].forSeconds).toBe(30);
  });
});

describe('EditPageModal name', () => {
  const savePageSetting = vi.fn();
  const renderModal = () =>
    render(
      <EditPageModal
        isOpen
        onClose={vi.fn()}
        t={t}
        editingPage="home"
        pageSettings={{ home: { label: 'Kitchen' } }}
        savePageSetting={savePageSetting}
        pageDefaults={{}}
        onDelete={vi.fn()}
      />
    );

  it('stays empty while the name is being retyped', () => {
    renderModal();
    const input = screen.getByLabelText(en['form.name']);
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue('');
    expect(savePageSetting).toHaveBeenCalledWith('home', 'label', '');
  });
});
