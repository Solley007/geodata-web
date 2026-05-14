/**
 * HLSVideoPlayer — no JavaScript, no hls.js, no async loading.
 *
 * Uses native <source> elements:
 *   - Safari / iOS   → plays the .m3u8 HLS source natively (adaptive bitrate)
 *   - All other browsers → skip the HLS source, play the MP4
 *
 * Videos always play. No edge cases. No race conditions.
 */

interface Props {
  src: string;          // HLS .m3u8 URL (or any video URL)
  fallbackSrc: string;  // Original MP4 URL — always works
  poster?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
}

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
  const isHLS = src.endsWith(".m3u8");

  return (
    <video
      poster={poster}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline
      preload="metadata"
      className={className}
    >
      {/* HLS — Safari/iOS plays this natively with adaptive bitrate */}
      {isHLS && (
        <source src={src} type="application/vnd.apple.mpegurl" />
      )}
      {/* MP4 — Chrome, Firefox, Edge all use this */}
      <source src={fallbackSrc} type="video/mp4" />
    </video>
  );
}
