import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProfiles } from '../hooks/useProfiles';

vi.mock('../services/profileApi', () => ({
  fetchProfiles: vi.fn(),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
}));

vi.mock('../services/snapshot', () => ({
  collectSnapshot: vi.fn(),
  applySnapshot: vi.fn(),
  isValidSnapshot: vi.fn(),
}));

import { fetchProfiles, createProfile, updateProfile } from '../services/profileApi';
import { collectSnapshot, isValidSnapshot } from '../services/snapshot';

describe('useProfiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchProfiles.mockResolvedValue([]);
    collectSnapshot.mockReturnValue({ version: 1, layout: {}, appearance: {} });
    isValidSnapshot.mockReturnValue(true);
  });

  it('saveProfile sends validated snapshot payload and prepends saved profile', async () => {
    const savedProfile = { id: 'p1', name: 'Home', data: { version: 1 } };
    createProfile.mockResolvedValue(savedProfile);

    const { result } = renderHook(() =>
      useProfiles({ haUser: { id: 'user-1' }, contextSetters: {} }),
    );

    await waitFor(() => expect(fetchProfiles).toHaveBeenCalledWith('user-1'));

    await act(async () => {
      await result.current.saveProfile('Home', 'Tablet');
    });

    expect(collectSnapshot).toHaveBeenCalled();
    expect(isValidSnapshot).toHaveBeenCalledWith({ version: 1, layout: {}, appearance: {} });
    expect(createProfile).toHaveBeenCalledWith({
      ha_user_id: 'user-1',
      name: 'Home',
      device_label: 'Tablet',
      data: { version: 1, layout: {}, appearance: {} },
    });
    expect(result.current.profiles[0]).toEqual(savedProfile);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('saveProfile fails fast when snapshot is invalid and does not call API', async () => {
    isValidSnapshot.mockReturnValue(false);

    const { result } = renderHook(() =>
      useProfiles({ haUser: { id: 'user-1' }, contextSetters: {} }),
    );

    await waitFor(() => expect(fetchProfiles).toHaveBeenCalledWith('user-1'));

    let thrownError = null;
    await act(async () => {
      try {
        await result.current.saveProfile('Home');
      } catch (error) {
        thrownError = error;
      }
    });

    expect(thrownError).toBeTruthy();
    expect(thrownError.message).toBe('Invalid snapshot data');

    expect(createProfile).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.error).toBe('Invalid snapshot data');
    });
    expect(result.current.loading).toBe(false);
  });

  it('overwriteProfile validates snapshot before API call', async () => {
    updateProfile.mockResolvedValue({ id: 'p1', name: 'Updated' });

    const { result } = renderHook(() =>
      useProfiles({ haUser: { id: 'user-1' }, contextSetters: {} }),
    );

    await waitFor(() => expect(fetchProfiles).toHaveBeenCalledWith('user-1'));

    await act(async () => {
      await result.current.overwriteProfile('p1', 'Updated');
    });

    expect(isValidSnapshot).toHaveBeenCalled();
    expect(updateProfile).toHaveBeenCalledWith('p1', {
      ha_user_id: 'user-1',
      name: 'Updated',
      data: { version: 1, layout: {}, appearance: {} },
    });
  });
});
