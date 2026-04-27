const MODAL_IMPORTERS = {
  addCard: () => import('../modals/AddCardContent'),
  config: () => import('../modals/ConfigModal'),
  editCard: () => import('../modals/EditCardModal'),
  genericClimate: () => import('../modals/GenericClimateModal'),
  headerSidebar: () => import('../components/sidebars/HeaderSidebar'),
  layoutSidebar: () => import('../components/sidebars/LayoutSidebar'),
  light: () => import('../modals/LightModal'),
  media: () => import('../modals/MediaModal'),
  room: () => import('../modals/RoomModal'),
  sensor: () => import('../modals/SensorModal'),
  statusPills: () => import('../modals/StatusPillsConfigModal'),
  themeSidebar: () => import('../components/sidebars/ThemeSidebar'),
  weather: () => import('../modals/WeatherModal'),
};

const LIKELY_MODAL_PREFETCH_ORDER = [
  'light',
  'genericClimate',
  'sensor',
  'media',
  'config',
  'room',
  'weather',
];

const prefetchedKeys = new Set();
const scheduledKeys = new Set();

function requestIdleTask(callback) {
  if (typeof window === 'undefined') return null;

  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(callback, { timeout: 1500 });
  }

  return window.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 900);
}

function cancelIdleTask(handle) {
  if (typeof window === 'undefined' || handle == null) return;

  if (typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
}

export function scheduleModalPrefetch(keys) {
  if (typeof window === 'undefined') return () => {};

  const queue = keys.filter((key) => {
    if (!MODAL_IMPORTERS[key] || prefetchedKeys.has(key) || scheduledKeys.has(key)) return false;
    scheduledKeys.add(key);
    return true;
  });

  if (queue.length === 0) return () => {};

  let cancelled = false;
  let idleHandle = null;
  let activeKey = null;

  const runNext = () => {
    if (cancelled) return;
    const key = queue.shift();
    if (!key) return;
    activeKey = key;

    idleHandle = requestIdleTask((deadline) => {
      idleHandle = null;
      if (cancelled) {
        scheduledKeys.delete(key);
        activeKey = null;
        return;
      }

      if (
        !deadline?.didTimeout &&
        typeof deadline?.timeRemaining === 'function' &&
        deadline.timeRemaining() < 8
      ) {
        queue.unshift(key);
        activeKey = null;
        runNext();
        return;
      }

      MODAL_IMPORTERS[key]()
        .then(() => {
          prefetchedKeys.add(key);
        })
        .catch(() => {})
        .finally(() => {
          scheduledKeys.delete(key);
          activeKey = null;
          runNext();
        });
    });
  };

  runNext();

  return () => {
    cancelled = true;
    cancelIdleTask(idleHandle);
    if (activeKey) scheduledKeys.delete(activeKey);
    queue.forEach((key) => scheduledKeys.delete(key));
  };
}

export function scheduleLikelyModalPrefetch() {
  return scheduleModalPrefetch(LIKELY_MODAL_PREFETCH_ORDER);
}
