import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import LightCard from '../components/cards/LightCard';
import en from '../i18n/en.json';

const translations: Record<string, string> = en;
const t = (key: string) => translations[key] ?? key;

type TestEntity = { entity_id: string; state: string; attributes: Record<string, unknown> };

const light = (state: string, attributes: Record<string, unknown> = {}): TestEntity => ({
  entity_id: 'light.stue',
  state,
  attributes: { friendly_name: 'Stue', supported_color_modes: ['brightness'], ...attributes },
});

const scene = (entityId: string, name: string, state = '2026-11-01T10:00:00+00:00') => ({
  [entityId]: { entity_id: entityId, state, attributes: { friendly_name: name } },
});

const SCENES = {
  ...scene('scene.evening', 'Evening'),
  ...scene('scene.movie', 'Movie night with a very long scene name'),
  ...scene('scene.reading', 'Reading'),
  ...scene('scene.cleaning', 'Cleaning'),
  ...scene('scene.broken', 'Broken', 'unavailable'),
};

interface RenderOptions {
  entity: TestEntity;
  settings?: Record<string, unknown>;
  editMode?: boolean;
  isMobile?: boolean;
  optimistic?: Record<string, number>;
  callService?: ReturnType<typeof vi.fn>;
}

function renderCard({
  entity,
  settings = {},
  editMode = false,
  isMobile = false,
  optimistic = {},
  callService = vi.fn(() => Promise.resolve()),
}: RenderOptions) {
  const entities: Record<string, TestEntity> = { 'light.stue': entity, ...SCENES };
  const onOpen = vi.fn();
  const props = {
    cardId: 'light.stue',
    entityId: 'light.stue',
    dragProps: {},
    controls: null,
    cardStyle: {},
    entities,
    editMode,
    cardSettings: { key: settings },
    settingsKey: 'key',
    customNames: {},
    customIcons: {},
    getA: (id: string, attr: string, fallback: unknown = null) =>
      entities[id]?.attributes?.[attr] ?? fallback,
    callService,
    onOpen,
    isMobile,
    optimisticLightBrightness: optimistic,
    setOptimisticLightBrightness: vi.fn(),
    t,
  } as unknown as ComponentProps<typeof LightCard>;
  return { ...render(<LightCard {...props} />), onOpen, callService };
}

afterEach(cleanup);

describe('LightCard small', () => {
  it('shows the brightness next to the slider', () => {
    renderCard({ entity: light('on', { brightness: 153 }), settings: { size: 'small' } });

    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('follows the slider while it is being dragged', () => {
    renderCard({
      entity: light('on', { brightness: 153 }),
      settings: { size: 'small' },
      optimistic: { 'light.stue': 77 },
    });

    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('says Off in readable text when the light is off', () => {
    renderCard({ entity: light('off'), settings: { size: 'small' } });

    const off = screen.getByText(en['common.off']);
    expect(off).not.toHaveClass('opacity-60');
    expect(off.className).toContain('text-[var(--text-secondary)]');
    expect(screen.getByText('Stue')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('shows on or off for a light without dimming', () => {
    renderCard({
      entity: light('on', { supported_color_modes: ['onoff'] }),
      settings: { size: 'small' },
    });

    expect(screen.getByText(en['common.on'])).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('never shows scene chips', () => {
    renderCard({
      entity: light('on', { brightness: 153 }),
      settings: { size: 'small', lightScenes: ['scene.evening'] },
    });

    expect(screen.queryByRole('button', { name: /Evening/ })).not.toBeInTheDocument();
  });
});

describe('LightCard scenes', () => {
  const sceneButton = (name: string | RegExp) => screen.getByRole('button', { name });

  it('shows nothing extra without scenes', () => {
    renderCard({ entity: light('on', { brightness: 153 }) });

    expect(screen.queryByRole('button', { name: /Evening/ })).not.toBeInTheDocument();
  });

  it('shows at most three configured scenes by name', () => {
    renderCard({
      entity: light('on', { brightness: 153 }),
      settings: {
        lightScenes: [
          'scene.evening',
          'light.stue',
          'scene.movie',
          'scene.reading',
          'scene.cleaning',
        ],
      },
    });

    expect(sceneButton(/Evening/)).toHaveTextContent('Evening');
    expect(sceneButton(/Movie night/)).toHaveAttribute(
      'title',
      'Movie night with a very long scene name'
    );
    expect(sceneButton(/Reading/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cleaning/ })).not.toBeInTheDocument();
  });

  it('skips scenes that no longer exist in Home Assistant', () => {
    renderCard({
      entity: light('on', { brightness: 153 }),
      settings: { lightScenes: ['scene.gone', 'scene.reading'] },
    });

    expect(sceneButton(/Reading/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gone/ })).not.toBeInTheDocument();
  });

  it('turns on the scene without opening the light popup and shows it is busy', async () => {
    let resolveCall: () => void = () => {};
    const callService = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCall = resolve;
        })
    );
    const { onOpen } = renderCard({
      entity: light('off'),
      settings: { lightScenes: ['scene.evening'] },
      callService,
    });

    fireEvent.click(sceneButton(/Evening/));

    expect(callService).toHaveBeenCalledWith('scene', 'turn_on', { entity_id: 'scene.evening' });
    expect(onOpen).not.toHaveBeenCalled();
    expect(sceneButton(/Evening/)).toHaveAttribute('aria-busy', 'true');
    expect(sceneButton(/Evening/)).toBeDisabled();

    fireEvent.click(sceneButton(/Evening/));
    expect(callService).toHaveBeenCalledTimes(1);

    await act(async () => resolveCall());

    expect(sceneButton(/Evening/)).toHaveAttribute('aria-busy', 'false');
    expect(sceneButton(/Evening/)).not.toBeDisabled();
  });

  it('leaves Enter and Space on a chip to the chip instead of opening the popup', () => {
    const { onOpen } = renderCard({
      entity: light('on', { brightness: 128 }),
      settings: { lightScenes: ['scene.evening'] },
    });

    for (const key of ['Enter', ' ']) {
      // fireEvent returns false when a handler cancelled the key, which stops the chip's click.
      expect(fireEvent.keyDown(sceneButton(/Evening/), { key })).toBe(true);
    }
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('frees the chip again when the call fails', async () => {
    const callService = vi.fn(() => Promise.reject(new Error('No connection')));
    renderCard({
      entity: light('on', { brightness: 153 }),
      settings: { lightScenes: ['scene.evening'] },
      callService,
    });

    await act(async () => {
      fireEvent.click(sceneButton(/Evening/));
    });

    expect(sceneButton(/Evening/)).toHaveAttribute('aria-busy', 'false');
    expect(sceneButton(/Evening/)).not.toBeDisabled();
  });

  it('does not run scenes in edit mode', () => {
    const callService = vi.fn(() => Promise.resolve());
    renderCard({
      entity: light('on', { brightness: 153 }),
      settings: { lightScenes: ['scene.evening'] },
      editMode: true,
      callService,
    });

    fireEvent.click(sceneButton(/Evening/));

    expect(sceneButton(/Evening/)).toBeDisabled();
    expect(callService).not.toHaveBeenCalled();
  });

  it('disables an unavailable scene', () => {
    renderCard({
      entity: light('on', { brightness: 153 }),
      settings: { lightScenes: ['scene.evening', 'scene.broken'] },
    });

    expect(sceneButton(/Evening/)).not.toBeDisabled();
    expect(sceneButton(/Broken/)).toBeDisabled();
  });

  it('shows the scenes on the phone layout too', () => {
    renderCard({
      entity: light('on', { brightness: 153 }),
      settings: { lightScenes: ['scene.evening'] },
      isMobile: true,
    });

    expect(sceneButton(/Evening/)).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });
});
