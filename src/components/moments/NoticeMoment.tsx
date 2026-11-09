import { Bell, getIconComponent } from '../../icons';
import MomentBar, { type MomentViewProps } from './MomentBar';

interface NoticeMomentProps extends MomentViewProps {
  message?: string;
  iconName?: string;
}

export default function NoticeMoment({
  titleId,
  name,
  entity,
  message,
  iconName,
  t,
}: NoticeMomentProps) {
  const Icon = (iconName && getIconComponent(iconName)) || Bell;
  const state = entity?.state ?? '';
  const headline = message?.trim() || state.charAt(0).toUpperCase() + state.slice(1);

  return (
    <>
      <MomentBar t={t} />
      <div className="moment__notice">
        <span className="moment__notice-icon">
          <Icon aria-hidden="true" />
        </span>
        <p className="moment__label">{name}</p>
        <h2 id={titleId} className="moment__title">
          {headline}
        </h2>
      </div>
    </>
  );
}
