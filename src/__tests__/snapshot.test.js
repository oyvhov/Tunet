import { describe, it, expect, beforeEach, vi } from 'vitest';
import { collectSnapshot, applySnapshot } from '../services/snapshot';

describe('snapshot service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('collectSnapshot includes cardBorderRadius from storage', () => {
    localStorage.setItem('tunet_card_border_radius', '28');

    const snapshot = collectSnapshot();

    expect(snapshot.layout.cardBorderRadius).toBe(28);
  });

  it('collectSnapshot includes card material, density and card scale', () => {
    localStorage.setItem('tunet_card_material', 'solid');
    localStorage.setItem('tunet_density', 'compact');
    localStorage.setItem('tunet_card_scale', '110');

    const { appearance } = collectSnapshot();

    expect(appearance.cardMaterial).toBe('solid');
    expect(appearance.density).toBe('compact');
    expect(appearance.cardScale).toBe(110);
  });

  it('applySnapshot persists and applies card material, density and card scale', () => {
    const setCardMaterial = vi.fn();
    const setDensity = vi.fn();
    const setCardScale = vi.fn();

    applySnapshot(
      {
        version: 1,
        layout: {},
        appearance: { cardMaterial: 'solid', density: 'compact', cardScale: 90 },
      },
      { setCardMaterial, setDensity, setCardScale }
    );

    expect(localStorage.getItem('tunet_card_material')).toBe('solid');
    expect(localStorage.getItem('tunet_density')).toBe('compact');
    expect(localStorage.getItem('tunet_card_scale')).toBe('90');
    expect(setCardMaterial).toHaveBeenCalledWith('solid');
    expect(setDensity).toHaveBeenCalledWith('compact');
    expect(setCardScale).toHaveBeenCalledWith(90);
  });

  it('applySnapshot leaves card style alone for snapshots from before it was saved', () => {
    localStorage.setItem('tunet_card_material', 'solid');
    localStorage.setItem('tunet_density', 'compact');
    localStorage.setItem('tunet_card_scale', '110');
    const setCardMaterial = vi.fn();
    const setDensity = vi.fn();
    const setCardScale = vi.fn();

    applySnapshot(
      { version: 1, layout: {}, appearance: { theme: 'dark' } },
      { setCardMaterial, setDensity, setCardScale }
    );

    expect(localStorage.getItem('tunet_card_material')).toBe('solid');
    expect(localStorage.getItem('tunet_density')).toBe('compact');
    expect(localStorage.getItem('tunet_card_scale')).toBe('110');
    expect(setCardMaterial).not.toHaveBeenCalled();
    expect(setDensity).not.toHaveBeenCalled();
    expect(setCardScale).not.toHaveBeenCalled();
  });

  it('applySnapshot moves a retired Flat theme to Dark', () => {
    const setCurrentTheme = vi.fn();

    applySnapshot({ version: 1, layout: {}, appearance: { theme: 'flat' } }, { setCurrentTheme });

    expect(localStorage.getItem('tunet_theme')).toBe('dark');
    expect(setCurrentTheme).toHaveBeenCalledWith('dark');
  });

  it('applySnapshot keeps the flat cards of a retired Flat theme', () => {
    localStorage.setItem('tunet_card_material', 'glass');
    const setCardMaterial = vi.fn();

    applySnapshot({ version: 1, layout: {}, appearance: { theme: 'flat' } }, { setCardMaterial });

    expect(localStorage.getItem('tunet_card_material')).toBe('flat');
    expect(setCardMaterial).toHaveBeenCalledWith('flat');
  });

  it('applySnapshot persists and applies cardBorderRadius', () => {
    const setCardBorderRadius = vi.fn();

    applySnapshot(
      {
        version: 1,
        layout: { cardBorderRadius: 34 },
        appearance: {},
      },
      { setCardBorderRadius }
    );

    expect(localStorage.getItem('tunet_card_border_radius')).toBe('34');
    expect(setCardBorderRadius).toHaveBeenCalledWith(34);
  });

  it('collectSnapshot includes cards-only mode from storage', () => {
    localStorage.setItem('tunet_cards_only_mode', '1');

    const snapshot = collectSnapshot();

    expect(snapshot.layout.cardsOnlyMode).toBe(true);
  });

  it('applySnapshot persists and applies cards-only mode', () => {
    const updateCardsOnlyMode = vi.fn();

    applySnapshot(
      {
        version: 1,
        layout: { cardsOnlyMode: true },
        appearance: {},
      },
      { updateCardsOnlyMode }
    );

    expect(localStorage.getItem('tunet_cards_only_mode')).toBe('1');
    expect(updateCardsOnlyMode).toHaveBeenCalledWith(true);
  });

  it('collectSnapshot includes card background color from storage', () => {
    localStorage.setItem('tunet_card_bg_color', '#223344');

    const snapshot = collectSnapshot();

    expect(snapshot.appearance.cardBgColor).toBe('#223344');
  });

  it('applySnapshot persists and applies card background color', () => {
    const setCardBgColor = vi.fn();

    applySnapshot(
      {
        version: 1,
        layout: {},
        appearance: { cardBgColor: '#445566' },
      },
      { setCardBgColor }
    );

    expect(localStorage.getItem('tunet_card_bg_color')).toBe('#445566');
    expect(setCardBgColor).toHaveBeenCalledWith('#445566');
  });

  it('collectSnapshot includes app font from storage', () => {
    localStorage.setItem('tunet_app_font', 'Montserrat');

    const snapshot = collectSnapshot();

    expect(snapshot.appearance.appFont).toBe('Montserrat');
  });

  it('applySnapshot persists and applies app font', () => {
    const setAppFont = vi.fn();

    applySnapshot(
      {
        version: 1,
        layout: {},
        appearance: { appFont: 'Inter' },
      },
      { setAppFont }
    );

    expect(localStorage.getItem('tunet_app_font')).toBe('Inter');
    expect(setAppFont).toHaveBeenCalledWith('Inter');
  });

  it('collectSnapshot includes units mode from storage', () => {
    localStorage.setItem('tunet_units_mode', 'imperial');

    const snapshot = collectSnapshot();

    expect(snapshot.appearance.unitsMode).toBe('imperial');
  });

  it('applySnapshot persists and applies units mode', () => {
    const setUnitsMode = vi.fn();

    applySnapshot(
      {
        version: 1,
        layout: {},
        appearance: { unitsMode: 'metric' },
      },
      { setUnitsMode }
    );

    expect(localStorage.getItem('tunet_units_mode')).toBe('metric');
    expect(setUnitsMode).toHaveBeenCalledWith('metric');
  });

  it('collectSnapshot includes the what happens next line, off by default', () => {
    expect(collectSnapshot().appearance.showNextUp).toBe(false);

    localStorage.setItem('tunet_show_next_up', '1');

    expect(collectSnapshot().appearance.showNextUp).toBe(true);
  });

  it('applySnapshot persists and applies the what happens next line', () => {
    const setShowNextUp = vi.fn();

    applySnapshot({ version: 1, layout: {}, appearance: { showNextUp: true } }, { setShowNextUp });

    expect(localStorage.getItem('tunet_show_next_up')).toBe('1');
    expect(setShowNextUp).toHaveBeenCalledWith(true);
  });

  it('applySnapshot leaves the what happens next line alone for older snapshots', () => {
    localStorage.setItem('tunet_show_next_up', '1');
    const setShowNextUp = vi.fn();

    applySnapshot({ version: 1, layout: {}, appearance: { theme: 'dark' } }, { setShowNextUp });

    expect(localStorage.getItem('tunet_show_next_up')).toBe('1');
    expect(setShowNextUp).not.toHaveBeenCalled();
  });

  it('collectSnapshot includes spacer/divider card settings from tunet_card_settings', () => {
    const cardSettings = {
      'home::spacer_card_123': {
        variant: 'divider',
        colSpan: 'full',
        heightPx: 40,
        headingAlign: 'right',
        heading: 'Section',
      },
    };
    localStorage.setItem('tunet_card_settings', JSON.stringify(cardSettings));

    const snapshot = collectSnapshot();

    expect(snapshot.layout.cardSettings).toEqual(cardSettings);
  });

  it('applySnapshot persists and applies spacer/divider card settings', () => {
    const persistCardSettings = vi.fn();
    const cardSettings = {
      'home::spacer_card_123': {
        variant: 'divider',
        colSpan: 'full',
        heightPx: 40,
        headingAlign: 'left',
        heading: 'Section',
      },
    };

    applySnapshot(
      {
        version: 1,
        layout: { cardSettings },
        appearance: {},
      },
      { persistCardSettings }
    );

    expect(JSON.parse(localStorage.getItem('tunet_card_settings') || '{}')).toEqual(cardSettings);
    expect(persistCardSettings).toHaveBeenCalledWith(cardSettings);
  });

  it('syncs the Music Assistant address and clears it when removed', () => {
    localStorage.setItem('tunet_music_assistant_url', 'http://ma.local:8095');
    expect(collectSnapshot().layout.musicAssistantUrl).toBe('http://ma.local:8095');

    applySnapshot({
      version: 1,
      layout: { musicAssistantUrl: 'https://ma.example' },
      appearance: {},
    });
    expect(localStorage.getItem('tunet_music_assistant_url')).toBe('https://ma.example');

    applySnapshot({ version: 1, layout: { musicAssistantUrl: '' }, appearance: {} });
    expect(localStorage.getItem('tunet_music_assistant_url')).toBeNull();

    localStorage.setItem('tunet_music_assistant_url', 'http://kept.local');
    applySnapshot({ version: 1, layout: {}, appearance: {} });
    expect(localStorage.getItem('tunet_music_assistant_url')).toBe('http://kept.local');
  });
});
