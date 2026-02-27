import { describe, expect, it, vi } from 'vitest';
import { buildProfilesContextSetters } from '../rendering/profileContextSetters';

describe('buildProfilesContextSetters', () => {
  it('maps all required setter references', () => {
    const refs = {
      persistConfig: vi.fn(),
      persistCardSettings: vi.fn(),
      persistPageSettings: vi.fn(),
      persistCustomNames: vi.fn(),
      persistCustomIcons: vi.fn(),
      persistHiddenCards: vi.fn(),
      saveStatusPillsConfig: vi.fn(),
      setGridColumns: vi.fn(),
      setGridGapH: vi.fn(),
      setGridGapV: vi.fn(),
      setCardBorderRadius: vi.fn(),
      updateHeaderScale: vi.fn(),
      updateHeaderTitle: vi.fn(),
      updateHeaderSettings: vi.fn(),
      updateSectionSpacing: vi.fn(),
      setCurrentTheme: vi.fn(),
      setLanguage: vi.fn(),
      setBgMode: vi.fn(),
      setBgColor: vi.fn(),
      setBgGradient: vi.fn(),
      setBgImage: vi.fn(),
      setCardTransparency: vi.fn(),
      setCardBorderOpacity: vi.fn(),
      setCardBgColor: vi.fn(),
      setInactivityTimeout: vi.fn(),
    };

    const result = buildProfilesContextSetters({
      page: {
        persistConfig: refs.persistConfig,
        persistCardSettings: refs.persistCardSettings,
        persistPageSettings: refs.persistPageSettings,
        persistCustomNames: refs.persistCustomNames,
        persistCustomIcons: refs.persistCustomIcons,
        persistHiddenCards: refs.persistHiddenCards,
        saveStatusPillsConfig: refs.saveStatusPillsConfig,
      },
      layout: {
        setGridColumns: refs.setGridColumns,
        setGridGapH: refs.setGridGapH,
        setGridGapV: refs.setGridGapV,
        setCardBorderRadius: refs.setCardBorderRadius,
        updateHeaderScale: refs.updateHeaderScale,
        updateHeaderTitle: refs.updateHeaderTitle,
        updateHeaderSettings: refs.updateHeaderSettings,
        updateSectionSpacing: refs.updateSectionSpacing,
      },
      appearance: {
        setCurrentTheme: refs.setCurrentTheme,
        setBgMode: refs.setBgMode,
        setBgColor: refs.setBgColor,
        setBgGradient: refs.setBgGradient,
        setBgImage: refs.setBgImage,
        setCardTransparency: refs.setCardTransparency,
        setCardBorderOpacity: refs.setCardBorderOpacity,
        setCardBgColor: refs.setCardBgColor,
        setInactivityTimeout: refs.setInactivityTimeout,
      },
      setLanguage: refs.setLanguage,
    });

    expect(result.persistConfig).toBe(refs.persistConfig);
    expect(result.setGridColumns).toBe(refs.setGridColumns);
    expect(result.setCurrentTheme).toBe(refs.setCurrentTheme);
    expect(result.setLanguage).toBe(refs.setLanguage);
    expect(result.setInactivityTimeout).toBe(refs.setInactivityTimeout);
  });
});
