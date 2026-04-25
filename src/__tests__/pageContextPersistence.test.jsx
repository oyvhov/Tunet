import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { PageProvider, usePages } from '../contexts/PageContext';

const wrapper = ({ children }) => <PageProvider>{children}</PageProvider>;

describe('PageContext persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists pagesConfig when setPagesConfig is used directly', async () => {
    const { result } = renderHook(() => usePages(), { wrapper });

    const nextConfig = {
      header: [],
      pages: ['home'],
      home: ['sensor.kitchen', 'sensor.bedroom'],
    };

    act(() => {
      result.current.setPagesConfig(nextConfig);
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('tunet_pages_config') || '{}');
      expect(stored).toEqual(nextConfig);
    });
  });

  it('keeps persistConfig behavior intact', async () => {
    const { result } = renderHook(() => usePages(), { wrapper });

    const nextConfig = {
      header: ['person.me'],
      pages: ['home', 'kitchen'],
      home: ['sensor.home'],
      kitchen: ['light.kitchen'],
    };

    act(() => {
      result.current.persistConfig(nextConfig);
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('tunet_pages_config') || '{}');
      expect(stored).toEqual(nextConfig);
    });
  });

  it('persists status pill text visibility flags across a provider reload', async () => {
    const first = renderHook(() => usePages(), { wrapper });

    const nextPills = [
      {
        id: 'pill-1',
        type: 'conditional',
        entityId: 'sensor.living_room',
        name: '',
        label: '',
        sublabel: '',
        visible: true,
        conditionEnabled: false,
        showLabel: false,
        showSublabel: false,
      },
    ];

    act(() => {
      first.result.current.saveStatusPillsConfig(nextPills);
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('tunet_status_pills_config') || '[]');
      expect(stored[0]).toMatchObject(nextPills[0]);
    });

    first.unmount();

    const second = renderHook(() => usePages(), { wrapper });

    expect(second.result.current.statusPillsConfig[0]).toMatchObject(nextPills[0]);
  });

  it('migrates string-based status pill visibility flags back to booleans on load', () => {
    localStorage.setItem(
      'tunet_status_pills_config',
      JSON.stringify([
        {
          id: 'pill-1',
          type: 'conditional',
          entityId: 'sensor.living_room',
          visible: 'true',
          conditionEnabled: 'false',
          showLabel: 'false',
          showSublabel: 'false',
          clickable: 'false',
          animated: 'true',
          showCover: 'true',
          showCount: 'false',
        },
      ])
    );

    const { result } = renderHook(() => usePages(), { wrapper });

    expect(result.current.statusPillsConfig[0]).toMatchObject({
      visible: true,
      conditionEnabled: false,
      showLabel: false,
      showSublabel: false,
      clickable: false,
      animated: true,
      showCover: true,
      showCount: false,
    });
  });

  it('keeps legacy status pill conditions enabled when conditionEnabled is missing', () => {
    localStorage.setItem(
      'tunet_status_pills_config',
      JSON.stringify([
        {
          id: 'pill-1',
          type: 'conditional',
          entityId: 'sensor.living_room',
          visible: true,
          showLabel: false,
          showSublabel: false,
        },
      ])
    );

    const { result } = renderHook(() => usePages(), { wrapper });

    expect(result.current.statusPillsConfig[0].conditionEnabled).toBeUndefined();
  });
});
