import { useRef, useState, type SyntheticEvent } from 'react';
import { Play } from 'lucide-react';

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

/**
 * A reference clip on a node: the first frame while the pointer is away (with a play icon at the bottom right to say
 * it is a video), and it plays, muted and looping, while the pointer is over it.
 */
export function HoverVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const start = () => {
    const video = ref.current;
    if (!video) return;
    video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const stop = () => {
    const video = ref.current;
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0.1;
    } catch {
      // the first frame is only a nicety
    }
    setPlaying(false);
  };

  return (
    <div className="hover-video" onMouseEnter={start} onMouseLeave={stop}>
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          try {
            event.currentTarget.currentTime = 0.1;
          } catch {
            // see above
          }
        }}
      />
      {!playing && (
        <span className="video-play" aria-label="Video: hover to play" title="Video: hover to play">
          <Play size={11} fill="currentColor" />
        </span>
      )}
    </div>
  );
}
