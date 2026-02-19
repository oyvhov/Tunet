import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import IconPicker from '../components/ui/IconPicker';

export default function AddPageModal({ isOpen, onClose, t, newPageLabel, setNewPageLabel, newPageIcon, setNewPageIcon, onCreate, onCreateMedia }) {
  if (!isOpen) return null;
  const [activeTab, setActiveTab] = useState('standard');

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-6" style={{
      backdropFilter: 'blur(20px)', 
      backgroundColor: 'rgba(0,0,0,0.3)'
    }} onClick={onClose}>
      <div className="border w-full max-w-lg rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl relative font-sans backdrop-blur-xl popup-anim" style={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
        borderColor: 'var(--glass-border)', 
        color: 'var(--text-primary)'
      }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 modal-close"><X className="w-4 h-4" /></button>
        <h3 className="text-2xl font-light mb-6 text-[var(--text-primary)] uppercase tracking-widest italic">{t('modal.addPage.title')}</h3>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('standard')}
            className={`flex-1 py-2.5 rounded-full font-bold uppercase tracking-widest text-[11px] border transition-all ${activeTab === 'standard' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
          >
            {t('page.create')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-2.5 rounded-full font-bold uppercase tracking-widest text-[11px] border transition-all ${activeTab === 'media' ? 'bg-[var(--glass-bg-hover)] text-[var(--text-primary)] border-[var(--glass-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
          >
            {t('addCard.type.sonos')}
          </button>
        </div>

        <div className="space-y-6">
          {activeTab === 'standard' ? (
            <>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-4">{t('form.name')}</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-[var(--glass-border)] outline-none transition-colors"
                  value={newPageLabel}
                  onChange={(e) => setNewPageLabel(e.target.value)}
                  placeholder={t('form.exampleName')}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500 ml-4">{t('form.chooseIcon')}</label>
                <IconPicker
                  value={newPageIcon}
                  onSelect={setNewPageIcon}
                  onClear={() => setNewPageIcon(null)}
                  t={t}
                  maxHeightClass="max-h-60"
                />
              </div>

              <button
                onClick={onCreate}
                className="w-full py-4 rounded-2xl popup-surface popup-surface-hover border border-[var(--glass-border)] text-[var(--text-primary)] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> {t('page.create')}
              </button>
            </>
          ) : (
            <>
              <div className="p-4 rounded-2xl popup-surface text-sm text-[var(--text-secondary)]">
                <p className="font-bold uppercase tracking-widest text-[10px] text-gray-500 mb-2">{t('sonos.createTitle')}</p>
                <p className="leading-relaxed">{t('sonos.createDescription')}</p>
              </div>
              <button
                onClick={onCreateMedia}
                className="w-full py-4 rounded-2xl popup-surface popup-surface-hover border border-[var(--glass-border)] text-[var(--text-primary)] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> {t('sonos.createPage')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
