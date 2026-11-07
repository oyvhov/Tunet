import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
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

describe('AccessibleModalShell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
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
