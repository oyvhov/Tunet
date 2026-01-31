import { X, Palette } from '../icons';
import ModernDropdown from '../components/ModernDropdown';

/**
 * Modal for editing header settings
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Close handler
 * @param {string} props.headerTitle - Current header title
 * @param {number} props.headerScale - Current header scale
 * @param {Object} props.headerSettings - Header visibility settings
 * @param {Function} props.updateHeaderTitle - Update title callback
 * @param {Function} props.updateHeaderScale - Update scale callback
 * @param {Function} props.updateHeaderSettings - Update settings callback
 * @param {Function} props.t - Translation function
 */
export default function EditHeaderModal({
  show,
  onClose,
  headerTitle,
  headerScale,
  headerSettings,
  updateHeaderTitle,
  updateHeaderScale,
  updateHeaderSettings,
  t
}) {
  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-12 md:pt-16" 
      style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
      onClick={onClose}
    >
      <div 
        className="border w-full max-w-md max-h-[85vh] rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl relative font-sans flex flex-col backdrop-blur-xl popup-anim overflow-y-auto" 
        style={{background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)'}} 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 md:top-6 md:right-6 modal-close"
        >
          <X className="w-4 h-4" />
        </button>
        
        <h3 className="text-xl font-light mb-6 text-[var(--text-primary)] text-center uppercase tracking-widest italic">
          {t('modal.editHeader.title')}
        </h3>
        
        <div className="space-y-6">
          <div>
            <label className="text-xs uppercase font-bold text-gray-500 ml-1 mb-2 block tracking-[0.2em]">
              {t('header.titleLabel')}
            </label>
            <input
              type="text"
              value={headerTitle}
              onChange={(e) => updateHeaderTitle(e.target.value)}
              placeholder={t('header.titlePlaceholder')}
              className="w-full px-4 py-2.5 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-bold text-gray-500 ml-1 mb-3 block tracking-[0.2em]">
              {t('header.scale')}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={headerScale}
                onChange={(e) => updateHeaderScale(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-bold text-[var(--text-primary)] w-12 text-right">
                {headerScale.toFixed(1)}x
              </span>
            </div>
          </div>

          <div>
            <ModernDropdown 
              label="Header font" 
              icon={Palette} 
              options={['sans', 'serif', 'mono', 'georgia', 'courier', 'trebuchet', 'comic', 'times', 'verdana']} 
              current={headerSettings?.headerFont || 'sans'} 
              onChange={(font) => updateHeaderSettings({ ...headerSettings, headerFont: font })} 
              map={{ 
                sans: 'Sans-serif',
                serif: 'Serif',
                mono: 'Monospace',
                georgia: 'Georgia',
                courier: 'Courier New',
                trebuchet: 'Trebuchet MS',
                comic: 'Comic Sans MS',
                times: 'Times New Roman',
                verdana: 'Verdana'
              }} 
              placeholder="Vel font" 
            />
          </div>

          <div className="space-y-3 pt-4 border-t border-[var(--glass-border)]">
            <label className="text-xs uppercase font-bold text-gray-500 ml-1 tracking-[0.2em]">
              {t('header.visibility')}
            </label>
            
            <button
              onClick={() => updateHeaderSettings({ ...headerSettings, showTitle: !headerSettings.showTitle })}
              className="w-full flex items-center justify-between p-4 rounded-2xl popup-surface popup-surface-hover transition-all"
            >
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {t('header.showTitle')}
              </span>
              <div className={`w-12 h-6 rounded-full relative transition-all ${headerSettings.showTitle ? 'bg-blue-500/80' : 'bg-[var(--glass-bg-hover)]'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${headerSettings.showTitle ? 'left-[calc(100%-20px)]' : 'left-1'}`} />
              </div>
            </button>

            <button
              onClick={() => updateHeaderSettings({ ...headerSettings, showClock: !headerSettings.showClock })}
              className="w-full flex items-center justify-between p-4 rounded-2xl popup-surface popup-surface-hover transition-all"
            >
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {t('header.showClock')}
              </span>
              <div className={`w-12 h-6 rounded-full relative transition-all ${headerSettings.showClock ? 'bg-blue-500/80' : 'bg-[var(--glass-bg-hover)]'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${headerSettings.showClock ? 'left-[calc(100%-20px)]' : 'left-1'}`} />
              </div>
            </button>

            <button
              onClick={() => updateHeaderSettings({ ...headerSettings, showDate: !headerSettings.showDate })}
              className="w-full flex items-center justify-between p-4 rounded-2xl popup-surface popup-surface-hover transition-all"
            >
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {t('header.showDate')}
              </span>
              <div className={`w-12 h-6 rounded-full relative transition-all ${headerSettings.showDate ? 'bg-blue-500/80' : 'bg-[var(--glass-bg-hover)]'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${headerSettings.showDate ? 'left-[calc(100%-20px)]' : 'left-1'}`} />
              </div>
            </button>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-[var(--glass-border)]">
          <button 
            onClick={onClose} 
            className="w-full py-3 rounded-2xl popup-surface popup-surface-hover text-[var(--text-secondary)] font-bold uppercase tracking-widest transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
