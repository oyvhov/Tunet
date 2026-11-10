import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/haClient', () => ({ getCalendarEvents: vi.fn() }));

import CalendarCard from '../components/cards/CalendarCard';
import { getCalendarEvents } from '../services/haClient';

const t = (key) => key;
const localDay = (offset) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString('sv-SE');
};
const hoursFromNow = (hours) => new Date(Date.now() + hours * 3600000).toISOString();
const respond = (events) => getCalendarEvents.mockResolvedValue({ 'calendar.a': { events } });

const makeConn = () => {
  const listeners = new Set();
  return {
    addEventListener: (_name, fn) => listeners.add(fn),
    removeEventListener: (_name, fn) => listeners.delete(fn),
    reconnect: () => listeners.forEach((fn) => fn()),
  };
};

const renderCard = (conn = makeConn(), overrides = {}) => {
  render(
    <CalendarCard
      cardId="cal"
      settings={{ calendars: ['calendar.a'], ...overrides }}
      conn={conn}
      t={t}
      locale="en-GB"
      className="h-full"
      size={overrides.size}
    />
  );
  return conn;
};

describe('CalendarCard', () => {
  beforeAll(() => {
    globalThis.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      observe() {
        this.callback([{ isIntersecting: true }]);
      }
      unobserve() {}
      disconnect() {}
    };
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows a multi-day event on every day it covers', async () => {
    respond([{ summary: 'Trip', start: localDay(0), end: localDay(3) }]);
    renderCard();
    await waitFor(() => expect(screen.getAllByText('Trip')).toHaveLength(3));
  });

  it('shows a running event under today, not under the day it began', async () => {
    respond([{ summary: 'Trip', start: localDay(-2), end: localDay(2) }]);
    renderCard();
    await waitFor(() => expect(screen.getAllByText('Trip')).toHaveLength(2));
    expect(screen.getByText('calendar.today')).toBeInTheDocument();
  });

  it('does not let a running all-day event hide the next appointment on the small card', async () => {
    respond([
      { summary: 'Holiday', start: localDay(0), end: localDay(1) },
      { summary: 'Dentist', start: hoursFromNow(1), end: hoursFromNow(2) },
    ]);
    renderCard(makeConn(), { size: 'small' });
    await waitFor(() => expect(screen.getByText('Dentist')).toBeInTheDocument());
    expect(screen.queryByText('Holiday')).toBeNull();
  });

  it('falls back to the running all-day event when nothing else is coming', async () => {
    respond([{ summary: 'Holiday', start: localDay(0), end: localDay(1) }]);
    renderCard(makeConn(), { size: 'small' });
    await waitFor(() => expect(screen.getByText('Holiday')).toBeInTheDocument());
  });

  it('skips an appointment that has finished', async () => {
    respond([
      { summary: 'Done', start: hoursFromNow(-3), end: hoursFromNow(-2) },
      { summary: 'Dentist', start: hoursFromNow(1), end: hoursFromNow(2) },
    ]);
    renderCard(makeConn(), { size: 'small' });
    await waitFor(() => expect(screen.getByText('Dentist')).toBeInTheDocument());
  });

  it('refetches after a reconnect', async () => {
    respond([{ summary: 'Dentist', start: hoursFromNow(1), end: hoursFromNow(2) }]);
    const conn = renderCard();
    await waitFor(() => expect(getCalendarEvents).toHaveBeenCalledTimes(1));
    await act(async () => conn.reconnect());
    await waitFor(() => expect(getCalendarEvents).toHaveBeenCalledTimes(2));
  });

  it('keeps the events when a later poll fails', async () => {
    respond([{ summary: 'Dentist', start: hoursFromNow(1), end: hoursFromNow(2) }]);
    const conn = renderCard();
    await waitFor(() => expect(screen.getByText('Dentist')).toBeInTheDocument());

    vi.spyOn(console, 'error').mockImplementation(() => {});
    getCalendarEvents.mockRejectedValue(new Error('down'));
    await act(async () => conn.reconnect());
    await waitFor(() => expect(getCalendarEvents).toHaveBeenCalledTimes(2));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('Dentist')).toBeInTheDocument();
    expect(screen.queryByText('calendar.loadFailed')).toBeNull();
  });

  it.each([
    ['normal', {}],
    ['small', { size: 'small' }],
  ])('says so when the first load fails on the %s card', async (_name, overrides) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getCalendarEvents.mockRejectedValue(new Error('down'));
    renderCard(makeConn(), overrides);
    await waitFor(() => expect(screen.getByText('calendar.loadFailed')).toBeInTheDocument());
  });

  it('moves the week on after midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 8, 23, 50, 0) });
    respond([]);
    const conn = renderCard(makeConn(), { largeCalendar: true });
    await waitFor(() => expect(getCalendarEvents).toHaveBeenCalledTimes(1));
    expect(screen.getByText('8')).toBeInTheDocument();

    vi.setSystemTime(new Date(2026, 10, 9, 0, 10, 0));
    await act(async () => conn.reconnect());
    await waitFor(() => expect(screen.queryByText('8')).toBeNull());
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('starts loading when any report in a batch says the card is on screen', async () => {
    const original = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      observe() {
        this.callback([{ isIntersecting: false }, { isIntersecting: true }]);
      }
      unobserve() {}
      disconnect() {}
    };
    try {
      respond([{ summary: 'Dentist', start: hoursFromNow(1), end: hoursFromNow(2) }]);
      renderCard();
      await waitFor(() => expect(screen.getByText('Dentist')).toBeInTheDocument());
    } finally {
      globalThis.IntersectionObserver = original;
    }
  });

  describe('list that is taller than the card', () => {
    const events = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'].map((summary) => ({
      summary,
      start: localDay(0),
      end: localDay(1),
    }));
    const tMore = (key) => (key === 'common.moreCount' ? '+{count} more' : key);
    const box = (top, bottom) => ({
      top,
      bottom,
      height: bottom - top,
      left: 0,
      right: 300,
      width: 300,
      x: 0,
      y: top,
      toJSON() {},
    });
    // Rows are 40 px with 10 px between them; the "+N more" line is 20 px below the last row.
    const fakeLayout = (listHeight) =>
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
        const rows = Array.from(document.querySelectorAll('[data-fit-row]'));
        const index = rows.indexOf(this);
        if (index >= 0) return box(index * 50, index * 50 + 40);
        if (this.hasAttribute('data-fit-more')) return box(rows.length * 50, rows.length * 50 + 20);
        return box(0, listHeight.current);
      });
    const renderList = () =>
      render(
        <CalendarCard
          cardId="cal"
          settings={{ calendars: ['calendar.a'] }}
          conn={makeConn()}
          t={tMore}
          locale="en-GB"
        />
      );

    it('shows only the events that fit whole, then how many more there are', async () => {
      fakeLayout({ current: 200 });
      respond(events);
      renderList();

      await waitFor(() => expect(screen.getByText('+3 more')).toBeInTheDocument());
      expect(screen.getByText('E3')).toBeInTheDocument();
      expect(screen.queryByText('E4')).toBeNull();
    });

    it('shows the rest when the card grows', async () => {
      const original = globalThis.ResizeObserver;
      const observers = [];
      globalThis.ResizeObserver = class {
        constructor(callback) {
          this.callback = callback;
          observers.push(this);
        }
        observe(target) {
          this.target = target;
        }
        unobserve() {}
        disconnect() {}
      };
      try {
        const listHeight = { current: 200 };
        fakeLayout(listHeight);
        respond(events);
        renderList();
        await waitFor(() => expect(screen.getByText('+3 more')).toBeInTheDocument());

        listHeight.current = 400;
        act(() =>
          observers.forEach((observer) =>
            observer.callback([
              { target: observer.target, contentRect: { width: 300, height: 400 } },
            ])
          )
        );

        expect(screen.getByText('E6')).toBeInTheDocument();
        expect(screen.queryByText(/more/)).toBeNull();
      } finally {
        globalThis.ResizeObserver = original;
      }
    });
  });

  it('puts a multi-day timed event in the all-day row of the week', async () => {
    respond([{ summary: 'Night shift', start: hoursFromNow(1), end: hoursFromNow(30) }]);
    renderCard(makeConn(), { largeCalendar: true });
    await waitFor(() => expect(screen.getByText('calendar.allDay')).toBeInTheDocument());
  });
});
