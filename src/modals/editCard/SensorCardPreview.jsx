import React from 'react';
import SensorCard from '../../components/cards/SensorCard';
import { resolveSensorIcon } from '../../components/cards/sensorIcon';
import { ChevronDown } from '../../icons';

const PREVIEW_CARD_STYLE = {
  backgroundColor: 'var(--card-bg)',
  borderColor: 'var(--card-border)',
  backdropFilter: 'blur(16px)',
  borderStyle: 'solid',
  borderWidth: '1px',
  borderRadius: 'var(--card-border-radius, 16px)',
};

/** @param {any} props */
export default function SensorCardPreview({
  entityId,
  settings,
  entities,
  name,
  iconName,
  t,
  className = '',
}) {
  const [open, setOpen] = React.useState(
    () => typeof window === 'undefined' || window.innerWidth >= 640
  );
  const bodyId = React.useId();
  const primaryId = settings.entityId || entityId;
  const entity = entities[primaryId];

  return (
    <aside
      aria-label={t('sensor.custom.preview')}
      className={`popup-surface shrink-0 rounded-2xl p-4 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase">
          {t('sensor.custom.preview')}
        </h4>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={t('sensor.custom.preview')}
          onClick={() => setOpen((previous) => !previous)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] lg:hidden"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>
      <div id={bodyId} className={`${open ? 'block' : 'hidden'} lg:block`}>
        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
          {t('sensor.custom.previewHint')}
        </p>
        <div
          inert
          className="pointer-events-none mx-auto mt-4 w-full max-w-[300px]"
          data-testid="sensor-card-preview"
        >
          {entity ? (
            <SensorCard
              entity={entity}
              entities={entities}
              conn={null}
              settings={settings}
              cardStyle={PREVIEW_CARD_STYLE}
              name={name || entity.attributes?.friendly_name || primaryId}
              Icon={resolveSensorIcon(primaryId, iconName, entity)}
              preview
              editMode={false}
              t={t}
            />
          ) : (
            <p className="py-6 text-center text-xs text-[var(--text-muted)]">
              {t('sensor.custom.missingEntity')}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
