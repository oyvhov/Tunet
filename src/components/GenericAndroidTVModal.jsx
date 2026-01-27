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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={handleBackdropClick}>
      <div className="bg-[var(--card-bg)] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--card-border)] shadow-2xl">
        <div className="sticky top-0 z-10 flex justify-between items-center p-6 border-b border-[var(--glass-border)] bg-[var(--card-bg)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">{deviceName}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--glass-bg)] rounded-full transition-colors">
            <X className="w-6 h-6 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {picture && (
            <div className="w-full aspect-video rounded-2xl overflow-hidden border border-[var(--glass-border)]">
              <img src={picture} alt={title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-[var(--text-secondary)] uppercase tracking-widest mb-2">{appName || t('media.homeScreen')}</p>
            {title && <h3 className="text-xl font-bold text-[var(--text-primary)]">{title}</h3>}
          </div>

          <div className="flex justify-center gap-4">
            <button 
              onClick={() => controlMedia('turn_off')} 
              className={`px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-sm transition-colors ${isOn ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
            >
              {isOn ? t('common.turnOff') : t('common.turnOn')}
            </button>
          </div>

          {remoteId && (
            <>
              <div className="flex justify-center gap-8 py-4">
                <button onClick={() => controlMedia('media_previous_track')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 active:scale-90">
                  <SkipBack className="w-6 h-6" />
                </button>
                <button onClick={() => controlMedia('media_play_pause')} className="w-14 h-14 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg active:scale-95">
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>
                <button onClick={() => controlMedia('media_next_track')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 active:scale-90">
                  <SkipForward className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 items-center justify-items-center">
                <button onClick={() => sendCommand('DPAD_UP')} className="col-start-2 p-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all">
                  <ChevronUp className="w-6 h-6" />
                </button>
                <button onClick={() => sendCommand('DPAD_LEFT')} className="p-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button onClick={() => sendCommand('DPAD_CENTER')} className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-500/20 border-2 border-blue-500/40 hover:bg-blue-500/30 active:scale-95 transition-all text-blue-400 font-bold text-xs uppercase tracking-widest">
                  OK
                </button>
                <button onClick={() => sendCommand('DPAD_RIGHT')} className="p-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all">
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button onClick={() => sendCommand('DPAD_DOWN')} className="col-start-2 p-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all">
                  <ChevronDown className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => sendCommand('BACK')} className="py-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-sm font-bold uppercase tracking-widest">
                  {t('common.back')}
                </button>
                <button onClick={() => sendCommand('HOME')} className="py-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Home className="w-5 h-5" />
                </button>
                <button onClick={() => sendCommand('MENU')} className="py-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => controlMedia('volume_down')} className="py-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-sm font-bold uppercase tracking-widest">
                  Vol -
                </button>
                <button onClick={() => controlMedia('volume_up')} className="py-4 rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] active:scale-95 transition-all text-sm font-bold uppercase tracking-widest">
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
