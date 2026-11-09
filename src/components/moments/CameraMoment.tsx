import CameraFeed from '../camera/CameraFeed';
import MomentBar, { type MomentViewProps } from './MomentBar';
import type { MomentCardSettings } from '../../utils/moments';

interface CameraMomentProps extends MomentViewProps {
  settings?: MomentCardSettings;
}

export default function CameraMoment({
  titleId,
  name,
  entity,
  entityId,
  settings,
  conn,
  getEntityImageUrl,
  t,
}: CameraMomentProps) {
  return (
    <>
      <div className="moment__camera bg-black">
        <CameraFeed
          entityId={entityId}
          entity={entity}
          conn={conn}
          getEntityImageUrl={getEntityImageUrl}
          settings={settings}
          refreshKey={0}
          fit="contain"
          controls={false}
          muted
          alt={name}
          t={t}
        />
      </div>
      <h2 id={titleId} className="sr-only">
        {name}
      </h2>
      <MomentBar label={name} t={t} />
    </>
  );
}
