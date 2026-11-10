import { describe, expect, it } from 'vitest';
import {
  MAX_LIGHT_SCENES,
  addLightScene,
  removeLightScene,
  resolveLightScenes,
} from '../utils/lightScenes';

describe('light card scenes', () => {
  it('keeps only scene ids, without duplicates, and at most three', () => {
    expect(
      resolveLightScenes([
        'scene.a',
        'light.desk',
        'scene.a',
        42,
        'scene.',
        'scene.b',
        'scene.c',
        'scene.d',
      ])
    ).toEqual(['scene.a', 'scene.b', 'scene.c']);
    expect(MAX_LIGHT_SCENES).toBe(3);
  });

  it('reads anything that is not a list as no scenes', () => {
    expect(resolveLightScenes(undefined)).toEqual([]);
    expect(resolveLightScenes(null)).toEqual([]);
    expect(resolveLightScenes('scene.a')).toEqual([]);
  });

  it('adds a scene until the limit is reached', () => {
    expect(addLightScene(undefined, 'scene.a')).toEqual(['scene.a']);
    expect(addLightScene(['scene.a'], 'scene.a')).toEqual(['scene.a']);
    expect(addLightScene(['scene.a'], 'light.desk')).toEqual(['scene.a']);
    expect(addLightScene(['scene.a', 'scene.b', 'scene.c'], 'scene.d')).toEqual([
      'scene.a',
      'scene.b',
      'scene.c',
    ]);
  });

  it('removes a scene', () => {
    expect(removeLightScene(['scene.a', 'scene.b'], 'scene.a')).toEqual(['scene.b']);
    expect(removeLightScene(undefined, 'scene.a')).toEqual([]);
  });
});
