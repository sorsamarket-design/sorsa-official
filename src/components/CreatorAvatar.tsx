import React from 'react';
import { getInitialsAvatarUrl, normalizeAvatarUrl } from '../lib/avatars';

type CreatorAvatarProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'name'> & {
  src?: string | null;
  name?: string | null;
};

export default function CreatorAvatar({ src, name, alt, className, ...props }: CreatorAvatarProps) {
  const fallback = getInitialsAvatarUrl(name || alt || 'Creator');
  const normalizedSrc = React.useMemo(() => normalizeAvatarUrl(src), [src]);
  const [imageSrc, setImageSrc] = React.useState(normalizedSrc || fallback);
  const retryCountRef = React.useRef(0);
  const retryTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    retryCountRef.current = 0;
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setImageSrc(normalizedSrc || fallback);

    return () => {
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [normalizedSrc, fallback]);

  const retrySrc = React.useCallback((url: string, attempt: number) => {
    try {
      const nextUrl = new URL(url);
      nextUrl.searchParams.set('avatarRetry', String(attempt));
      return nextUrl.toString();
    } catch {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}avatarRetry=${attempt}`;
    }
  }, []);

  const handleError = React.useCallback(() => {
    if (!normalizedSrc || imageSrc === fallback) return;

    if (retryCountRef.current >= 2) {
      setImageSrc(fallback);
      return;
    }

    retryCountRef.current += 1;
    const retryAttempt = retryCountRef.current;
    setImageSrc(fallback);

    retryTimeoutRef.current = window.setTimeout(() => {
      setImageSrc(retrySrc(normalizedSrc, retryAttempt));
    }, retryAttempt * 800);
  }, [fallback, imageSrc, normalizedSrc, retrySrc]);

  const handleLoad = React.useCallback(() => {
    if (imageSrc !== fallback) {
      retryCountRef.current = 0;
    }
  }, [fallback, imageSrc]);

  return (
    <img
      {...props}
      src={imageSrc}
      alt={alt || name || 'Creator'}
      className={className}
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={handleLoad}
    />
  );
}
