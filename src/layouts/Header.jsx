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
  children,
  isMobile,
  sectionSpacing
}) {
  const headerBottom = Number.isFinite(sectionSpacing?.statusToNav)
    ? sectionSpacing.statusToNav
    : (isMobile ? 8 : 40);

  const fontWeight = headerSettings?.fontWeight || '300';
  const letterSpacingMap = { tight: '0.05em', normal: '0.2em', wide: '0.5em', extraWide: '0.8em' };
  const letterSpacingMobile = { tight: '0.05em', normal: '0.2em', wide: '0.3em', extraWide: '0.5em' };
  const lsDesktop = letterSpacingMap[headerSettings?.letterSpacing || 'normal'] || '0.2em';
  const lsMobile = letterSpacingMobile[headerSettings?.letterSpacing || 'normal'] || '0.2em';
  const fontStyleVal = headerSettings?.fontStyle || 'normal';
  const clockFormat = headerSettings?.clockFormat || '24h';
  const is12h = clockFormat === '12h';
  const clockScale = headerSettings?.clockScale ?? 1.0;
  const dateScale = headerSettings?.dateScale ?? 1.0;

  const timeOptions = is12h
    ? { hour: 'numeric', minute: '2-digit', hour12: true }
    : { hour: '2-digit', minute: '2-digit', hour12: false };

  const timeStr = now.toLocaleTimeString(is12h ? 'en-US' : 'nn-NO', timeOptions);

  return (
    <header
      className="relative pt-4 md:pt-0 font-sans"
      style={{ marginBottom: `${headerBottom}px` }}
    >
      {editMode && !headerSettings.showTitle && setShowHeaderEditModal && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 edit-controls-anim">
          <button
            onClick={() => setShowHeaderEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all shadow-lg backdrop-blur-md"
          >
            <Edit2 className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest">{t('header.addHeader')}</span>
          </button>
        </div>
      )}

      {/* Main flex: heading (left) & clock (right) aligned at same Y */}
      <div className={`flex justify-between items-start gap-10 leading-none ${isMobile ? 'flex-col items-center text-center' : ''}`}>
        {/* Left column: Heading and Date (same X) */}
        <div className="flex flex-col gap-1">
          <div className={`flex items-center gap-4 ${isMobile ? 'justify-center w-full' : ''}`}>
            {headerSettings.showTitle && (
              <>
                <h1 
                  className={`leading-none select-none ${
                    headerSettings?.headerFont === 'serif' ? 'font-serif' :
                    headerSettings?.headerFont === 'mono' ? 'font-mono' :
                    'font-sans'
                  }`}
                  style={{
                    color: 'var(--text-muted)', 
                    fontSize: `calc(clamp(3rem, 5vw, 3.75rem) * ${headerScale})`,
                    fontWeight: fontWeight,
                    letterSpacing: isMobile ? lsMobile : lsDesktop,
                    fontStyle: fontStyleVal === 'italic' ? 'italic' : 'normal',
                    textTransform: fontStyleVal === 'uppercase' ? 'uppercase' : 'none',
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
              </>
            )}
          </div>
          
          {headerSettings.showDate && !isMobile && (
            <p 
              className="text-gray-500 font-medium uppercase leading-none opacity-50 tracking-[0.2em] md:tracking-[0.6em]"
              style={{ fontSize: `calc(0.75rem * ${dateScale})` }}
            >
              {now.toLocaleDateString('nn-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          )}
        </div>

        {/* Right column: Clock (aligned with heading Y) */}
        {headerSettings.showClock && !isMobile && (
          <h2 
            className="font-light tracking-[0.1em] leading-none select-none" 
            style={{ 
              fontSize: `calc(3.75rem * ${headerScale} * ${clockScale})`, 
              color: 'var(--text-muted)' 
            }}
          >
            {timeStr}
          </h2>
        )}
      </div>

      {/* Children (content below heading & clock) */}
      <div className="flex flex-col gap-6 md:gap-3 w-full pt-6 md:pt-3">
        {children}
      </div>
    </header>
  );
}
