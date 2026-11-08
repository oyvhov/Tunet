import { Edit2 } from '../icons';
import { getLocaleForLanguage } from '../i18n';
import { useConfig } from '../contexts';
import BatteryBar from '../components/ui/BatteryBar';

const MOBILE_ALIGNMENT_CLASSES = {
  left: {
    container: 'items-start text-left',
    title: 'justify-start',
    date: 'text-left',
  },
  center: {
    container: 'items-center text-center',
    title: 'justify-center',
    date: 'text-center',
  },
  right: {
    container: 'items-end text-right',
    title: 'justify-end',
    date: 'text-right',
  },
};

/**
 * Header component with title, time and edit controls
 * @param {Object} props
 * @param {Date} props.now - Current time
 * @param {string} props.headerTitle - Main title
 * @param {number} props.headerScale - Scale factor for header size
 * @param {boolean} props.editMode - Whether in edit mode
 * @param {Object} [props.headerSettings] - Header visibility settings
 * @param {Function} props.setShowHeaderEditModal - Show header edit modal
 * @param {Function} props.t - Translation function
 * @param {boolean} [props.isMobile] - Whether on mobile viewport
 * @param {import('../types/dashboard.js').SectionSpacing} [props.sectionSpacing] - Section spacing
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
  sectionSpacing,
}) {
  const { language } = useConfig();

  const headerBottom = Number.isFinite(sectionSpacing?.statusToNav)
    ? sectionSpacing.statusToNav
    : isMobile
      ? 8
      : 40;

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
  const letterSpacingMobile = {
    tight: '0.03em',
    normal: '0.08em',
    wide: '0.14em',
    extraWide: '0.2em',
  };
  const lsDesktop = letterSpacingMap[headerSettings?.letterSpacing || 'normal'] || '0.2em';
  const lsMobile = letterSpacingMobile[headerSettings?.letterSpacing || 'normal'] || '0.08em';
  const fontStyleVal = headerSettings?.fontStyle || 'normal';
  const clockFormat = headerSettings?.clockFormat || '24h';
  const showClockOnMobile = headerSettings?.showClockOnMobile ?? true;
  const is12h = clockFormat === '12h';
  const clockScale = headerSettings?.clockScale ?? 1.0;
  const dateScale = headerSettings?.dateScale ?? 1.0;
  const locale = getLocaleForLanguage(language);

  /** @type {Intl.DateTimeFormatOptions} */
  const timeOptions = is12h
    ? { hour: 'numeric', minute: '2-digit', hour12: true }
    : { hour: '2-digit', minute: '2-digit', hour12: false };

  const timeStr = now.toLocaleTimeString(locale, timeOptions);
  const headingFontSize = `calc(${
    isMobile ? 'clamp(2.75rem, 14vw, 3.75rem)' : 'clamp(3rem, 5vw, 3.75rem)'
  } * ${headerScale})`;
  const clockFontSize = `calc(${
    isMobile ? 'clamp(2.4rem, 12vw, 3.25rem)' : 'clamp(3rem, 5vw, 3.75rem)'
  } * ${headerScale} * ${clockScale})`;

  const isBattery = headerSettings?.headerStyle === 'battery';
  const batteryVariant = headerSettings?.batteryVariant || 'glass';
  const showBatteryNub = headerSettings?.showBatteryNub ?? true;
  const mobileAlignment = MOBILE_ALIGNMENT_CLASSES[headerSettings?.mobileAlignment]
    ? headerSettings.mobileAlignment
    : 'center';
  const mobileAlignmentClasses = MOBILE_ALIGNMENT_CLASSES[mobileAlignment];

  const dateStr = now.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const titleStyle = {
    color: 'var(--text-secondary)',
    fontSize: headingFontSize,
    fontWeight: fontWeight,
    letterSpacing: isMobile ? lsMobile : lsDesktop,
    fontStyle: fontStyleVal === 'italic' ? 'italic' : 'normal',
    textTransform: fontStyleVal === 'uppercase' ? 'uppercase' : 'none',
    fontFamily: resolvedFontFamily,
  };

  const clockStyle = {
    fontSize: clockFontSize,
    color: 'var(--text-secondary)',
    fontFamily: resolvedFontFamily,
  };

  const showClock = headerSettings.showClock && (!isMobile || showClockOnMobile);

  // On phones the title and clock share a row; the title shrinks to fit what the clock leaves.
  const titleText = headerTitle || 'Tunet';
  const mobileTitleAndClockInRow = isMobile && headerSettings.showTitle && showClock;
  const mobileRowClockFontSize = `calc(clamp(1.75rem, 8.5vw, 2.5rem) * ${headerScale} * ${clockScale})`;
  const mobileClockReserve = mobileTitleAndClockInRow
    ? ` - ${mobileRowClockFontSize} * 3.1 - 0.75rem`
    : '';
  const mobileTitleCharWidthEm = 0.54 + parseFloat(lsMobile);
  const mobileTitleFontSize = `min(${headingFontSize}, calc((100vw - 2rem${mobileClockReserve}) / ${
    Math.max(1, titleText.length) * mobileTitleCharWidthEm
  }))`;
  const classicTitleStyle = isMobile
    ? { ...titleStyle, fontSize: mobileTitleFontSize }
    : titleStyle;

  // ── Battery layout ──
  if (isBattery) {
    return (
      <header
        className="relative pt-4 font-sans md:pt-0"
        style={{ marginBottom: `${headerBottom}px` }}
      >
        {editMode && !headerSettings.showTitle && setShowHeaderEditModal && (
          <div className="edit-controls-anim absolute top-0 left-1/2 z-50 -translate-x-1/2">
            <button
              onClick={() => setShowHeaderEditModal(true)}
              className="flex items-center gap-2 rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-4 py-2 text-[var(--accent-color)] shadow-lg backdrop-blur-md transition-all hover:bg-[var(--accent-bg)]"
            >
              <Edit2 className="h-4 w-4 animate-pulse" />
              <span className="text-xs font-bold tracking-widest uppercase">
                {t('header.addHeader')}
              </span>
            </button>
          </div>
        )}

        <BatteryBar
          variant={batteryVariant}
          showNub={showBatteryNub}
          isMobile={isMobile}
          className={isMobile ? `battery-bar--align-${mobileAlignment}` : ''}
        >
          {/* Left: Title */}
          {headerSettings.showTitle && (
            <h1 className="leading-none whitespace-nowrap select-none" style={titleStyle}>
              {headerTitle || 'Tunet'}
            </h1>
          )}

          {/* Center: Date */}
          {headerSettings.showDate && !isMobile && (
            <p
              className="leading-none font-medium tracking-[0.2em] text-[var(--text-secondary)] uppercase md:tracking-[0.4em]"
              style={{
                fontSize: `calc(0.75rem * ${dateScale})`,
                fontFamily: resolvedFontFamily,
              }}
            >
              {dateStr}
            </p>
          )}

          {/* Right: Clock */}
          {showClock && (
            <h2
              className="leading-none font-light tracking-[0.1em] whitespace-nowrap select-none"
              style={clockStyle}
            >
              {timeStr}
            </h2>
          )}
        </BatteryBar>

        {/* Mobile date below battery bar */}
        {headerSettings.showDate && isMobile && (
          <p
            className={`mt-2 leading-none font-medium tracking-[0.2em] text-[var(--text-secondary)] uppercase ${mobileAlignmentClasses.date}`}
            style={{
              fontSize: `calc(0.75rem * ${dateScale})`,
              fontFamily: resolvedFontFamily,
            }}
          >
            {dateStr}
          </p>
        )}

        <div className="flex w-full flex-col gap-6 pt-6 md:gap-3 md:pt-3">{children}</div>
      </header>
    );
  }

  // ── Classic layout (default) ──
  return (
    <header
      className="relative pt-4 font-sans md:pt-0"
      style={{ marginBottom: `${headerBottom}px` }}
    >
      {editMode && !headerSettings.showTitle && setShowHeaderEditModal && (
        <div className="edit-controls-anim absolute top-0 left-1/2 z-50 -translate-x-1/2">
          <button
            onClick={() => setShowHeaderEditModal(true)}
            className="flex items-center gap-2 rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-4 py-2 text-[var(--accent-color)] shadow-lg backdrop-blur-md transition-all hover:bg-[var(--accent-bg)]"
          >
            <Edit2 className="h-4 w-4 animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase">
              {t('header.addHeader')}
            </span>
          </button>
        </div>
      )}

      <div
        className={`flex justify-between leading-none ${
          mobileTitleAndClockInRow
            ? 'items-baseline gap-3'
            : isMobile
              ? `flex-col gap-4 ${mobileAlignmentClasses.container}`
              : 'items-start gap-10'
        }`}
      >
        <div
          className={`flex items-center gap-4 ${
            mobileTitleAndClockInRow
              ? 'min-w-0 flex-1'
              : isMobile
                ? `w-full ${mobileAlignmentClasses.title}`
                : ''
          }`}
        >
          {headerSettings.showTitle && (
            <h1
              className={`select-none ${isMobile ? 'min-w-0 truncate leading-[1.15]' : 'leading-none'}`}
              style={classicTitleStyle}
            >
              {titleText}
            </h1>
          )}
        </div>

        {headerSettings.showClock && !isMobile && (
          <h2 className="leading-none font-light tracking-[0.1em] select-none" style={clockStyle}>
            {timeStr}
          </h2>
        )}

        {headerSettings.showClock && isMobile && showClockOnMobile && (
          <h2
            className="shrink-0 leading-none font-light tracking-[0.08em] select-none"
            style={
              mobileTitleAndClockInRow
                ? { ...clockStyle, fontSize: mobileRowClockFontSize }
                : clockStyle
            }
          >
            {timeStr}
          </h2>
        )}
      </div>

      {headerSettings.showDate && !isMobile && (
        <p
          className="mt-1 leading-none font-medium tracking-[0.2em] text-[var(--text-secondary)] uppercase md:tracking-[0.6em]"
          style={{
            fontSize: `calc(0.75rem * ${dateScale})`,
            fontFamily: resolvedFontFamily,
          }}
        >
          {dateStr}
        </p>
      )}

      <div
        className={`flex w-full flex-col ${
          isMobile ? 'gap-4 pt-4' : 'gap-6 pt-6 md:gap-3 md:pt-3'
        }`}
      >
        {children}
      </div>
    </header>
  );
}
