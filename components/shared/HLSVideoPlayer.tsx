"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** HLS manifest URL (.m3u8) for adaptive streaming */
  src: string;
  /**
   * Original MP4 URL — rendered as the initial <video src>.
   * The video ALWAYS plays via this. hls.js upgrades to adaptive
   * streaming on top of it when available.
   * Required for reliable playback.
   */
  fallbackSrc: string;
  poster?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
}

/**
 * HLSVideoPlayer
 * ----
 * Strategy: MP4 first, HLS upgrade when possible.
 *
 * The video element always has the MP4 src set — so it ALWAYS plays.
 * hls.js then tries to attach an adaptive HLS stream on top.
 * If HLS fails (plan limit, not transcoded, browser unsupported),
 * hls.js is destroyed, the MP4 src attribute takes over again, and
 * the viewer sees no interruption.
 */
export default function HLSVideoPlayer({
  src,
  fallbackSrc,
  poster,
  controls  = true,
  autoPlay  = false,
  muted     = false,
  loop      = false,
  className = "",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef   = useRef<any>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Destroy any previous hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Nothing to upgrade — already playing MP4 via src attribute
    if (!src.endsWith(".m3u8")) return;

    // Safari / iOS has native HLS — swap to the HLS src directly
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.load();
      return;
    }

    // Chrome / Firefox / Edge — try hls.js for adaptive streaming
    // If it fails for any reason, the MP4 src attribute is still on the
    // element and the browser will use it
    import("hls.js")
      .then(({ default: Hls }) => {
        const v = videoRef.current;
        if (!v || !Hls.isSupported()) return; // component unmounted or no MSE support

        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });

        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            // HLS unavailable (Cloudinary plan, not yet transcoded, network)
            // Destroy and let the MP4 src attribute play
            hls.destroy();
            if (hlsRef.current === hls) hlsRef.current = null;
            const v2 = videoRef.current;
            if (v2) { v2.src = fallbackSrc; v2.load(); }
          }
        });

        hls.loadSource(src);
        hls.attachMedia(v);
        hlsRef.current = hls;
      })
      .catch(() => {
        // hls.js not installed — MP4 already playing, nothing to do
      });

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, fallbackSrc]);

  return (
    <video
      ref={videoRef}
      src={fallbackSrc}   // ← always set — video plays even if JS fails entirely
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
