import React from 'react';
import { X } from 'lucide-react';
import IconPicker from './IconPicker';

const EditPageModal = ({ 
  isOpen, 
  onClose, 
  t, 
  editingPage, 
  pageSettings, 
  setPageSettings, 
  pageDefaults,
  onDelete 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-6" style={{
      backdropFilter: 'blur(48px)', 
      backgroundColor: 'var(--modal-backdrop)'
    }} onClick={onClose}>
      <div className="border w-full max-w-lg rounded-3xl md:rounded-[3rem] p-6 md:p-12 shadow-2xl relative font-sans" style={{
        backgroundColor: 'var(--modal-bg)', 
        borderColor: 'var(--glass-border)', 
        color: 'var(--text-primary)'
      }} onClick={(e) => e.stopPropagation()}>
         <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 modal-close"><X className="w-4 h-4" /></button>
         <h3 className="text-2xl font-light mb-6 text-[var(--text-primary)] uppercase tracking-widest italic">{t('modal.editPage.title')}</h3>
         
         <div className="space-y-8">
           <div className="space-y-2">
             <label className="text-xs uppercase font-bold text-gray-500 ml-4">{t('form.name')}</label>
             <input 
               type="text" 
               className="w-full px-6 py-4 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
               value={pageSettings[editingPage]?.label || pageDefaults[editingPage]?.label || editingPage}
               onChange={(e) => {
                  const newSettings = { ...pageSettings, [editingPage]: { ...pageSettings[editingPage], label: e.target.value } };
                  setPageSettings(newSettings);
                  localStorage.setItem('midttunet_page_settings', JSON.stringify(newSettings));
               }}
             />
           </div>
           
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-gray-500 ml-4">{t('form.chooseIcon')}</label>
            <IconPicker
              value={pageSettings[editingPage]?.icon || null}
              onSelect={(iconName) => {
                const newSettings = { ...pageSettings, [editingPage]: { ...pageSettings[editingPage], icon: iconName } };
                setPageSettings(newSettings);
                localStorage.setItem('midttunet_page_settings', JSON.stringify(newSettings));
              }}
              onClear={() => {
                const newSettings = { ...pageSettings, [editingPage]: { ...pageSettings[editingPage], icon: null } };
                setPageSettings(newSettings);
                localStorage.setItem('midttunet_page_settings', JSON.stringify(newSettings));
              }}
              t={t}
              maxHeightClass="max-h-60"
            />
          </div>
           
           <div className="flex items-center justify-between px-6 py-4 rounded-2xl popup-surface">
              <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.hidePage')}</span>
              <button 
                onClick={() => {
                  const newSettings = { ...pageSettings, [editingPage]: { ...pageSettings[editingPage], hidden: !pageSettings[editingPage]?.hidden } };
                  setPageSettings(newSettings);
                  localStorage.setItem('midttunet_page_settings', JSON.stringify(newSettings));
                }}
                className={`w-12 h-6 rounded-full transition-colors relative ${pageSettings[editingPage]?.hidden ? 'bg-blue-500' : 'bg-[var(--glass-bg-hover)]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pageSettings[editingPage]?.hidden ? 'left-7' : 'left-1'}`} />
              </button>
           </div>

           {editingPage !== 'home' && (
             <button
               onClick={() => onDelete(editingPage)}
               className="w-full py-3 rounded-2xl bg-red-500/10 text-red-400 font-bold uppercase tracking-widest hover:bg-red-500/15 transition-colors"
             >
               {t('form.deletePage')}
             </button>
           )}
         </div>
      </div>
    </div>
  );
};
export default EditPageModal;
