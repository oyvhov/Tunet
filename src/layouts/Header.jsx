import { Edit2 } from '../icons';

/**
 * Header component with title, time and edit controls
 * @param {Object} props
 * @param {Date} props.now - Current time
 * @param {string} props.headerTitle - Main title
 * @param {number} props.headerScale - Scale factor for header size
 * @param {boolean} props.editMode - Whether in edit mode
 * @param {Object} props.headerSettings - Header visibility settings
 * @param {Function} props.setShowHeaderEditModal - Show header edit modal
 * @param {Function} props.t - Translation function
 * @param {React.ReactNode} [props.children] - Optional children content
 */
export default function Header({ 
  now, 
  headerTitle, 
  headerScale, 
  editMode,
  headerSettings = { showTitle: true, showClock: true, showDate: true },
  setShowHeaderEditModal,
  t,
  children
}) {
  return (
    <header className="relative mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10 leading-none">
      {editMode && !headerSettings.showTitle && setShowHeaderEditModal && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 edit-controls-anim">
          <button
            onClick={() => setShowHeaderEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all shadow-lg backdrop-blur-md"
          >
            <Edit2 className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">Legg til header</span>
          </button>
        </div>
      )}
      
      {headerSettings.showClock && (
        <>
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
        </>
      )}

      <div className="flex flex-col gap-3 font-sans w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            {headerSettings.showTitle && (
              <>
                <h1 
                  className={`font-light uppercase leading-none select-none tracking-[0.2em] md:tracking-[0.8em] ${
                    headerSettings?.headerFont === 'serif' ? 'font-serif' :
                    headerSettings?.headerFont === 'mono' ? 'font-mono' :
                    'font-sans'
                  }`}
                  style={{
                    color: 'var(--text-muted)', 
                    fontSize: `calc(clamp(3rem, 5vw, 3.75rem) * ${headerScale})`,
                    fontFamily: 
                      headerSettings?.headerFont === 'georgia' ? 'Georgia, serif' :
                      headerSettings?.headerFont === 'courier' ? '"Courier New", monospace' :
                      headerSettings?.headerFont === 'trebuchet' ? '"Trebuchet MS", sans-serif' :
                      headerSettings?.headerFont === 'comic' ? '"Comic Sans MS", cursive' :
                      headerSettings?.headerFont === 'times' ? '"Times New Roman", serif' :
                      headerSettings?.headerFont === 'verdana' ? 'Verdana, sans-serif' :
                      undefined
                  }}
                >
                  {headerTitle || 'Tunet'}
                </h1>
                
                {editMode && setShowHeaderEditModal && (
                  <button
                    onClick={() => setShowHeaderEditModal(true)}
                    className="p-2 rounded-full hover:bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Rediger heading"
                  >
                    <Edit2 className="w-4 h-4 text-blue-400 animate-pulse" />
                  </button>
                )}
              </>
            )}
          </div>
          
          {headerSettings.showDate && (
            <p className="text-gray-500 font-medium uppercase text-[10px] md:text-xs leading-none opacity-50 tracking-[0.2em] md:tracking-[0.6em]">
              {now.toLocaleDateString('nn-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          )}
        </div>

        {children}
      </div>
    </header>
  );
}
