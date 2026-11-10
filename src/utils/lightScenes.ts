export const MAX_LIGHT_SCENES = 3;

const isSceneId = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('scene.') && value.length > 'scene.'.length;

/** Scenes picked for a light card (`cardSettings[key].lightScenes`): scene ids only, at most three. */
export function resolveLightScenes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(isSceneId))).slice(0, MAX_LIGHT_SCENES);
}

export function addLightScene(value: unknown, sceneId: unknown): string[] {
  const current = resolveLightScenes(value);
  if (!isSceneId(sceneId) || current.includes(sceneId) || current.length >= MAX_LIGHT_SCENES) {
    return current;
  }
  return [...current, sceneId];
}

export function removeLightScene(value: unknown, sceneId: string): string[] {
  return resolveLightScenes(value).filter((id) => id !== sceneId);
}
