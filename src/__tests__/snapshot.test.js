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

  it('applySnapshot persists and applies cardBorderRadius', () => {
    const setCardBorderRadius = vi.fn();

    applySnapshot(
      {
        version: 1,
        layout: { cardBorderRadius: 34 },
        appearance: {},
      },
      { setCardBorderRadius },
    );

    expect(localStorage.getItem('tunet_card_border_radius')).toBe('34');
    expect(setCardBorderRadius).toHaveBeenCalledWith(34);
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
      { setCardBgColor },
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
      { setAppFont },
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
      { setUnitsMode },
    );

    expect(localStorage.getItem('tunet_units_mode')).toBe('metric');
    expect(setUnitsMode).toHaveBeenCalledWith('metric');
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
      { persistCardSettings },
    );

    expect(JSON.parse(localStorage.getItem('tunet_card_settings') || '{}')).toEqual(cardSettings);
    expect(persistCardSettings).toHaveBeenCalledWith(cardSettings);
  });
});
