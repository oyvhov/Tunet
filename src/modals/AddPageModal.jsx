import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import IconPicker from '../components/ui/IconPicker';

export default function AddPageModal({
  isOpen,
  onClose,
  t,
  newPageLabel,
  setNewPageLabel,
  newPageIcon,
  setNewPageIcon,
  onCreate,
  onCreateMedia,
}) {
  const [activeTab, setActiveTab] = useState('standard');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-6"
      style={{
        backdropFilter: 'blur(20px)',
        backgroundColor: 'rgba(0,0,0,0.3)',
      }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative w-full max-w-lg rounded-3xl border p-6 font-sans shadow-2xl backdrop-blur-xl md:rounded-[3rem] md:p-10"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close absolute top-6 right-6 md:top-10 md:right-10"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="mb-6 text-2xl font-light tracking-widest text-[var(--text-primary)] uppercase italic">
          {t('modal.addPage.title')}
        </h3>

        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('standard')}
            className={`flex-1 rounded-full border py-2.5 text-[11px] font-bold tracking-widest uppercase transition-all ${activeTab === 'standard' ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
          >
            {t('page.create')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`flex-1 rounded-full border py-2.5 text-[11px] font-bold tracking-widest uppercase transition-all ${activeTab === 'media' ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
          >
            {t('addCard.type.sonos')}
          </button>
        </div>

        <div className="space-y-6">
          {activeTab === 'standard' ? (
            <>
              <div className="space-y-2">
                <label className="ml-4 text-xs font-bold text-gray-500 uppercase">
                  {t('form.name')}
                </label>
                <input
                  type="text"
                  className="popup-surface w-full rounded-2xl px-6 py-4 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
                  value={newPageLabel}
                  onChange={(e) => setNewPageLabel(e.target.value)}
                  placeholder={t('form.exampleName')}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="ml-4 text-xs font-bold text-gray-500 uppercase">
                  {t('form.chooseIcon')}
                </label>
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
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--accent-color)] bg-[var(--accent-bg)] py-4 font-bold tracking-widest text-[var(--accent-color)] uppercase transition-colors hover:opacity-90"
              >
                <Plus className="h-5 w-5" /> {t('page.create')}
              </button>
            </>
          ) : (
            <>
              <div className="popup-surface rounded-2xl p-4 text-sm text-[var(--text-secondary)]">
                <p className="mb-2 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  {t('sonos.createTitle')}
                </p>
                <p className="leading-relaxed">{t('sonos.createDescription')}</p>
              </div>
              <button
                onClick={onCreateMedia}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--accent-color)] bg-[var(--accent-bg)] py-4 font-bold tracking-widest text-[var(--accent-color)] uppercase transition-colors hover:opacity-90"
              >
                <Plus className="h-5 w-5" /> {t('sonos.createPage')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
