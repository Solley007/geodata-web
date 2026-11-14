import { PROJECTS, projectPath, type ProjectCategory } from "@/pages/track-record/page.tsx";
import { calProps } from "@/pages/home/RealEstateLandingPage.tsx";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist.ts";
import { Menu, X, Phone, Mail, ChevronDown, ChevronRight, UserCircle, LogOut, LayoutDashboard, User, ExternalLink, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { cn } from "@/lib/utils.ts";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { useContactInfo } from "@/hooks/use-contact-info.ts";

// ── Access control hook ────────────────────────────────────────────────────
function useSignInVisible() {
  const raw = useQuery(api.cms.getSiteSettings, { key: "access_control" });
  if (raw === undefined) return true;
  if (raw === null) return true;
  return raw === "true";
}

// ── Enhanced nav hook ──────────────────────────────────────────────────────
function useNavEnhanced() {
  const raw = useQuery(api.cms.getSiteSettings, { key: "nav_enhanced" });
  // Default: false — use existing nav until admin enables the new structure
  if (raw === undefined || raw === null) return false;
  return raw === "true";
}

// ── Diaspora feature-toggle hook ───────────────────────────────────────────
function useDiasporaEnabled() {
  const raw = useQuery(api.cms.getSiteSettings, { key: "feature_diaspora_platform" });
  if (raw === undefined || raw === null) return false;
  return raw === "true";
}

const BASE_NAV_LINKS = [
  { label: "Home", href: "/" },
  {
    label: "Properties",
    href: "/properties",
    children: [
      { label: "All Residences", href: "/properties" },
      { label: "Residential", href: "/properties?type=residential" },
      { label: "Commercial", href: "/properties?type=commercial" },
    ],
  },
  {
    label: "Projects",
    href: "/projects",
    children: [
      { label: "Southern Bridge City", href: "/southern-bridge-city" },
      { label: "Ongoing Projects", href: "/ongoing-projects" },
      { label: "All Projects", href: "/projects" },
      { label: "Gallery", href: "/gallery" },
    ],
  },
  { label: "Services", href: "/services" },
  { label: "Updates", href: "/updates" },
  { label: "MREIF", href: "/mortgage" },
  {
    label: "About",
    href: "/about",
    children: [
      { label: "About Us", href: "/about" },
      { label: "News & Blog", href: "/news" },
      { label: "Downloads", href: "/downloads" },{ label: "Verify Allocation", href: "/verify" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

const ENHANCED_NAV_LINKS = [
  { label: "Home", href: "/" },
  {
    label: "Properties",
    href: "/properties",
    children: [
      { label: "All Residences", href: "/properties" },
      { label: "Residential", href: "/properties?type=residential" },
      { label: "Commercial", href: "/properties?type=commercial" },
    ],
  },
  {
    label: "Projects",
    href: "/projects",
    children: [
      { label: "Southern Bridge City", href: "/southern-bridge-city" },
      { label: "Ongoing Projects", href: "/ongoing-projects" },
      { label: "All Projects", href: "/projects" },
      { label: "Gallery", href: "/gallery" },
    ],
  },
  { label: "Services", href: "/services" },
  { label: "Updates", href: "/updates" },
  { label: "MREIF", href: "/mortgage" },
  {
    label: "About",
    href: "/about",
    children: [
      { label: "About Us", href: "/about" },
      { label: "News & Blog", href: "/news" },
      { label: "Organisational Structure", href: "/org-structure" },
      { label: "Corporate Governance", href: "/corporate-governance" },
      { label: "Downloads", href: "/downloads" },
      { label: "Verify Allocation", href: "/verify" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

// ── Ticker hook ────────────────────────────────────────────────────────────
function useTickerMessages() {
const m = useQuery(api.communications.listActiveTicker, {}); return m ? m.filter((x) => !/payments must be made/i.test(x.text)) : m;
}


// ── Top bar with integrated animated news ticker ───────────────────────────
function TopBar() {
  const contact = useContactInfo();
  const messages = useTickerMessages();
  const [dismissed, setDismissed] = useState(false);
  const [paused, setPaused] = useState(false);

  if (dismissed) return null;

  const hasMessages = messages && messages.length > 0;
  // Roughly scale scroll duration to how much text there is, so it always
  // reads at a comfortable, consistent pace regardless of message count.
  const totalChars = hasMessages ? messages.reduce((sum, m) => sum + m.text.length, 0) : 0;
  const duration = Math.max(18, totalChars * 0.22);

  return (
    <div className="gd-topbar hidden md:block relative bg-gradient-to-r from-[#081a3f] via-[var(--brand)] to-[#081a3f] text-white text-xs overflow-hidden">
      {/* Subtle animated sheen sweeping across the bar for extra polish */}
      <motion.div
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
        animate={{ x: ["-40%", "140%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
      />

      <div className="relative max-w-7xl mx-auto px-6 h-9 flex items-center justify-between gap-4">

        {/* Left: static tagline */}
<div />

        {/* Centre: continuously scrolling news ticker */}
        {hasMessages && (
          <>
            {/* Vertical divider */}
            <div className="w-px self-stretch bg-white/20 shrink-0" />

            <div className="flex-1 flex items-center gap-3 min-w-0">
              {/* Eye-catching pulsing badge */}
              <motion.span
                className="shrink-0 flex items-center gap-1 text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm bg-gradient-to-r from-amber-400 to-red-500 text-[#1a0a00] shadow-[0_0_10px_rgba(251,146,60,0.6)]"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="relative flex h-1.5 w-1.5 rounded-full bg-[#1a0a00]" />
                News
              </motion.span>

              {/* Scrolling marquee */}
              <div
                className="flex-1 relative overflow-hidden"
                style={{ height: "20px" }}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    maskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
                    WebkitMaskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
                  }}
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 flex items-center whitespace-nowrap will-change-transform"
                    animate={paused ? undefined : { x: ["0%", "-50%"] }}
                    transition={{ duration, repeat: Infinity, ease: "linear" }}
                  >
                    {[0, 1].map((copy) => (
                      <div key={copy} className="flex items-center">
                        {messages.map((m, i) => (
                          <span key={`${copy}-${i}`} className="flex items-center gap-2 mx-5 shrink-0">
                            <ChevronRight size={11} className="shrink-0 opacity-60" />
                            <span className="text-[11px] font-semibold whitespace-nowrap">{m.text}</span>
                            {m.link && (
                              <a
                                href={m.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 flex items-center gap-0.5 underline underline-offset-2 opacity-75 hover:opacity-100 transition-opacity whitespace-nowrap"
                              >
                                {m.linkLabel ?? "Read more"}
                                <ExternalLink size={9} />
                              </a>
                            )}
                          </span>
                        ))}
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px self-stretch bg-white/20 shrink-0" />
          </>
        )}

        {/* Right: contact strip */}
        <div className="flex items-center gap-4 shrink-0">
          <a
            href={`tel:${contact.primaryPhone}`}
            className="flex items-center gap-1.5 text-[11px] opacity-85 hover:opacity-100 transition-opacity whitespace-nowrap"
          >
            <Phone size={11} />
            {contact.primaryPhone}
          </a>
          <span className="opacity-30">|</span>
          <a
            href={`mailto:${contact.primaryEmail}`}
            className="flex items-center gap-1.5 text-[11px] opacity-85 hover:opacity-100 transition-opacity whitespace-nowrap"
          >
            <Mail size={11} />
            {contact.primaryEmail}
          </a><span className="opacity-30">|</span><SocialLinks />

          {/* Dismiss */}
          {hasMessages && (
            <button
              onClick={() => setDismissed(true)}
              className="opacity-40 hover:opacity-90 transition-opacity cursor-pointer ml-1"
              aria-label="Dismiss ticker"
            >
              <X size={12} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// navLinks — replaced by BASE_NAV_LINKS / ENHANCED_NAV_LINKS above, selected at runtime

const ADMIN_ROLES = new Set(["super_admin", "admin", "manager", "agent"]);

function AuthMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentUser = useQuery(api.users.getCurrentUser);
  const partnerProfile = useQuery(api.partners.getMyPartnerProfile, {});
  const { signout } = useAuth();
  const navigate = useNavigate();

  const isStaff = currentUser?.role && ADMIN_ROLES.has(currentUser.role);
  // partnerProfile === undefined means still loading — don't resolve destination yet
  const partnerLoading = partnerProfile === undefined;
  const isApprovedPartner = !isStaff && !partnerLoading && partnerProfile?.status === "approved";
  const displayName = currentUser?.name?.split(" ")[0] ?? currentUser?.email?.split("@")[0] ?? "Account";
  const initial = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signout();
    navigate("/");
  };

  // Don't resolve destination until partnerProfile has loaded
  const dashboardLink = isStaff ? "/admin" : partnerLoading ? null : isApprovedPartner ? "/partner" : "/client";
  const dashboardLabel = isStaff ? "Go to Dashboard" : isApprovedPartner ? "Go to Partner Portal" : "Go to My Portal";
  const DashboardIcon = isStaff ? LayoutDashboard : isApprovedPartner ? Handshake : User;

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={() => setMenuOpen(true)}
      onMouseLeave={() => setMenuOpen(false)}
    >
      {/* Prominent button: avatar + name + Dashboard shortcut */}
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand-dark)] transition-colors cursor-pointer shadow-sm">
        {/* Avatar circle */}
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initial}
        </div>
        <span className="text-sm font-medium text-white max-w-[90px] truncate">{displayName}</span>
        <ChevronDown size={12} className={cn("text-white/80 transition-transform duration-200", menuOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden"
          >
            {/* User info header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--brand)] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{currentUser?.name ?? displayName}</div>
                  <div className="text-xs text-gray-400 truncate">{currentUser?.email ?? ""}</div>
                  <div className="text-[10px] text-[var(--brand)] font-medium capitalize mt-0.5">
                    {isApprovedPartner ? "Partner" : (currentUser?.role ?? "client")}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-2 py-1">
              {dashboardLink ? (
                <Link
                  to={dashboardLink}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-xl transition-colors"
                >
                  <DashboardIcon size={14} /> {dashboardLabel}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-white/70 bg-[var(--brand)]/60 rounded-xl cursor-wait">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />
                  Loading portal...
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Saved residences shortlist (desktop nav) ──────────────────────────
// Hidden for now. Set to true to show the shortlist icon again.
const SHOW_SHORTLIST = false;

function ShortlistLink() {
  const { count } = useWishlist();
  return SHOW_SHORTLIST && (
    <Link
      to="/properties/saved"
      title={count ? `${count} saved residence${count === 1 ? "" : "s"}` : "Saved residences"}
      aria-label="Saved residences"
      className="gd-shortlist relative inline-flex items-center justify-center w-9 h-9 text-[#0a1628] hover:text-[#a93340] transition-colors"
    >
      <Heart size={18} strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#a93340] text-white text-[10px] leading-4 text-center">{count}</span>
      )}
    </Link>
  );
}

// ─── Properties mega menu (desktop) ──────────────────────────────────────────
function megaPrice(price: number): string {
  if (price >= 1_000_000_000) return `₦${(price / 1_000_000_000).toFixed(1)}B`;
  if (price >= 1_000_000) return `₦${Math.round(price / 1_000_000)}M`;
  return `₦${price.toLocaleString()}`;
}

function PropertiesMegaMenu({ onNavigate }: { onNavigate: () => void }) {
  const featured = useQuery(api.properties.listFeatured, {});
  const cards = (featured ?? []).slice(0, 2);
  const serif = { fontFamily: "'Fraunces', Georgia, serif" };
  return (
    <div className="absolute top-full -left-40 pt-3 z-50">
      <div className="w-[860px] bg-[#fafaf7] border border-[#e5e0d5] shadow-[0_24px_48px_-24px_rgba(10,22,40,0.25)] grid grid-cols-[1fr_1.4fr] gap-10 p-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#5c6b7e] mb-4">Our developments</p>
          <Link to="/southern-bridge-city" onClick={onNavigate} className="group block py-4 border-b border-[#e5e0d5]">
            <span className="flex items-baseline justify-between gap-4">
              <span className="text-2xl text-[#0a1628] group-hover:text-[#a93340] transition-colors" style={serif}>Southern Bridge City</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#5c6b7e]">Available</span>
            </span>
            <span className="block text-sm text-[#5c6b7e] mt-1">1,850+ residences · 12 typologies · from ₦90M</span>
          </Link>
<Link to="/projects/southern-bridge-estate" onClick={onNavigate} className="group block py-4 border-b border-[#e5e0d5]"><span className="flex items-baseline justify-between gap-4"><span className="text-2xl text-[#0a1628] group-hover:text-[#a93340] transition-colors" style={serif}>Southern Bridge Estate</span><span className="text-[10px] uppercase tracking-[0.2em] text-[#5c6b7e]">Limited</span></span><span className="block text-sm text-[#5c6b7e] mt-1">27 units · 9 still available</span></Link>
          <div className="flex items-center gap-6 mt-6">
            <Link to="/properties" onClick={onNavigate} className="text-xs uppercase tracking-[0.15em] font-medium text-[#0a1628] border-b border-[#0a1628] pb-1 hover:text-[#a93340] hover:border-[#a93340]">
              View all residences &rarr;
            </Link>
            <Link to="/mortgage" onClick={onNavigate} className="text-xs uppercase tracking-[0.15em] text-[#5c6b7e] hover:text-[#a93340]">
              MREIF 9.75%
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {cards.length === 0 &&
            [0, 1].map((i) => <div key={i} className="aspect-[4/5] bg-[#f4f2ec] animate-pulse" />)}
          {cards.map((p) => (
            <Link key={p._id} to={`/properties/${p._id}`} onClick={onNavigate} className="group relative block aspect-[4/5] overflow-hidden bg-[#0a1628]">
              {p.featuredImage && (
                <img src={p.featuredImage} alt={p.title} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/90 via-[#0a1628]/20 to-transparent" />
              <span className="absolute left-4 right-4 bottom-4 text-[#fafaf7]">
                <span className="block text-[10px] uppercase tracking-[0.2em] text-[#fafaf7]/70 mb-1 truncate">{p.location}</span>
                <span className="block text-lg leading-tight" style={serif}>{p.title}</span>
                <span className="block text-sm text-[#d44455] mt-1">From {megaPrice(p.price)}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// Projects mega menu: every project, grouped by category
const PROJECT_MENU_COLUMNS: ProjectCategory[][] = [
  ["Residential", "Commercial"],
  ["Federal Government", "State Government", "World Bank"],
];

function ProjectsMegaMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="absolute top-full -left-72 pt-3 z-50">
      <div className="w-[min(1040px,92vw)] bg-bone border border-hairline shadow-[0_24px_48px_-24px_rgba(15,37,71,0.18)] grid grid-cols-12 gap-10 p-10">
        <div className="col-span-9 grid grid-cols-2 gap-x-10">
          {PROJECT_MENU_COLUMNS.map((cats, ci) => (
            <div key={ci} className="space-y-8">
              {cats.map((category) => {
const base = PROJECTS.filter((p) => p.category === category && !p.hideFromNav); const items = base.filter((p) => p.slug !== "southern-bridge-estate"); const sbe = base.find((p) => p.slug === "southern-bridge-estate"); if (sbe) items.splice(1, 0, sbe);
                if (items.length === 0) return null;
                return (
                  <div key={category}>
                    <p className="eyebrow !text-ink-faint mb-3">{category}</p>
                    <ul className="space-y-1">
                      {items.map((p) => (
                        <li key={p.slug}>
                          <Link
                            to={projectPath(p.slug)}
                            onClick={onNavigate}
                            className="group flex items-center justify-between py-2.5 border-b border-hairline hover:border-navy-900 transition-colors duration-300"
                          >
                            <span className="text-navy-950 text-sm font-medium inline-block transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-coral-dark">
                              {p.name}
                            </span>
                            {p.status === "Ongoing" && (
                              <span className="flex items-center gap-1 text-[10px] uppercase tracking-eyebrow text-coral-dark shrink-0 ml-3">
                                <span className="block h-1 w-1 rounded-full bg-coral animate-pulse" />
                                Live
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="col-span-3 flex flex-col justify-between">
          <div>
            <p className="eyebrow mb-4">Portfolio</p>
            <p className="text-sm text-ink leading-relaxed">
              18 years of residential, commercial, institutional, and infrastructure work across Nigeria.
            </p>
          </div>
          <div className="mt-8">
            <Link
              to="/projects"
              onClick={onNavigate}
              className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 hover:text-coral-dark transition-colors duration-400 pb-1 border-b border-navy-900 hover:border-coral-dark"
            >
              View all projects <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile drawer: full-height slide-in panel, ported from the Vercel site ───
const DRAWER_DEVELOPMENTS = [
  { href: "/southern-bridge-city", name: "Southern Bridge City", status: "Available" },
  { href: "/projects/southern-bridge-estate", name: "Southern Bridge Estate", status: "Limited" },

];

const DRAWER_UNITS = [
  { label: "5 Bedroom Semi-Detached", sub: "From ₦220M" },
  { label: "6 Bedroom Terrace Duplex", sub: "From ₦220M" },
  { label: "4 Bedroom Semi-Detached", sub: "From ₦180M" },
  { label: "4 Bedroom Terrace Duplex", sub: "From ₦150M" },
  { label: "4 Bedroom Block of Flats", sub: "From ₦130M" },
  { label: "2 Bedroom Block of Flats", sub: "From ₦90M" },
];

const DRAWER_CATEGORIES: ProjectCategory[] = ["Residential", "Commercial", "Federal Government", "State Government", "World Bank"];

const drawerRow =
  "w-full flex items-center justify-between py-4 font-display text-3xl text-navy-950 hover:text-coral-dark transition-colors duration-300";

function MobileDrawer({ open, onClose, children }: { open: boolean; onClose: () => void; children?: React.ReactNode }) {
  const [expanded, setExpanded] = useState<"properties" | "projects" | null>(null);
  const rows = useQuery(api.properties.listLatest, { limit: 50 });

  useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggle = (s: "properties" | "projects") => setExpanded((p) => (p === s ? null : s));

  const unitKey = (n: string) =>
    ((n.match(/(\d+)[\s-]*bed/i) || [])[1] || "") + (/semi/i.test(n) ? "semi" : /terrace/i.test(n) ? "terrace" : /flat/i.test(n) ? "flat" : "x");
  const unitLink = (name: string) => {
    const hit = ((rows ?? []) as { _id: string; title?: string }[]).find((p) => unitKey(p.title ?? "") === unitKey(name));
    return hit ? `/properties/${hit._id}` : "/properties";
  };

  const flat = (to: string, label: string) => (
    <li className="border-b border-hairline">
      <Link to={to} onClick={onClose} className={`block ${drawerRow}`}>
        {label}
      </Link>
    </li>
  );

  const chev = (active: boolean) => (
    <span aria-hidden className={cn("text-base text-ink-faint transition-transform duration-300", active && "rotate-180")}>
      ▾
    </span>
  );

  return (
    <div className="lg:hidden" data-v2>
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "fixed inset-0 z-[70] bg-navy-950/40 backdrop-blur-sm transition-opacity duration-500",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label="Site navigation"
        className={cn(
          "fixed inset-y-0 right-0 z-[80] w-full max-w-md bg-bone shadow-2xl transition-transform duration-500 flex flex-col",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-8 h-20 border-b border-hairline shrink-0">
          <Link to="/" onClick={onClose} className="flex items-center gap-2.5 text-navy-900">
            <img src="/media/file_o2fBFolF2Qj4CQwJJxVgli1T.png" alt="Geodata World Services" className="h-10 w-auto shrink-0" />
            
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="text-navy-900 text-3xl leading-none p-2 -m-2 hover:text-coral-dark transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-8 py-6">
          <ul>
            {flat("/", "Home")}

            <li className="border-b border-hairline">
              <button type="button" onClick={() => toggle("properties")} aria-expanded={expanded === "properties"} className={`${drawerRow} cursor-pointer`}>
                Properties
                {chev(expanded === "properties")}
              </button>
              {expanded === "properties" && (
                <div className="pb-6 space-y-6">
                  <div>
                    <p className="eyebrow !text-ink-faint mb-3">Developments</p>
                    <ul>
                      {DRAWER_DEVELOPMENTS.map((d) => (
                        <li key={d.href}>
                          <Link
                            to={d.href}
                            onClick={onClose}
                            className="flex items-center justify-between py-3 border-b border-hairline text-navy-900 hover:text-coral-dark transition-colors duration-300"
                          >
                            <span className="font-medium text-base">{d.name}</span>
                            <span className={cn("text-[10px] uppercase tracking-eyebrow shrink-0 ml-3", d.status === "Limited" ? "text-coral-dark" : "text-navy-900")}>
                              {d.status}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="eyebrow !text-ink-faint mb-3">Southern Bridge City</p>
                    <ul>
                      {DRAWER_UNITS.map((u) => (
                        <li key={u.label}>
                          <Link
                            to={unitLink(u.label)}
                            onClick={onClose}
                            className="flex items-baseline justify-between py-3 border-b border-hairline text-navy-900 hover:text-coral-dark transition-colors duration-300"
                          >
                            <span className="font-medium text-base">{u.label}</span>
                            <span className="text-xs text-ink-faint shrink-0 ml-3">{u.sub}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    to="/properties"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 hover:text-coral-dark transition-colors duration-400 pb-1 border-b border-navy-900 hover:border-coral-dark"
                  >
                    View all available units →
                  </Link>
                </div>
              )}
            </li>

            <li className="border-b border-hairline">
              <button type="button" onClick={() => toggle("projects")} aria-expanded={expanded === "projects"} className={`${drawerRow} cursor-pointer`}>
                Projects
                {chev(expanded === "projects")}
              </button>
              {expanded === "projects" && (
                <div className="pb-6 space-y-5">
                  {DRAWER_CATEGORIES.map((cat) => {
const base = PROJECTS.filter((p) => p.category === cat && !p.hideFromNav); const items = base.filter((p) => p.slug !== "southern-bridge-estate"); const sbe = base.find((p) => p.slug === "southern-bridge-estate"); if (sbe) items.splice(1, 0, sbe);
                    if (items.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="eyebrow !text-ink-faint mb-2">{cat}</p>
                        <ul>
                          {items.map((p) => (
                            <li key={p.slug}>
                              <Link
                                to={projectPath(p.slug)}
                                onClick={onClose}
                                className="flex items-center justify-between py-2.5 border-b border-hairline text-navy-900 hover:text-coral-dark transition-colors duration-300"
                              >
                                <span className="text-sm font-medium">{p.name}</span>
                                {p.status === "Ongoing" && (
                                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-eyebrow text-coral-dark shrink-0 ml-3">
                                    <span className="block h-1 w-1 rounded-full bg-coral" />
                                    Live
                                  </span>
                                )}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  <Link
                    to="/projects"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 hover:text-coral-dark transition-colors duration-400 pb-1 border-b border-navy-900 hover:border-coral-dark"
                  >
                    View full portfolio →
                  </Link><Link to="/gallery" onClick={onClose} className="ml-6 inline-flex items-center gap-2 text-sm font-medium text-navy-900 hover:text-coral-dark transition-colors pb-1 border-b border-navy-900">Gallery →</Link>
                </div>
              )}
            </li>

{flat("/services", "Services")}{flat("/mortgage", "MREIF Mortgage")}{[["About", [["/about", "About Us"], ["/org-structure", "Organisational Structure"], ["/corporate-governance", "Corporate Governance"], ["/verify", "Verify Allocation"]]], ["More", [["/updates", "Updates"], ["/news", "News & Blog"], ["/downloads", "Downloads"], ["/diaspora", "Diaspora"]]]].map(([title, items]) => (<li key={title as string} className="border-b border-hairline"><details className="group"><summary className={`${drawerRow} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>{title as string}<span className="text-base text-ink-faint transition-transform duration-300 group-open:rotate-180">▾</span></summary><ul className="pb-6">{(items as string[][]).map(([h, l]) => (<li key={h}><Link to={h} onClick={onClose} className="block py-3 border-b border-hairline text-base text-navy-900 hover:text-coral-dark transition-colors">{l}</Link></li>))}</ul></details></li>))}{flat("/contact", "Contact")}
          </ul>
        </nav>

        <div className="border-t border-hairline px-8 py-8 shrink-0">
          {children && <div className="mb-4 flex flex-col gap-2">{children}</div>}
          <button
            type="button"
            {...calProps}
            onClick={onClose}
            className="flex items-center justify-center gap-3 w-full bg-navy-900 text-bone px-7 py-4 text-xs uppercase tracking-eyebrow font-medium hover:bg-navy-800 transition-colors duration-400 cursor-pointer"
          >
            Schedule a visit →
          </button>
          <div className="mt-6 flex flex-col gap-2 text-sm text-ink-muted">
            <a href="tel:+2347047620492" className="hover:text-navy-900 transition-colors">
              +234 704 762 0492
            </a>
            <a href="mailto:hello@geodata.com.ng" className="hover:text-navy-900 transition-colors">
              hello@geodata.com.ng
            </a><SocialLinks className="mt-2 text-navy-900" size={18} />
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const location = useLocation();
  // Public-site editorial theme scope (styles live in index.css under html[data-site="public"])
  useEffect(() => {
    const root = document.documentElement
    const isPortal = /^\/(admin|staff|partner-portal|portal|client-portal|dashboard)(\/|$)/.test(location.pathname)
    if (isPortal) {
      delete root.dataset.site
      return
    }
    root.dataset.site = "public"
    return () => {
      delete root.dataset.site
    }
  }, [location.pathname])
  const signInVisible = useSignInVisible();
  const navEnhanced = useNavEnhanced();
  const diasporaEnabled = useDiasporaEnabled();
  // Hide the Track Record submenu item when the admin switch is off (default ON)
  const trackRecordSetting = useQuery(api.cms.getSiteSettings, { key: "track_record_visible" });
  const trackRecordOn = trackRecordSetting !== "false";
  const ongoingSetting = useQuery(api.cms.getSiteSettings, { key: "ongoing_projects_visible" });
  const ongoingOn = ongoingSetting !== "false";
  const estatesSetting = useQuery(api.cms.getSiteSettings, { key: "estates_visible" });
  const estatesOn = estatesSetting !== "false";
  const rawLinks = navEnhanced ? ENHANCED_NAV_LINKS : BASE_NAV_LINKS;
  const docsSetting = useQuery(api.cms.getSiteSettings, { key: "public_documents_visible" });
  const docsOn = docsSetting !== "false";
  const withoutDocs = docsOn
    ? rawLinks
    : rawLinks.map((l) => (l.children ? { ...l, children: l.children.filter((c) => c.href !== "/downloads") } : l));
  const baseLinks = withoutDocs.map((l) => {
    if (l.label !== "Projects" || !l.children) return l;
    // Drop switched-off items; a Projects menu left with one item becomes a plain link
    const children = l.children.filter((c) => (c.href !== "/track-record" || trackRecordOn) && (c.href !== "/ongoing-projects" || ongoingOn) && (c.href !== "/southern-bridge-city" || estatesOn));
    return children.length > 1 ? { ...l, children } : { label: l.label, href: children[0]?.href ?? l.href };
  });
  // Diaspora entry (spec section 42) is inserted just before Contact, and
  // only shown while the platform's master toggle is on — never a dead link.
  const navLinks = [...baseLinks.slice(0, -1).filter((l) => l.label !== "Updates").map((l) => (l.children ? { ...l, children: l.children.filter((c) => !["/news", "/careers", "/downloads"].includes(c.href)) } : l)), { label: "More", href: "/updates", children: [{ label: "Updates", href: "/updates" }, ...baseLinks.flatMap((l) => l.children ?? []).filter((c) => ["/news", "/careers", "/downloads"].includes(c.href)), ...(diasporaEnabled ? [{ label: "Diaspora", href: "/diaspora" }] : [])] }, baseLinks[baseLinks.length - 1]];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Top bar with integrated news ticker */}
<TopBar />

      {/* Main navbar */}
      <motion.nav
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "gd-nav gd-nav--scrolled bg-white/95 backdrop-blur-md shadow-lg border-b border-blue-100"
            : "gd-nav bg-white shadow-sm"
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <img
                src="/media/file_o2fBFolF2Qj4CQwJJxVgli1T.png"
                alt="Geodata World Services"
                className="h-11 lg:h-14 w-auto"
              />
              
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => link.children && setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    to={link.href}
                    className={cn(
                      "gd-navlink flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      location.pathname === link.href
                        ? "text-[var(--brand)]"
                        : "text-[#111111] hover:text-[var(--brand)]"
                    )}
                  >
                    {link.label}
                    {link.children && <ChevronDown size={14} />}
                  </Link>
                  {link.label === "Properties" && activeDropdown === "Properties" && (
                    <PropertiesMegaMenu onNavigate={() => setActiveDropdown(null)} />
                  )}
                  {link.label === "Projects" && activeDropdown === "Projects" && (
                    <ProjectsMegaMenu onNavigate={() => setActiveDropdown(null)} />
                  )}
                  {link.children && activeDropdown === link.label && link.label !== "Properties" && link.label !== "Projects" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="gd-dropdown absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50"
                    >
                      {link.children.map((child) => (
                        <Link
                          key={child.label}
                          to={child.href}
                          className="gd-dropdown-item block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[var(--brand)] transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <ShortlistLink />
              {/* Auth state: show Login or User menu */}
              <Unauthenticated>
                {signInVisible && (
                  <SignInButton
                    showIcon={false}
                    signInText="Login"
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[var(--brand)] hover:bg-blue-50 rounded-md transition-colors h-auto bg-transparent shadow-none border-0"
                  />
                )}
              </Unauthenticated>
              <Authenticated>
                <AuthMenu />
              </Authenticated>

              <Button
                size="sm"
                className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white shadow-md"
                asChild
              >
                <button type="button" {...calProps}>Schedule Visit</button>
              </Button>
            </div>

            {/* Mobile: compact always-visible login icon + menu toggle. The
                full "Sign In / Login" button also lives inside the hamburger
                dropdown below, but visitors expect a login affordance on the
                header itself without first opening the menu. */}
            <div className="flex items-center gap-1 lg:hidden">
              <Unauthenticated>
                {signInVisible && (
                  <SignInButton
                    showIcon
                    signInText=""
                    aria-label="Sign in"
                    className="p-2 h-auto w-auto text-[var(--brand)] hover:bg-blue-50 rounded-md transition-colors bg-transparent shadow-none border-0 [&_svg]:size-5"
                  />
                )}
              </Unauthenticated>
              <Authenticated>
                <MobileHeaderAvatar onClick={() => setMobileOpen(true)} />
              </Authenticated>
              <button
                className="p-2 rounded-md text-gray-700 hover:text-[var(--brand)]"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile drawer (outside the nav so its fixed positioning is not affected by the nav blur) */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Unauthenticated>
          {signInVisible && (
            <SignInButton
              showIcon
              signInText="Sign In / Login"
              className="w-full justify-center text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] h-10 text-sm rounded-lg"
            />
          )}
        </Unauthenticated>
        <Authenticated>
          <MobileUserMenu />
        </Authenticated>
      </MobileDrawer>
    </>
  );
}

// Compact avatar shown on the mobile header (next to the menu toggle) for
// signed-in visitors, so there's always a visible auth affordance without
// first opening the hamburger menu. Tapping it opens that same menu, where
// the full account actions (dashboard link, sign out) already live.
function MobileHeaderAvatar({ onClick }: { onClick: () => void }) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const displayName = currentUser?.name?.split(" ")[0] ?? currentUser?.email?.split("@")[0] ?? "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      aria-label="Account menu"
      className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center text-white text-xs font-bold shrink-0 cursor-pointer"
    >
      {initial}
    </button>
  );
}

function MobileUserMenu() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const partnerProfile = useQuery(api.partners.getMyPartnerProfile, {});
  const { signout } = useAuth();
  const navigate = useNavigate();
  const isStaff = currentUser?.role && ADMIN_ROLES.has(currentUser.role);
  const partnerLoading = partnerProfile === undefined;
  const isApprovedPartner = !isStaff && !partnerLoading && partnerProfile?.status === "approved";
  const displayName = currentUser?.name?.split(" ")[0] ?? "Account";

  const dashboardLink = isStaff ? "/admin" : partnerLoading ? null : isApprovedPartner ? "/partner" : "/client";
  const dashboardLabel = isStaff ? "Go to Dashboard" : isApprovedPartner ? "Go to Partner Portal" : "Go to My Portal";

  return (
    <div className="space-y-1">
      {/* User badge */}
      <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 rounded-lg">
        <div className="w-7 h-7 rounded-full bg-[var(--brand)] flex items-center justify-center text-white text-xs font-bold shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{displayName}</div>
          <div className="text-[10px] text-[var(--brand)] capitalize">
            {isApprovedPartner ? "Partner" : (currentUser?.role ?? "client")}
          </div>
        </div>
      </div>
      {dashboardLink ? (
        <Link
          to={dashboardLink}
          className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-lg transition-colors"
        >
          <LayoutDashboard size={14} /> {dashboardLabel}
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white/70 bg-[var(--brand)]/60 rounded-lg cursor-wait">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />
          Loading portal...
        </div>
      )}
      <button
        onClick={async () => { await signout(); navigate("/"); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
      >
        <LogOut size={14} /> Sign Out
      </button>
    </div>
  );
}


export function SocialLinks({ className = "", size = 13 }: { className?: string; size?: number }) { const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }; const a = "opacity-85 hover:opacity-100 transition-opacity"; return (<div className={`flex items-center gap-3 ${className}`}><a href="https://www.instagram.com/geodataworldservicesltd/" target="_blank" rel="noopener noreferrer" aria-label="Geodata on Instagram" title="Instagram: @geodataworldservicesltd" className={a}><svg {...p}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" /></svg></a><a href="https://www.facebook.com/GWCommsNG/" target="_blank" rel="noopener noreferrer" aria-label="Geodata on Facebook" title="Facebook: GWCommsNG" className={a}><svg {...p}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg></a><a href="https://www.youtube.com/@geodataworldservicesltd" target="_blank" rel="noopener noreferrer" aria-label="Geodata on YouTube" title="YouTube: @geodataworldservicesltd" className={a}><svg {...p}><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" /><path d="m10 15 5-3-5-3z" /></svg></a></div>); }