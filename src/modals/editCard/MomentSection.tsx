import { useId } from 'react';
import ConditionBuilder from '../../components/ui/ConditionBuilder';
import Segmented from '../../components/ui/Segmented';
import {
  DEFAULT_MOMENT_CLOSE_SECONDS,
  MOMENT_CLOSE_SECONDS_OPTIONS,
  getMomentKind,
  type MomentConfig,
  type MomentKind,
} from '../../utils/moments';

const CLOSE_LABELS: Record<MomentKind, string> = {
  media: 'moment.closeAfterPause',
  camera: 'moment.closeAfterQuiet',
  notice: 'moment.showFor',
};

const OPTION_LABELS: Record<number, string> = {
  30: 'moment.seconds30',
  60: 'moment.minute1',
  120: 'moment.minutes2',
  300: 'moment.minutes5',
};

interface MomentSectionProps {
  t: (key: string) => string;
  cardId: string;
  moment?: MomentConfig | null;
  onChange: (next: MomentConfig) => void;
  editSettings: Record<string, unknown>;
  entities: Record<string, unknown>;
}

/** One switch that turns a card into a full-screen moment, and the little it needs. */
export default function MomentSection({
  t,
  cardId,
  moment,
  onChange,
  editSettings,
  entities,
}: MomentSectionProps) {
  const messageId = useId();
  const kind = getMomentKind(cardId);
  const enabled = moment?.enabled === true;
  const closeAfterSeconds = Number(moment?.closeAfterSeconds) || DEFAULT_MOMENT_CLOSE_SECONDS;
  const current: MomentConfig = { ...moment, enabled, closeAfterSeconds };

  return (
    <div
      className="popup-surface space-y-3 rounded-2xl border border-[var(--glass-border)]/50 p-4"
      data-testid="moment-section"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {t(`moment.${kind}.title`)}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{t(`moment.${kind}.hint`)}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t(`moment.${kind}.title`)}
          onClick={() => onChange({ ...current, enabled: !enabled })}
          className={`relative h-6 w-12 shrink-0 rounded-full border transition-colors before:absolute before:-inset-2.5 before:content-[''] ${enabled ? 'border-transparent bg-[var(--accent-color)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)]'}`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-[var(--text-primary)] transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-3 border-t border-[var(--glass-border)]/40 pt-3">
          {kind !== 'media' && (
            <ConditionBuilder
              cardId={cardId}
              cardSettings={editSettings}
              condition={moment?.condition ?? null}
              entities={entities}
              onChange={(condition: MomentConfig['condition']) =>
                onChange({ ...current, condition })
              }
              t={t}
              showHeader={false}
              showEnableToggle={false}
              forceEnabled
            />
          )}

          {kind === 'notice' && (
            <div className="space-y-1">
              <label htmlFor={messageId} className="modal-section-label">
                {t('moment.message')}
              </label>
              <input
                id={messageId}
                type="text"
                value={moment?.message ?? ''}
                placeholder={t('moment.messagePlaceholder')}
                onChange={(event) => onChange({ ...current, message: event.target.value })}
                className="w-full rounded-xl border-0 bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
              />
            </div>
          )}

          <div className="space-y-1">
            <p className="modal-section-label">{t(CLOSE_LABELS[kind])}</p>
            <Segmented
              block
              ariaLabel={t(CLOSE_LABELS[kind])}
              value={closeAfterSeconds}
              onChange={(seconds) => onChange({ ...current, closeAfterSeconds: seconds })}
              options={MOMENT_CLOSE_SECONDS_OPTIONS.map((seconds) => ({
                value: seconds as number,
                label: t(OPTION_LABELS[seconds]),
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
