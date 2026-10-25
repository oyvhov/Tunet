import { useId, useState } from 'react';
import { Music } from '../icons';
import {
  normalizeExternalUrl,
  readMusicAssistantUrl,
  writeMusicAssistantUrl,
} from '../utils/externalLinks';
import type { Translate } from '../types/ha';

export default function MusicAssistantUrlField({ t }: { t: Translate }) {
  const id = useId();
  const [value, setValue] = useState(readMusicAssistantUrl);
  const invalid = Boolean(value.trim()) && !normalizeExternalUrl(value);

  return (
    <div className="space-y-3">
      <label
        htmlFor={id}
        className="ml-1 flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase"
      >
        <Music className="h-4 w-4" />
        {t('system.musicAssistantUrl')}
      </label>
      <input
        id={id}
        type="url"
        inputMode="url"
        aria-invalid={invalid}
        aria-describedby={`${id}-hint`}
        className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-[var(--text-primary)] transition-all outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:bg-[var(--glass-bg-hover)]"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          writeMusicAssistantUrl(event.target.value);
        }}
        placeholder="http://homeassistant.local:8095"
      />
      <p
        id={`${id}-hint`}
        className={`ml-1 text-xs ${invalid ? 'text-[var(--status-error-fg)]' : 'text-[var(--text-muted)]'}`}
      >
        {t(invalid ? 'system.musicAssistantUrlInvalid' : 'system.musicAssistantUrlHint')}
      </p>
    </div>
  );
}
