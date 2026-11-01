import { useMemo } from 'react';
import type { ReactEventHandler } from 'react';

interface SafeImageProps {
  imageUrl?: unknown;
  alt?: string;
  className?: string;
  onError?: ReactEventHandler<HTMLImageElement>;
}

export default function SafeImage({ imageUrl, alt = '', className = '', onError }: SafeImageProps) {
  const safeSrc = useMemo(() => {
    if (typeof imageUrl !== 'string') return null;
    const value = imageUrl.trim();
    if (!value) return null;
    try {
      const parsed = new URL(value, window.location.origin);
      if (!['http:', 'https:'].includes(parsed.protocol)) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }, [imageUrl]);

  if (!safeSrc) return null;

  return <img src={safeSrc} alt={alt} className={className} loading="lazy" onError={onError} />;
}
