import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMoments, type ActiveMoment } from '../hooks/useMoments';
import { MOMENT_STARTUP_GRACE_MS } from '../utils/moments';
import type { EntityMap, PagesConfig } from '../types/dashboard';

const pagesConfig = { header: [], pages: ['home'], home: ['media_player.kitchen'] } as PagesConfig;
const cardSettings = {
  'media_player.kitchen': { moment: { enabled: true, closeAfterSeconds: 30 } },
};
const getCardSettingsKey = (cardId: string) => cardId;

const speaker = (state: string) =>
  ({
    'media_player.kitchen': { state, attributes: { media_title: 'Song' } },
  }) as EntityMap;

interface HookProps {
  entities: EntityMap;
  entitiesLoaded?: boolean;
}

const setup = (initialEntities: EntityMap, entitiesLoaded = true) =>
  renderHook(
    ({ entities, entitiesLoaded: loaded = true }: HookProps) => {
      const [activeMoment, setActiveMoment] = useState<ActiveMoment | null>(null);
      useMoments({
        entities,
        entitiesLoaded: loaded,
        pagesConfig,
        cardSettings,
        getCardSettingsKey,
        editMode: false,
        popupOpen: false,
        activeMoment,
        setActiveMoment,
      });
      return { activeMoment, setActiveMoment };
    },
    { initialProps: { entities: initialEntities, entitiesLoaded } as HookProps }
  );

const passStartup = () =>
  act(() => {
    vi.advanceTimersByTime(MOMENT_STARTUP_GRACE_MS + 1000);
  });

describe('useMoments', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T20:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens the view when the card starts playing', () => {
    const { result, rerender } = setup(speaker('idle'));
    passStartup();

    rerender({ entities: speaker('playing') });

    expect(result.current.activeMoment).toMatchObject({
      cardId: 'media_player.kitchen',
      kind: 'media',
      entityId: 'media_player.kitchen',
    });
  });

  it('opens when a rule that must hold for a while comes due, with no further updates', () => {
    const washerPages = { header: [], pages: ['home'], home: ['sensor.washer'] } as PagesConfig;
    const washerSettings = {
      'sensor.washer': {
        moment: {
          enabled: true,
          closeAfterSeconds: 30,
          condition: {
            enabled: true,
            rules: [{ type: 'state', states: ['done'], forSeconds: 30 }],
          },
        },
      },
    };
    const washer = (state: string) =>
      ({
        'sensor.washer': {
          entity_id: 'sensor.washer',
          state,
          attributes: {},
          last_changed: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        },
      }) as unknown as EntityMap;

    const { result, rerender } = renderHook(
      ({ entities }: { entities: EntityMap }) => {
        const [activeMoment, setActiveMoment] = useState<ActiveMoment | null>(null);
        useMoments({
          entities,
          entitiesLoaded: true,
          pagesConfig: washerPages,
          cardSettings: washerSettings as never,
          getCardSettingsKey,
          editMode: false,
          popupOpen: false,
          activeMoment,
          setActiveMoment,
        });
        return { activeMoment };
      },
      { initialProps: { entities: washer('running') } }
    );
    passStartup();

    rerender({ entities: washer('done') });
    expect(result.current.activeMoment).toBeNull();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.activeMoment).toMatchObject({ cardId: 'sensor.washer', kind: 'notice' });
  });

  it('hands the view the settings of the card', () => {
    const { result, rerender } = setup(speaker('idle'));
    passStartup();

    rerender({ entities: speaker('playing') });

    expect(result.current.activeMoment?.settings).toBe(cardSettings['media_player.kitchen']);
  });

  it('starts closing when the pause runs out with no further updates from HA', () => {
    const { result, rerender } = setup(speaker('idle'));
    passStartup();
    rerender({ entities: speaker('playing') });
    rerender({ entities: speaker('paused') });

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.activeMoment?.closing).toBe(true);
  });

  it('keeps the view when playback resumes in time', () => {
    const { result, rerender } = setup(speaker('idle'));
    passStartup();
    rerender({ entities: speaker('playing') });
    rerender({ entities: speaker('paused') });
    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    rerender({ entities: speaker('playing') });
    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(result.current.activeMoment?.closing).toBeUndefined();
  });

  it('stays closed after the user closes the view', () => {
    const { result, rerender } = setup(speaker('idle'));
    passStartup();
    rerender({ entities: speaker('playing') });

    act(() => {
      result.current.setActiveMoment(null);
    });
    rerender({ entities: speaker('playing') });

    expect(result.current.activeMoment).toBeNull();
  });

  it('waits for the entities to load', () => {
    const { result, rerender } = setup(speaker('idle'), false);
    passStartup();

    rerender({ entities: speaker('playing'), entitiesLoaded: false });

    expect(result.current.activeMoment).toBeNull();
  });

  it('stays out of the way on a phone', () => {
    vi.stubGlobal('innerWidth', 412);
    vi.stubGlobal('innerHeight', 915);
    const { result, rerender } = setup(speaker('idle'));
    passStartup();

    rerender({ entities: speaker('playing') });

    expect(result.current.activeMoment).toBeNull();
  });
});
