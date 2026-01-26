import React from 'react';
import { X, Plus } from 'lucide-react';
import IconPicker from './IconPicker';

const AddPageModal = ({ isOpen, onClose, t, newPageLabel, setNewPageLabel, newPageIcon, setNewPageIcon, onCreate }) => {
  if (!isOpen) return null;

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

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-gray-500 ml-4">{t('form.name')}</label>
            <input
              type="text"
              className="w-full px-6 py-4 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
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
            className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> {t('page.create')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPageModal;
