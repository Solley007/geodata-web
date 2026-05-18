/**
 * HLSVideoPlayer — adaptive bitrate via hls.js, with native HLS fallback.
 * Priority: hls.js first (since Chrome lies about HLS support with canPlayType="maybe").
 */
"use client";

import { useEffect, useRef } from "react";

interface Props {
  src: string;
  fallbackSrc: string;
  poster?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
}

export default function HLSVideoPlayer({
  src, fallbackSrc, poster,
  controls = true, autoPlay = false, muted = false, loop = false,
  className = "",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!src.endsWith(".m3u8")) {
      video.src = fallbackSrc;
      return;
    }

    let hlsInstance: { destroy: () => void } | null = null;
    let cancelled = false;

    import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;

      if (Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60_000_000,
          startLevel: -1,
          capLevelToPlayerSize: true,
          abrEwmaDefaultEstimate: 500_000,
          enableWorker: true,
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
            case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
            default:
              hls.destroy();
              hlsInstance = null;
              video.src = fallbackSrc;
              break;
          }
        });
        hlsInstance = hls;
        return;
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        return;
      }
      video.src = fallbackSrc;
    }).catch(() => {
      if (cancelled) return;
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else {
        video.src = fallbackSrc;
      }
    });

    return () => {
      cancelled = true;
      hlsInstance?.destroy();
      hlsInstance = null;
    };
  }, [src, fallbackSrc]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline
      preload="metadata"
      className={className}
    />
  );
}