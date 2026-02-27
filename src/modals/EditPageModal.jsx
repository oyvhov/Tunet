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
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4"
      style={{
        backdropFilter: 'blur(20px)',
        backgroundColor: 'rgba(0,0,0,0.3)',
      }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative mt-3 w-full max-w-lg rounded-2xl border p-4 font-sans shadow-2xl backdrop-blur-xl sm:mt-0 sm:rounded-3xl sm:p-6 md:rounded-[3rem] md:p-8"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close absolute top-4 right-4 md:top-6 md:right-6"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="mb-4 text-2xl font-light tracking-widest text-[var(--text-primary)] uppercase italic">
          {t('modal.editPage.title')}
        </h3>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
              {t('form.name')}
            </label>
            <input
              type="text"
              className="popup-surface w-full rounded-2xl px-4 py-3 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
              value={
                pageSettings[editingPage]?.label || pageDefaults[editingPage]?.label || editingPage
              }
              onChange={(e) => {
                savePageSetting(editingPage, 'label', e.target.value);
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
              {t('form.chooseIcon')}
            </label>
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

          <div className="popup-surface flex items-center justify-between rounded-2xl px-4 py-3">
            <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
              {t('form.hidePage')}
            </span>
            <button
              onClick={() => {
                savePageSetting(editingPage, 'hidden', !pageSettings[editingPage]?.hidden);
              }}
              className={`relative h-6 w-12 rounded-full transition-colors ${pageSettings[editingPage]?.hidden ? 'bg-[var(--accent-color)]' : 'bg-[var(--glass-bg-hover)]'}`}
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${pageSettings[editingPage]?.hidden ? 'left-7' : 'left-1'}`}
              />
            </button>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
              {t('form.gridColumnsPage')}
            </label>
            <p className="-mt-1 ml-1 text-[10px] text-gray-500">{t('form.gridColumnsPageHint')}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((cols) => {
                const pageGridColumns = pageSettings[editingPage]?.gridColumns;
                const isActive = pageGridColumns === cols;
                return (
                  <button
                    key={cols}
                    type="button"
                    onClick={() => savePageSetting(editingPage, 'gridColumns', cols)}
                    className={`h-10 flex-1 rounded-xl text-sm font-bold transition-all ${
                      isActive ? 'text-white shadow-md' : 'hover:bg-white/5'
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: 'var(--accent-color)' }
                        : { backgroundColor: 'var(--glass-bg)', color: 'var(--text-secondary)' }
                    }
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
                className="w-full rounded-xl py-2 text-xs font-bold tracking-widest uppercase transition-colors"
                style={{ backgroundColor: 'var(--glass-bg-hover)', color: 'var(--text-secondary)' }}
              >
                {t('settings.useGlobal')}
              </button>
            )}
          </div>

          {editingPage !== 'home' && (
            <button
              onClick={() => onDelete(editingPage)}
              className="w-full rounded-2xl bg-red-500/10 py-2.5 font-bold tracking-widest text-red-400 uppercase transition-colors hover:bg-red-500/15"
            >
              {t('form.deletePage')}
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-[var(--glass-bg-hover)] py-3 font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors hover:bg-[var(--glass-bg)]"
          >
            {t('common.ok')}
          </button>
        </div>
      </div>
    </div>
  );
};
export default EditPageModal;
