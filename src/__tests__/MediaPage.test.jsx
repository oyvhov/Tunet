import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MediaPage from '../components/pages/MediaPage';

const makeBaseProps = (overrides = {}) => {
  const entities =
    overrides.entities ||
    {
      'media_player.kitchen': {
        entity_id: 'media_player.kitchen',
        state: 'idle',
        attributes: {
          friendly_name: 'Kitchen',
          integration: 'sonos',
          supported_features: 0,
        },
      },
    };

  const getA = (entityId, attr, fallback = null) => entities[entityId]?.attributes?.[attr] ?? fallback;

  return {
    pageId: 'sonos',
    entities,
    conn: null,
    pageSettings: {},
    editMode: false,
    isSonosActive: () => false,
    activeMediaId: null,
    setActiveMediaId: vi.fn(),
    getA,
    getEntityImageUrl: (value) => value || null,
    callService: vi.fn(),
    savePageSetting: vi.fn(),
    formatDuration: (value) => String(value ?? 0),
    t: (key) => key,
    mode: 'sonos',
    ...overrides,
  };
};

describe('MediaPage Sonos discovery', () => {
  it('renders Sonos players discovered through integration metadata', () => {
    render(
      <MediaPage
        {...makeBaseProps({
          entities: {
            'media_player.living_room': {
              entity_id: 'media_player.living_room',
              state: 'idle',
              attributes: {
                friendly_name: 'Living Room',
                integration: 'sonos',
                supported_features: 0,
              },
            },
            'media_player.bedroom_tv': {
              entity_id: 'media_player.bedroom_tv',
              state: 'idle',
              attributes: {
                friendly_name: 'Bedroom TV',
                integration: 'cast',
                supported_features: 0,
              },
            },
          },
        })}
      />
    );

    expect(screen.getAllByText('Living Room').length).toBeGreaterThan(0);
    expect(screen.queryByText('media.noPlayersFound')).not.toBeInTheDocument();
    expect(screen.queryByText('Bedroom TV')).not.toBeInTheDocument();
  });

  it('shows neutral-named Sonos players in the selector even when page selection is curated', () => {
    render(
      <MediaPage
        {...makeBaseProps({
          editMode: true,
          pageSettings: {
            sonos: {
              mediaIds: ['media_player.kitchen'],
            },
          },
          entities: {
            'media_player.kitchen': {
              entity_id: 'media_player.kitchen',
              state: 'idle',
              attributes: {
                friendly_name: 'Kitchen',
                integration: 'sonos',
                supported_features: 0,
              },
            },
            'media_player.living_room': {
              entity_id: 'media_player.living_room',
              state: 'idle',
              attributes: {
                friendly_name: 'Living Room',
                sonos_favorites: ['Radio'],
                supported_features: 0,
              },
            },
          },
        })}
      />
    );

    fireEvent.click(screen.getByText('common.show'));

    expect(screen.getAllByText('Kitchen').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Living Room').length).toBeGreaterThan(0);
  });
});