import { useState } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock, MockInstance } from 'vitest';
import { HashRouter, useLocation, useNavigate } from 'react-router-dom';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { ModalHeader, StatusChip } from '../components/ui/ModalParts';
import Segmented from '../components/ui/Segmented';
import { formatRelativeTime } from '../utils/formatting';

const t = (key: string) =>
  ({
    'time.justNow': 'just now',
    'time.minutesAgo': '{minutes} min ago',
    'time.todayAt': 'today {time}',
    'time.yesterdayAt': 'yesterday {time}',
  })[key] ?? key;

/** Lets queued history work and its popstate run on real timers. */
const settleHistory = (ms = 30) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

describe('AccessibleModalShell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(async () => {
    cleanup();
    vi.useRealTimers();
    await settleHistory();
  });

  const renderShell = (onClose = vi.fn(), extra: Record<string, unknown> = {}) => {
    render(
      <AccessibleModalShell open onClose={onClose} size="m" {...extra}>
        {() => (
          <>
            <ModalHeader title="Kitchen" closeLabel="Close" />
            <input aria-label="level" type="range" />
          </>
        )}
      </AccessibleModalShell>
    );
    return onClose;
  };

  it('uses the shared popup layout classes when a size is given', () => {
    renderShell();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('modal-panel', 'modal-panel--m', 'popup-anim');
    expect(dialog.parentElement).toHaveClass('modal-overlay');
    expect(screen.getByRole('heading', { name: 'Kitchen' })).toHaveAttribute(
      'id',
      dialog.getAttribute('aria-labelledby')
    );
  });

  it('plays the exit animation before calling onClose on Escape', () => {
    const onClose = renderShell();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog').parentElement).toHaveAttribute('data-modal-state', 'closing');
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open, without the exit animation, when beforeClose declines', async () => {
    const onClose = vi.fn();
    render(
      <AccessibleModalShell open onClose={onClose} beforeClose={() => false} size="s">
        {() => <p>Body</p>}
      </AccessibleModalShell>
    );

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(screen.getByRole('dialog').parentElement).toHaveAttribute('data-modal-state', 'open');
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes through the header close button', () => {
    const onClose = renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a backdrop click that started on the backdrop', () => {
    const onClose = renderShell();
    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open when a drag starts inside the panel and ends on the backdrop', () => {
    const onClose = renderShell();
    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.pointerDown(screen.getByLabelText('level'));
    fireEvent.click(overlay, { detail: 1 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('only closes the top popup on Escape', () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    render(
      <>
        <AccessibleModalShell open onClose={outerClose} size="l">
          {() => <ModalHeader title="Alarm" closeLabel="Close alarm" />}
        </AccessibleModalShell>
        <AccessibleModalShell open onClose={innerClose} size="s" nested>
          {() => <ModalHeader title="PIN" closeLabel="Close PIN" />}
        </AccessibleModalShell>
      </>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(innerClose).toHaveBeenCalledTimes(1);
    expect(outerClose).not.toHaveBeenCalled();
  });

  it('closes at once without motion or blur in still mode', () => {
    const onClose = renderShell(vi.fn(), { still: true });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('modal-panel--still');
    expect((dialog.parentElement as HTMLElement).style.backdropFilter).toBe('');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape and the backdrop when not dismissible', () => {
    const onClose = renderShell(vi.fn(), { dismissible: false });
    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(overlay).toHaveAttribute('data-modal-state', 'open');
  });

  it('renders a nested popup outside the parent panel', () => {
    render(
      <AccessibleModalShell open onClose={vi.fn()} size="l">
        {() => (
          <>
            <ModalHeader title="Alarm" closeLabel="Close alarm" />
            <AccessibleModalShell open onClose={vi.fn()} size="s" nested>
              {() => <ModalHeader title="PIN" closeLabel="Close PIN" />}
            </AccessibleModalShell>
          </>
        )}
      </AccessibleModalShell>
    );
    const [outer, inner] = screen.getAllByRole('dialog');
    expect(outer.contains(inner)).toBe(false);
    expect(inner.parentElement?.parentElement).toBe(document.body);
  });

  it('keeps legacy class names when no size is given', () => {
    render(
      <AccessibleModalShell
        open
        onClose={vi.fn()}
        overlayClassName="legacy-overlay"
        panelClassName="legacy-panel"
      >
        {() => <h3>Legacy</h3>}
      </AccessibleModalShell>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('legacy-panel');
    expect(dialog).not.toHaveClass('modal-panel');
    expect(dialog.parentElement).toHaveClass('legacy-overlay');
  });
});

describe('StatusChip', () => {
  it('shows the state and an optional detail', () => {
    render(<StatusChip label="On" detail="22 %" tone="on" />);
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByText('22 %')).toBeInTheDocument();
  });
});

describe('Segmented', () => {
  it('marks one option as selected and moves with the arrow keys', () => {
    const onChange = vi.fn();
    render(
      <Segmented
        ariaLabel="Range"
        value="24h"
        onChange={onChange}
        options={[
          { value: '6h', label: '6 h' },
          { value: '24h', label: '24 h' },
          { value: '7d', label: '7 d' },
        ]}
      />
    );
    const selected = screen.getByRole('radio', { name: '24 h' });
    expect(selected).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '6 h' })).toHaveAttribute('aria-checked', 'false');
    fireEvent.keyDown(selected, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('7d');
  });

  it('keeps an enabled option in the tab order when the selected one is disabled', () => {
    render(
      <Segmented
        ariaLabel="Range"
        value="6h"
        onChange={vi.fn()}
        options={[
          { value: '6h', label: '6 h', disabled: true },
          { value: '24h', label: '24 h' },
        ]}
      />
    );
    expect(screen.getByRole('radio', { name: '24 h' })).toHaveAttribute('tabindex', '0');
  });
});

describe('useConfirmDialog', () => {
  it('answers false when the host unmounts with a question open', async () => {
    const { result, unmount } = renderHook(() =>
      useConfirmDialog({ cancel: 'Cancel', close: 'Close' })
    );
    let answer: Promise<boolean> | undefined;
    act(() => {
      answer = result.current.confirm({ title: 'Delete?', confirmLabel: 'Delete' });
    });
    unmount();
    await expect(answer).resolves.toBe(false);
  });
});

describe('AccessibleModalShell scroll lock', () => {
  const originalInnerWidth = window.innerWidth;

  const openShellWithScrollbar = (scrollbarWidth: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 1280 - scrollbarWidth,
    });
    return render(
      <AccessibleModalShell open onClose={vi.fn()} size="m">
        {() => <button type="button">Ok</button>}
      </AccessibleModalShell>
    );
  };

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    Reflect.deleteProperty(document.documentElement, 'clientWidth');
  });

  it('keeps the page from widening when the scrollbar disappears', () => {
    const { unmount } = openShellWithScrollbar(15);

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.paddingRight).toBe('15px');

    unmount();

    expect(document.body.style.paddingRight).toBe('');
  });

  it('only releases the page when the last popup is gone', () => {
    const first = openShellWithScrollbar(15);
    const second = render(
      <AccessibleModalShell open onClose={vi.fn()} size="s" nested>
        {() => <button type="button">Inner</button>}
      </AccessibleModalShell>
    );

    first.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    second.unmount();
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.paddingRight).toBe('');
  });

  it('adds no padding when scrollbars take no room', () => {
    openShellWithScrollbar(0);

    expect(document.body.style.paddingRight).toBe('');
  });
});

describe('AccessibleModalShell Back button', () => {
  const START_URL = '#/page/kitchen';
  let pushState: MockInstance<History['pushState']>;
  let go: MockInstance<History['go']>;
  let routerSaw: Mock<() => void>;
  let userBacks = 0;

  /** How far above the starting entry the session history stands. */
  const depth = () =>
    pushState.mock.calls.length +
    go.mock.calls.reduce((sum, [delta]) => sum + (delta ?? 0), 0) -
    userBacks;

  const pressBack = async () => {
    userBacks += 1;
    window.history.back();
    await settleHistory();
  };

  const closeOnTop = async () => {
    fireEvent.keyDown(document, { key: 'Escape' });
    await settleHistory();
  };

  type PopupProps = {
    id?: string;
    initialOpen?: boolean;
    onClose?: () => void;
    still?: boolean;
    nested?: boolean;
    dismissible?: boolean;
  };

  function Popup({ id = 'popup', initialOpen = true, onClose, still = true, ...rest }: PopupProps) {
    const [open, setOpen] = useState(initialOpen);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          {`open ${id}`}
        </button>
        <AccessibleModalShell
          open={open}
          still={still}
          size="m"
          onClose={() => {
            onClose?.();
            setOpen(false);
          }}
          {...rest}
        >
          {() => <h3>{id}</h3>}
        </AccessibleModalShell>
      </>
    );
  }

  beforeEach(async () => {
    await settleHistory();
    window.history.replaceState({ key: 'router' }, '', START_URL);
    userBacks = 0;
    pushState = vi.spyOn(window.history, 'pushState');
    go = vi.spyOn(window.history, 'go');
    routerSaw = vi.fn();
    // Registered like the router's own listener: on window, without capture.
    window.addEventListener('popstate', routerSaw);
  });

  afterEach(async () => {
    cleanup();
    await settleHistory();
    window.removeEventListener('popstate', routerSaw);
    vi.restoreAllMocks();
  });

  it('adds one entry with the same URL and router state when a popup opens', async () => {
    render(<Popup />);
    await settleHistory();

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState.mock.calls[0][2]).toBeUndefined();
    expect(window.location.hash).toBe(START_URL);
    expect(window.history.state).toEqual({ key: 'router' });
  });

  it('closes the popup on Back and uses up its entry', async () => {
    const onClose = vi.fn();
    render(<Popup onClose={onClose} />);
    await settleHistory();

    await pressBack();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(go).not.toHaveBeenCalled();
    expect(depth()).toBe(0);
    expect(window.location.hash).toBe(START_URL);
  });

  it('stays on the dashboard when Back is pressed twice during the exit animation', async () => {
    const onClose = vi.fn();
    render(<Popup onClose={onClose} still={false} />);
    await settleHistory();
    const before = window.history.length;

    await pressBack();
    await settleHistory(40);
    expect(depth()).toBe(1);
    expect(window.history.length).toBeGreaterThanOrEqual(before);

    await settleHistory(250);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(depth()).toBe(0);
  });

  it('plays the exit animation when closed with Back', async () => {
    const onClose = vi.fn();
    render(<Popup onClose={onClose} still={false} />);
    await settleHistory();

    await pressBack();
    expect(screen.getByRole('dialog').parentElement).toHaveAttribute('data-modal-state', 'closing');
    expect(onClose).not.toHaveBeenCalled();

    await settleHistory(250);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(depth()).toBe(0);
  });

  it('removes the entry when closed another way, without closing again or telling the router', async () => {
    const onClose = vi.fn();
    render(<Popup onClose={onClose} />);
    await settleHistory();

    await closeOnTop();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledWith(-1);
    expect(depth()).toBe(0);
    expect(routerSaw).not.toHaveBeenCalled();
    expect(window.location.hash).toBe(START_URL);
  });

  it('removes the entry when the popup is unmounted while open', async () => {
    const { unmount } = render(<Popup />);
    await settleHistory();

    unmount();
    await settleHistory();

    expect(go).toHaveBeenCalledWith(-1);
    expect(depth()).toBe(0);
  });

  it('closes only the top popup on each Back', async () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    render(
      <>
        <Popup id="outer" onClose={outerClose} />
        <Popup id="inner" onClose={innerClose} nested />
      </>
    );
    await settleHistory();
    expect(pushState).toHaveBeenCalledTimes(2);

    await pressBack();
    expect(innerClose).toHaveBeenCalledTimes(1);
    expect(outerClose).not.toHaveBeenCalled();
    expect(depth()).toBe(1);

    await pressBack();
    expect(outerClose).toHaveBeenCalledTimes(1);
    expect(depth()).toBe(0);
  });

  it('keeps the outer popup guarded after the inner one closes another way', async () => {
    const outerClose = vi.fn();
    render(
      <>
        <Popup id="outer" onClose={outerClose} />
        <Popup id="inner" nested />
      </>
    );
    await settleHistory();

    await closeOnTop();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(outerClose).not.toHaveBeenCalled();
    expect(depth()).toBe(1);

    await pressBack();
    expect(outerClose).toHaveBeenCalledTimes(1);
    expect(depth()).toBe(0);
  });

  it('leaves the top popup open when a popup under it closes', async () => {
    const innerClose = vi.fn();
    function Pair() {
      const [outerOpen, setOuterOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOuterOpen(false)}>
            drop outer
          </button>
          <AccessibleModalShell open={outerOpen} still size="m" onClose={vi.fn()}>
            {() => <h3>outer</h3>}
          </AccessibleModalShell>
          <AccessibleModalShell open still size="s" nested onClose={innerClose}>
            {() => <h3>inner</h3>}
          </AccessibleModalShell>
        </>
      );
    }
    render(<Pair />);
    await settleHistory();

    fireEvent.click(screen.getByRole('button', { name: 'drop outer' }));
    await settleHistory();

    expect(innerClose).not.toHaveBeenCalled();
    expect(depth()).toBe(1);
    expect(routerSaw).not.toHaveBeenCalled();
  });

  it('reuses the entry when one popup replaces another in the same update', async () => {
    function Swap() {
      const [which, setWhich] = useState('a');
      return (
        <>
          <button type="button" onClick={() => setWhich('b')}>
            swap
          </button>
          <AccessibleModalShell open={which === 'a'} still size="m" onClose={vi.fn()}>
            {() => <h3>a</h3>}
          </AccessibleModalShell>
          <AccessibleModalShell open={which === 'b'} still size="m" onClose={vi.fn()}>
            {() => <h3>b</h3>}
          </AccessibleModalShell>
        </>
      );
    }
    render(<Swap />);
    await settleHistory();

    fireEvent.click(screen.getByRole('button', { name: 'swap' }));
    await settleHistory();

    expect(pushState).toHaveBeenCalledTimes(1);
    expect(go).not.toHaveBeenCalled();
    expect(depth()).toBe(1);
  });

  it('waits for the old entry to go before adding one for a popup opened right after', async () => {
    const secondClose = vi.fn();
    render(
      <>
        <Popup id="first" />
        <Popup id="second" initialOpen={false} onClose={secondClose} />
      </>
    );
    await settleHistory();

    // Only microtasks pass between these steps, so the traversal cannot have landed yet.
    fireEvent.keyDown(document, { key: 'Escape' });
    await Promise.resolve();
    expect(go).toHaveBeenCalledWith(-1);

    fireEvent.click(screen.getByRole('button', { name: 'open second' }));
    await Promise.resolve();
    expect(pushState).toHaveBeenCalledTimes(1);

    await settleHistory();
    expect(pushState).toHaveBeenCalledTimes(2);
    expect(depth()).toBe(1);

    await pressBack();
    expect(secondClose).toHaveBeenCalledTimes(1);
    expect(depth()).toBe(0);
  });

  it('adds no entry for a popup that cannot be dismissed, and ignores Back', async () => {
    const onClose = vi.fn();
    render(<Popup onClose={onClose} dismissible={false} />);
    await settleHistory();
    expect(pushState).not.toHaveBeenCalled();

    await pressBack();

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps everything open when Back hits a popup that cannot be dismissed on top', async () => {
    const outerClose = vi.fn();
    const onboardingClose = vi.fn();
    render(
      <>
        <Popup id="outer" onClose={outerClose} />
        <Popup id="onboarding" onClose={onboardingClose} dismissible={false} nested />
      </>
    );
    await settleHistory();
    expect(pushState).toHaveBeenCalledTimes(1);

    await pressBack();

    expect(outerClose).not.toHaveBeenCalled();
    expect(onboardingClose).not.toHaveBeenCalled();
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    expect(pushState).toHaveBeenCalledTimes(2);
    expect(depth()).toBe(1);
  });

  it('adds the entry when a popup becomes dismissible while open', async () => {
    const { rerender } = render(<Popup dismissible={false} />);
    await settleHistory();
    expect(pushState).not.toHaveBeenCalled();

    rerender(<Popup dismissible />);
    await settleHistory();

    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it('removes every entry in one step when all popups close at once', async () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    function All({ open }: { open: boolean }) {
      return (
        <>
          <AccessibleModalShell open={open} still size="m" onClose={outerClose}>
            {() => <h3>outer</h3>}
          </AccessibleModalShell>
          <AccessibleModalShell open={open} still size="s" nested onClose={innerClose}>
            {() => <h3>inner</h3>}
          </AccessibleModalShell>
        </>
      );
    }
    const { rerender } = render(<All open />);
    await settleHistory();

    rerender(<All open={false} />);
    await settleHistory();

    expect(go).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledWith(-2);
    expect(depth()).toBe(0);
    expect(outerClose).not.toHaveBeenCalled();
    expect(innerClose).not.toHaveBeenCalled();
    expect(routerSaw).not.toHaveBeenCalled();
  });

  it('stays on the new page when a reset changes page and closes the popup together', async () => {
    function Reset({ open }: { open: boolean }) {
      return (
        <AccessibleModalShell open={open} still size="m" onClose={vi.fn()}>
          {() => <h3>popup</h3>}
        </AccessibleModalShell>
      );
    }
    const { rerender } = render(<Reset open />);
    await settleHistory();

    // What navigate(..., { replace: true }) does: only the entry on top changes URL.
    window.history.replaceState({ key: 'home' }, '', '#/page/home');
    rerender(<Reset open={false} />);
    await settleHistory();

    expect(window.location.hash).toBe('#/page/home');
    expect(window.history.state).toEqual({ key: 'home' });
    expect(routerSaw).not.toHaveBeenCalled();
    expect(depth()).toBe(0);
  });

  it('leaves Back alone when no popup is open', async () => {
    render(<Popup initialOpen={false} />);
    await settleHistory();
    window.history.pushState(null, '');
    pushState.mockClear();

    userBacks = 0;
    window.history.back();
    await settleHistory();

    expect(routerSaw).toHaveBeenCalledTimes(1);
    expect(pushState).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
  });
});

describe('AccessibleModalShell inside the HashRouter', () => {
  function Page({ onClose }: { onClose: () => void }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [open, setOpen] = useState(true);
    return (
      <>
        <output>{pathname}</output>
        <button
          type="button"
          onClick={() => {
            navigate('/page/home', { replace: true });
            setOpen(false);
          }}
        >
          reset
        </button>
        <AccessibleModalShell
          open={open}
          still
          size="m"
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        >
          {() => <h3>popup</h3>}
        </AccessibleModalShell>
      </>
    );
  }

  const renderPage = async (onClose = vi.fn()) => {
    window.history.replaceState(null, '', '#/page/kitchen');
    render(
      <HashRouter>
        <Page onClose={onClose} />
      </HashRouter>
    );
    await settleHistory();
    return onClose;
  };

  afterEach(async () => {
    cleanup();
    await settleHistory();
  });

  it('closes the popup on Back and keeps the page', async () => {
    const onClose = await renderPage();

    window.history.back();
    await settleHistory();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('/page/kitchen');
    expect(window.location.hash).toBe('#/page/kitchen');
  });

  it('keeps the new page when a reset navigates and closes the popup together', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'reset', hidden: true }));
    await settleHistory();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('/page/home');
    expect(window.location.hash).toBe('#/page/home');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 7, 15, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses minutes for the last hour', () => {
    expect(formatRelativeTime(new Date(2026, 10, 7, 14, 48), t, 'en-GB')).toBe('12 min ago');
    expect(formatRelativeTime(new Date(2026, 10, 7, 14, 59, 40), t, 'en-GB')).toBe('just now');
  });

  it('uses today and yesterday with a clock time', () => {
    expect(formatRelativeTime(new Date(2026, 10, 7, 9, 14), t, 'en-GB')).toBe('today 09:14');
    expect(formatRelativeTime(new Date(2026, 10, 6, 23, 2), t, 'en-GB')).toBe('yesterday 23:02');
  });

  it('falls back to a short date for older times', () => {
    expect(formatRelativeTime(new Date(2026, 2, 23, 10, 0), t, 'en-GB')).toBe('23 Mar');
    expect(formatRelativeTime(new Date(2025, 2, 23, 10, 0), t, 'en-GB')).toBe('23 Mar 2025');
  });
});
