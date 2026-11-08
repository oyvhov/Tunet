import { Sparkles } from '../../icons';

export interface ThemeGalleryProps {
  themes: Record<string, { colors: Record<string, string> }>;
  currentTheme: string;
  onSelect: (key: string) => void;
  t: (key: string) => string;
}

export default function ThemeGallery({ themes, currentTheme, onSelect, t }: ThemeGalleryProps) {
  return (
    <div className="sidebar-background-grid">
      {Object.entries(themes).map(([key, { colors }]) => {
        const active = key === currentTheme;
        const cardStyle = {
          backgroundColor: colors['--card-bg'],
          borderColor: colors['--card-border'],
        };
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={active}
            className={`sidebar-background-option ${active ? 'is-active' : ''}`}
          >
            <span
              aria-hidden="true"
              className="sidebar-background-option__preview sidebar-theme-preview"
              style={{
                background: `linear-gradient(145deg, ${colors['--bg-gradient-from']}, ${colors['--bg-gradient-to']})`,
              }}
            >
              <span className="sidebar-theme-preview__card" style={cardStyle}>
                <span
                  className="sidebar-theme-preview__line"
                  style={{ backgroundColor: colors['--text-primary'] }}
                />
                <span
                  className="sidebar-theme-preview__line sidebar-theme-preview__line--short"
                  style={{ backgroundColor: colors['--text-secondary'] }}
                />
              </span>
              <span className="sidebar-theme-preview__card" style={cardStyle}>
                <span
                  className="sidebar-theme-preview__accent"
                  style={{ backgroundColor: colors['--accent-color'] }}
                />
              </span>
              {key === 'contextual' ? (
                <Sparkles
                  className="sidebar-theme-preview__auto"
                  style={{ color: colors['--text-primary'] }}
                />
              ) : null}
            </span>
            <span className="sidebar-background-option__label">{t(`theme.${key}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
