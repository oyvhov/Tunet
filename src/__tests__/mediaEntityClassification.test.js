import { describe, expect, it } from 'vitest';
import {
  isMusicAssistantMediaEntity,
  isSonosMediaEntity,
} from '../utils/mediaEntityClassification';

describe('media entity classification', () => {
  it('detects Sonos entities via integration metadata even with neutral ids and names', () => {
    const entity = {
      entity_id: 'media_player.living_room',
      attributes: {
        friendly_name: 'Living Room',
        integration: 'sonos',
      },
    };

    expect(isSonosMediaEntity(entity)).toBe(true);
  });

  it('detects Sonos entities via sonos-specific attributes', () => {
    const entity = {
      entity_id: 'media_player.kitchen',
      attributes: {
        friendly_name: 'Kitchen',
        sonos_favorites: ['Radio'],
      },
    };

    expect(isSonosMediaEntity(entity)).toBe(true);
  });

  it('excludes Music Assistant players from Sonos classification even when manufacturer is Sonos', () => {
    const entity = {
      entity_id: 'media_player.stue',
      attributes: {
        friendly_name: 'Stue',
        manufacturer: 'Sonos',
        integration: 'music_assistant',
        mass_player_type: 'player',
      },
    };

    expect(isMusicAssistantMediaEntity(entity)).toBe(true);
    expect(isSonosMediaEntity(entity)).toBe(false);
  });
});