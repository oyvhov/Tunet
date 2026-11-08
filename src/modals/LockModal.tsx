import { useEffect, useState } from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import { AlertTriangle, Key, Lock, Unlock } from '../icons';
import { getIconComponent } from '../icons';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import Button from '../components/ui/Button';
import { ModalBody, ModalHeader, ModalSection, StatusChip } from '../components/ui/ModalParts';
import type { StatusTone } from '../components/ui/ModalParts';
import { getHistory } from '../services/haClient';
import { formatRelativeTime } from '../utils/formatting';

type Translate = (key: string) => string;

interface LockEntity {
  state?: string;
  last_changed?: string;
  attributes?: Record<string, unknown>;
}

interface LockModalProps {
  entityId: string;
  entity: LockEntity | null | undefined;
  conn?: Connection | null;
  customName?: string | null;
  customIcon?: string | null;
  callService: (domain: string, service: string, data: Record<string, unknown>) => unknown;
  onClose: () => void;
  t: Translate;
}

interface LogEntry {
  state: string;
  time: string;
}

const FEATURE_OPEN = 1;
const LOG_HOURS = 48;
const LOG_LIMIT = 8;

const normalizeState = (state: unknown) => String(state || 'unknown').toLowerCase();

function stateLabel(state: unknown, t: Translate) {
  const key = `lock.state.${normalizeState(state)}`;
  const translated = t(key);
  return translated === key ? String(state || t('common.unknown')) : translated;
}

function toLogEntries(history: unknown[]): LogEntry[] {
  const entries: LogEntry[] = [];
  let previous: string | null = null;
  for (const raw of history) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const state = String(item.state ?? item.s ?? '');
    const changed = item.last_changed ?? item.lc ?? item.last_updated ?? item.lu;
    if (!state || state === previous || changed == null) continue;
    previous = state;
    const time =
      typeof changed === 'number' ? new Date(changed * 1000).toISOString() : String(changed);
    entries.push({ state, time });
  }
  return entries.reverse().slice(0, LOG_LIMIT);
}

export default function LockModal({
  entityId,
  entity,
  conn,
  customName,
  customIcon,
  callService,
  onClose,
  t,
}: LockModalProps) {
  const [confirmAction, setConfirmAction] = useState<'unlock' | 'open' | null>(null);
  const [code, setCode] = useState('');
  const [log, setLog] = useState<LogEntry[] | null>(null);

  const state = normalizeState(entity?.state);
  const lastChanged = entity?.last_changed;

  useEffect(() => {
    if (!confirmAction) return undefined;
    const timeout = setTimeout(() => setConfirmAction(null), 3000);
    return () => clearTimeout(timeout);
  }, [confirmAction]);

  useEffect(() => {
    if (!conn) {
      setLog([]);
      return undefined;
    }
    let active = true;
    const end = new Date();
    const start = new Date(end.getTime() - LOG_HOURS * 60 * 60 * 1000);
    getHistory(conn as unknown as Parameters<typeof getHistory>[0], {
      start,
      end,
      entityId,
      minimal_response: true,
    })
      .then((history) => {
        if (active) setLog(toLogEntries(history as unknown[]));
      })
      .catch(() => {
        if (active) setLog([]);
      });
    return () => {
      active = false;
    };
  }, [conn, entityId, lastChanged]);

  const attributes = entity?.attributes || {};
  const isLocked = state === 'locked' || state === 'locking';
  const isUnlocked = state === 'unlocked' || state === 'unlocking';
  const isOpen = state === 'open' || state === 'opening';
  const isJammed = state === 'jammed';
  const isUnavailable = !entity || state === 'unavailable' || state === 'unknown';
  const actionsDisabled = !conn || isUnavailable;
  const supportsOpen = (Number(attributes.supported_features || 0) & FEATURE_OPEN) !== 0;
  const codeFormat = attributes.code_format;
  const requiresCode =
    typeof codeFormat === 'string' && !!codeFormat.trim() && codeFormat !== 'none';
  // Only a digits-only format (e.g. ^\d{4}$) gets the number pad on touch devices.
  const numericCode =
    requiresCode && /^\^?(\\d|\[0-9\])(\{\d+(,\d*)?\}|[+*])?\$?$/.test(codeFormat.trim());

  const name =
    customName ||
    (typeof attributes.friendly_name === 'string' ? attributes.friendly_name : '') ||
    entityId;
  const iconName = customIcon || (typeof attributes.icon === 'string' ? attributes.icon : null);
  const StateIcon = isJammed ? AlertTriangle : isUnlocked || isOpen ? Unlock : Lock;
  const HeaderIcon = (iconName && getIconComponent(iconName)) || StateIcon;

  const tone: StatusTone =
    isJammed || isUnavailable
      ? 'error'
      : isUnlocked || isOpen
        ? 'warn'
        : isLocked
          ? 'on'
          : 'neutral';
  const toneColour =
    tone === 'error'
      ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]'
      : tone === 'warn'
        ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]'
        : tone === 'on'
          ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]'
          : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]';

  const payload = () => {
    const data: Record<string, unknown> = { entity_id: entityId };
    if (requiresCode && code.trim()) data.code = code.trim();
    return data;
  };

  const lock = () => {
    setConfirmAction(null);
    if (actionsDisabled || isLocked) return;
    callService('lock', 'lock', payload());
  };

  const confirmThenCall = (action: 'unlock' | 'open') => {
    if (confirmAction !== action) {
      setConfirmAction(action);
      return;
    }
    setConfirmAction(null);
    callService('lock', action, payload());
  };

  const unlock = () => {
    if (actionsDisabled || isUnlocked || isOpen) return;
    confirmThenCall('unlock');
  };

  const open = () => {
    if (actionsDisabled || !supportsOpen || isOpen) return;
    confirmThenCall('open');
  };

  const codeMissing = requiresCode && !code.trim();

  return (
    <AccessibleModalShell open onClose={onClose} size="m">
      {() => (
        <>
          <ModalHeader
            title={name}
            closeLabel={t('common.close')}
            onClose={onClose}
            icon={<HeaderIcon />}
            iconClassName={toneColour}
            status={
              <StatusChip
                tone={tone}
                label={stateLabel(entity?.state, t)}
                detail={lastChanged ? formatRelativeTime(lastChanged, t) : null}
              />
            }
          />
          <ModalBody className="flex flex-col gap-6">
            <div className="popup-surface flex flex-col items-center gap-5 rounded-[var(--modal-surface-radius)] p-6">
              <div
                className={`flex h-28 w-28 items-center justify-center rounded-full transition-colors duration-300 ${toneColour}`}
                data-testid="lock-modal-state"
              >
                <StateIcon className="h-11 w-11 stroke-[1.5px]" />
              </div>

              {requiresCode && (
                <label className="flex w-full max-w-xs flex-col gap-2">
                  <span className="modal-section-label">{t('lock.code.prompt')}</span>
                  <input
                    type="password"
                    inputMode={numericCode ? 'numeric' : 'text'}
                    autoComplete="off"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="h-11 rounded-[var(--modal-control-radius)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 text-center text-lg tracking-[0.3em] text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)]"
                  />
                </label>
              )}

              <div className="flex w-full max-w-xs flex-col gap-2">
                {(isUnlocked || isOpen || isJammed) && (
                  <Button
                    variant="primary"
                    block
                    icon={<Lock />}
                    onClick={lock}
                    disabled={actionsDisabled || codeMissing}
                  >
                    {t('lock.action.lock')}
                  </Button>
                )}
                {/* A jam can happen either way, so a jammed lock offers both. */}
                {!isUnlocked && !isOpen && (
                  <Button
                    variant={confirmAction === 'unlock' ? 'destructive' : 'secondary'}
                    block
                    icon={<Unlock />}
                    onClick={unlock}
                    disabled={actionsDisabled || codeMissing || isUnlocked || isOpen}
                  >
                    {confirmAction === 'unlock'
                      ? t('lock.action.confirmUnlock')
                      : t('lock.action.unlock')}
                  </Button>
                )}
                {supportsOpen && (
                  <Button
                    variant={confirmAction === 'open' ? 'destructive' : 'secondary'}
                    block
                    icon={<Key />}
                    onClick={open}
                    disabled={actionsDisabled || codeMissing || isOpen}
                  >
                    {confirmAction === 'open'
                      ? t('lock.action.confirmOpen')
                      : t('lock.action.open')}
                  </Button>
                )}
              </div>
            </div>

            <ModalSection label={t('history.log')}>
              {log === null ? (
                <p className="text-sm text-[var(--text-muted)]">{t('common.loading')}</p>
              ) : log.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  {lastChanged
                    ? `${stateLabel(entity?.state, t)} · ${formatRelativeTime(lastChanged, t)}`
                    : '--'}
                </p>
              ) : (
                <ul className="popup-surface popup-surface-group flex flex-col rounded-[var(--modal-surface-radius)]">
                  {log.map((entry) => (
                    <li
                      key={`${entry.time}-${entry.state}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-[var(--text-primary)]">
                        {stateLabel(entry.state, t)}
                      </span>
                      <span className="text-[var(--text-secondary)] tabular-nums">
                        {formatRelativeTime(entry.time, t)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ModalSection>
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
