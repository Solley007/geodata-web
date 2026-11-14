import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useInView } from "motion/react";
import { Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useContactInfo } from "@/hooks/use-contact-info.ts";
import { FacebookLogo, XLogo, InstagramLogo, LinkedinLogo, YoutubeLogo } from "@phosphor-icons/react";

const quickLinks = [
  { label: "About Us", href: "/about" },
  { label: "Properties for Sale", href: "/properties" },
  { label: "News & Blog", href: "/news" },
  { label: "Downloads", href: "/downloads" },
];

const services = [
  { label: "Property Sales", href: "/services" },
  { label: "Estate Development", href: "/services" },
  { label: "Construction", href: "/services" },
  { label: "Land Allocation", href: "/services" },
  { label: "Investment Advisory", href: "/services" },
  { label: "Property Management", href: "/services" },
];

const propertyTypes = [
  { label: "Residential", href: "/properties?type=residential" },
];

// ─── "Stay informed" sign-up (shown once per browser, after 25 seconds) ──────
const STAY_INFORMED_KEY = "gd_stay_informed_seen";

function StayInformedPopup() {
  const subscribe = useMutation(api.inquiries.subscribe);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(STAY_INFORMED_KEY) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    const t = window.setTimeout(() => setOpen(true), 25000);
    return () => window.clearTimeout(t);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(STAY_INFORMED_KEY, "1");
    } catch {
      // storage unavailable, the popup may show again next visit
    }
  };

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await subscribe({ email: email.trim() });
      setDone(true);
      try {
        localStorage.setItem(STAY_INFORMED_KEY, "1");
      } catch {
        // ignore
      }
    } catch {
      toast.error("Subscription failed. Try again.");
    }
  };

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] bg-[#0a1628]/60 flex items-center justify-center p-4" onClick={close}>
      <div className="relative w-full max-w-md bg-[#fafaf7] text-[#0a1628] p-8 md:p-10" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={close} aria-label="Close" className="absolute top-4 right-4 text-[#5c6b7e] hover:text-[#0a1628] text-xl cursor-pointer">&times;</button>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-3">Stay informed</p>
        {done ? (
          <>
            <h3 className="text-3xl font-normal tracking-[-0.02em] mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>You're on the list.</h3>
            <p className="text-sm text-[#5c6b7e] mb-6">We'll email you when there's news from the sites, new releases or price changes.</p>
            <button type="button" onClick={close} className="bg-[#0a1628] text-[#fafaf7] px-6 py-3 uppercase text-xs tracking-[0.15em] cursor-pointer">Close</button>
          </>
        ) : (
          <>
            <h3 className="text-3xl font-normal tracking-[-0.02em] mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Get what matters to you.</h3>
            <p className="text-sm text-[#5c6b7e] mb-6">Site updates from Southern Bridge City, new properties and pricing, and MREIF mortgage news. No spam.</p>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-transparent border-b border-[#e5e0d5] focus:border-[#0a1628] outline-none py-3"
              />
              <button type="submit" className="w-full bg-[#0a1628] hover:bg-[#0f2547] text-[#fafaf7] py-4 uppercase text-xs tracking-[0.15em] font-medium cursor-pointer">Subscribe</button>
            </form>
            <button type="button" onClick={close} className="block mx-auto mt-4 text-xs text-[#5c6b7e] hover:text-[#0a1628] cursor-pointer">No thanks</button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default function Footer() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const subscribe = useMutation(api.inquiries.subscribe);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const contact = useContactInfo();

  const socials = [
{ key: "facebook", Icon: FacebookLogo, href: "https://www.facebook.com/GWCommsNG/" },
    { key: "twitter",   Icon: XLogo,         href: contact.twitter },
{ key: "instagram", Icon: InstagramLogo, href: "https://www.instagram.com/geodataworldservicesltd/" },
    { key: "linkedin",  Icon: LinkedinLogo,  href: contact.linkedin },
{ key: "youtube", Icon: YoutubeLogo, href: "https://www.youtube.com/@geodataworldservicesltd" },
  ];

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await subscribe({ email });
      setSubscribed(true);
      toast.success("Subscribed successfully!");
    } catch {
      toast.error("Subscription failed. Try again.");
    }
  };

  return (
    <footer ref={ref} className="gd-footer bg-[#0a1628] text-white/70">
      {/* Private viewing call to action */}
      <div className="gd-footer-cta border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-16 md:py-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#d44455] mb-4">Schedule a private viewing</p>
            <h3 className="text-4xl md:text-6xl font-normal text-[#fafaf7] leading-[1.05] tracking-[-0.03em]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Visit Southern <em className="italic">Bridge City</em> in person.
            </h3>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center gap-3 self-start md:self-auto bg-[#fafaf7] hover:bg-[#d44455] text-[#0a1628] px-8 py-4 rounded-[2px] uppercase text-xs tracking-[0.15em] font-medium transition-colors"
          >
            Schedule visit <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
      {/* Newsletter Banner */}
      <div className="gd-footer-news border-b border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                Stay Ahead of the Market
              </h3>
              <p className="text-white/60 text-sm">Get the latest listings, market insights, and investment opportunities.</p>
            </div>
            {subscribed ? (
              <div className="flex items-center gap-2 text-white font-medium">
                <CheckCircle size={20} />
                You&apos;re subscribed!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2 w-full md:w-auto">
                <Input
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder-white/60 w-full md:w-64 focus:bg-white/30"
                />
                <Button type="submit" className="bg-white text-[var(--brand)] hover:bg-blue-50 shrink-0 gap-2">
                  <Mail size={15} />
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="pt-16 pb-8"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/media/file_hqjYSAKlVBBRqljHrAkEnfVn.png"
                  alt="Geodata World Services"
                  className="h-10 w-auto"
                />
                <div>
                  <div className="text-white font-bold text-sm leading-tight">GEODATA WORLD</div>
                  <div className="text-gray-400 text-xs">SERVICES LIMITED</div>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                Nigeria&apos;s premier real estate development company. Building dreams, creating wealth, transforming communities since 2007.
              </p>
              <div className="flex gap-3">
                {socials
                  .filter((s) => s.href && s.href !== "#")
                  .map((s) => (
                    <a
                      key={s.key}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[var(--brand)] flex items-center justify-center transition-colors duration-300 text-white cursor-pointer"
                    >
                      <s.Icon size={17} weight="fill" />
                    </a>
                  ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-2.5">
                {quickLinks.map((l) => (
                  <li key={l.label}>
                    <Link to={l.href} className="text-gray-400 text-sm hover:text-[var(--brand)] hover:translate-x-1 transition-all duration-200 inline-block">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Our Services</h4>
              <ul className="space-y-2.5">
                {services.map((l) => (
                  <li key={l.label}>
                    <Link to={l.href} className="text-gray-400 text-sm hover:text-[var(--brand)] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Property Types */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Properties</h4>
              <ul className="space-y-2.5">
                {propertyTypes.map((l) => (
                  <li key={l.label}>
                    <Link to={l.href} className="text-gray-400 text-sm hover:text-[var(--brand)] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <span>
              &copy; {new Date().getFullYear()} Geodata World Services Limited. All rights reserved.
            </span>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-[var(--brand)] transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-[var(--brand)] transition-colors">Terms of Service</Link>
              <Link to="/sitemap" className="hover:text-[var(--brand)] transition-colors">Sitemap</Link>
            </div>
          </div>
        </div>
      </motion.div>
      <StayInformedPopup />
    </footer>
  );
}
