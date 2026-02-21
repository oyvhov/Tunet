import React from 'react';
import { X } from 'lucide-react';
import IconPicker from '../components/ui/IconPicker';

const EditPageModal = ({ 
  isOpen, 
  onClose, 
  t, 
  editingPage, 
  pageSettings, 
  savePageSetting,
  pageDefaults,
  onDelete 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4" style={{
      backdropFilter: 'blur(20px)', 
      backgroundColor: 'rgba(0,0,0,0.3)'
    }} onClick={onClose}>
      <div className="border w-full max-w-lg rounded-2xl sm:rounded-3xl md:rounded-[3rem] p-4 sm:p-6 md:p-8 shadow-2xl relative font-sans backdrop-blur-xl popup-anim mt-3 sm:mt-0" style={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
        borderColor: 'var(--glass-border)', 
        color: 'var(--text-primary)'
      }} onClick={(e) => e.stopPropagation()}>
         <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 modal-close"><X className="w-4 h-4" /></button>
         <h3 className="text-2xl font-light mb-4 text-[var(--text-primary)] uppercase tracking-widest italic">{t('modal.editPage.title')}</h3>
         
         <div className="space-y-5">
           <div className="space-y-2">
             <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('form.name')}</label>
             <input 
               type="text" 
               className="w-full px-4 py-3 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-[var(--accent-color)] outline-none transition-colors"
               value={pageSettings[editingPage]?.label || pageDefaults[editingPage]?.label || editingPage}
               onChange={(e) => {
                savePageSetting(editingPage, 'label', e.target.value);
               }}
             />
           </div>
           
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('form.chooseIcon')}</label>
            <IconPicker
              value={pageSettings[editingPage]?.icon || null}
              onSelect={(iconName) => {
                savePageSetting(editingPage, 'icon', iconName);
              }}
              onClear={() => {
                savePageSetting(editingPage, 'icon', null);
              }}
              t={t}
              maxHeightClass="max-h-72"
            />
          </div>
           
           <div className="flex items-center justify-between px-4 py-3 rounded-2xl popup-surface">
              <span className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('form.hidePage')}</span>
              <button 
                onClick={() => {
                  savePageSetting(editingPage, 'hidden', !pageSettings[editingPage]?.hidden);
                }}
                className={`w-12 h-6 rounded-full transition-colors relative ${pageSettings[editingPage]?.hidden ? 'bg-[var(--accent-color)]' : 'bg-[var(--glass-bg-hover)]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pageSettings[editingPage]?.hidden ? 'left-7' : 'left-1'}`} />
              </button>
           </div>

           <div className="space-y-2">
             <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('form.gridColumnsPage')}</label>
             <p className="text-[10px] text-gray-500 ml-1 -mt-1">{t('form.gridColumnsPageHint')}</p>
             <div className="flex gap-2">
               {[1,2,3,4,5].map(cols => {
                 const pageGridColumns = pageSettings[editingPage]?.gridColumns;
                 const isActive = pageGridColumns === cols;
                 return (
                   <button
                     key={cols}
                     type="button"
                     onClick={() => savePageSetting(editingPage, 'gridColumns', cols)}
                     className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all ${
                       isActive ? 'text-white shadow-md' : 'hover:bg-white/5'
                     }`}
                     style={isActive ? { backgroundColor: 'var(--accent-color)' } : { backgroundColor: 'var(--glass-bg)', color: 'var(--text-secondary)' }}
                   >
                     {cols}
                   </button>
                 );
               })}
             </div>
             {pageSettings[editingPage]?.gridColumns !== undefined && (
               <button
                 type="button"
                 onClick={() => savePageSetting(editingPage, 'gridColumns', null)}
                 className="w-full py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                 style={{ backgroundColor: 'var(--glass-bg-hover)', color: 'var(--text-secondary)' }}
               >
                 {t('settings.useGlobal')}
               </button>
             )}
           </div>

           {editingPage !== 'home' && (
             <button
               onClick={() => onDelete(editingPage)}
               className="w-full py-2.5 rounded-2xl bg-red-500/10 text-red-400 font-bold uppercase tracking-widest hover:bg-red-500/15 transition-colors"
             >
               {t('form.deletePage')}
             </button>
           )}

           <button
             onClick={onClose}
             className="w-full py-3 rounded-2xl bg-[var(--glass-bg-hover)] text-[var(--text-primary)] font-bold uppercase tracking-widest hover:bg-[var(--glass-bg)] transition-colors"
           >
             {t('common.ok')}
           </button>
         </div>
      </div>
    </div>
  );
};
export default EditPageModal;
