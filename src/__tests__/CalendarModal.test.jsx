import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarModal from '../modals/CalendarModal';
import { getCalendarEvents } from '../services';

vi.mock('../services', () => ({
  getCalendarEvents: vi.fn(),
}));

const entities = {
  'calendar.family': {
    entity_id: 'calendar.family',
    state: 'on',
    attributes: { friendly_name: 'Family' },
  },
  'calendar.work': {
    entity_id: 'calendar.work',
    state: 'off',
    attributes: { friendly_name: 'Work' },
  },
};

describe('CalendarModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    const now = new Date();
    const pastStart = new Date(now);
    pastStart.setHours(0, 0, 0, 0);
    getCalendarEvents.mockResolvedValue({
      'calendar.family': {
        events: [
          {
            summary: 'Past meeting',
            start: pastStart.toISOString(),
            end: new Date(now.getTime() - 60_000).toISOString(),
          },
          {
            summary: 'Future meeting',
            start: new Date(now.getTime() + 60 * 60_000).toISOString(),
            end: new Date(now.getTime() + 120 * 60_000).toISOString(),
          },
        ],
      },
    });
  });

  it('opens with calendar selection hidden and reveals it on demand', async () => {
    render(
      <CalendarModal
        show
        onClose={vi.fn()}
        conn={{ sendMessagePromise: vi.fn() }}
        entities={entities}
        language="en"
        t={(key) => key}
      />
    );

    const pickerButton = screen.getByRole('button', { name: 'calendar.selectCalendars' });
    expect(pickerButton).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('calendar-picker-panel')).not.toBeInTheDocument();

    fireEvent.click(pickerButton);

    expect(pickerButton).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('calendar-picker-panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Family' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('starts from the calendars of the card it was opened from', async () => {
    localStorage.setItem('tunet_calendar_modal_selection', JSON.stringify(['calendar.work']));
    render(
      <CalendarModal
        show
        onClose={vi.fn()}
        conn={{ sendMessagePromise: vi.fn() }}
        entities={entities}
        language="en"
        cardCalendars={['calendar.family']}
        t={(key) => key}
      />
    );
    await waitFor(() =>
      expect(getCalendarEvents).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ entityIds: ['calendar.family'] })
      )
    );
    expect(localStorage.getItem('tunet_calendar_modal_selection')).toBe(
      JSON.stringify(['calendar.work'])
    );
  });

  it('keeps using the stored selection without a card', async () => {
    localStorage.setItem('tunet_calendar_modal_selection', JSON.stringify(['calendar.work']));
    render(
      <CalendarModal
        show
        onClose={vi.fn()}
        conn={{ sendMessagePromise: vi.fn() }}
        entities={entities}
        language="en"
        t={(key) => key}
      />
    );
    await waitFor(() =>
      expect(getCalendarEvents).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ entityIds: ['calendar.work'] })
      )
    );
  });

  it('says so when the events cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementationOnce(() => {});
    getCalendarEvents.mockRejectedValue(new Error('down'));
    render(
      <CalendarModal
        show
        onClose={vi.fn()}
        conn={{ sendMessagePromise: vi.fn() }}
        entities={entities}
        language="en"
        t={(key) => key}
      />
    );
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('calendar.loadFailed'));
    expect(screen.queryByText('calendar.noEvents')).toBeNull();
  });

  it('dims only events from today whose end time has passed', async () => {
    render(
      <CalendarModal
        show
        onClose={vi.fn()}
        conn={{ sendMessagePromise: vi.fn() }}
        entities={entities}
        language="en"
        t={(key) => key}
      />
    );

    await waitFor(() => expect(screen.getByText('Past meeting')).toBeInTheDocument());

    expect(screen.getByText('Past meeting').closest('[data-past-event]')).toHaveAttribute(
      'data-past-event',
      'true'
    );
    expect(screen.getByText('Future meeting').closest('[data-past-event]')).toHaveAttribute(
      'data-past-event',
      'false'
    );
  });
});
