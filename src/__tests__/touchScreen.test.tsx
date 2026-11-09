import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import SidebarContainer from '../components/sidebars/SidebarContainer';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import PinLockModal from '../components/ui/PinLockModal';
import AlarmActionPinModal from '../modals/AlarmActionPinModal';
import ConfigModal from '../modals/ConfigModal';
import { hasTouchScreen, opensTouchKeyboard } from '../utils/touchScreen';

interface Device {
  touchPoints: number;
  matches: string[];
}

const MOUSE_DESKTOP: Device = {
  touchPoints: 0,
  matches: ['(pointer: fine)', '(any-pointer: fine)'],
};
const PHONE: Device = { touchPoints: 5, matches: ['(pointer: coarse)', '(any-pointer: coarse)'] };
// Chromium on Android reports a stylus as a fine pointer next to the touchscreen.
const STYLUS_TABLET: Device = {
  touchPoints: 10,
  matches: ['(pointer: coarse)', '(any-pointer: coarse)', '(any-pointer: fine)'],
};

function stubDevice({ touchPoints, matches }: Device) {
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: touchPoints });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches.includes(query),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const t = (key: string) => key;

const flushTimers = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'maxTouchPoints');
});

describe('hasTouchScreen', () => {
  it.each<[string, Device]>([
    ['a phone', PHONE],
    ['a tablet with a stylus', STYLUS_TABLET],
    ['a stylus tablet that reports no touch points', { ...STYLUS_TABLET, touchPoints: 0 }],
    ['a device known only by its touch points', { touchPoints: 1, matches: [] }],
    [
      'a device known only by a coarse pointer',
      { touchPoints: 0, matches: ['(any-pointer: coarse)'] },
    ],
  ])('is true on %s', (_name, device) => {
    stubDevice(device);
    expect(hasTouchScreen()).toBe(true);
  });

  it('is false on a desktop with only a mouse', () => {
    stubDevice(MOUSE_DESKTOP);
    expect(hasTouchScreen()).toBe(false);
  });

  it('is false without matchMedia or touch points', () => {
    expect(hasTouchScreen()).toBe(false);
  });
});

describe('opensTouchKeyboard', () => {
  const element = (html: string) => {
    const host = document.createElement('div');
    host.innerHTML = html;
    return host.firstElementChild as Element;
  };

  it.each([
    '<input />',
    '<input type="number" />',
    '<textarea></textarea>',
    '<div contenteditable="true"></div>',
  ])('is true for %s on a touch screen', (html) => {
    stubDevice(STYLUS_TABLET);
    expect(opensTouchKeyboard(element(html))).toBe(true);
  });

  it.each([
    '<button></button>',
    '<input type="checkbox" />',
    '<input type="range" />',
    '<select></select>',
  ])('is false for %s on a touch screen', (html) => {
    stubDevice(STYLUS_TABLET);
    expect(opensTouchKeyboard(element(html))).toBe(false);
  });

  it('is false for a text field on a desktop with only a mouse', () => {
    stubDevice(MOUSE_DESKTOP);
    expect(opensTouchKeyboard(element('<input />'))).toBe(false);
  });
});

describe('popup focus', () => {
  const popup = (open: boolean) => (
    <AccessibleModalShell open={open} onClose={vi.fn()} size="m">
      {() => <input aria-label="Name" />}
    </AccessibleModalShell>
  );

  const openFrom = (trigger: ReactElement) => {
    const view = render(
      <>
        {trigger}
        {popup(false)}
      </>
    );
    screen.getByTestId('trigger').focus();
    view.rerender(
      <>
        {trigger}
        {popup(true)}
      </>
    );
    return () =>
      view.rerender(
        <>
          {trigger}
          {popup(false)}
        </>
      );
  };

  it.each<[string, Device]>([
    ['a phone', PHONE],
    ['a tablet with a stylus', STYLUS_TABLET],
  ])('focuses the panel instead of a text field on %s', (_name, device) => {
    stubDevice(device);
    render(popup(true));
    expect(screen.getByLabelText('Name')).not.toHaveFocus();
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('focuses the text field on a desktop with only a mouse', () => {
    stubDevice(MOUSE_DESKTOP);
    render(popup(true));
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('does not hand focus back to a text field on a touch screen', () => {
    stubDevice(STYLUS_TABLET);
    const close = openFrom(<input data-testid="trigger" />);
    close();
    expect(screen.getByTestId('trigger')).not.toHaveFocus();
  });

  it('hands focus back to a button on a touch screen', () => {
    stubDevice(STYLUS_TABLET);
    const close = openFrom(<button type="button" data-testid="trigger" />);
    close();
    expect(screen.getByTestId('trigger')).toHaveFocus();
  });

  it('hands focus back to a text field on a desktop with only a mouse', () => {
    stubDevice(MOUSE_DESKTOP);
    const close = openFrom(<input data-testid="trigger" />);
    close();
    expect(screen.getByTestId('trigger')).toHaveFocus();
  });
});

describe('sidebar focus', () => {
  const sidebar = (open: boolean) => (
    <SidebarContainer open={open} onClose={vi.fn()} title="Panel">
      <input aria-label="Search" />
      <button type="button">Apply</button>
    </SidebarContainer>
  );

  // jsdom has no layout, and the sidebar only moves focus to rendered elements.
  const pretendElementsAreRendered = (except = '') =>
    vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function (this: Element) {
      return (except && this.matches(except) ? [] : [{}]) as unknown as DOMRectList;
    });

  it('skips a text field that would be first when it opens on a touch screen', () => {
    stubDevice(STYLUS_TABLET);
    pretendElementsAreRendered('[data-testid="sidebar-done"]');
    render(sidebar(true));
    expect(screen.getByLabelText('Search')).not.toHaveFocus();
    expect(screen.getByRole('button', { name: 'Apply' })).toHaveFocus();
  });

  it('focuses a text field that is first on a desktop with only a mouse', () => {
    stubDevice(MOUSE_DESKTOP);
    pretendElementsAreRendered('[data-testid="sidebar-done"]');
    render(sidebar(true));
    expect(screen.getByLabelText('Search')).toHaveFocus();
  });

  it('does not hand focus back to a text field on a touch screen', () => {
    stubDevice(STYLUS_TABLET);
    pretendElementsAreRendered();
    const trigger = <input data-testid="trigger" />;
    const view = render(
      <>
        {trigger}
        {sidebar(false)}
      </>
    );
    screen.getByTestId('trigger').focus();
    view.rerender(
      <>
        {trigger}
        {sidebar(true)}
      </>
    );
    view.rerender(
      <>
        {trigger}
        {sidebar(false)}
      </>
    );
    expect(screen.getByTestId('trigger')).not.toHaveFocus();
  });
});

describe('PIN popups', () => {
  const pinInput = () => screen.getByRole('dialog').querySelector('input') as HTMLInputElement;

  it('keeps the PIN lock field unfocused on a tablet with a stylus', async () => {
    stubDevice(STYLUS_TABLET);
    render(<PinLockModal open onClose={vi.fn()} onSubmit={vi.fn()} t={t} />);
    await flushTimers();
    expect(pinInput()).not.toHaveFocus();
  });

  it('keeps the alarm PIN field unfocused on a tablet with a stylus', async () => {
    stubDevice(STYLUS_TABLET);
    render(
      <AlarmActionPinModal
        show
        onClose={vi.fn()}
        actionKey="disarm"
        entityId="alarm_control_panel.home"
        entity={{ attributes: { code_format: 'number' } }}
        callService={vi.fn()}
        t={t}
      />
    );
    await flushTimers();
    expect(pinInput()).not.toHaveFocus();
  });

  it('focuses the PIN lock field on a desktop with only a mouse', async () => {
    stubDevice(MOUSE_DESKTOP);
    render(<PinLockModal open onClose={vi.fn()} onSubmit={vi.fn()} t={t} />);
    await flushTimers();
    expect(pinInput()).toHaveFocus();
  });
});

describe('profile name field', () => {
  const openProfileEditor = () => {
    render(
      <ConfigModal
        open
        t={t}
        configTab="profiles"
        setConfigTab={vi.fn()}
        config={{ url: '' }}
        themes={{}}
        onClose={vi.fn()}
        profiles={{
          profiles: [{ id: 'p1', name: 'Kitchen', device_label: 'Tablet' }],
          backendAvailable: true,
          haUser: { id: 'u1', name: 'Owner' },
          autoSync: { knownDevices: [], targets: [], revisions: [] },
        }}
      />
    );
    fireEvent.click(screen.getByText('profiles.load').nextElementSibling as HTMLElement);
    return screen.getByDisplayValue('Kitchen');
  };

  it('stays unfocused on a tablet with a stylus', () => {
    stubDevice(STYLUS_TABLET);
    expect(openProfileEditor()).not.toHaveFocus();
  });

  it('gets focus on a desktop with only a mouse', () => {
    stubDevice(MOUSE_DESKTOP);
    expect(openProfileEditor()).toHaveFocus();
  });
});
