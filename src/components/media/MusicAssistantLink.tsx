import { useEffect, useState } from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import { useHomeAssistantMeta } from '../../contexts';
import { ExternalLink } from '../../icons';
import { getPanels } from '../../services/haClient';
import { readMusicAssistantUrl, resolveMusicAssistantUrl } from '../../utils/externalLinks';
import type { HaPanels } from '../../utils/externalLinks';

const panelsByConnection = new WeakMap<Connection, Promise<HaPanels | null>>();

function loadPanels(conn: Connection): Promise<HaPanels | null> {
  let request = panelsByConnection.get(conn);
  if (!request) {
    request = getPanels(conn).catch(() => null);
    panelsByConnection.set(conn, request);
  }
  return request;
}

export default function MusicAssistantLink({ title }: { title: string }) {
  const { conn, connected, activeUrl } = useHomeAssistantMeta();
  const [panels, setPanels] = useState<HaPanels | null>(null);
  const configuredUrl = readMusicAssistantUrl();

  useEffect(() => {
    if (!conn || !connected || configuredUrl) return undefined;
    let cancelled = false;
    loadPanels(conn).then((result) => {
      if (!cancelled) setPanels(result);
    });
    return () => {
      cancelled = true;
    };
  }, [conn, connected, configuredUrl]);

  const href = resolveMusicAssistantUrl(configuredUrl, activeUrl, panels);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
    >
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
      <span className="text-xs font-bold tracking-wider uppercase">Music Assistant</span>
    </a>
  );
}
