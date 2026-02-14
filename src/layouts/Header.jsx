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
  language,
  children,
  isMobile,
  sectionSpacing
}) {
  const headerBottom = Number.isFinite(sectionSpacing?.statusToNav)
    ? sectionSpacing.statusToNav
    : (isMobile ? 8 : 40);

  const fontWeight = headerSettings?.fontWeight || '300';
  const selectedFontFamily = headerSettings?.fontFamily || headerSettings?.headerFont || 'sans';
  const fontFamilyMap = {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    Inter: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    Roboto: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    Lato: 'Lato, "Helvetica Neue", Arial, sans-serif',
    Montserrat: 'Montserrat, "Helvetica Neue", Arial, sans-serif',
    'Open Sans': '"Open Sans", "Helvetica Neue", Arial, sans-serif',
    Oswald: 'Oswald, "Arial Narrow", Arial, sans-serif',
    'Playfair Display': '"Playfair Display", Georgia, serif',
    Raleway: 'Raleway, "Helvetica Neue", Arial, sans-serif',
    georgia: 'Georgia, serif',
    courier: '"Courier New", monospace',
    trebuchet: '"Trebuchet MS", sans-serif',
    comic: '"Comic Sans MS", cursive',
    times: '"Times New Roman", serif',
    verdana: 'Verdana, sans-serif',
  };
  const resolvedFontFamily = fontFamilyMap[selectedFontFamily] || fontFamilyMap.sans;
  const letterSpacingMap = { tight: '0.05em', normal: '0.2em', wide: '0.5em', extraWide: '0.8em' };
  const letterSpacingMobile = { tight: '0.05em', normal: '0.2em', wide: '0.3em', extraWide: '0.5em' };
  const lsDesktop = letterSpacingMap[headerSettings?.letterSpacing || 'normal'] || '0.2em';
  const lsMobile = letterSpacingMobile[headerSettings?.letterSpacing || 'normal'] || '0.2em';
  const fontStyleVal = headerSettings?.fontStyle || 'normal';
  const clockFormat = headerSettings?.clockFormat || '24h';
  const showClockOnMobile = headerSettings?.showClockOnMobile ?? true;
  const is12h = clockFormat === '12h';
  const clockScale = headerSettings?.clockScale ?? 1.0;
  const dateScale = headerSettings?.dateScale ?? 1.0;
  const locale = language === 'nn' ? 'nn-NO' : 'en-US';

  const timeOptions = is12h
    ? { hour: 'numeric', minute: '2-digit', hour12: true }
    : { hour: '2-digit', minute: '2-digit', hour12: false };

  const timeStr = now.toLocaleTimeString(locale, timeOptions);
  const headingFontSize = `calc(clamp(3rem, 5vw, 3.75rem) * ${headerScale})`;
  const clockFontSize = `calc(clamp(3rem, 5vw, 3.75rem) * ${headerScale} * ${clockScale})`;

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

      {/* Top row: heading (left) and clock (right) aligned only with heading */}
      <div className={`flex justify-between items-start gap-10 leading-none ${isMobile ? 'flex-col items-center text-center' : ''}`}>
        <div className={`flex items-center gap-4 ${isMobile ? 'justify-center w-full' : ''}`}>
          {headerSettings.showTitle && (
            <h1 
              className="leading-none select-none"
              style={{
                color: 'var(--text-muted)', 
                fontSize: headingFontSize,
                fontWeight: fontWeight,
                letterSpacing: isMobile ? lsMobile : lsDesktop,
                fontStyle: fontStyleVal === 'italic' ? 'italic' : 'normal',
                textTransform: fontStyleVal === 'uppercase' ? 'uppercase' : 'none',
                fontFamily: resolvedFontFamily
              }}
            >
              {headerTitle || 'Tunet'}
            </h1>
          )}
        </div>

        {headerSettings.showClock && !isMobile && (
          <h2 
            className="font-light tracking-[0.1em] leading-none select-none" 
            style={{ 
              fontSize: clockFontSize,
              color: 'var(--text-muted)',
              fontFamily: resolvedFontFamily,
            }}
          >
            {timeStr}
          </h2>
        )}

        {headerSettings.showClock && isMobile && showClockOnMobile && (
          <h2
            className="font-light tracking-[0.08em] leading-none select-none"
            style={{
              fontSize: clockFontSize,
              color: 'var(--text-muted)',
              fontFamily: resolvedFontFamily,
            }}
          >
            {timeStr}
          </h2>
        )}
      </div>

      {/* Date row: independent from heading/clock alignment */}
      {headerSettings.showDate && !isMobile && (
        <p 
          className="text-gray-500 font-medium uppercase leading-none opacity-50 tracking-[0.2em] md:tracking-[0.6em] mt-1"
          style={{
            fontSize: `calc(0.75rem * ${dateScale})`,
            fontFamily: resolvedFontFamily,
          }}
        >
          {now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      )}

      {/* Children (content below heading & clock) */}
      <div className="flex flex-col gap-6 md:gap-3 w-full pt-6 md:pt-3">
        {children}
      </div>
    </header>
  );
}
