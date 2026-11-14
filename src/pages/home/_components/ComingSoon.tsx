import { useState, useEffect, useRef } from "react";
import { motion, useAnimation, AnimatePresence } from "motion/react";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { useContactInfo } from "@/hooks/use-contact-info.ts";
const LOGO = "https://hercules-cdn.com/file_hqjYSAKlVBBRqljHrAkEnfVn";
// ── Countdown hook ─────────────────────────────────────────────────────────
function useCountdown(targetIso: string) {
  const calc = () => {
    const diff = new Date(targetIso).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
    return {
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000)  / 60_000),
      seconds: Math.floor((diff % 60_000)     / 1_000),
      done: false,
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return time;
}

// ── Animated digit ─────────────────────────────────────────────────────────
function Digit({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 flex items-center justify-center overflow-hidden shadow-2xl">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={display}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-3xl sm:text-4xl font-bold text-white tabular-nums"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {display}
          </motion.span>
        </AnimatePresence>
        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-2xl" />
      </div>
      <span className="mt-2 text-xs sm:text-sm font-medium text-blue-200 tracking-widest uppercase">{label}</span>
    </div>
  );
}

// ── Floating particle ──────────────────────────────────────────────────────
function Particle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-white/10 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{ y: [0, -30, 0], opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ComingSoon({
  launchDate,
  message,
}: {
  launchDate: string;
  message: string;
}) {
  const countdown = useCountdown(launchDate);
  const contact = useContactInfo();
  const logoControls = useAnimation();
  const hasAnimated = useRef(false);
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const addSubscriber = useMutation(api.inquiries.subscribe);

  // Orchestrated logo animation on mount
  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const run = async () => {
      await logoControls.start({ scale: [0.4, 1.12, 0.96, 1.04, 1], opacity: [0, 1, 1, 1, 1], rotate: [0, 0, 3, -2, 0] }, { duration: 1.1, ease: "easeOut" });
    };
    run().catch(() => null);
  }, [logoControls]);

  const handleSubscribe = async () => {
    if (!email || !email.includes("@")) { toast.error("Enter a valid email address"); return; }
    setSubscribing(true);
    try {
      await addSubscriber({ email });
      toast.success("You're on the list! We'll notify you at launch.");
      setEmail("");
    } catch { toast.error("Subscription failed — please try again"); }
    finally { setSubscribing(false); }
  };

  // Random but stable particles
  const particles = [
    { x: 8,  y: 15, size: 80,  delay: 0   },
    { x: 85, y: 10, size: 120, delay: 1.5 },
    { x: 5,  y: 70, size: 60,  delay: 0.8 },
    { x: 90, y: 65, size: 90,  delay: 2.2 },
    { x: 50, y: 5,  size: 50,  delay: 1.1 },
    { x: 20, y: 88, size: 70,  delay: 3.0 },
    { x: 75, y: 80, size: 45,  delay: 0.4 },
  ];

  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden px-4"
      style={{ background: "linear-gradient(135deg, var(--brand) 0%, #0a2e82 50%, #050d2e 100%)" }}
    >
      {/* ── Background ── */}
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Animated arc rings */}
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-white/5"
          animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} />
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5"
          animate={{ rotate: -360 }} transition={{ duration: 45, repeat: Infinity, ease: "linear" }} />
      </div>

      {/* Floating particles */}
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl w-full">

        {/* Logo */}
        <motion.div animate={logoControls} initial={{ opacity: 0, scale: 0.4 }} className="mb-8">
          <div className="relative">
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 rounded-3xl"
              animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)", filter: "blur(12px)" }}
            />
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-3 border-2 border-white/30">
              <img src={LOGO} alt="Geodata World Services Limited" className="w-full h-full object-contain" />
            </div>
          </div>
        </motion.div>

        {/* Company name */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }}>
          <p className="text-blue-200 text-xs sm:text-sm tracking-[0.3em] uppercase font-medium mb-2">
            Geodata World Services Limited
          </p>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.7 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Something{" "}
          <span className="relative inline-block">
            <span className="relative z-10">Big</span>
            <motion.span
              className="absolute bottom-1 left-0 right-0 h-2 sm:h-3 -z-0 rounded-full opacity-40"
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.6, duration: 0.6, ease: "easeOut" }}
              style={{ background: "rgba(255,255,255,0.5)", transformOrigin: "left" }}
            />
          </span>{" "}
          is Coming
        </motion.h1>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.6 }}
          className="text-blue-100 text-base sm:text-lg leading-relaxed max-w-lg mb-10"
        >
          {message}
        </motion.p>

        {/* ── Countdown ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.7 }}
          className="mb-10 w-full"
        >
          {countdown.done ? (
            <div className="text-2xl font-bold text-white tracking-widest uppercase">
              We are Live!
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 sm:gap-5">
              <Digit value={countdown.days}    label="Days"    />
              <span className="text-white/40 text-3xl font-light mb-6 select-none">:</span>
              <Digit value={countdown.hours}   label="Hours"   />
              <span className="text-white/40 text-3xl font-light mb-6 select-none">:</span>
              <Digit value={countdown.minutes} label="Minutes" />
              <span className="text-white/40 text-3xl font-light mb-6 select-none">:</span>
              <Digit value={countdown.seconds} label="Seconds" />
            </div>
          )}
        </motion.div>

        {/* ── Email subscribe ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.6 }}
          className="w-full max-w-md mb-12"
        >
          <p className="text-blue-200 text-sm mb-3">Get notified the moment we launch</p>
          <div className="flex gap-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { handleSubscribe().catch(() => null); } }}
              placeholder="your@email.com"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 h-11 rounded-xl"
            />
            <Button
              onClick={() => { handleSubscribe().catch(() => null); }}
              disabled={subscribing}
              className="h-11 px-5 bg-white text-[var(--brand)] hover:bg-blue-50 font-semibold rounded-xl shrink-0 cursor-pointer shadow-lg"
            >
              {subscribing ? "…" : <><ArrowRight size={16} /></>}
            </Button>
          </div>
        </motion.div>

        {/* ── Contact strip ── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9, duration: 0.7 }}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-blue-200"
        >
          {contact.primaryPhone && (
            <a href={`tel:${contact.primaryPhone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone size={13} /> {contact.primaryPhone}
            </a>
          )}
          {contact.primaryEmail && (
            <a href={`mailto:${contact.primaryEmail}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail size={13} /> {contact.primaryEmail}
            </a>
          )}
          {contact.offices[0]?.address && (
            <span className="flex items-center gap-1.5">
              <MapPin size={13} /> {contact.offices[0].address}
            </span>
          )}
        </motion.div>
      </div>

      {/* ── Bottom brand strip ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.1, duration: 0.6 }}
        className="absolute bottom-6 left-0 right-0 flex justify-center"
      >
        <p className="text-white/20 text-xs tracking-widest uppercase">
          &copy; {new Date().getFullYear()} Geodata World Services Limited
        </p>
      </motion.div>
    </div>
  );
}
