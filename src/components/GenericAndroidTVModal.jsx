import { useState, useEffect } from 'react';
import { X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, SkipBack, Play, Pause, SkipForward, Home, Settings, ArrowLeftRight } from '../icons';

export default function GenericAndroidTVModal({ 
  show, 
  onClose, 
  entities, 
  mediaPlayerId, 
  remoteId,
  callService, 
  getA, 
  getEntityImageUrl,
  customNames,
  t 
}) {
  if (!show) return null;

  const entity = entities[mediaPlayerId];
  if (!entity) return null;

  const state = entity?.state;
  const isOn = state !== 'off' && state !== 'unavailable' && state !== 'unknown';
  const isPlaying = state === 'playing';
  const appName = getA(mediaPlayerId, 'app_name');
  const title = getA(mediaPlayerId, 'media_title');
  const picture = getEntityImageUrl(entity?.attributes?.entity_picture);
  const deviceName = customNames[mediaPlayerId] || entity?.attributes?.friendly_name || 'Android TV';

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const sendCommand = (command) => {
    if (remoteId) {
      callService('remote', 'send_command', { entity_id: remoteId, command });
    }
  };

  const controlMedia = (action) => {
    callService('media_player', action, { entity_id: mediaPlayerId });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6" style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} onClick={handleBackdropClick}>
      <div className="w-full max-w-5xl max-h-[95vh] rounded-3xl md:rounded-[4rem] p-6 md:p-12 shadow-2xl relative overflow-y-auto flex flex-col md:flex-row gap-6 md:gap-12 border backdrop-blur-xl popup-anim" style={{background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 modal-close z-20"><X className="w-4 h-4" /></button>
        
        <div className="flex-1 flex flex-col justify-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border self-start mb-8 bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">ANDROID TV</span>
          </div>

          <div className="flex flex-col gap-6">
            {picture && (
              <div className="aspect-video w-full rounded-3xl overflow-hidden border border-[var(--glass-border)] shadow-2xl bg-[var(--glass-bg)] relative group">
                <img src={picture} alt={title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-0 left-0 w-full p-8">
                  <p className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-2">{appName || t('media.homeScreen')}</p>
                  {title && <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-2 line-clamp-2">{title}</h2>}
                </div>
              </div>
            )}

            {!picture && (
              <div className="text-center">
                <p className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-2">{appName || t('media.homeScreen')}</p>
                {title && <h2 className="text-2xl md:text-4xl font-bold text-[var(--text-primary)] leading-tight">{title}</h2>}
              </div>
            )}

            <div className="flex flex-col gap-4 pt-2">
              <div className="flex items-center justify-center gap-8">
                <button onClick={() => controlMedia('media_previous_track')} className="p-4 hover:bg-[var(--glass-bg-hover)] rounded-full transition-colors active:scale-95">
                  <SkipBack className="w-8 h-8 text-[var(--text-secondary)]" />
                </button>
                <button onClick={() => controlMedia('media_play_pause')} className="p-6 rounded-full transition-colors active:scale-95 shadow-lg" style={{backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)'}}>
                  {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </button>
                <button onClick={() => controlMedia('media_next_track')} className="p-4 hover:bg-[var(--glass-bg-hover)] rounded-full transition-colors active:scale-95">
                  <SkipForward className="w-8 h-8 text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-[var(--glass-border)] pt-6 md:pt-24 pl-0 md:pl-12 flex flex-col gap-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">{deviceName}</h3>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={() => isOn ? controlMedia('turn_off') : controlMedia('turn_on')} 
              className={`px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all shadow-lg ${isOn ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
            >
              {isOn ? t('shield.turnOff') : t('shield.turnOn')}
            </button>
          </div>

          {remoteId && (
            <>
              <div className="border-t border-[var(--glass-border)] pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4 text-center">Fjernkontroll</p>
                <div className="grid grid-cols-3 gap-3 items-center justify-items-center max-w-xs mx-auto">
                  <div />
                  <button onClick={() => sendCommand('DPAD_UP')} className="p-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <ChevronUp className="w-6 h-6" />
                  </button>
                  <div />
                  
                  <button onClick={() => sendCommand('DPAD_LEFT')} className="p-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button onClick={() => sendCommand('DPAD_CENTER')} className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all font-bold text-xs uppercase tracking-widest shadow-lg">
                    OK
                  </button>
                  <button onClick={() => sendCommand('DPAD_RIGHT')} className="p-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  
                  <div />
                  <button onClick={() => sendCommand('DPAD_DOWN')} className="p-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <ChevronDown className="w-6 h-6" />
                  </button>
                  <div />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => sendCommand('BACK')} className="py-3 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  Tilbake
                </button>
                <button onClick={() => sendCommand('HOME')} className="py-3 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <Home className="w-5 h-5" />
                </button>
                <button onClick={() => sendCommand('MENU')} className="py-3 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-[var(--glass-border)] pt-6">
                <button onClick={() => controlMedia('volume_down')} className="py-3 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  Vol −
                </button>
                <button onClick={() => controlMedia('volume_up')} className="py-3 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  Vol +
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
