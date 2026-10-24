import { useMemo } from 'react';
import { makeArtwork } from '../lib/artwork';

interface ArtworkProps {
  seed: string;
  variant?: number;
  className?: string;
  alt?: string;
}

export function Artwork({ seed, variant = 0, className, alt = 'Generated abstract artwork' }: ArtworkProps) {
  const src = useMemo(() => makeArtwork(seed, variant), [seed, variant]);
  return <img className={className} src={src} alt={alt} draggable={false} />;
}
