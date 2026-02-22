import { Edit2 } from '../icons';
import StatusPill from '../components/cards/StatusPill';

/**
 * StatusBar component showing various status indicators
 * @param {Object} props
 * @param {Object} props.entities - Home Assistant entities
 * @param {Date} props.now - Current time
 * @param {Function} props.setActiveMediaId - Set active media player
 * @param {Function} props.setActiveMediaGroupKey - Set media group key
 * @param {Function} props.setActiveMediaModal - Set active media modal
 * @param {Function} props.setShowUpdateModal - Open update modal
 * @param {Function} props.t - Translation function
 * @param {Function} props.isSonosActive - Check if Sonos is active
 * @param {Function} props.isMediaActive - Check if media is active
 * @param {Function} props.getA - Get entity attribute
 * @param {Function} props.getEntityImageUrl - Get entity image URL
 * @param {Array} props.statusPillsConfig - Status pills configuration
 */
export default function StatusBar({ 
  entities, 
  _now,
  setActiveMediaId,
  setActiveMediaGroupKey,
  setActiveMediaGroupIds,
  setActiveMediaSessionSensorIds,
  setActiveMediaModal,
  _setShowUpdateModal,  
  setShowStatusPillsConfig,
  editMode,
  t, 
  isSonosActive, 
  isMediaActive, 
  getA, 
  getEntityImageUrl, 
  statusPillsConfig = [],
  isMobile = false
}) {
  const isSonosEntity = (entity) => {
    if (!entity) return false;
    const manufacturer = (entity.attributes?.manufacturer || '').toLowerCase();
    const platform = (entity.attributes?.platform || '').toLowerCase();
    if (manufacturer.includes('sonos') || platform.includes('sonos')) return true;
    const entityId = (entity.entity_id || '').toLowerCase();
    const friendlyName = (entity.attributes?.friendly_name || '').toLowerCase();
    return entityId.includes('sonos') || friendlyName.includes('sonos');
  };

  const getSonosEntities = () => Object.keys(entities)
    .filter(id => id.startsWith('media_player.'))
    .map(id => entities[id])
    .filter(isSonosEntity);

  const hasSonosMediaMetadata = (entity) => {
    if (!entity) return false;
    const attrs = entity.attributes || {};
    const hasText = Boolean(attrs.media_title || attrs.media_channel || attrs.media_artist || attrs.media_album_name);
    const hasImage = Boolean(attrs.entity_picture || attrs.media_image_url);
    return hasText || hasImage;
  };

  const normalizePattern = (pattern) => pattern.trim();

  const buildWildcardRegex = (pattern) => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const wildcard = escaped.replace(/\*/g, '.*');
    return new RegExp(`^${wildcard}$`, 'i');
  };

  const matchesMediaFilter = (id, filter, mode) => {
    if (!filter) return true;
    const patterns = filter
      .split(',')
      .map(normalizePattern)
      .filter(Boolean);
    if (patterns.length === 0) return true;

    return patterns.some((pattern) => {
      if (mode === 'regex') {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(id);
        } catch {
          return false;
        }
      }

      if (pattern.includes('*')) {
        const wildcardRegex = buildWildcardRegex(pattern);
        return wildcardRegex.test(id);
      }

      if (mode === 'contains') return id.toLowerCase().includes(pattern.toLowerCase());
      return id.toLowerCase().startsWith(pattern.toLowerCase());
    });
  };

  const setMediaNameDisplayFilter = (pill) => {
    try {
      localStorage.setItem('tunet_media_name_display_filter', typeof pill?.playerNameDisplayFilter === 'string' ? pill.playerNameDisplayFilter : '');
    } catch {
      // ignore localStorage errors
    }
  };

  return (
    <div className="flex items-center justify-between w-full mt-0 font-sans">
      <div className={`flex flex-wrap items-center min-w-0 ${isMobile ? 'gap-1.5' : 'gap-2.5'}`}>
        {/* Edit button (only in edit mode) - at first position */}
        {editMode && (
          <button
            onClick={() => setShowStatusPillsConfig(true)}
            className={`flex items-center gap-1.5 rounded-full border transition-all bg-[var(--accent-bg)] border-[var(--accent-color)] text-[var(--accent-color)] hover:bg-[var(--accent-bg)] ${isMobile ? 'px-2 py-1 text-[10px]' : 'px-3 py-1'}`}
            title={t('statusBar.editPills')}
          >
            <Edit2 className="w-3 h-3" />
            <span className="text-[10px] uppercase font-bold tracking-[0.2em]">{t('statusBar.pills')}</span>
          </button>
        )}
        
        {/* Configurable status pills */}
        {statusPillsConfig
          .filter(pill => pill.visible !== false)
          .map(pill => {
            // Handle different pill types
            if (pill.type === 'media_player' || pill.type === 'emby') {
              const mediaIds = (() => {
                if (pill.type === 'media_player') {
                  return pill.entityId
                    ? [pill.entityId]
                    : Object.keys(entities)
                        .filter(id => id.startsWith('media_player.'))
                        .filter(id => matchesMediaFilter(id, pill.mediaFilter, pill.mediaFilterMode));
                }

                if (Array.isArray(pill.mediaEntityIds) && pill.mediaEntityIds.length > 0) {
                  return pill.mediaEntityIds;
                }

                return Object.keys(entities)
                  .filter(id => id.startsWith('media_player.'))
                  .filter(id => matchesMediaFilter(id, pill.mediaFilter, pill.mediaFilterMode));
              })();
              const mediaEntities = mediaIds.map(id => entities[id]).filter(Boolean);
              const playingCount = mediaEntities.filter(e => e.state === 'playing').length;
              
              return (
                <StatusPill
                  key={pill.id}
                  entity={mediaEntities}
                  pill={pill}
                  getA={getA}
                  getEntityImageUrl={getEntityImageUrl}
                  isMediaActive={isMediaActive}
                  t={t}
                  isMobile={isMobile}
                  badge={pill.showCount
                    ? (pill.type === 'emby'
                      ? (playingCount >= 2 ? playingCount : undefined)
                      : (pill.type === 'media_player' && playingCount > 0 ? playingCount : undefined))
                    : undefined}
                  onClick={pill.clickable ? () => {
                    const activeEntities = mediaEntities.filter(isMediaActive);
                    const firstActive = activeEntities[0];
                    if (!firstActive) return;
                    setMediaNameDisplayFilter(pill);
                    const activeMediaIds = activeEntities.map((entity) => entity.entity_id).filter(Boolean);
                    setActiveMediaId(firstActive.entity_id);
                    setActiveMediaGroupKey(null);
                    setActiveMediaGroupIds(activeMediaIds);
                    if (pill.type === 'emby' && Array.isArray(pill.sessionSensorIds)) {
                      setActiveMediaSessionSensorIds(pill.sessionSensorIds);
                    } else {
                      setActiveMediaSessionSensorIds(null);
                    }
                    setActiveMediaModal('media');
                  } : undefined}
                />
              );
            }
            
            if (pill.type === 'sonos') {
              const selectedMediaIds = Array.isArray(pill.mediaEntityIds) ? pill.mediaEntityIds : [];
              const filteredMediaIds = Object.keys(entities)
                .filter((id) => id.startsWith('media_player.'))
                .filter((id) => matchesMediaFilter(id, pill.mediaFilter, pill.mediaFilterMode));
              const sourceMediaIds = (pill.mediaSelectionMode === 'select' && selectedMediaIds.length > 0)
                ? selectedMediaIds
                : filteredMediaIds;
              const detectedSonosIds = getSonosEntities()
                .map((entity) => entity.entity_id)
                .filter((id) => sourceMediaIds.includes(id));
              const sonosIds = detectedSonosIds.length > 0 ? detectedSonosIds : sourceMediaIds;
              const sonosEntities = sonosIds.map(id => entities[id]).filter(Boolean);
              const sonosPlayingCount = sonosEntities.filter(e => e.state === 'playing').length;
              
              return (
                <StatusPill
                  key={pill.id}
                  entity={sonosEntities}
                  pill={pill}
                  getA={getA}
                  getEntityImageUrl={getEntityImageUrl}
                  isMediaActive={isSonosActive}
                  t={t}
                  isMobile={isMobile}
                  badge={pill.showCount && sonosPlayingCount > 0 ? sonosPlayingCount : undefined}
                  onClick={pill.clickable ? () => {
                    const activeEntities = sonosEntities.filter(isSonosActive);
                    const playingEntities = activeEntities.filter((entity) => entity.state === 'playing');
                    const metadataEntities = sonosEntities.filter(hasSonosMediaMetadata);
                    const preferredEntity = playingEntities[0] || metadataEntities[0] || activeEntities[0] || sonosEntities[0];
                    const selectedBase = activeEntities.length > 0 ? activeEntities : (metadataEntities.length > 0 ? metadataEntities : sonosEntities);
                    const selectedIds = selectedBase
                      .map((entity) => entity?.entity_id)
                      .filter(Boolean);

                    if (!preferredEntity) return;

                    setMediaNameDisplayFilter(pill);
                    setActiveMediaId(preferredEntity.entity_id);
                    setActiveMediaGroupKey(null);
                    setActiveMediaGroupIds(selectedIds.length > 0 ? selectedIds : [preferredEntity.entity_id]);
                    setActiveMediaSessionSensorIds(null);
                    setActiveMediaModal('sonos');
                  } : undefined}
                />
              );
            }
            
            // Default conditional pill
            return (
              <StatusPill
                key={pill.id}
                entity={entities[pill.entityId]}
                pill={pill}
                getA={getA}
                t={t}
                isMobile={isMobile}
              />
            );
          })
        }
      </div>
    </div>
  );
}
