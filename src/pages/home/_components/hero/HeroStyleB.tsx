/**
 * Style B — Split-Screen Editorial
 * Left: brand-coloured content panel with bold typography.
 * Right: property image with a clip-path wipe transition.
 * Inspired by Sotheby's / high-end architecture magazines.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { type Slide, PROPERTY_TYPES, STATES, useReadyMixButtonVisible } from "./shared.ts";
import HeroFxLine from "./HeroFxLine.tsx";

const LOGO = "/media/file_hqjYSAKlVBBRqljHrAkEnfVn.png";

// Slide-in from right variants for the image panel
const imgVariants = {
  enter: { clipPath: "inset(0 100% 0 0)", opacity: 0 },
  center: { clipPath: "inset(0 0% 0 0)", opacity: 1 },
  exit: { clipPath: "inset(0 0 0 100%)", opacity: 0 },
};

// Staggered text variants
const textVariants = {
  hidden: { opacity: 0, x: -32 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } }),
  exit: { opacity: 0, x: 32 },
};

type Props = { slides: Slide[] };

export default function HeroStyleB({ slides }: Props) {
  const [current, setCurrent] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("All Types");
  const [searchState, setSearchState] = useState("Select State");
  const [searchOpen, setSearchOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // When slide changes, seek video to start and play
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {/* autoplay blocked */});
    }
  }, [current]);

  useEffect(() => { setCurrent(0); }, [slides.length]);

  return (
    <div className="relative flex h-[88vh] min-h-[580px] max-h-[900px] overflow-hidden bg-[var(--brand)]">

      {/* ── MOBILE background image (below lg) ── */}
      <div className="absolute inset-0 lg:hidden">
        <AnimatePresence mode="sync">
          <motion.div
            key={`mob-${current}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0"
          >
            {slide.mediaType === "video" ? (
              <video
                src={slide.mediaUrl ?? undefined}
                autoPlay
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={slide.mediaUrl ?? undefined} alt={slide.headline} className="w-full h-full object-cover" />
            )}
          </motion.div>
        </AnimatePresence>
        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-[var(--brand)]/70" />
      </div>

      {/* ── LEFT: Content panel ── */}
      <div className="relative z-10 flex flex-col justify-between w-full lg:w-[46%] px-8 sm:px-12 lg:px-16 py-10 shrink-0">

        {/* Logo + brand */}
        <div className="flex items-center gap-3">
          <img src={LOGO} alt="Geodata" className="h-10 w-auto rounded-lg" />
          <div>
            <div className="text-white font-bold text-sm leading-tight tracking-wide uppercase">Geodata World</div>
            <div className="text-white/70 text-[10px] leading-tight tracking-widest uppercase">Services Limited</div>
          </div>
        </div>

        {/* Main copy */}
        <AnimatePresence mode="wait">
          <motion.div key={current} className="flex-1 flex flex-col justify-center mt-8 mb-6" initial="hidden" animate="visible" exit="exit">
            {/* Tag */}
            <motion.div custom={0} variants={textVariants}
              className="flex items-center gap-2 mb-6">
              <span className="w-8 h-px bg-white/50" />
              <span className="text-white/70 text-xs font-semibold tracking-[0.2em] uppercase">{slide.tag}</span>
            </motion.div>
            <HeroFxLine tag={slide.tag} className="-mt-3 mb-6" />

            {/* Headline — large stacked serif */}
            <motion.h1 custom={1} variants={textVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}>
              {slide.headline}
            </motion.h1>

            <motion.h2 custom={2} variants={textVariants}
              className="text-lg sm:text-xl text-white/70 font-light mb-5 leading-snug"
              style={{ fontFamily: "'Playfair Display', serif" }}>
              {slide.subheadline}
            </motion.h2>

            <motion.p custom={3} variants={textVariants}
              className="text-white/60 text-sm leading-relaxed mb-8 max-w-sm">
              {slide.body}
            </motion.p>

            <motion.div custom={4} variants={textVariants} className="flex flex-wrap gap-3">
              <Button size="lg" className="bg-white text-[var(--brand)] hover:bg-white/90 font-semibold px-7 gap-2 shadow-lg cursor-pointer" asChild>
                <Link to="/properties">Explore Properties <ArrowRight size={15} /></Link>
              </Button>
              <Button size="lg" className="bg-transparent border border-white/40 text-white hover:bg-white/10 px-7 cursor-pointer" asChild>
                <Link to="/contact">Book Inspection</Link>
              </Button>
              {showReadyMix && (
                <Button size="lg" className="bg-white text-[var(--brand)] hover:bg-blue-50 font-semibold border-0 px-7 gap-2 cursor-pointer shadow-lg" asChild>
                  <Link to="/readymix">Geodata ReadyMix</Link>
                </Button>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom: search toggle + slide counter */}
        <div className="space-y-4">
          {/* Compact search toggle */}
          <button onClick={() => setSearchOpen((o) => !o)}
            className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors cursor-pointer group">
            <Search size={14} />
            <span>Search properties</span>
            <span className="text-white/30 group-hover:text-white/50 transition-colors ml-1">›</span>
          </button>

          <AnimatePresence>
            {searchOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-3 space-y-2 overflow-hidden border border-white/20">
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <MapPin size={13} className="text-white/60 shrink-0" />
                  <input type="text" placeholder="Location or keyword..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40" />
                </div>
                <div className="flex gap-2">
                  <select value={searchType} onChange={(e) => setSearchType(e.target.value)}
                    className="flex-1 bg-white/10 text-white text-xs rounded-lg px-2 py-2 outline-none cursor-pointer">
                    {PROPERTY_TYPES.map((t) => <option key={t} className="text-gray-900">{t}</option>)}
                  </select>
                  <select value={searchState} onChange={(e) => setSearchState(e.target.value)}
                    className="flex-1 bg-white/10 text-white text-xs rounded-lg px-2 py-2 outline-none cursor-pointer">
                    {STATES.map((s) => <option key={s} className="text-gray-900">{s}</option>)}
                  </select>
                  <button onClick={() => navigate(`/properties?q=${searchQuery}&type=${searchType}&state=${searchState}`)}
                    className="bg-white text-[var(--brand)] font-semibold text-xs px-4 py-2 rounded-lg hover:bg-white/90 transition-colors cursor-pointer">
                    Go
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Slide counter + arrows */}
          <div className="flex items-center justify-between pt-2 border-t border-white/15">
            <div className="flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-300 cursor-pointer ${i === current ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/35"}`} />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                {String(current + 1).padStart(2, "0")}
              </span>
              <span className="text-white/40 text-lg">/</span>
              <span className="text-white/40 text-sm">{String(slides.length).padStart(2, "0")}</span>
              <div className="flex gap-1 ml-3">
                <button onClick={prev} className="w-8 h-8 rounded-full border border-white/25 flex items-center justify-center text-white hover:bg-white/15 transition-colors cursor-pointer"><ChevronLeft size={14} /></button>
                <button onClick={next} className="w-8 h-8 rounded-full border border-white/25 flex items-center justify-center text-white hover:bg-white/15 transition-colors cursor-pointer"><ChevronRight size={14} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Image/video panel with clip-path wipe ── */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.div
            key={current}
            variants={imgVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] as const }}
            className="absolute inset-0"
          >
            {slide.mediaType === "video" ? (
              <video
                ref={videoRef}
                src={slide.mediaUrl ?? undefined}
                autoPlay
                muted
                playsInline
                preload="auto"
                onEnded={next}
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={slide.mediaUrl ?? undefined} alt={slide.headline} className="w-full h-full object-cover" />
            )}
            {/* Subtle left-edge fade to blend with content panel */}
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[var(--brand)] to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Floating property stat card */}
        <motion.div
          key={`stat-${current}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="absolute bottom-10 left-8 bg-white/95 backdrop-blur-md rounded-2xl px-5 py-4 shadow-2xl min-w-[180px]"
        >
          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest mb-1">Featured in</div>
          <div className="text-[var(--brand)] font-bold text-base">{slide.tag}</div>
          <div className="text-xs text-gray-400 mt-1 leading-snug max-w-[160px] truncate">{slide.subheadline}</div>
        </motion.div>
      </div>

      {/* Decorative vertical rule */}
      <div className="hidden lg:block absolute left-[46%] top-0 bottom-0 w-px bg-white/10 z-20" />
    </div>
  );
}
