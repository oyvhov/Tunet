import { 
  X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, 
  SkipBack, Play, Pause, SkipForward, Home, Settings, 
  Gamepad2, Tv, Power, Volume2
} from '../icons';

export default function GenericAndroidTVModal({ 
  show, 
  onClose, 
  entities, 
  mediaPlayerId, 
  remoteId,
  linkedMediaPlayers,
  callService, 
  getA, 
  getEntityImageUrl,
  customNames,
  t 
}) {
  if (!show) return null;

  const entity = entities[mediaPlayerId];
  if (!entity) return null;

  // Determine priority entity for metadata
  let displayEntityId = mediaPlayerId;
  let linkedActive = false;
  
  if (linkedMediaPlayers && Array.isArray(linkedMediaPlayers)) {
    for (const linkedId of linkedMediaPlayers) {
        const linkedState = entities[linkedId]?.state;
        if (linkedState === 'playing' || linkedState === 'paused' || linkedState === 'buffering') {
            displayEntityId = linkedId;
            linkedActive = true;
            break; 
        }
    }
  }
  const displayEntity = entities[displayEntityId];

  const state = entity?.state;
  const isOn = state !== 'off' && state !== 'unavailable' && state !== 'unknown';
  
  const displayState = displayEntity?.state;
  const isPlaying = displayState === 'playing';
  const isPaused = displayState === 'paused';
  
  let appName = getA(displayEntityId, 'app_name');
  let title = getA(displayEntityId, 'media_title');

  if (linkedActive) {
      const seriesTitle = getA(displayEntityId, 'media_series_title');
      if (seriesTitle) {
          // title already holds episode title from media_title
          appName = seriesTitle; // Series Name
      } else {
          // title already holds movie title from media_title
          if (!appName) {
             appName = (displayEntityId !== mediaPlayerId ? customNames[displayEntityId] || displayEntity?.attributes?.friendly_name : null);
          }
      }
  } else {
    appName = appName || (displayEntityId !== mediaPlayerId ? customNames[displayEntityId] || displayEntity?.attributes?.friendly_name : null);
  }

  const picture = getEntityImageUrl(displayEntity?.attributes?.entity_picture);
  const deviceName = customNames[mediaPlayerId] || entity?.attributes?.friendly_name || 'Android TV';

  // Status Logic
  const statusColor = isPlaying ? '#60a5fa' : (isPaused ? '#fbbf24' : (isOn ? '#a78bfa' : 'var(--text-secondary)'));
  const statusBg = isPlaying ? 'rgba(59, 130, 246, 0.1)' : (isPaused ? 'rgba(251, 191, 36, 0.1)' : (isOn ? 'rgba(167, 139, 250, 0.1)' : 'var(--glass-bg)')); 

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const sendCommand = (command) => {
    if (remoteId) {
      callService('remote', 'send_command', { entity_id: remoteId, command });
    }
  };

  const controlMedia = (action) => {
    const targetId = (action.includes('media') && displayEntityId !== mediaPlayerId) ? displayEntityId : mediaPlayerId;
    callService('media_player', action, { entity_id: targetId });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6" style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} onClick={handleBackdropClick}>
      <div 
        className="w-full max-w-5xl max-h-[80vh] rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl relative overflow-y-auto border backdrop-blur-xl popup-anim" 
        style={{background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} 
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 modal-close z-20"><X className="w-4 h-4" /></button>
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 font-sans">
          <div className="p-4 rounded-2xl transition-all duration-500" style={{ backgroundColor: statusBg, color: statusColor }}>
             {isOn ? <Gamepad2 className="w-8 h-8" /> : <Tv className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none">{deviceName}</h3>
            {!linkedActive && (
              <div className="mt-2 px-3 py-1 rounded-full inline-block transition-all duration-500" style={{ backgroundColor: statusBg, color: statusColor }}>
                <p className="text-[10px] uppercase font-bold italic tracking-widest">{t('status.statusLabel')}: {state}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start font-sans">
          
          {/* Left Column (Span 3) - Media Info & Controls */}
          <div className="lg:col-span-3 space-y-6">
            <div className="p-4 rounded-2xl popup-surface flex flex-col gap-4">
               
               {/* Album Art / Info Area */}
               <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/20 relative group">
                  {picture ? (
                    <>
                      <img src={picture} alt={title} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      <div className="absolute bottom-6 left-6 right-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent-color)] mb-1">{appName || t('media.homeScreen')}</p>
                        <h2 className="text-2xl font-bold text-white leading-tight line-clamp-2">{title || t('media.noneMedia')}</h2>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)]">
                       <Tv className="w-16 h-16 opacity-20 mb-4" />
                       <span className="text-xs font-bold uppercase tracking-widest opacity-50">{t('media.noneMedia')}</span>
                    </div>
                  )}
               </div>

               {/* Playback Controls */}
               <div className="flex items-center justify-center gap-4">
                  <button onClick={() => controlMedia('media_previous_track')} className="p-3 rounded-full bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button onClick={() => controlMedia('media_play_pause')} className="p-5 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-color)] text-white shadow-lg  transition-all active:scale-95 font-bold">
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                  </button>
                  <button onClick={() => controlMedia('media_next_track')} className="p-3 rounded-full bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95">
                    <SkipForward className="w-5 h-5" />
                  </button>
               </div>
            </div>
          </div>

          {/* Right Column (Span 2) - Remote + Volume & Power */}
          {remoteId && (
            <div className="lg:col-span-2 p-4 rounded-2xl popup-surface flex flex-col items-center gap-6">
               
               {/* D-Pad */}
               <div className="relative w-44 h-44">
                  {/* Up */}
                  <button onClick={() => sendCommand('DPAD_UP')} className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-90 flex items-center justify-center">
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  {/* Left */}
                  <button onClick={() => sendCommand('DPAD_LEFT')} className="absolute top-1/2 left-0 -translate-y-1/2 w-14 h-14 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-90 flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {/* Right */}
                  <button onClick={() => sendCommand('DPAD_RIGHT')} className="absolute top-1/2 right-0 -translate-y-1/2 w-14 h-14 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-90 flex items-center justify-center">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  {/* Down */}
                  <button onClick={() => sendCommand('DPAD_DOWN')} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-90 flex items-center justify-center">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                  {/* Center */}
                  <button onClick={() => sendCommand('DPAD_CENTER')} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[var(--accent-color)] hover:bg-[var(--accent-color)] text-white transition-all active:scale-90 flex items-center justify-center shadow-lg  font-bold text-[10px]">
                    OK
                  </button>
               </div>

               {/* Nav Buttons */}
               <div className="grid grid-cols-3 gap-4 w-full">
                  <button onClick={() => sendCommand('BACK')} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] transition-all active:scale-95 group">
                     <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">{t('shield.back')}</span>
                  </button>
                  <button onClick={() => sendCommand('HOME')} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] transition-all active:scale-95 group">
                     <Home className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">{t('shield.home')}</span>
                  </button>
                  <button onClick={() => sendCommand('MENU')} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] transition-all active:scale-95 group">
                     <Settings className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">Menu</span>
                  </button>
               </div>

               {/* Volume & Power Controls */}
               <div className="flex flex-col gap-3 w-full">
                  <div className="flex gap-3">
                     <button onClick={() => controlMedia('volume_down')} className="flex-1 py-3 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Volume2 className="w-4 h-4 opacity-50" />
                        <span className="text-lg font-bold">−</span>
                     </button>
                     <button onClick={() => controlMedia('volume_up')} className="flex-1 py-3 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <span className="text-lg font-bold">+</span>
                        <Volume2 className="w-4 h-4 opacity-50" />
                     </button>
                  </div>
                  <button onClick={() => isOn ? controlMedia('turn_off') : controlMedia('turn_on')} className={`w-full py-3 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 font-bold ${isOn ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}>
                     <Power className="w-5 h-5" />
                     {isOn ? t('shield.turnOff') : t('shield.turnOn')}
                  </button>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}