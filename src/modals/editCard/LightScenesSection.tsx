import { X } from '../../icons';
import { SearchableSelect } from './CarMappingsSection';
import {
  MAX_LIGHT_SCENES,
  addLightScene,
  removeLightScene,
  resolveLightScenes,
} from '../../utils/lightScenes';
import type { EntityMap } from '../../types/dashboard';
import type { Translate } from '../../types/ha';

interface LightScenesSectionProps {
  value: unknown;
  sceneOptions: string[];
  entities: EntityMap;
  onChange: (sceneIds: string[]) => void;
  t: Translate;
}

/** Picks up to three scenes for the quick buttons on the large light card. */
export default function LightScenesSection({
  value,
  sceneOptions,
  entities,
  onChange,
  t,
}: LightScenesSectionProps) {
  const selected = resolveLightScenes(value);
  const available = sceneOptions.filter((sceneId) => !selected.includes(sceneId));

  return (
    <div className="space-y-2">
      <div className="ml-1">
        <p className="modal-section-label">{t('light.scenes')}</p>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">{t('light.scenesHint')}</p>
      </div>
      {selected.length > 0 && (
        <ul className="popup-surface space-y-1 rounded-2xl p-2">
          {selected.map((sceneId) => {
            const sceneName = String(entities[sceneId]?.attributes?.friendly_name || sceneId);
            return (
              <li key={sceneId} className="flex min-h-11 items-center gap-2 rounded-xl pl-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-[var(--text-primary)]">
                    {sceneName}
                  </div>
                  <div className="truncate text-[11px] text-[var(--text-muted)]">{sceneId}</div>
                </div>
                <button
                  type="button"
                  aria-label={`${t('light.removeScene')}: ${sceneName}`}
                  title={t('light.removeScene')}
                  onClick={() => onChange(removeLightScene(selected, sceneId))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {selected.length < MAX_LIGHT_SCENES && (
        <SearchableSelect
          label={null}
          labelClassName="hidden"
          value={null}
          options={available}
          entities={entities}
          onChange={(sceneId: string | null) => {
            if (sceneId) onChange(addLightScene(selected, sceneId));
          }}
          placeholder={t('light.addScene')}
          t={t}
        />
      )}
    </div>
  );
}
