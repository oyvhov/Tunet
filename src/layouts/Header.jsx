import { ChevronUp, ChevronDown } from '../icons';

/**
 * Header component with title, time and edit controls
 * @param {Object} props
 * @param {Date} props.now - Current time
 * @param {string} props.headerTitle - Main title
 * @param {number} props.headerScale - Scale factor for header size
 * @param {boolean} props.editMode - Whether in edit mode
 * @param {Function} props.updateHeaderScale - Update scale callback
 * @param {Function} props.updateHeaderTitle - Update title callback
 * @param {Function} props.t - Translation function
 * @param {React.ReactNode} [props.children] - Optional children content
 */
export default function Header({ 
  now, 
  headerTitle, 
  headerScale, 
  editMode, 
  updateHeaderScale, 
  updateHeaderTitle,
  t,
  children
}) {
  return (
    <header className="relative mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10 leading-none">
      <div className="absolute top-0 right-0 hidden md:block">
        <h2 
          className="font-light tracking-[0.1em] leading-none select-none" 
          style={{ 
            fontSize: `calc(3.75rem * ${headerScale})`, 
            color: 'var(--text-muted)' 
          }}
        >
          {now.toLocaleTimeString('nn-NO', { hour: '2-digit', minute: '2-digit' })}
        </h2>
      </div>
      
      <div className="absolute top-0 right-0 md:hidden">
        <h2 
          className="font-light tracking-[0.1em] leading-none select-none" 
          style={{ 
            fontSize: `calc(3rem * ${headerScale})`, 
            color: 'var(--text-muted)' 
          }}
        >
          {now.toLocaleTimeString('nn-NO', { hour: '2-digit', minute: '2-digit' })}
        </h2>
      </div>

      <div className="flex flex-col gap-3 font-sans w-full">
        <div>
          <div className="flex items-center gap-4">
            <h1 
              className="font-light uppercase leading-none select-none tracking-[0.2em] md:tracking-[0.8em]" 
              style={{
                color: 'var(--text-muted)', 
                fontSize: `calc(clamp(3rem, 5vw, 3.75rem) * ${headerScale})`
              }}
            >
              {headerTitle || 'Midttunet'}
            </h1>
            
            {editMode && (
              <div className="flex flex-col gap-1 z-50">
                <button 
                  onClick={() => updateHeaderScale(Math.min(headerScale + 0.1, 2))} 
                  className="p-1 bg-white/10 rounded hover:bg-white/20"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => updateHeaderScale(Math.max(headerScale - 0.1, 0.5))} 
                  className="p-1 bg-white/10 rounded hover:bg-white/20"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          {editMode && (
            <div className="mt-4 space-y-2">
              <label className="text-[10px] md:text-xs uppercase font-bold text-gray-500 ml-1 tracking-[0.2em]">
                {t('header.titleLabel')}
              </label>
              <input
                type="text"
                value={headerTitle}
                onChange={(e) => updateHeaderTitle(e.target.value)}
                placeholder={t('header.titlePlaceholder')}
                className="w-full max-w-sm px-4 py-2.5 text-[var(--text-primary)] rounded-2xl popup-surface focus:border-blue-500/50 outline-none transition-colors"
              />
            </div>
          )}
          
          <p className="text-gray-500 font-medium uppercase text-[10px] md:text-xs leading-none mt-2 opacity-50 tracking-[0.2em] md:tracking-[0.6em]">
            {now.toLocaleDateString('nn-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {children}
      </div>
    </header>
  );
}
