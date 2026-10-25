/**
 * When Tunet runs as a Home Assistant add-on panel (Ingress), it is loaded in an
 * iframe on the same origin as the Home Assistant frontend. That frontend exposes
 * its signed-in session as `window.hassConnection`, so Tunet can reuse it instead
 * of asking for a long-lived access token in every browser.
 */
import type { Auth } from 'home-assistant-js-websocket';

type ParentHassConnection = Promise<{ auth?: Auth | null }>;

let cachedAuth: Auth | null = null;

const getParentHassConnection = (): ParentHassConnection | null => {
  try {
    const win = globalThis.window;
    const parent = win?.parent;
    if (!parent || parent === win) return null;
    // Reading a property of a cross-origin parent throws, which also rules it out.
    const candidate = (parent as unknown as { hassConnection?: unknown }).hassConnection;
    return candidate && typeof (candidate as Promise<unknown>).then === 'function'
      ? (candidate as ParentHassConnection)
      : null;
  } catch {
    return null;
  }
};

/** True when the Home Assistant frontend around this Ingress panel can share its session. */
export const hasParentHaSession = (): boolean => getParentHassConnection() !== null;

/** The Home Assistant frontend's auth object, which refreshes its own access token. */
export async function getParentHaAuth(): Promise<Auth | null> {
  const parentConnection = getParentHassConnection();
  if (!parentConnection) return null;
  try {
    const { auth } = await parentConnection;
    cachedAuth = auth || null;
    return cachedAuth;
  } catch {
    return null;
  }
}

/** A current access token from the parent session, refreshed first when expired. */
export async function getParentHaAccessToken(): Promise<string> {
  const auth = await getParentHaAuth();
  if (!auth) return '';
  if (auth.expired) {
    try {
      await auth.refreshAccessToken();
    } catch {
      return '';
    }
  }
  return auth.accessToken || '';
}

/** The last known parent access token, for synchronous callers. */
export const getCachedParentHaAccessToken = (): string => cachedAuth?.accessToken || '';
