import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeExternalUrl,
  openExternalUrl,
  readMusicAssistantUrl,
  resolveMusicAssistantUrl,
  writeMusicAssistantUrl,
} from '../utils/externalLinks';

describe('externalLinks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('accepts only complete http and https addresses', () => {
    expect(normalizeExternalUrl(' https://music.local:8095 ')).toBe('https://music.local:8095/');
    expect(normalizeExternalUrl('http://192.168.1.5:8095/#/home')).toBe(
      'http://192.168.1.5:8095/#/home'
    );
    expect(normalizeExternalUrl('javascript:alert(1)')).toBe('');
    expect(normalizeExternalUrl('/hassio/ingress/x')).toBe('');
    expect(normalizeExternalUrl('music.local')).toBe('');
    expect(normalizeExternalUrl(42)).toBe('');
  });

  it('opens safe links in a new tab and refuses anything else', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    expect(openExternalUrl('https://example.com/a')).toBe(true);
    expect(open).toHaveBeenCalledWith('https://example.com/a', '_blank', 'noopener,noreferrer');
    expect(openExternalUrl('javascript:alert(1)')).toBe(false);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('prefers the configured Music Assistant address over the add-on panel', () => {
    const panels = {
      app: { url_path: 'app', config: null },
      d5369777_music_assistant: {
        url_path: 'd5369777_music_assistant',
        title: 'Music Assistant',
        config: { addon: 'd5369777_music_assistant' },
      },
    };
    expect(resolveMusicAssistantUrl('http://ma.local:8095', 'https://ha.local:8123', panels)).toBe(
      'http://ma.local:8095/'
    );
    expect(resolveMusicAssistantUrl('', 'https://ha.local:8123/', panels)).toBe(
      'https://ha.local:8123/d5369777_music_assistant'
    );
    expect(
      resolveMusicAssistantUrl('', 'https://ha.local:8123', {
        mass_beta: { url_path: 'mass-beta', config: { ingress: 'd5369777_music_assistant_beta' } },
      })
    ).toBe('https://ha.local:8123/mass-beta');
  });

  it('shows no add-on link when Music Assistant has no panel in Home Assistant', () => {
    expect(
      resolveMusicAssistantUrl('', 'https://ha.local:8123', { app: { url_path: 'app' } })
    ).toBe('');
    expect(resolveMusicAssistantUrl('', 'https://ha.local:8123', null)).toBe('');
    expect(resolveMusicAssistantUrl('not a url', '', null)).toBe('');
  });

  it('stores and clears the configured address', () => {
    writeMusicAssistantUrl(' http://ma.local:8095 ');
    expect(readMusicAssistantUrl()).toBe('http://ma.local:8095');
    writeMusicAssistantUrl('');
    expect(localStorage.getItem('tunet_music_assistant_url')).toBeNull();
  });
});
