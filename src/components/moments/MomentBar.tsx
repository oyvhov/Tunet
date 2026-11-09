import { X } from '../../icons';
import { useModalShell } from '../ui/AccessibleModalShell';
import type { EntityMap } from '../../types/dashboard';

export interface MomentServices {
  conn: unknown;
  callService: (domain: string, service: string, data?: Record<string, unknown>) => unknown;
  getEntityImageUrl: (url: unknown) => string | null | undefined;
  formatDuration: (seconds: number) => string;
  t: (key: string) => string;
}

export interface MomentViewProps extends MomentServices {
  titleId: string;
  name: string;
  entity: EntityMap[string] | undefined;
  entityId: string;
}

/** Top row of every moment: where it comes from, and the way out. */
export default function MomentBar({ label, t }: { label?: string; t: MomentServices['t'] }) {
  const shell = useModalShell();
  return (
    <header className="moment__bar">
      <span className="moment__label">{label}</span>
      <button
        type="button"
        className="moment__close"
        onClick={() => shell?.requestClose()}
        aria-label={t('common.close')}
        title={t('common.close')}
      >
        <X aria-hidden="true" />
      </button>
    </header>
  );
}
