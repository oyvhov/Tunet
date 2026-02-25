// Timing constants for application behavior

// Entity update intervals
export const ENTITY_UPDATE_INTERVAL = 30000; // 30 seconds - how often to refresh entity data
export const ENTITY_UPDATE_THRESHOLD = 30000; // 30 seconds - threshold for considering entity data stale
export const CLOCK_TICK_INTERVAL = 1000; // 1 second - UI clock refresh cadence

// Media player timeouts
export const MEDIA_TIMEOUT = 120000; // 2 minutes - timeout for inactive media player
export const MEDIA_TICK_INTERVAL = 1000; // 1 second - media player state check interval

// History data fetching
export const INITIAL_FETCH_DELAY = 500; // 500ms - delay before initial history fetch
export const FETCH_STAGGER_BASE = 500; // 500ms - base delay for staggered fetches
export const FETCH_STAGGER_RANDOM = 200; // 200ms - random component for staggered fetches
export const HISTORY_REFRESH_INTERVAL = 300000; // 5 minutes - how often to refresh history data

// Layout breakpoints
export const MOBILE_BREAKPOINT = 480; // px - screen width threshold for mobile layout
