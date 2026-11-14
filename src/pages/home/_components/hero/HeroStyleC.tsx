/**
 * Style C — Vertical Card Stack / Staggered Reveal
 * Active slide is full-height centre-stage. Previous and next slides
 * peek in from the sides at reduced scale/opacity, giving 3D depth.
 * Transitions use perspective tilt + horizontal slide.
 * Inspired by luxury automotive and hospitality brands.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { type Slide, PROPERTY_TYPES, STATES, useReadyMixButtonVisible } from "./shared.ts";
import HeroFxLine from "./HeroFxLine.tsx";

const LOGO = "/media/file_hqjYSAKlVBBRqljHrAkEnfVn.png";

type Props = { slides: Slide[] };

// Direction-aware variants for the main card
const cardVariants = {
  enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", scale: 0.88, rotateY: d > 0 ? 12 : -12, opacity: 0 }),
  center: { x: "0%", scale: 1, rotateY: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", scale: 0.88, rotateY: d > 0 ? -12 : 12, opacity: 0 }),
};

export default function HeroStyleC({ slides }: Props) {
  const [[current, direction], setPage] = useState([0, 1]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("All Types");
  const [searchState, setSearchState] = useState("Select State");
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const showReadyMix = useReadyMixButtonVisible();

  const paginate = useCallback((dir: number) => {
    setPage(([cur]) => [(cur + dir + slides.length) % slides.length, dir]);
  }, [slides.length]);

  const slide = slides[current] ?? slides[0];
  const prevSlide = slides[(current - 1 + slides.length) % slides.length];
  const nextSlide = slides[(current + 1) % slides.length];

  // Image slides: auto-advance every 7s. Video slides: advance on video end.
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (slide.mediaType !== "video") {
      timerRef.current = setInterval(() => paginate(1), 7000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paginate, slide.mediaType]);

  // When slide changes, seek video to start and play
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {/* autoplay blocked */});
    }
  }, [current]);

  useEffect(() => { setPage([0, 1]); }, [slides.length]);

  return (
    <div className="relative h-[88vh] min-h-[580px] max-h-[900px] bg-[#0c1a2e] overflow-hidden" style={{ perspective: "1200px" }}>

      {/* ── Side peek cards (desktop only) ── */}
      {/* Previous */}
      <div className="hidden xl:block absolute left-0 top-0 bottom-0 w-[14%] z-10 overflow-hidden">
        <div className="w-full h-full relative cursor-pointer" onClick={() => paginate(-1)}>
          {prevSlide.mediaType === "video" ? (
            <video src={prevSlide.mediaUrl ?? undefined} autoPlay loop muted playsInline preload="auto" className="w-full h-full object-cover" />
          ) : (
            <img src={prevSlide.mediaUrl ?? undefined} alt={prevSlide.headline} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-[#0c1a2e]/70" />
          <div className="absolute inset-0 flex items-center justify-start pl-4">
            <div className="text-white/60 space-y-1">
              <div className="text-[10px] tracking-widest uppercase opacity-60">{prevSlide.tag}</div>
              <div className="text-sm font-semibold leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>{prevSlide.headline}</div>
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-r from-transparent to-[#0c1a2e]" />
        </div>
      </div>

      {/* Next */}
      <div className="hidden xl:block absolute right-0 top-0 bottom-0 w-[14%] z-10 overflow-hidden">
        <div className="w-full h-full relative cursor-pointer" onClick={() => paginate(1)}>
          {nextSlide.mediaType === "video" ? (
            <video src={nextSlide.mediaUrl ?? undefined} autoPlay loop muted playsInline preload="auto" className="w-full h-full object-cover" />
          ) : (
            <img src={nextSlide.mediaUrl ?? undefined} alt={nextSlide.headline} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-[#0c1a2e]/70" />
          <div className="absolute inset-0 flex items-center justify-end pr-4">
            <div className="text-white/60 space-y-1 text-right">
              <div className="text-[10px] tracking-widest uppercase opacity-60">{nextSlide.tag}</div>
              <div className="text-sm font-semibold leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>{nextSlide.headline}</div>
            </div>
          </div>
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-l from-transparent to-[#0c1a2e]" />
        </div>
      </div>

      {/* ── Main active card ── */}
      <div className="absolute inset-0 xl:inset-x-[14%] z-20 overflow-hidden rounded-none xl:rounded-[2px]">
        <AnimatePresence mode="sync" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
            className="absolute inset-0"
            style={{ transformOrigin: "center center" }}
          >
            {slide.mediaType === "video" ? (
              <video
                ref={videoRef}
                src={slide.mediaUrl ?? undefined}
                autoPlay
                muted
                playsInline
                preload="auto"
                onEnded={() => paginate(1)}
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={slide.mediaUrl ?? undefined} alt={slide.headline} className="w-full h-full object-cover" />
            )}
            {/* Rich gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1a2e] via-[#0c1a2e]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c1a2e]/60 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-8 sm:p-12">

          {/* Top: logo + tag */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={LOGO} alt="Geodata" className="h-9 w-auto rounded-lg" />
              <div>
                <div className="text-white font-bold text-xs leading-tight tracking-wide uppercase">Geodata World</div>
                <div className="text-white/50 text-[9px] leading-tight tracking-widest uppercase">Services Limited</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
            <AnimatePresence mode="wait">
              <motion.span key={`tag-${current}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.35 }}
                className="text-[10px] font-bold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full border border-white/30 text-white/90 backdrop-blur-sm bg-white/10">
                {slide.tag}
              </motion.span>
            </AnimatePresence>
            <HeroFxLine tag={slide.tag} />
            </div>
          </div>

          {/* Centre: big headline */}
          <AnimatePresence mode="wait">
            <motion.div key={`copy-${current}`} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] as const, delay: 0.1 }}
              className="max-w-2xl">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.0] mb-4"
                style={{ fontFamily: "'Playfair Display', serif", textShadow: "0 2px 40px rgba(0,0,0,0.5)" }}>
                {slide.headline}
                <span className="block text-[var(--brand)] italic">{slide.subheadline}</span>
              </h1>
              <p className="text-white/65 text-base leading-relaxed max-w-lg mb-8">{slide.body}</p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white px-8 gap-2 shadow-2xl shadow-blue-900/40 cursor-pointer" asChild>
                  <Link to="/properties">Explore Properties <ArrowUpRight size={15} /></Link>
                </Button>
                <Button size="lg" className="bg-white/10 hover:bg-white/20 text-white border border-white/25 backdrop-blur-sm px-8 cursor-pointer" asChild>
                  <Link to="/contact">Book Inspection</Link>
                </Button>
                {showReadyMix && (
                  <Button size="lg" className="bg-white text-[var(--brand)] hover:bg-blue-50 font-semibold border-0 px-8 gap-2 shadow-xl cursor-pointer" asChild>
                    <Link to="/readymix">Geodata ReadyMix</Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom: search + nav */}
          <div className="space-y-5">
            {/* Search bar — frosted glass */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center max-w-2xl">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MapPin size={15} className="text-white/60 shrink-0" />
                <input type="text" placeholder="Location, estate or keyword..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40 min-w-0" />
              </div>
              <div className="flex gap-2 sm:border-l sm:border-white/20 sm:pl-3">
                <select value={searchType} onChange={(e) => setSearchType(e.target.value)}
                  className="bg-transparent text-white/80 text-xs outline-none cursor-pointer">
                  {PROPERTY_TYPES.map((t) => <option key={t} className="text-gray-900">{t}</option>)}
                </select>
                <select value={searchState} onChange={(e) => setSearchState(e.target.value)}
                  className="bg-transparent text-white/80 text-xs outline-none cursor-pointer">
                  {STATES.map((s) => <option key={s} className="text-gray-900">{s}</option>)}
                </select>
                <button onClick={() => navigate(`/properties?q=${searchQuery}&type=${searchType}&state=${searchState}`)}
                  className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-xs font-semibold px-5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0">
                  <Search size={13} /> Search
                </button>
              </div>
            </div>

            {/* Slide counter + arrows */}
            <div className="flex items-center justify-between max-w-2xl">
              <div className="flex items-center gap-2">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setPage([i, i > current ? 1 : -1])}
                    className={`rounded-full transition-all duration-300 cursor-pointer ${i === current ? "w-8 h-1.5 bg-white" : "w-2 h-1.5 bg-white/30"}`} />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-sm tabular-nums">{String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
                <div className="flex gap-1.5">
                  <button onClick={() => paginate(-1)} className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center text-white hover:bg-white/15 transition-colors backdrop-blur-sm cursor-pointer"><ChevronLeft size={15} /></button>
                  <button onClick={() => paginate(1)} className="w-9 h-9 rounded-full bg-[var(--brand)]/80 hover:bg-[var(--brand)] border border-[var(--brand)] flex items-center justify-center text-white transition-colors cursor-pointer"><ChevronRight size={15} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side arrow hints */}
      <button onClick={() => paginate(-1)} className="hidden xl:flex absolute left-[14%] top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/10 border border-white/20 items-center justify-center text-white hover:bg-white/25 transition-colors backdrop-blur-sm cursor-pointer">
        <ChevronLeft size={18} />
      </button>
      <button onClick={() => paginate(1)} className="hidden xl:flex absolute right-[14%] top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/10 border border-white/20 items-center justify-center text-white hover:bg-white/25 transition-colors backdrop-blur-sm cursor-pointer">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
