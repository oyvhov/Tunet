import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { MediaGroupCard, MediaPlayerCard } from '../components/cards/MediaCards';

const entityId = 'media_player.kitchen';

interface Options {
  state?: string;
  active?: boolean;
  artworkMode?: string;
}

const renderCard = (
  kind: 'player' | 'group',
  { state = 'playing', active = true, artworkMode }: Options = {}
) => {
  const attributes: Record<string, unknown> = {
    friendly_name: 'Sonos kitchen',
    media_title: 'Flowers',
    media_artist: 'Miley Cyrus',
    entity_picture: '/artwork.jpg',
  };
  const cardId = kind === 'player' ? entityId : 'sonos_group_kitchen';
  const settingsKey = `home::${cardId}`;
  const props = {
    cardId,
    mpId: entityId,
    settingsKey,
    cardSettings: { [settingsKey]: { mediaIds: [entityId], artworkMode } },
    saveCardSetting: vi.fn(),
    dragProps: {},
    controls: null,
    cardStyle: {},
    entities: { [entityId]: { entity_id: entityId, state, attributes } },
    editMode: false,
    customNames: {},
    customIcons: {},
    getA: (_id: string, attribute: string, fallback?: unknown) => attributes[attribute] ?? fallback,
    getEntityImageUrl: (value: unknown) => value,
    callService: vi.fn(),
    isMediaActive: () => active,
    onOpen: vi.fn(),
    isMobile: false,
    t: (key: string) => key,
  } as unknown as ComponentProps<typeof MediaPlayerCard>;
  const Card = kind === 'player' ? MediaPlayerCard : MediaGroupCard;
  const { container } = render(<Card {...props} />);
  return container.firstElementChild as HTMLElement;
};

describe.each(['player', 'group'] as const)('%s media card', (kind) => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it('keeps the artwork card dark in a dark theme', () => {
    document.documentElement.dataset.theme = 'dark';
    const card = renderCard(kind);

    expect(card).toHaveClass('media-on-art');
    expect(card.style.color).toBe('white');
  });

  it('tints the card with the artwork and keeps the theme text in a light theme', () => {
    document.documentElement.dataset.theme = 'light';
    const card = renderCard(kind);

    expect(card).not.toHaveClass('media-on-art');
    expect(card.style.color).toBe('var(--text-primary)');
    expect(card.querySelector('.text-white\\/80')).toBeNull();
    expect(card.querySelector('.media-art-scrim')).toBeNull();
  });

  it('follows a switch to a light theme', async () => {
    document.documentElement.dataset.theme = 'dark';
    const card = renderCard(kind);

    await act(async () => {
      document.documentElement.dataset.theme = 'light';
    });

    expect(card).not.toHaveClass('media-on-art');
  });

  it('keeps white text over a full cover in a light theme', () => {
    document.documentElement.dataset.theme = 'light';
    const card = renderCard(kind, { artworkMode: 'cover' });

    expect(card).toHaveClass('media-on-art');
  });

  it('shrinks the idle ring on a short card so it stays inside', () => {
    const card = renderCard(kind, { state: 'off', active: false });

    expect(card).toHaveClass('@container-size');
    expect(card.querySelector('.rounded-full')).toHaveClass('[@container(max-height:13rem)]:p-3');
  });
});
