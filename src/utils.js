export const formatRelativeTime = (timestamp, t) => {
  if (!timestamp || timestamp === "unavailable" || timestamp === "unknown" || timestamp === "--") return "--";
  // Fallback t function if not provided
  const translate = t || ((key) => key);
  
  try {
    const past = new Date(timestamp);
    const now = new Date();
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return translate('time.justNow');
    if (diffMins < 60) return translate('time.minutesAgo').replace('{minutes}', diffMins);
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    if (remainingMins === 0) return translate('time.hoursAgo').replace('{hours}', diffHours);
    return translate('time.hoursMinutesAgo').replace('{hours}', diffHours).replace('{minutes}', remainingMins);
  } catch (_e) {
    return translate('time.unknown');
  }
};

export const formatDuration = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const parseMarkdown = (text) => {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>')
    .replace(/\n/g, '<br />');
};

/** Check if an entity belongs to a togglable domain. */
export const isToggleEntity = (id) => {
  const domain = id?.split('.')?.[0];
  const toggleDomains = ['automation', 'switch', 'input_boolean', 'script', 'fan'];
  return toggleDomains.includes(domain);
};
