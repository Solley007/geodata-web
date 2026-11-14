import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink, Phone, Mail, ChevronRight } from "lucide-react";

/**
 * Premium three-column ticker bar.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Nigeria's Premier Real Estate Company  │  [sliding news]  │  📞 | ✉   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * News messages slide vertically in/out between the two static anchors.
 */
export default function TickerBar() {
  const messages = useQuery(api.communications.listActiveTicker, {});
  const [dismissed, setDismissed] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1); // 1 = slide up, -1 = slide down

  useEffect(() => {
    if (!messages || messages.length <= 1) return;
    const id = setInterval(() => {
      setDirection(1);
      setActiveIdx((i) => (i + 1) % messages.length);
    }, 5000);
    return () => clearInterval(id);
  }, [messages]);

  if (dismissed) return null;

  const hasMessages = messages && messages.length > 0;
  const active = hasMessages ? (messages[activeIdx] ?? messages[0]) : null;

  // Pull colours from active message or fall back to brand
  const bg = active?.bgColor ?? "var(--brand)";
  const fg = active?.textColor ?? "#ffffff";

  return (
    <AnimatePresence>
      <motion.div
        key="ticker-bar"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ background: bg, color: fg }}
        className="relative z-50 overflow-hidden"
      >
        {/* Subtle shimmer line at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />

        <div
          className="flex items-center px-4 max-w-[1600px] mx-auto"
          style={{ minHeight: "34px" }}
        >
          {/* ── Left: static brand tagline ── */}
          <div className="hidden md:flex items-center gap-2 shrink-0 pr-4">
            {/* Accent dot */}
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
              style={{ background: "rgba(255,255,255,0.7)" }}
            />
            <span
              className="text-[11px] font-semibold tracking-widest uppercase whitespace-nowrap"
              style={{ color: fg, opacity: 0.85 }}
            >
              Nigeria&apos;s Premier Real Estate Company
            </span>
          </div>

          {/* ── Divider ── */}
          {hasMessages && (
            <div
              className="hidden md:block w-px self-stretch mx-3 shrink-0"
              style={{ background: "rgba(255,255,255,0.2)" }}
            />
          )}

          {/* ── Centre: animated news messages ── */}
          <div className="flex-1 overflow-hidden min-w-0 flex items-center">
            {hasMessages ? (
              <>
                {/* "NEWS" badge */}
                <span
                  className="shrink-0 mr-3 text-[9px] font-black tracking-widest px-2 py-0.5 rounded-sm uppercase"
                  style={{
                    background: "rgba(255,255,255,0.22)",
                    color: fg,
                    letterSpacing: "0.15em",
                  }}
                >
                  NEWS
                </span>

                {/* Sliding message */}
                <div className="flex-1 overflow-hidden relative" style={{ height: "22px" }}>
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={activeIdx}
                      custom={direction}
                      variants={{
                        enter: (d: number) => ({
                          y: d > 0 ? 18 : -18,
                          opacity: 0,
                        }),
                        center: { y: 0, opacity: 1 },
                        exit: (d: number) => ({
                          y: d > 0 ? -18 : 18,
                          opacity: 0,
                        }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 flex items-center gap-2"
                    >
                      <ChevronRight
                        size={12}
                        className="shrink-0 opacity-60"
                        style={{ color: fg }}
                      />
                      <span
                        className="text-[12px] font-medium truncate"
                        style={{ color: fg }}
                      >
                        {active?.text}
                      </span>
                      {active?.link && (
                        <a
                          href={active.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-0.5 text-[11px] underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity"
                          style={{ color: fg }}
                        >
                          {active.linkLabel ?? "Read more"}
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Dot pagination */}
                {messages.length > 1 && (
                  <div className="shrink-0 hidden sm:flex items-center gap-1 ml-3">
                    {messages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setDirection(i > activeIdx ? 1 : -1);
                          setActiveIdx(i);
                        }}
                        className="rounded-full transition-all duration-300 cursor-pointer"
                        style={{
                          width: i === activeIdx ? "16px" : "6px",
                          height: "5px",
                          borderRadius: "3px",
                          background:
                            i === activeIdx
                              ? fg
                              : "rgba(255,255,255,0.35)",
                          transition: "width 0.35s ease, background 0.35s ease",
                        }}
                        aria-label={`Go to message ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              // No messages — show mobile tagline as fallback
              <span
                className="text-[11px] font-semibold tracking-widest uppercase md:hidden"
                style={{ color: fg, opacity: 0.85 }}
              >
                Nigeria&apos;s Premier Real Estate Company
              </span>
            )}
          </div>

          {/* ── Divider ── */}
          <div
            className="hidden sm:block w-px self-stretch mx-3 shrink-0"
            style={{ background: "rgba(255,255,255,0.2)" }}
          />

          {/* ── Right: contact strip ── */}
          <div className="hidden sm:flex items-center gap-3 shrink-0 pl-1">
            <a
              href="tel:+2347047620492"
              className="flex items-center gap-1.5 text-[11px] font-medium opacity-85 hover:opacity-100 transition-opacity whitespace-nowrap"
              style={{ color: fg }}
            >
              <Phone size={11} />
              (+234) 704 762 0492
            </a>
            <span style={{ opacity: 0.3, color: fg }}>|</span>
            <a
              href="mailto:hello@geodata.com.ng"
              className="flex items-center gap-1.5 text-[11px] font-medium opacity-85 hover:opacity-100 transition-opacity whitespace-nowrap"
              style={{ color: fg }}
            >
              <Mail size={11} />
              hello@geodata.com.ng
            </a>
          </div>

          {/* ── Dismiss ── */}
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 ml-3 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
            style={{ color: fg }}
            aria-label="Dismiss banner"
          >
            <X size={13} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
