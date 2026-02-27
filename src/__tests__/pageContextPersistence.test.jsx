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
});
