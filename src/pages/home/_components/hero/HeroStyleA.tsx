/**
 * Style A — Full-Screen Cinematic Fade (original, preserved exactly)
 * Fullscreen image/video, dark gradient overlay, centred headline,
 * search bar at bottom, arrow navigation.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, MapPin, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { type Slide, PROPERTY_TYPES, STATES, useReadyMixButtonVisible } from "./shared.ts";
import HeroFxLine from "./HeroFxLine.tsx";

type Props = { slides: Slide[] };

export default function HeroStyleA({ slides }: Props) {
  const [current, setCurrent] = useState(0);
  const [searchType, setSearchType] = useState("All Types");
  const [searchState, setSearchState] = useState("Select State");
  const [searchQuery, setSearchQuery] = useState("");
  const [muted, setMuted] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track muted in a ref so the callback ref below can read the latest value
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const navigate = useNavigate();
  const showReadyMix = useReadyMixButtonVisible();

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);

  const slide = slides[current] ?? slides[0];

  // Image slides: auto-advance every 7s. Video slides: advance on video end.
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (slide.mediaType !== "video") {
      timerRef.current = setInterval(next, 7000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, slide.mediaType]);

  useEffect(() => { setCurrent(0); }, [slides.length]);

  /**
   * Callback ref — called by React the moment the <video> node mounts.
   * Because we key the <video> on `current`, every slide switch unmounts the
   * old element and mounts a fresh one, so this fires reliably on each change.
   */
  const videoCallbackRef = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    el.muted = mutedRef.current;
    el.currentTime = 0;
    el.play().catch(() => { /* autoplay policy — no-op */ });
  }, []); // stable — reads muted via ref

  // When user toggles mute, apply it to the currently-playing video element
  const handleMuteToggle = () => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      // Find the active video element and sync immediately
      const el = document.querySelector<HTMLVideoElement>("video[data-hero]");
      if (el) el.muted = next;
      return next;
    });
  };

  return (
    <div className="relative h-[88vh] min-h-[580px] max-h-[900px] overflow-hidden bg-[#111]">
      {/*
        mode="wait" ensures the old slide fully exits before the new one enters.
        This prevents two video elements existing simultaneously, which caused
        the new video to never receive the ref and therefore never play.
      */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {slide.mediaType === "video" ? (
            <video
              ref={videoCallbackRef}
              key={`video-${current}`}
              data-hero
              src={slide.mediaUrl ?? undefined}
              autoPlay
              muted={muted}
              playsInline
              preload="auto"
              onEnded={next}
              className="w-full h-full object-cover"
            />
          ) : (
            <img src={slide.mediaUrl ?? undefined} alt={slide.headline} width={1920} height={1080} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/85 via-[#0a1628]/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/75 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {slide.mediaType === "video" && (
        <button
          onClick={handleMuteToggle}
          className="absolute top-6 right-6 z-20 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      )}

      <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-10 lg:px-20 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
              className="gd-hero-tag inline-flex items-center gap-3 text-[#c9a961] text-[11px] font-medium tracking-[0.2em] uppercase mb-5 before:content-[''] before:block before:w-8 before:h-px before:bg-[#c9a961]">
              {slide.tag}
            </motion.span>
            <HeroFxLine tag={slide.tag} className="-mt-3 mb-5" />
            <h1 className="gd-hero-title text-[44px] sm:text-6xl lg:text-[88px] font-normal text-[#fafaf7] leading-[1.02] tracking-[-0.03em] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {slide.headline}
            </h1>
            <h2 className="gd-hero-sub text-2xl sm:text-3xl text-[#fafaf7]/85 font-light italic mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
              {slide.subheadline}
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-lg leading-relaxed">{slide.body}</p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="gd-btn-light bg-[#fafaf7] hover:bg-[#c9a961] text-[#0a1628] px-8 rounded-[2px] uppercase text-xs tracking-[0.15em] font-medium cursor-pointer" asChild>
                <Link to="/properties">Explore Properties</Link>
              </Button>
              <Button size="lg" variant="secondary" className="bg-transparent hover:bg-white/10 text-[#fafaf7] border border-[#fafaf7]/40 px-8 rounded-[2px] uppercase text-xs tracking-[0.15em] font-medium cursor-pointer" asChild>
                <Link to="/contact">Book Inspection</Link>
              </Button>
              <Button size="lg" variant="secondary" className="bg-transparent hover:bg-transparent text-[#fafaf7]/80 hover:text-[#c9a961] border-0 px-4 underline-offset-8 hover:underline uppercase text-xs tracking-[0.15em] font-medium cursor-pointer" asChild>
                <Link to="/contact#sales">Contact Sales</Link>
              </Button>
              {showReadyMix && (
                <Button size="lg" className="bg-white text-[var(--brand)] hover:bg-blue-50 font-semibold px-8 gap-2 shadow-xl cursor-pointer" asChild>
                  <Link to="/readymix">Geodata ReadyMix</Link>
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Search bar */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }}
          className="absolute bottom-0 left-0 right-0 mx-auto max-w-7xl px-6 sm:px-10 lg:px-20 pb-10">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="flex items-center gap-2 flex-1 border-r border-gray-200 pr-4">
              <MapPin size={18} className="text-[var(--brand)] shrink-0" />
              <input type="text" placeholder="Location, Estate, or Keyword..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400" />
            </div>
            <select value={searchType} onChange={(e) => setSearchType(e.target.value)} className="text-sm text-gray-700 outline-none bg-transparent border-r border-gray-200 pr-4 cursor-pointer">
              {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={searchState} onChange={(e) => setSearchState(e.target.value)} className="text-sm text-gray-700 outline-none bg-transparent cursor-pointer">
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <Button className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white px-6 rounded-xl gap-2 shrink-0 cursor-pointer"
              onClick={() => navigate(`/properties?q=${searchQuery}&type=${searchType}&state=${searchState}`)}>
              <Search size={16} /> Search
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Indicators + arrows */}
      <div className="absolute bottom-28 right-6 sm:right-10 lg:right-20 z-10 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === current ? "w-8 bg-white" : "w-3 bg-white/40"}`} />
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={prev} className="w-9 h-9 rounded-full border border-white/30 bg-white/10 text-white flex items-center justify-center hover:bg-white/25 transition-colors backdrop-blur-sm cursor-pointer"><ChevronLeft size={16} /></button>
          <button onClick={next} className="w-9 h-9 rounded-full border border-white/30 bg-white/10 text-white flex items-center justify-center hover:bg-white/25 transition-colors backdrop-blur-sm cursor-pointer"><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}
