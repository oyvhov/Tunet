import { APP_FONT_FAMILIES, APP_FONT_OPTIONS } from '../../config/appFonts';

export interface FontGalleryProps {
  current: string;
  onSelect: (font: string) => void;
}

export default function FontGallery({ current, onSelect }: FontGalleryProps) {
  return (
    <div className="sidebar-background-grid">
      {APP_FONT_OPTIONS.map((font) => {
        const active = font === current;
        return (
          <button
            key={font}
            type="button"
            onClick={() => onSelect(font)}
            aria-pressed={active}
            className={`sidebar-background-option ${active ? 'is-active' : ''}`}
          >
            <span
              aria-hidden="true"
              className="sidebar-background-option__preview sidebar-font-preview"
              style={{ fontFamily: APP_FONT_FAMILIES[font] }}
            >
              Aa
            </span>
            <span className="sidebar-background-option__label">
              {font === 'sans' ? 'Sans-serif' : font}
            </span>
          </button>
        );
      })}
    </div>
  );
}
