import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MusicAssistantLink from '../components/media/MusicAssistantLink';
import MusicAssistantUrlField from '../modals/MusicAssistantUrlField';
import en from '../i18n/en.json';

const PANELS = {
  app: { url_path: 'app', config: null },
  d5369777_music_assistant: {
    url_path: 'd5369777_music_assistant',
    config: { addon: 'd5369777_music_assistant' },
  },
};
const connWith = (panels) => ({ sendMessagePromise: vi.fn().mockResolvedValue(panels) });
const meta = vi.hoisted(() => ({ value: null }));
vi.mock('../contexts', () => ({ useHomeAssistantMeta: () => meta.value }));

const t = (key) => en[key] || key;

describe('Music Assistant shortcut', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('links to the panel of the Music Assistant add-on', async () => {
    const conn = connWith(PANELS);
    meta.value = { conn, connected: true, activeUrl: 'https://ha.local:8123' };
    render(<MusicAssistantLink title="Open Music Assistant" />);
    const link = await screen.findByRole('link', { name: /Music Assistant/ });
    expect(conn.sendMessagePromise).toHaveBeenCalledWith({ type: 'get_panels' });
    expect(link).toHaveAttribute('href', 'https://ha.local:8123/d5369777_music_assistant');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('uses the configured address and hides the link when there is none', async () => {
    const conn = connWith({ app: { url_path: 'app' } });
    meta.value = { conn, connected: true, activeUrl: 'http://ha.local:8123' };
    const { rerender } = render(<MusicAssistantLink title="Open" />);
    await waitFor(() => expect(conn.sendMessagePromise).toHaveBeenCalled());
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    localStorage.setItem('tunet_music_assistant_url', 'http://ma.local:8095');
    rerender(<MusicAssistantLink title="Open" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'http://ma.local:8095/');
  });

  it('saves the address from settings and flags an incomplete one', () => {
    render(<MusicAssistantUrlField t={t} />);
    const input = screen.getByLabelText('Music Assistant address');
    fireEvent.change(input, { target: { value: 'ma.local' } });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(en['system.musicAssistantUrlInvalid'])).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'http://ma.local:8095' } });
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(localStorage.getItem('tunet_music_assistant_url')).toBe('http://ma.local:8095');
  });
});
