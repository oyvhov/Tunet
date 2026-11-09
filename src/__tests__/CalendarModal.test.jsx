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

  describe('events spanning several days', () => {
    const dayAt = (offset, hour = 0) => {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      date.setHours(hour, 0, 0, 0);
      return date;
    };
    const dateOnly = (offset) => dayAt(offset).toLocaleDateString('sv-SE');
    const renderWith = (event) => {
      getCalendarEvents.mockResolvedValue({ 'calendar.family': { events: [event] } });
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
    };

    it('lists an all-day event on every day it covers, without its exclusive end', async () => {
      renderWith({ summary: 'Trip', start: dateOnly(1), end: dateOnly(4) });

      await waitFor(() => expect(screen.getAllByText('Trip')).toHaveLength(3));
    });

    it('starts a running event today instead of on a day already gone', async () => {
      renderWith({ summary: 'Trip', start: dateOnly(-2), end: dateOnly(2) });

      await waitFor(() => expect(screen.getAllByText('Trip')).toHaveLength(2));
      expect(
        screen.getByRole('heading', {
          name: dayAt(0).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        })
      ).toBeInTheDocument();
    });

    it('does not add a day for a timed event ending at midnight', async () => {
      renderWith({
        summary: 'Late',
        start: dayAt(1, 22).toISOString(),
        end: dayAt(2).toISOString(),
      });

      await waitFor(() => expect(screen.getAllByText('Late')).toHaveLength(1));
    });

    it('labels a timed event over several days as all day, like the card', async () => {
      renderWith({
        summary: 'Night shift',
        start: dayAt(1, 22).toISOString(),
        end: dayAt(2, 6).toISOString(),
      });

      await waitFor(() => expect(screen.getAllByText('Night shift')).toHaveLength(2));
      expect(screen.getAllByText('calendar.allDay')).toHaveLength(2);
    });
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
