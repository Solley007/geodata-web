import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  TrendingUp, Users, DollarSign, Copy, Share2, ExternalLink,
  Building2, Newspaper, Handshake, ChevronRight, CheckCircle2,
  Phone, Loader2, UserPlus, ArrowRight, LayoutDashboard,
  UserRound, Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";
import { cn } from "@/lib/utils.ts";
import { Link, useNavigate } from "react-router-dom";
import { ConvexError } from "convex/values";
import NotificationBell from "@/components/notifications/NotificationBell.tsx";
import ShowcaseProfileTab from "./_components/ShowcaseProfileTab.tsx";
import MyContractBanner from "./_components/MyContractBanner.tsx";

// ── Partner sign-in button (respects partner_signin_visible toggle) ───────────
function PartnerSignInButton() {
  const raw = useQuery(api.cms.getSiteSettings, { key: "partner_signin_visible" });
  const visible = raw === undefined || raw === null ? true : raw === "true";
  if (!visible) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-gray-400 italic">Partner sign-in is currently unavailable.</p>
      </div>
    );
  }
  return <SignInButton />;
}

const APP_URL = typeof window !== "undefined" ? window.location.origin : "";

// ── Staff Enroll Modal ────────────────────────────────────────────────────────
function StaffEnrollModal({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const enroll = useMutation(api.partners.enrollSelfAsPartner);

  const handleEnroll = async () => {
    if (!phone) { toast.error("Phone number required"); return; }
    try {
      await enroll({ phone, whatsapp: whatsapp || undefined });
      toast.success("You're now enrolled as a Partner!");
      onClose();
    } catch (e) {
      const err = e instanceof ConvexError ? (e.data as { message: string }).message : "Enrollment failed";
      toast.error(err);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake size={18} className="text-[var(--brand)]" /> Enroll as Partner
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">As internal staff, you're automatically approved. Add your contact details below.</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Phone Number *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp (if different)</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+234 800 000 0000" />
          </div>
          <Button onClick={handleEnroll} className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white cursor-pointer">
            Enroll & Get My Referral Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Promo Card ────────────────────────────────────────────────────────────────
function PromoCard({
  type, id, title, subtitle, image, referralCode,
}: {
  type: "property" | "article";
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  referralCode: string;
}) {
  const path = type === "property" ? `/properties/${id}` : `/news/${id}`;
  const promoUrl = `${APP_URL}${path}?ref=${referralCode}`;
  const waMessage = encodeURIComponent(`Check this out from Geodata World:\n${title}\n${promoUrl}`);

  const copyLink = () => {
    navigator.clipboard.writeText(promoUrl).then(() => toast.success("Promo link copied! Your referral code is embedded."));
  };

  const shareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${waMessage}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      {image && (
        <div className="h-36 overflow-hidden">
          <img src={image} alt={title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-semibold text-gray-900 text-sm line-clamp-2">{title}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <a href={`${APP_URL}${path}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-400 hover:text-[var(--brand)] transition-colors">
            <ExternalLink size={14} />
          </a>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-[var(--brand)] text-white px-3 py-2 rounded-lg hover:bg-[var(--brand-dark)] transition-colors cursor-pointer"
          >
            <Copy size={12} /> Copy Link
          </button>
          <button
            onClick={shareWhatsApp}
            className="flex items-center justify-center gap-1.5 text-xs font-medium bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Partner Portal Inner ──────────────────────────────────────────────────────
function PartnerPortalInner() {
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const partner = useQuery(api.partners.getMyPartnerProfile, {});
  const referrals = useQuery(api.partners.getMyReferrals, {});
  const commissions = useQuery(api.partners.getMyCommissions, {});
  const properties = useQuery(api.properties.listAll, {});
  const articles = useQuery(api.cms.listNewsArticles, {});

  if (partner === undefined) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  // Not a partner yet
  if (!partner) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
          <Handshake size={36} className="text-[var(--brand)]" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
          You're not a Partner yet
        </h2>
        <p className="text-gray-500 text-lg max-w-md mx-auto">
          Join our Partner Program to earn commissions by referring clients to Geodata World properties.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/partner/apply">
            <Button className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white cursor-pointer">
              Apply as External Partner <ArrowRight size={16} className="ml-1" />
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => setShowEnrollModal(true)} className="cursor-pointer">
            <UserPlus size={16} className="mr-1" /> Staff Quick Enroll
          </Button>
        </div>
        {showEnrollModal && <StaffEnrollModal onClose={() => setShowEnrollModal(false)} />}
      </div>
    );
  }

  // Pending approval
  if (partner.status === "pending") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mx-auto">
          <Loader2 size={28} className="text-yellow-500 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Application Under Review</h2>
        <p className="text-gray-500">Our team is reviewing your application and will respond within 24 hours.</p>
      </div>
    );
  }

  if (partner.status === "rejected") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-gray-500 text-lg">Your application was not approved. Contact us for more details.</p>
      </div>
    );
  }

  // Approved partner
  const p = partner as {
    fullName: string; referralCode: string; commissionRate: number;
    totalReferrals: number; totalCommissionEarned: number;
    phone: string; email: string;
    partnerType?: "individual" | "company"; companyName?: string; contactRole?: string; rcNumber?: string;
  };
  const isCompany = p.partnerType === "company" && !!p.companyName;
  const displayName = isCompany ? p.companyName! : p.fullName;

  const pendingComm = (commissions ?? []).filter((c) => (c as Record<string, string>).status === "pending")
    .reduce((s, c) => s + ((c as Record<string, number>).commissionAmount ?? 0), 0);
  const paidComm = (commissions ?? []).filter((c) => (c as Record<string, string>).status === "paid")
    .reduce((s, c) => s + ((c as Record<string, number>).commissionAmount ?? 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Partner header */}
      <div className="bg-[var(--brand)] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl">
              {isCompany ? <Building2 size={24} /> : displayName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-xl truncate">{displayName}</p>
                {isCompany && <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-[#061433] px-2 py-0.5 rounded-full">Company Partner</span>}
              </div>
              <p className="text-blue-100 text-sm">
                {isCompany ? `Contact: ${p.fullName}${p.contactRole ? `, ${p.contactRole}` : ""} · ` : "Geodata World Partner · "}
                {p.commissionRate}% Commission
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-blue-200">Your Referral Code</p>
              <p className="font-mono font-bold text-lg tracking-wide">{p.referralCode}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(p.referralCode); toast.success("Code copied!"); }}
              className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Copy size={16} />
            </button>
            <Link to="/profile" title="My profile" className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer">
              <UserRound size={16} />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <NotificationBell triggerClassName="text-white hover:text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Referrals", value: p.totalReferrals, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Conversions", value: (referrals ?? []).filter((r) => (r as Record<string, string>).status === "converted").length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Pending Comm.", value: `₦${pendingComm.toLocaleString()}`, icon: TrendingUp, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Total Paid", value: `₦${paidComm.toLocaleString()}`, icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.bg)}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main tabs */}
      <MyContractBanner partnerName={displayName} />
      <Tabs defaultValue="properties">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="properties" className="cursor-pointer">
            <Building2 size={14} className="mr-1" /> Property Promos
          </TabsTrigger>
          <TabsTrigger value="articles" className="cursor-pointer">
            <Newspaper size={14} className="mr-1" /> Blog Promos
          </TabsTrigger>
          <TabsTrigger value="referrals" className="cursor-pointer">
            <Users size={14} className="mr-1" /> My Referrals
          </TabsTrigger>
          <TabsTrigger value="commissions" className="cursor-pointer">
            <DollarSign size={14} className="mr-1" /> Commissions
          </TabsTrigger>
          <TabsTrigger value="showcase" className="cursor-pointer">
            <Globe2 size={14} className="mr-1" /> Showcase Profile
          </TabsTrigger>
        </TabsList>

        {/* Properties */}
        <TabsContent value="properties" className="mt-4">
          <div className="mb-4 p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
            <strong>How it works:</strong> Copy a promo link for any property below. When someone visits via your link, your phone number will be shown as the contact instead of the main office number — they'll reach you directly.
          </div>
          {!properties ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((prop) => {
                const pr = prop as Record<string, unknown>;
                return (
                  <PromoCard
                    key={pr._id as string}
                    type="property"
                    id={pr._id as string}
                    title={pr.title as string}
                    subtitle={`${pr.location as string}, ${pr.state as string}`}
                    image={pr.featuredImage as string | undefined}
                    referralCode={p.referralCode}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Blog Articles */}
        <TabsContent value="articles" className="mt-4">
          <div className="mb-4 p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
            <strong>Blog promos:</strong> Share blog posts with your referral code. When readers click through, your contact details appear on any linked property.
          </div>
          {!articles ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.filter((a) => (a as unknown as Record<string, boolean>).published).map((art) => {
                const a = art as Record<string, unknown>;
                return (
                  <PromoCard
                    key={a._id as string}
                    type="article"
                    id={a.slug as string}
                    title={a.title as string}
                    subtitle={a.category as string | undefined}
                    image={a.image as string | undefined}
                    referralCode={p.referralCode}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Referrals */}
        <TabsContent value="referrals" className="mt-4">
          {!referrals || referrals.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>No referral clicks recorded yet. Start sharing your promo links!</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Resource</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {referrals.map((ref) => {
                    const r = ref as Record<string, unknown>;
                    return (
                      <tr key={r._id as string} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{r.resourceTitle as string}</td>
                        <td className="px-4 py-3 capitalize text-gray-500">{r.resourceType as string}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            r.status === "converted" ? "bg-green-100 text-green-700" :
                            r.status === "inquiry" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-600"
                          )}>
                            {r.status as string}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {format(new Date(r._creationTime as number), "dd MMM yyyy")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Commissions */}
        <TabsContent value="commissions" className="mt-4">
          {!commissions || commissions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <DollarSign size={40} className="mx-auto mb-3 opacity-30" />
              <p>No commissions recorded yet. Keep referring clients!</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Description</th>
                    <th className="text-right px-4 py-3">Sale Amount</th>
                    <th className="text-right px-4 py-3">Commission</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {commissions.map((com) => {
                    const c = com as Record<string, unknown>;
                    return (
                      <tr key={c._id as string} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-800">{c.description as string}</td>
                        <td className="px-4 py-3 text-right">₦{(c.saleAmount as number).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">₦{(c.commissionAmount as number).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            c.status === "paid" ? "bg-green-100 text-green-700" :
                            c.status === "approved" ? "bg-blue-100 text-blue-700" :
                            "bg-yellow-100 text-yellow-700"
                          )}>
                            {c.status as string}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {format(new Date(c._creationTime as number), "dd MMM yyyy")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="showcase" className="mt-4">
          <ShowcaseProfileTab defaultName={displayName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Redirect unauthenticated visitors to the proper login page
function PortalRedirectToLogin() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/partner/login", { replace: true }); }, [navigate]);
  return null;
}

// ── Super-admin back-to-admin banner ────────────────────────────────────────
function BackToAdminBanner() {
  const currentUser = useQuery(api.users.getCurrentUser, {});
  if (currentUser?.role !== "super_admin") return null;
  return (
    <div className="bg-[var(--brand)] text-white">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <span className="text-xs sm:text-sm text-blue-100">You're viewing the Partner Portal as a super admin.</span>
        <Link to="/admin" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white hover:underline shrink-0">
          <LayoutDashboard size={14} /> Back to Admin Dashboard
        </Link>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function PartnerPortalPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <Authenticated>
        <BackToAdminBanner />
      </Authenticated>
      <div className="flex-1">
        <AuthLoading>
          <div className="max-w-5xl mx-auto px-4 py-12 space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </AuthLoading>
        <Unauthenticated>
          <PortalRedirectToLogin />
        </Unauthenticated>
        <Authenticated>
          <PartnerPortalInner />
        </Authenticated>
      </div>
      <Footer />
    </div>
  );
}
