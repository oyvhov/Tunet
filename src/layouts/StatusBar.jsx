import { 
  MapPin, Clock, AlertCircle, Activity, DoorOpen, Warehouse, 
  Clapperboard, Music, Edit2
} from '../icons';
import StatusPill from '../components/StatusPill';
import { 
  REFRIGERATOR_ID, EILEV_DOOR_ID, OLVE_DOOR_ID, STUDIO_PRESENCE_ID,
  PORTEN_MOTION_ID, GARAGE_DOOR_ID, SONOS_IDS, BIBLIOTEK_SESSIONS_ID
} from '../constants';

/**
 * StatusBar component showing various status indicators
 * @param {Object} props
 * @param {Object} props.entities - Home Assistant entities
 * @param {Date} props.now - Current time
 * @param {Function} props.setShowCameraModal - Open camera modal
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
  now,
  setShowCameraModal,
  setActiveMediaId,
  setActiveMediaGroupKey,
  setActiveMediaModal,
  setShowUpdateModal,
  setShowStatusPillsConfig,
  editMode,
  t, 
  isSonosActive, 
  isMediaActive, 
  getA, 
  getEntityImageUrl, 
  statusPillsConfig = [] 
}) {
  const refrigeratorStatus = () => {
    if (entities[REFRIGERATOR_ID]?.state !== 'on') return null;
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl animate-pulse" 
           style={{backgroundColor: 'rgba(249, 115, 22, 0.02)'}}>
        <div className="p-1.5 rounded-xl text-orange-400" 
             style={{backgroundColor: 'rgba(249, 115, 22, 0.1)'}}>
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase font-bold leading-tight">
            {t('status.alert')}
          </span>
          <span className="text-xs font-medium uppercase tracking-widest text-orange-200/50 italic">
            {t('status.fridgeOpen')}
          </span>
        </div>
      </div>
    );
  };

  const studioStatus = () => {
    if (entities[STUDIO_PRESENCE_ID]?.state !== 'on') return null;
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl" 
           style={{backgroundColor: 'rgba(255, 255, 255, 0.03)'}}>
        <div className="p-1.5 rounded-xl text-emerald-400" 
             style={{backgroundColor: 'rgba(16, 185, 129, 0.1)'}}>
          <Activity className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-[var(--text-secondary)] uppercase font-bold leading-tight">
            {t('status.studio')}
          </span>
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)] italic">
            {t('status.inUse')}
          </span>
        </div>
      </div>
    );
  };

  const portenStatus = () => {
    if (entities[PORTEN_MOTION_ID]?.state !== 'on') return null;
    return (
      <button 
        onClick={() => setShowCameraModal(true)} 
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95" 
        style={{backgroundColor: 'rgba(255, 255, 255, 0.03)'}}>
        <div className="p-1.5 rounded-xl text-amber-400" 
             style={{backgroundColor: 'rgba(251, 191, 36, 0.1)'}}>
          <Activity className="w-4 h-4" />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs text-[var(--text-secondary)] uppercase font-bold leading-tight">
            {t('camera.gate')}
          </span>
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)] italic">
            {t('camera.motion')}
          </span>
        </div>
      </button>
    );
  };

  const garageStatus = () => {
    if (entities[GARAGE_DOOR_ID]?.state !== 'on') return null;
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl" 
           style={{backgroundColor: 'rgba(255, 255, 255, 0.03)'}}>
        <div className="p-1.5 rounded-xl text-red-400" 
             style={{backgroundColor: 'rgba(248, 113, 113, 0.1)'}}>
          <Warehouse className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-[var(--text-secondary)] uppercase font-bold leading-tight">
            {t('status.garage')}
          </span>
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)] italic">
            {t('status.open')}
          </span>
        </div>
      </div>
    );
  };

  const embyStatus = () => {
    const activePlayers = Object.keys(entities)
      .filter(id => id.startsWith('media_player.bibliotek') || id.startsWith('media_player.midttunet'))
      .map(id => entities[id])
      .filter(Boolean)
      .filter(e => isMediaActive(e));
    
    const count = activePlayers.length;
    if (count === 0) return null;

    return (
      <button 
        onClick={() => {
          const firstActive = activePlayers[0]?.entity_id;
          if (firstActive) setActiveMediaId(firstActive);
          setActiveMediaGroupKey('__emby__');
          setActiveMediaModal('media');
        }} 
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95" 
        style={{backgroundColor: 'rgba(255, 255, 255, 0.03)'}}>
        <div className="p-1.5 rounded-xl text-green-400" 
             style={{backgroundColor: 'rgba(74, 222, 128, 0.1)'}}>
          <Clapperboard className="w-4 h-4 animate-pulse" />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs text-[var(--text-secondary)] uppercase font-bold leading-tight">
            Emby
          </span>
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)] italic">
            {count} {t('addCard.players')}
          </span>
        </div>
      </button>
    );
  };

  const sonosStatus = () => {
    const sonosEntities = SONOS_IDS.map(id => entities[id]).filter(Boolean);
    const activeSonos = sonosEntities.filter(isSonosActive);
    
    if (activeSonos.length === 0) return null;

    let currentSonos = activeSonos.find(e => e.state === 'playing');
    if (!currentSonos) currentSonos = activeSonos[0];

    const sId = currentSonos.entity_id;
    const isLydplanke = sId === 'media_player.sonos_lydplanke';
    const isTV = isLydplanke && (currentSonos.attributes?.source === 'TV' || currentSonos.attributes?.media_title === 'TV');
    const sTitle = isTV ? t('media.tvAudio') : getA(sId, 'media_title');
    const sArtist = isTV ? t('media.livingRoom') : (getA(sId, 'media_artist') || getA(sId, 'media_album_name'));
    const sPicture = !isTV ? getEntityImageUrl(currentSonos.attributes?.entity_picture) : null;
    const isPlaying = currentSonos.state === 'playing';

    return (
      <button 
        onClick={() => setActiveMediaModal('sonos')} 
        className="flex items-center gap-3 px-2 py-1.5 rounded-2xl transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95" 
        style={{backgroundColor: 'rgba(255, 255, 255, 0.03)'}}>
        <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--glass-bg)] relative flex-shrink-0">
          {sPicture ? (
            <img 
              src={sPicture} 
              alt="" 
              className={`w-full h-full object-cover ${isPlaying ? 'animate-spin' : ''}`} 
              style={{ animationDuration: '10s' }} 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-500/10 text-blue-400">
              <Music className="w-4 h-4" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-start max-w-[120px]">
          <span className="text-xs text-[var(--text-primary)] font-bold leading-tight truncate w-full">
            {sTitle || t('common.unknown')}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-secondary)] truncate w-full">
            {sArtist || ''}
          </span>
        </div>
      </button>
    );
  };

  const doorStatus = (id, label) => {
    if (entities[id]?.state !== 'on') return null;
    return (
      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl" 
           style={{backgroundColor: 'rgba(255, 255, 255, 0.03)'}}>
        <div className="p-1.5 rounded-xl text-blue-400" 
             style={{backgroundColor: 'rgba(59, 130, 246, 0.1)'}}>
          <DoorOpen className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-[var(--text-secondary)] uppercase font-bold leading-tight">
            {label}
          </span>
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)] italic">
            {t('status.open')}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-between w-full mt-0 font-sans">
      <div className="flex flex-wrap gap-2.5 items-center min-w-0">
        {/* Edit button (only in edit mode) - at first position */}
        {editMode && (
          <button
            onClick={() => setShowStatusPillsConfig(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
            title="Rediger status piller"
          >
            <Edit2 className="w-3 h-3" />
            <span className="text-xs tracking-widest uppercase font-bold">Piller</span>
          </button>
        )}
        
        {/* Configurable status pills */}
        {statusPillsConfig
          .filter(pill => pill.visible !== false)
          .map(pill => {
            // Handle different pill types
            if (pill.type === 'media_player') {
              // Get selected media player entity if specified, otherwise all
              const mediaIds = pill.entityId 
                ? [pill.entityId]
                : Object.keys(entities).filter(id => 
                    id.startsWith('media_player.bibliotek') || id.startsWith('media_player.midttunet')
                  );
              const mediaEntities = mediaIds.map(id => entities[id]).filter(Boolean);
              
              return (
                <StatusPill
                  key={pill.id}
                  entity={mediaEntities}
                  pill={pill}
                  getA={getA}
                  getEntityImageUrl={getEntityImageUrl}
                  isMediaActive={isMediaActive}
                  t={t}
                  onClick={pill.clickable ? () => {
                    const activeEntities = mediaEntities.filter(isMediaActive);
                    const firstActive = activeEntities[0];
                    if (firstActive) {
                      setActiveMediaId(firstActive.entity_id);
                      setActiveMediaGroupKey('__emby__');
                      setActiveMediaModal('media');
                    }
                  } : undefined}
                />
              );
            }
            
            if (pill.type === 'sonos') {
              // Get Sonos entities
              const sonosEntities = SONOS_IDS.map(id => entities[id]).filter(Boolean);
              
              return (
                <StatusPill
                  key={pill.id}
                  entity={sonosEntities}
                  pill={pill}
                  getA={getA}
                  getEntityImageUrl={getEntityImageUrl}
                  isMediaActive={isSonosActive}
                  t={t}
                  onClick={pill.clickable ? () => {
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
                onClick={pill.clickable ? () => {
                  // Handle click based on entity type
                  if (pill.entityId === PORTEN_MOTION_ID) {
                    setShowCameraModal(true);
                  }
                  // Add more click handlers as needed
                } : undefined}
              />
            );
          })
        }
        
        {/* Legacy hardcoded pills (always show as fallback) */}
        {refrigeratorStatus()}
        {studioStatus()}
        {portenStatus()}
        {garageStatus()}
        {embyStatus()}
        {sonosStatus()}
        {doorStatus(EILEV_DOOR_ID, t('door.eilev'))}
        {doorStatus(OLVE_DOOR_ID, t('door.olve'))}
      </div>
    </div>
  );
}
