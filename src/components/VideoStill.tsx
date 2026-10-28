import type { SyntheticEvent } from 'react';

interface VideoStillProps {
  src: string;
  className?: string;
}

/**
 * Renders the first frame of a video (no autoplay), so reference videos read as
 * still thumbnails instead of silently looping.
 */
export function VideoStill({ src, className }: VideoStillProps) {
  const showFirstFrame = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    try {
      video.currentTime = 0.1;
    } catch {
      // Ignore: some browsers need a frame to be buffered first.
    }
  };

  return (
    <video
      className={className}
      src={src}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={showFirstFrame}
    />
  );
}
