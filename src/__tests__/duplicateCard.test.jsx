import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { PageProvider, usePages } from '../contexts/PageContext';

const wrapper = ({ children }) => <PageProvider>{children}</PageProvider>;

describe('duplicateCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('copies the card into the same page right after the original', async () => {
    const { result } = renderHook(() => usePages(), { wrapper });

    act(() => {
      result.current.persistConfig({
        header: [],
        pages: ['home'],
        home: ['light.kitchen', 'light.living'],
      });
    });

    let newCardId = null;
    act(() => {
      newCardId = result.current.duplicateCard('light.kitchen', 'home');
    });

    expect(newCardId).toBeTruthy();
    expect(newCardId).not.toBe('light.kitchen');

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('tunet_pages_config') || '{}');
      expect(stored.home).toEqual(['light.kitchen', newCardId, 'light.living']);
    });
  });

  it('copies the card settings and remembers the entity for entity cards', async () => {
    const { result } = renderHook(() => usePages(), { wrapper });

    act(() => {
      result.current.persistConfig({ header: [], pages: ['home'], home: ['light.kitchen'] });
      result.current.persistCardSettings({
        'home::light.kitchen': { size: 'small', brightness: 120 },
      });
    });

    let newCardId = null;
    act(() => {
      newCardId = result.current.duplicateCard('light.kitchen', 'home');
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('tunet_card_settings') || '{}');
      const copied = stored[`home::${newCardId}`];
      expect(copied).toBeDefined();
      expect(copied.size).toBe('small');
      expect(copied.brightness).toBe(120);
      expect(copied.entityId).toBe('light.kitchen');
    });
  });

  it('keeps cards that are not entity based pointing at their own settings', async () => {
    const { result } = renderHook(() => usePages(), { wrapper });

    act(() => {
      result.current.persistConfig({ header: [], pages: ['home'], home: ['camera_card_1'] });
      result.current.persistCardSettings({
        'home::camera_card_1': { cameraId: 'camera.front', size: 'large' },
      });
    });

    let newCardId = null;
    act(() => {
      newCardId = result.current.duplicateCard('camera_card_1', 'home');
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('tunet_card_settings') || '{}');
      const copied = stored[`home::${newCardId}`];
      expect(copied.cameraId).toBe('camera.front');
      expect(copied.entityId).toBeUndefined();
    });
  });
  it('keeps nested settings independent and preserves the source when editing a copy', () => {
    const { result } = renderHook(() => usePages(), { wrapper });
    act(() => {
      result.current.persistConfig({ header: [], pages: ['home'], home: ['camera_card_1'] });
      result.current.persistCardSettings({ 'home::camera_card_1': { cameras: ['camera.front'] } });
    });
    let copy;
    act(() => {
      copy = result.current.duplicateCard('camera_card_1');
    });
    const original = result.current.cardSettings['home::camera_card_1'];
    expect(result.current.cardSettings[`home::${copy}`].cameras).not.toBe(original.cameras);
    act(() => {
      result.current.saveCardSetting(`home::${copy}`, 'cameras', ['camera.back']);
    });
    expect(result.current.cardSettings['home::camera_card_1'].cameras).toEqual(['camera.front']);
    expect(result.current.cardSettings[`home::${copy}`].cameras).toEqual(['camera.back']);
  });
});
