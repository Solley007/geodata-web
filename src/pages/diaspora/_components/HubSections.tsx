import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, FileCheck2, FolderDown, Landmark, MapPinned, MessageCircle, Plane, Presentation, ReceiptText, ShieldCheck, Sparkles, Video, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

// AI-generated mood imagery (illustrative scenes, not real clients).
const HERO_IMAGE = "/media/file_4StnID3HrjIm1BNONstnECE0.jpg";
const ABROAD_IMAGE = "/media/file_5COF23cl5HFVzjJjyZXcUowF.jpg";
const HOME_IMAGE = "/media/file_p1p632FXOmDzUcI0qaAkmfAN.jpg";

const DIASPORA_WHATSAPP_URL = "https://wa.me/2347047620492?text=" + encodeURIComponent("Hello Geodata Diaspora Desk, I'd like to know more about Southern Bridge City.");

const CITIES = ["London", "Houston", "Toronto", "Brussels", "Dubai", "Manchester", "Berlin", "Atlanta", "Dublin", "Johannesburg"];

const EASE = [0.22, 1, 0.36, 1] as const;

// Subtle Adire-inspired dot-and-ring texture, layered via CSS gradients.
const ADIRE_PATTERN =
  "bg-[radial-gradient(circle_at_center,rgba(212,160,23,0.18)_1.5px,transparent_2px),radial-gradient(circle_at_center,transparent_9px,rgba(255,255,255,0.06)_10px,transparent_11px)] bg-[length:28px_28px,56px_56px]";

type HeroProps = { headline?: string; subheadline?: string; onFindOpportunity: () => void };

export function DiasporaHero({ headline, subheadline, onFindOpportunity }: HeroProps) {
  return (
    <section className="relative min-h-[620px] lg:min-h-[680px] flex items-center overflow-hidden">
      <motion.img
        src={HERO_IMAGE}
        alt="A Nigerian family abroad viewing their future Abuja home online"
        className="absolute inset-0 w-full h-full object-cover object-[70%_center]"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 8, ease: "easeOut" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#061433]/95 via-[#0a2257]/80 to-[#0a2257]/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#061433]/80 via-transparent to-transparent" />

      <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-10 py-20">
        <div className="max-w-2xl">
          <motion.span
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
            className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-bold tracking-widest uppercase mb-5 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full border border-white/15"
          >
            <Sparkles size={13} /> Geodata Diaspora Desk
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] mb-5 text-balance"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {headline || (<>Own a home in Abuja,<br /><span className="text-amber-300">from anywhere.</span></>)}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
            className="text-blue-100/90 text-base sm:text-lg max-w-xl mb-8"
          >
            {subheadline || "Wherever life has taken you, buy, invest or partner in Southern Bridge City, Idu, guided remotely by Geodata World Services Limited."}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button size="lg" onClick={onFindOpportunity} className="bg-amber-400 hover:bg-amber-300 text-[#061433] font-semibold gap-2 cursor-pointer">
              <Compass size={17} /> Find my opportunity
            </Button>
            <Button size="lg" asChild className="bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold gap-2 cursor-pointer">
              <a href={DIASPORA_WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> Talk to the Diaspora Desk</a>
            </Button>
            <Button size="lg" asChild className="bg-white/10 hover:bg-white/20 text-white border border-white/25 font-semibold gap-2 cursor-pointer">
              <Link to="/diaspora/downloads"><FolderDown size={17} /> Downloads</Link>
            </Button>
          </motion.div>
        </div>
      </div>

      <CityTicker />
    </section>
  );
}

function CityTicker() {
  const loop = [...CITIES, ...CITIES];
  return (
    <div className="absolute bottom-0 inset-x-0 border-t border-white/10 bg-[#061433]/60 backdrop-blur overflow-hidden">
      <motion.div
        className="flex gap-10 py-3 whitespace-nowrap w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 40, ease: "linear", repeat: Infinity }}
      >
        {loop.map((city, i) => (
          <span key={`${city}-${i}`} className="text-xs font-semibold tracking-[0.2em] uppercase text-white/70 flex items-center gap-10">
            {city} <span className="text-amber-300/70">•</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
} as const;

/** "Here and there" — life abroad on one side, the new home on the other, linked by a flight path. */
export function HereAndThere() {
  return (
    <section className="relative py-20 px-6 bg-[#061433] overflow-hidden">
      <div className={`absolute inset-0 opacity-60 ${ADIRE_PATTERN}`} />
      <div className="relative max-w-6xl mx-auto">
        <motion.div {...reveal} transition={{ duration: 0.6, ease: EASE }} className="text-center mb-12">
          <span className="text-amber-300 text-xs font-bold tracking-widest uppercase block mb-3">Here and there</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-balance" style={{ fontFamily: "'Playfair Display', serif" }}>
            Your life abroad. Your home in Nigeria.
          </h2>
          <p className="text-blue-100/80 mt-3 max-w-2xl mx-auto">We handle the distance, so you can build at home without putting life on hold.</p>
        </motion.div>

        <div className="grid md:grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-4">
          <motion.figure {...reveal} transition={{ duration: 0.7, ease: EASE }} className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
            <img src={ABROAD_IMAGE} alt="A Nigerian professional abroad on a video call" className="w-full h-full object-cover" />
            <figcaption className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/80 to-transparent text-white">
              <p className="text-xs uppercase tracking-widest text-amber-300 font-bold">Abroad</p>
              <p className="font-semibold mt-1">Briefings, price schedules and offer letters by video and WhatsApp</p>
            </figcaption>
          </motion.figure>

          <motion.div {...reveal} transition={{ duration: 0.7, delay: 0.15, ease: EASE }} className="flex md:flex-col items-center justify-center gap-2 text-amber-300">
            <span className="hidden md:block h-16 border-l-2 border-dashed border-amber-300/50" />
            <span className="md:hidden w-16 border-t-2 border-dashed border-amber-300/50" />
            <span className="w-12 h-12 rounded-full bg-amber-400 text-[#061433] flex items-center justify-center shadow-lg shadow-amber-400/30">
              <Plane size={20} className="md:rotate-90" />
            </span>
            <span className="hidden md:block h-16 border-l-2 border-dashed border-amber-300/50" />
            <span className="md:hidden w-16 border-t-2 border-dashed border-amber-300/50" />
          </motion.div>

          <motion.figure {...reveal} transition={{ duration: 0.7, delay: 0.25, ease: EASE }} className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
            <img src={HOME_IMAGE} alt="Receiving the keys to a 6-bedroom terrace prototype at Southern Bridge City, Abuja" className="w-full h-full object-cover" />
            <figcaption className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/80 to-transparent text-white">
              <p className="text-xs uppercase tracking-widest text-amber-300 font-bold">Home</p>
              <p className="font-semibold mt-1">Southern Bridge City, Idu, Abuja</p>
            </figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: Video, title: "Remote briefing", text: "A video or WhatsApp call at a time that suits your time zone." },
  { icon: ReceiptText, title: "Price schedule", text: "Full prices, payment routes and what's included, sent to you." },
  { icon: FileCheck2, title: "Offer letter", text: "Review a sample offer letter, then receive yours to sign." },
  { icon: MapPinned, title: "Site inspection", text: "Visit in person, send a representative, or take a live video tour." },
] as const;

export function HowItWorksAbroad() {
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-amber-50/60 to-white">
      <div className="max-w-6xl mx-auto">
        <motion.div {...reveal} transition={{ duration: 0.6, ease: EASE }} className="text-center mb-12">
          <span className="text-[var(--brand)] text-xs font-bold tracking-widest uppercase block mb-3">How it works from abroad</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-balance" style={{ fontFamily: "'Playfair Display', serif" }}>
            Four simple steps, wherever you are
          </h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              {...reveal}
              transition={{ duration: 0.55, delay: i * 0.1, ease: EASE }}
              className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              <span className="absolute top-5 right-5 text-4xl font-bold text-amber-100" style={{ fontFamily: "'Playfair Display', serif" }}>{i + 1}</span>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand)] to-emerald-600 text-white flex items-center justify-center mb-4">
                <step.icon size={21} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1.5">{step.title}</h3>
              <p className="text-sm text-gray-500">{step.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TRUST = [
  { icon: ShieldCheck, title: "Documented title", text: "Clear title documentation for every home." },
  { icon: Landmark, title: "MREIF mortgage route", text: "Mortgage option for qualifying buyers." },
  { icon: Wallet, title: "Instalment plans", text: "Spread payments from a 50% deposit." },
  { icon: Presentation, title: "Meet us in person", text: "Diaspora forums and site visits through the year." },
] as const;

export function TrustStrip() {
  return (
    <section className="py-14 px-6 bg-white border-y border-gray-100">
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
        {TRUST.map((t, i) => (
          <motion.div key={t.title} {...reveal} transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }} className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center"><t.icon size={18} /></div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{t.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function FinalCta({ onFindOpportunity }: { onFindOpportunity: () => void }) {
  return (
    <section className="relative py-20 px-6 bg-gradient-to-br from-[#0a2257] via-[var(--brand)] to-emerald-800 overflow-hidden">
      <div className={`absolute inset-0 opacity-50 ${ADIRE_PATTERN}`} />
      <motion.div {...reveal} transition={{ duration: 0.6, ease: EASE }} className="relative max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-balance mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
          Ready to come home, on your terms?
        </h2>
        <p className="text-blue-100/90 mb-8">Tell us what you're looking for and the Diaspora Desk will reach out within 48 hours.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={onFindOpportunity} className="bg-amber-400 hover:bg-amber-300 text-[#061433] font-semibold gap-2 cursor-pointer">
            Get started <ArrowRight size={17} />
          </Button>
          <Button size="lg" asChild className="bg-white/10 hover:bg-white/20 text-white border border-white/25 gap-2 cursor-pointer">
            <a href={DIASPORA_WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> WhatsApp +234 704 762 0492</a>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
