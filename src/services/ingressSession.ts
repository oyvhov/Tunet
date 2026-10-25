/**
 * Home Assistant's Supervisor answers ingress requests that carry no valid
 * ingress session (for example after a mobile browser drops its session
 * cookie on restart) with a plain-text 401 before they reach the Tunet
 * backend. That says nothing about the stored Home Assistant credentials,
 * so callers must not treat it as an authentication failure. The Tunet
 * backend itself always answers with JSON.
 */
export const isIngressSessionRejection = (res: {
  status: number;
  headers?: { get?: (name: string) => string | null } | null;
}): boolean => {
  if (res.status !== 401) return false;
  const contentType = res.headers?.get?.('content-type');
  return typeof contentType === 'string' && !contentType.toLowerCase().includes('json');
};

export const INGRESS_SESSION_INVALID = 'INGRESS_SESSION_INVALID';
