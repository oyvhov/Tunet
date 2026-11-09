import { describe, expect, it } from 'vitest';
import {
  INITIAL_MOMENTS_STATE,
  MOMENT_STARTUP_GRACE_MS,
  buildMomentActivities,
  collectMomentSources,
  getMomentKind,
  momentFitsScreen,
  stepMoments,
  type MomentActivity,
  type MomentCardSettings,
  type MomentConfig,
  type MomentsInput,
  type MomentsState,
} from '../utils/moments';
import type { EntityMap, PagesConfig } from '../types/dashboard';

const START = 1_000_000;
const LATER = START + MOMENT_STARTUP_GRACE_MS + 1000;
const MINUTE = 60_000;

const music = (overrides: Partial<MomentActivity> = {}): MomentActivity => ({
  cardId: 'media_player.kitchen',
  kind: 'media',
  entityId: null,
  closeAfterMs: MINUTE,
  maxVisibleMs: null,
  ...overrides,
});
const playing = (overrides: Partial<MomentActivity> = {}) =>
  music({ entityId: 'media_player.kitchen', ...overrides });
const camera = (entityId: string | null, overrides: Partial<MomentActivity> = {}) =>
  music({ cardId: 'camera_card_door', kind: 'camera', entityId, closeAfterMs: 0, ...overrides });
const notice = (entityId: string | null, overrides: Partial<MomentActivity> = {}) =>
  music({
    cardId: 'entity_card_washer',
    kind: 'notice',
    entityId,
    closeAfterMs: 0,
    maxVisibleMs: MINUTE,
    ...overrides,
  });

const step = (
  state: MomentsState,
  now: number,
  activities: MomentActivity[],
  extras: Partial<MomentsInput> = {}
) =>
  stepMoments(state, {
    now,
    activities,
    popupOpen: false,
    editing: false,
    screenFits: true,
    viewOpen: state.visibleCardId !== null,
    ...extras,
  });

const quietDashboard = (activities: MomentActivity[] = [music()]) =>
  step(INITIAL_MOMENTS_STATE, START, activities).state;

const showingMusic = () => step(quietDashboard(), LATER, [playing()]).state;

describe('moments: music', () => {
  it('opens when a card starts playing', () => {
    expect(step(quietDashboard(), LATER, [playing()]).visible).toEqual({
      cardId: 'media_player.kitchen',
      kind: 'media',
      entityId: 'media_player.kitchen',
    });
  });

  it('leaves music alone that was already playing when the dashboard loaded', () => {
    const loaded = step(INITIAL_MOMENTS_STATE, START, [playing()]).state;

    expect(step(loaded, LATER, [playing()]).visible).toBeNull();
  });

  it('stays open through a pause shorter than the timeout', () => {
    const paused = step(showingMusic(), LATER + 1000, [music()]).state;

    expect(step(paused, LATER + 1000 + MINUTE - 1, [music()]).visible).not.toBeNull();
  });

  it('closes once the pause has lasted the whole timeout', () => {
    const paused = step(showingMusic(), LATER + 1000, [music()]).state;

    expect(step(paused, LATER + 1000 + MINUTE, [music()]).visible).toBeNull();
  });

  it('starts the timeout over when playback resumes', () => {
    const paused = step(showingMusic(), LATER, [music()]).state;
    const resumed = step(paused, LATER + 50_000, [playing()]).state;
    const pausedAgain = step(resumed, LATER + 70_000, [music()]).state;

    expect(step(pausedAgain, LATER + 70_000 + MINUTE - 1, [music()]).visible).not.toBeNull();
  });

  it('does not come back after being closed by hand while the music goes on', () => {
    const closed = step(showingMusic(), LATER + 1000, [playing()], { viewOpen: false }).state;

    expect(closed.visibleCardId).toBeNull();
    expect(step(closed, LATER + 2000, [playing()]).visible).toBeNull();
  });

  it('does not come back when music closed by hand resumes within the timeout', () => {
    const closed = step(showingMusic(), LATER + 1000, [playing()], { viewOpen: false }).state;
    const paused = step(closed, LATER + 2000, [music()]).state;

    expect(step(paused, LATER + 30_000, [playing()]).visible).toBeNull();
  });

  it('opens again for music that starts after the timeout has passed', () => {
    const closed = step(showingMusic(), LATER + 1000, [playing()], { viewOpen: false }).state;
    const paused = step(closed, LATER + 2000, [music()]).state;
    const ended = step(paused, LATER + 2000 + MINUTE, [music()]).state;

    expect(step(ended, LATER + 2000 + MINUTE + 1, [playing()]).visible).not.toBeNull();
  });

  it('does not open while the dashboard is being edited, not even afterwards', () => {
    const missed = step(quietDashboard(), LATER, [playing()], { editing: true });

    expect(missed.visible).toBeNull();
    expect(step(missed.state, LATER + 1000, [playing()]).visible).toBeNull();
  });

  it('does not open over another popup, not even after it closes', () => {
    const missed = step(quietDashboard(), LATER, [playing()], { popupOpen: true });

    expect(missed.visible).toBeNull();
    expect(step(missed.state, LATER + 1000, [playing()]).visible).toBeNull();
  });

  it('never opens on a screen that is too small', () => {
    expect(step(quietDashboard(), LATER, [playing()], { screenFits: false }).visible).toBeNull();
  });

  it('moves on to another card that plays when the shown card is paused', () => {
    const other = (entityId: string | null) => music({ cardId: 'media_player.living', entityId });
    const shown = step(quietDashboard([music(), other(null)]), LATER, [playing(), other(null)]);
    const moved = step(shown.state, LATER + 5000, [music(), other('media_player.living')]);

    expect(moved.visible?.cardId).toBe('media_player.living');
  });

  it('keeps the shown card while it is still playing when another starts', () => {
    const other = (entityId: string | null) => music({ cardId: 'media_player.living', entityId });
    const shown = step(quietDashboard([music(), other(null)]), LATER, [playing(), other(null)]);
    const both = step(shown.state, LATER + 5000, [playing(), other('media_player.living')]);

    expect(both.visible?.cardId).toBe('media_player.kitchen');
  });

  it('counts every playing card as closed when the view is closed by hand', () => {
    const other = (entityId: string | null) => music({ cardId: 'media_player.living', entityId });
    const both = [playing(), other('media_player.living')];
    const shown = step(quietDashboard([music(), other(null)]), LATER, both).state;
    const closed = step(shown, LATER + 1000, both, { viewOpen: false }).state;

    expect(step(closed, LATER + 2000, both).visible).toBeNull();
  });

  it('closes when the card no longer has the moment turned on', () => {
    expect(step(showingMusic(), LATER + 1000, []).visible).toBeNull();
  });

  it('wakes up when the pause timeout runs out', () => {
    expect(step(showingMusic(), LATER + 1000, [music()]).wakeAt).toBe(LATER + 1000 + MINUTE);
  });

  it('has nothing to wake up for while the music plays', () => {
    expect(step(showingMusic(), LATER + 1000, [playing()]).wakeAt).toBeNull();
  });
});

describe('moments: camera', () => {
  const doorQuiet = () => quietDashboard([music(), camera(null)]);

  it('opens over another popup', () => {
    const rung = step(doorQuiet(), LATER, [music(), camera('camera.door')], { popupOpen: true });

    expect(rung.visible?.kind).toBe('camera');
  });

  it('does not open while the dashboard is being edited', () => {
    const rung = step(doorQuiet(), LATER, [music(), camera('camera.door')], { editing: true });

    expect(rung.visible).toBeNull();
  });

  it('takes over from music', () => {
    const shown = step(doorQuiet(), LATER, [playing(), camera(null)]).state;
    const rung = step(shown, LATER + 1000, [playing(), camera('camera.door')]);

    expect(rung.visible?.kind).toBe('camera');
  });

  it('hands back to the music when the door has gone quiet', () => {
    const shown = step(doorQuiet(), LATER, [playing(), camera(null)]).state;
    const rung = step(shown, LATER + 1000, [playing(), camera('camera.door')]).state;
    const quiet = step(rung, LATER + 2000, [playing(), camera(null)]);

    expect(quiet.visible?.kind).toBe('media');
  });

  it('hands back to the music when the camera is closed by hand', () => {
    const shown = step(doorQuiet(), LATER, [playing(), camera(null)]).state;
    const rung = step(shown, LATER + 1000, [playing(), camera('camera.door')]).state;
    const closed = step(rung, LATER + 2000, [playing(), camera('camera.door')], {
      viewOpen: false,
    });

    expect(closed.visible?.kind).toBe('media');
  });
});

describe('moments: notice', () => {
  const washerQuiet = () => quietDashboard([notice(null)]);
  const done = () => notice('sensor.washer');

  it('waits for an open popup to close instead of being lost', () => {
    const blocked = step(washerQuiet(), LATER, [done()], { popupOpen: true });

    expect(blocked.visible).toBeNull();
    expect(step(blocked.state, LATER + 1000, [done()]).visible?.kind).toBe('notice');
  });

  it('closes by itself after its time even though the state stays the same', () => {
    const shown = step(washerQuiet(), LATER, [done()]).state;

    expect(step(shown, LATER + MINUTE, [done()]).visible).toBeNull();
  });

  it('does not repeat itself while the state stays the same', () => {
    const shown = step(washerQuiet(), LATER, [done()]).state;
    const closed = step(shown, LATER + MINUTE, [done()]).state;

    expect(step(closed, LATER + MINUTE + 1000, [done()]).visible).toBeNull();
  });

  it('shows again the next time the state is reached', () => {
    const shown = step(washerQuiet(), LATER, [done()]).state;
    const closed = step(shown, LATER + MINUTE, [done()]).state;
    const reset = step(closed, LATER + 2 * MINUTE, [notice(null)]).state;

    expect(step(reset, LATER + 3 * MINUTE, [done()]).visible?.kind).toBe('notice');
  });

  it('wakes up when its time is over', () => {
    expect(step(washerQuiet(), LATER, [done()]).wakeAt).toBe(LATER + MINUTE);
  });
});

describe('moment sources', () => {
  const pages = {
    header: [],
    pages: ['home', 'music'],
    home: ['media_player.kitchen', 'light.hall'],
    music: ['sonos_group_all', 'media_player.kitchen'],
  } as PagesConfig;
  const keyFor = (cardId: string, pageId?: string) => `${pageId}::${cardId}`;

  it('finds cards on every page, once each', () => {
    const settings: Record<string, MomentCardSettings> = {
      'home::media_player.kitchen': { moment: { enabled: true } },
      'music::media_player.kitchen': { moment: { enabled: true } },
      'music::sonos_group_all': { moment: { enabled: true }, mediaIds: ['media_player.a'] },
    };

    expect(collectMomentSources(pages, settings, keyFor).map((s) => s.cardId)).toEqual([
      'media_player.kitchen',
      'sonos_group_all',
    ]);
  });

  it('skips cards that have not turned the moment on', () => {
    const settings: Record<string, MomentCardSettings> = {
      'home::media_player.kitchen': { moment: { enabled: false } },
    };

    expect(collectMomentSources(pages, settings, keyFor)).toEqual([]);
  });

  it('uses a minute when the saved timeout is unusable', () => {
    const settings: Record<string, MomentCardSettings> = {
      'home::media_player.kitchen': { moment: { enabled: true, closeAfterSeconds: 'x' } },
    };

    expect(collectMomentSources(pages, settings, keyFor)[0].closeAfterMs).toBe(MINUTE);
  });

  it.each([
    ['media_player.kitchen', 'media'],
    ['media_group_all', 'media'],
    ['sonos_group_all', 'media'],
    ['camera_card_door', 'camera'],
    ['entity_card_washer', 'notice'],
    ['car_card_ev', 'notice'],
  ])('treats %s as a %s moment', (cardId, kind) => {
    expect(getMomentKind(cardId)).toBe(kind);
  });
});

describe('moment activities', () => {
  const keyFor = (cardId: string) => cardId;
  const pagesWith = (cardId: string) =>
    ({ header: [], pages: ['home'], home: [cardId] }) as PagesConfig;
  const speaker = (state: string, attributes: Record<string, unknown> = { media_title: 'Song' }) =>
    ({ state, attributes }) as EntityMap[string];

  const activityFor = (
    cardId: string,
    settings: MomentCardSettings,
    entities: EntityMap
  ): MomentActivity =>
    buildMomentActivities(
      collectMomentSources(pagesWith(cardId), { [cardId]: settings }, keyFor),
      entities
    )[0];

  it('points a group at the speaker that is playing', () => {
    const activity = activityFor(
      'sonos_group_all',
      { moment: { enabled: true }, mediaIds: ['media_player.a', 'media_player.b'] },
      { 'media_player.a': speaker('paused'), 'media_player.b': speaker('playing') }
    );

    expect(activity.entityId).toBe('media_player.b');
  });

  it('ignores playback with neither title nor cover, like TV sound', () => {
    const activity = activityFor(
      'media_player.bar',
      { moment: { enabled: true } },
      { 'media_player.bar': speaker('playing', { source: 'TV' }) }
    );

    expect(activity.entityId).toBeNull();
  });

  it('accepts playback that has only a cover', () => {
    const activity = activityFor(
      'media_player.bar',
      { moment: { enabled: true } },
      { 'media_player.bar': speaker('playing', { entity_picture: '/cover.jpg' }) }
    );

    expect(activity.entityId).toBe('media_player.bar');
  });

  const ringing: MomentConfig['condition'] = {
    enabled: true,
    logic: 'AND',
    rules: [{ type: 'state', states: ['on'], entityId: 'binary_sensor.doorbell' }],
  };

  it('points a camera moment at its camera while the rule holds', () => {
    const activity = activityFor(
      'camera_card_door',
      { cameraId: 'camera.door', moment: { enabled: true, condition: ringing } },
      {
        'camera.door': speaker('idle'),
        'binary_sensor.doorbell': speaker('on'),
      }
    );

    expect(activity.entityId).toBe('camera.door');
  });

  it('is quiet while the rule does not hold', () => {
    const activity = activityFor(
      'camera_card_door',
      { cameraId: 'camera.door', moment: { enabled: true, condition: ringing } },
      {
        'camera.door': speaker('idle'),
        'binary_sensor.doorbell': speaker('off'),
      }
    );

    expect(activity.entityId).toBeNull();
  });

  it('stays quiet when no rule has been set', () => {
    const activity = activityFor(
      'entity_card_washer',
      { entityId: 'sensor.washer', moment: { enabled: true } },
      { 'sensor.washer': speaker('finished') }
    );

    expect(activity.entityId).toBeNull();
  });

  it('gives a notice its time on screen and no time after the rule ends', () => {
    const activity = activityFor(
      'entity_card_washer',
      { entityId: 'sensor.washer', moment: { enabled: true, closeAfterSeconds: 30 } },
      { 'sensor.washer': speaker('finished') }
    );

    expect(activity.maxVisibleMs).toBe(30_000);
    expect(activity.closeAfterMs).toBe(0);
  });
});

describe('moment screen size', () => {
  it.each([
    [800, 1280, true],
    [1280, 800, true],
    [412, 915, false],
    [915, 412, false],
  ])('at %ix%i the answer is %s', (width, height, expected) => {
    expect(momentFitsScreen(width, height)).toBe(expected);
  });
});
