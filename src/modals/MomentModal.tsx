import { useEffect } from 'react';
import AccessibleModalShell, { useModalShell } from '../components/ui/AccessibleModalShell';
import CameraMoment from '../components/moments/CameraMoment';
import MediaMoment from '../components/moments/MediaMoment';
import NoticeMoment from '../components/moments/NoticeMoment';
import type { MomentServices } from '../components/moments/MomentBar';
import type { ActiveMoment } from '../hooks/useMoments';
import { useConfig } from '../contexts';
import { themes } from '../config/themes';
import type { CSSProperties } from 'react';
import type { EntityMap } from '../types/dashboard';
import '../styles/moments.css';

const CLEAR_OVERLAY = {
  backgroundColor: 'transparent',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
};

interface MomentModalProps extends MomentServices {
  moment: ActiveMoment;
  onClose: () => void;
  entities: EntityMap;
  customNames?: Record<string, string>;
  customIcons?: Record<string, string>;
}

function CloseWhenOver({ closing }: { closing: boolean }) {
  const requestClose = useModalShell()?.requestClose;
  useEffect(() => {
    if (closing) requestClose?.();
  }, [closing, requestClose]);
  return null;
}

/** The full-screen view for whatever is happening: music, a camera or a notice. */
export default function MomentModal({
  moment,
  onClose,
  entities,
  customNames,
  customIcons,
  ...services
}: MomentModalProps) {
  const { currentTheme } = useConfig();
  const themeBase = themes[currentTheme as keyof typeof themes]?.colors?.['--bg-primary'];
  const entity = moment.entityId ? entities[moment.entityId] : undefined;
  const name =
    customNames?.[moment.cardId] ||
    (typeof entity?.attributes?.friendly_name === 'string'
      ? entity.attributes.friendly_name
      : '') ||
    moment.entityId ||
    '';
  const shared = { name, entity, entityId: moment.entityId || '', ...services };

  return (
    <AccessibleModalShell
      open
      onClose={onClose}
      overlayClassName="moment-overlay"
      overlayStyle={CLEAR_OVERLAY}
      panelClassName={`moment moment--${moment.kind} popup-anim`}
      panelStyle={{ '--moment-base': themeBase || '#0f172a' } as CSSProperties}
    >
      {(titleId) => (
        <>
          <CloseWhenOver closing={moment.closing === true} />
          {moment.kind === 'media' && <MediaMoment titleId={titleId} {...shared} />}
          {moment.kind === 'camera' && (
            <CameraMoment titleId={titleId} settings={moment.settings} {...shared} />
          )}
          {moment.kind === 'notice' && (
            <NoticeMoment
              titleId={titleId}
              message={moment.settings?.moment?.message}
              iconName={customIcons?.[moment.cardId]}
              {...shared}
            />
          )}
        </>
      )}
    </AccessibleModalShell>
  );
}
