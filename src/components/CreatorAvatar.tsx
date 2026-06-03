import React from 'react';
import { getInitialsAvatarUrl, normalizeAvatarUrl } from '../lib/avatars';

type CreatorAvatarProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  name?: string | null;
};

export default function CreatorAvatar({ src, name, alt, className, ...props }: CreatorAvatarProps) {
  const fallback = getInitialsAvatarUrl(name || alt || 'Creator');
  const [imageSrc, setImageSrc] = React.useState(normalizeAvatarUrl(src) || fallback);

  React.useEffect(() => {
    setImageSrc(normalizeAvatarUrl(src) || fallback);
  }, [src, fallback]);

  return (
    <img
      {...props}
      src={imageSrc}
      alt={alt || name || 'Creator'}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setImageSrc(fallback)}
    />
  );
}