import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MediaPage from '../components/pages/MediaPage';

const makeBaseProps = (overrides = {}) => {
  const entities = overrides.entities || {
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

  const getA = (entityId, attr, fallback = null) =>
    entities[entityId]?.attributes?.[attr] ?? fallback;

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

    expect(screen.getAllByText('Kitchen').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Living Room').length).toBeGreaterThan(0);
    expect(screen.getByRole('switch', { name: 'Kitchen' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'Living Room' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('uses one clear switch per player while editing the page', () => {
    const savePageSetting = vi.fn();
    render(
      <MediaPage
        {...makeBaseProps({
          editMode: true,
          savePageSetting,
          pageSettings: { sonos: { mediaIds: ['media_player.kitchen'] } },
        })}
      />
    );

    const kitchenSwitch = screen.getByRole('switch', { name: 'Kitchen' });
    fireEvent.click(kitchenSwitch);

    expect(savePageSetting).toHaveBeenCalledWith('sonos', 'mediaIds', []);
  });
});

describe('MediaPage Sonos empty state', () => {
  it('renders the empty state when no Sonos players are present', () => {
    render(<MediaPage {...makeBaseProps({ entities: {} })} />);
    expect(screen.getByText('sonos.empty.title')).toBeInTheDocument();
    expect(screen.getByText('sonos.empty.subtitle')).toBeInTheDocument();
  });
});

describe('MediaPage Sonos grouping', () => {
  const groupingEntities = {
    'media_player.kitchen': {
      entity_id: 'media_player.kitchen',
      state: 'playing',
      attributes: {
        friendly_name: 'Kitchen',
        integration: 'sonos',
        group_members: ['media_player.kitchen'],
        supported_features: 0,
      },
    },
    'media_player.bedroom': {
      entity_id: 'media_player.bedroom',
      state: 'idle',
      attributes: {
        friendly_name: 'Bedroom',
        integration: 'sonos',
        group_members: ['media_player.bedroom'],
        supported_features: 0,
      },
    },
  };

  it('joins all other players when "Group" is clicked and no group exists yet', () => {
    const callService = vi.fn();
    render(
      <MediaPage
        {...makeBaseProps({
          entities: groupingEntities,
          activeMediaId: 'media_player.kitchen',
          callService,
          conn: { sendMessagePromise: vi.fn() },
        })}
      />
    );

    const groupBtn = screen.getByLabelText('sonos.groupAll');
    fireEvent.click(groupBtn);

    expect(callService).toHaveBeenCalledWith('media_player', 'join', {
      entity_id: 'media_player.kitchen',
      group_members: ['media_player.bedroom'],
    });
  });

  it('does not call join when there is no active connection', () => {
    const callService = vi.fn();
    render(
      <MediaPage
        {...makeBaseProps({
          entities: groupingEntities,
          activeMediaId: 'media_player.kitchen',
          callService,
          conn: null,
        })}
      />
    );

    const groupBtn = screen.getByLabelText('sonos.groupAll');
    fireEvent.click(groupBtn);

    expect(callService).not.toHaveBeenCalled();
  });
});

describe('MediaPage media chooser', () => {
  it('browses nested favorites for generic players without replacing the chooser layout', async () => {
    const browseResults = {
      '': {
        title: 'Media sources',
        children: [
          {
            title: 'Music Assistant',
            media_class: 'app',
            media_content_type: 'app',
            media_content_id: 'media-source://music-assistant',
            can_play: false,
            can_expand: true,
          },
        ],
      },
      'media-source://music-assistant': {
        title: 'Music Assistant',
        children: [
          {
            title: 'Favorittar',
            media_content_type: 'music',
            media_content_id: 'library://favorites',
            can_play: false,
            can_expand: true,
          },
        ],
      },
      'library://favorites': {
        title: 'Favorittar',
        children: [
          {
            title: 'Born to Be Alive',
            media_content_type: 'music',
            media_content_id: 'spotify://track/favorite-1',
            can_play: true,
            can_expand: false,
          },
        ],
      },
    };
    const conn = {
      sendMessagePromise: vi.fn(async (message) => {
        const contentId = message.media_content_id || '';
        return browseResults[contentId] || { title: 'Empty', children: [] };
      }),
    };
    const entities = {
      'media_player.emby_tv': {
        entity_id: 'media_player.emby_tv',
        state: 'idle',
        attributes: {
          friendly_name: 'Emby TV',
          integration: 'emby',
          supported_features: 0,
        },
      },
    };

    render(
      <MediaPage
        {...makeBaseProps({
          pageId: 'media',
          mode: 'media',
          entities,
          conn,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'media.tab.media' }));

    expect(screen.getByTestId('media-page-chooser')).toBeInTheDocument();
    expect(screen.getByTestId('media-page-chooser-results')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('media-page-chooser-loading')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Born to Be Alive')).toBeInTheDocument());

    expect(screen.getByTestId('media-page-chooser-results')).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByTestId('media-page-chooser-loading')).not.toBeInTheDocument();
    expect(conn.sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({ media_content_id: 'library://favorites' })
    );
  });
});
