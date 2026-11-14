import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { formatDistanceToNow } from "date-fns";
import { Settings, User, Shield, Database, Palette, Upload, RefreshCw, Check, Lock, Handshake, Globe, Factory, MessageCircle, ExternalLink, Radio, ToggleLeft, FileText, PenTool, Stamp, MessagesSquare, BarChart3, History, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { toast } from "sonner";
import { parseBranding, applyBranding, BRANDING_DEFAULTS, type BrandingData } from "@/components/providers/branding.tsx";
import { cn } from "@/lib/utils.ts";
import { Coins } from "lucide-react";
import CurrencySettingsTab from "./_components/CurrencySettingsTab.tsx";

// ─── Preset palettes ─────────────────────────────────────────────────────────
const PRESETS = [
  { name: "Royal Blue",   color: "#0B4DBB" },
  { name: "Midnight",     color: "#1a1a2e" },
  { name: "Forest",       color: "#166534" },
  { name: "Crimson",      color: "#9B1C1C" },
  { name: "Amber",        color: "#B45309" },
  { name: "Indigo",       color: "#3730A3" },
  { name: "Teal",         color: "#0F766E" },
  { name: "Slate",        color: "#334155" },
];

// ─── Active tab ───────────────────────────────────────────────────────────────
type Tab = "branding" | "profile" | "access" | "notifications" | "features" | "currency" | "audit";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "branding", label: "Branding & White-label", icon: Palette },
  { id: "profile",  label: "My Profile",             icon: User },
  { id: "access",   label: "Access Control",          icon: Lock },
  { id: "notifications", label: "Notifications",      icon: MessageCircle },
  { id: "features", label: "Features",                icon: ToggleLeft },
  { id: "currency", label: "Currency",                icon: Coins },
  { id: "audit",    label: "Audit Log",               icon: Shield },
];

export default function AdminSettings() {
  const { user } = useAuth();
  const currentUser  = useQuery(api.users.getCurrentUser);
  const activityLog  = useQuery(api.admin.getActivityLog);
  const rawBranding  = useQuery(api.cms.getSiteSettings, { key: "branding" });
  const rawAccess    = useQuery(api.cms.getSiteSettings, { key: "access_control" });
  const rawLock      = useQuery(api.cms.getSiteSettings, { key: "landing_lock" });
  const upsert       = useMutation(api.cms.upsertSiteSettings);

  const [activeTab, setActiveTab] = useState<Tab>("branding");
  const [form, setForm]           = useState<BrandingData | null>(null);
  const [saving, setSaving]       = useState(false);
  const [preview, setPreview]     = useState<string | null>(null); // live preview color

  const data = form ?? parseBranding(rawBranding);

  // Live preview as user picks a color
  useEffect(() => {
    if (preview) applyBranding({ ...data, primaryColor: preview });
  }, [preview]);

  const setColor = (c: string) => {
    setForm({ ...data, primaryColor: c });
    setPreview(c);
  };

  const save = async () => {
    setSaving(true);
    try {
      await upsert({ key: "branding", value: JSON.stringify(data) });
      applyBranding(data); // apply immediately
      toast.success("Branding saved — the entire site has updated");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const reset = () => {
    setForm({ ...BRANDING_DEFAULTS });
    setPreview(BRANDING_DEFAULTS.primaryColor);
    toast("Reset to default Royal Blue");
  };

  const actionColor: Record<string, string> = {
    create: "text-green-600 bg-green-100",
    update: "text-blue-600 bg-blue-100",
    delete: "text-red-600 bg-red-100",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Settings</h1>
        <p className="text-sm text-gray-500">Branding, profile, and system configuration</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
              activeTab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Branding tab ───────────────────────────────────────────────── */}
      {activeTab === "branding" && (
        <div className="space-y-5">
          {rawBranding === undefined ? <Skeleton className="h-64 w-full" /> : (
            <>
              {/* Color picker */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900">Brand Color</h2>
                    <p className="text-sm text-gray-500 mt-0.5">This color is applied across the entire site — navbar, buttons, highlights, and more.</p>
                  </div>
                  <button onClick={reset} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
                    <RefreshCw size={12} /> Reset default
                  </button>
                </div>

                {/* Live preview swatch + hex input */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl shadow-lg border-4 border-white ring-1 ring-gray-200"
                      style={{ backgroundColor: preview ?? data.primaryColor }} />
                    <input type="color" value={preview ?? data.primaryColor}
                      onChange={(e) => setColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-2xl" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center shadow-sm">
                      <Palette size={9} className="text-gray-500" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Hex Color Code</Label>
                    <div className="flex items-center gap-2">
                      <Input value={preview ?? data.primaryColor}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-36 font-mono text-sm uppercase"
                        placeholder="#0B4DBB" />
                      <span className="text-xs text-gray-400">Click the swatch or type a hex code</span>
                    </div>
                  </div>
                </div>

                {/* Preset swatches */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-3">Quick Presets</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button key={p.color} onClick={() => setColor(p.color)} title={p.name}
                        className="group relative flex flex-col items-center gap-1 cursor-pointer">
                        <div className="w-10 h-10 rounded-xl border-2 transition-all shadow-sm group-hover:scale-110"
                          style={{ backgroundColor: p.color, borderColor: (preview ?? data.primaryColor) === p.color ? p.color : "transparent" }}>
                          {(preview ?? data.primaryColor) === p.color && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check size={14} className="text-white drop-shadow" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview strip */}
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <div className="px-5 py-3 text-white text-sm font-semibold flex items-center gap-3"
                    style={{ backgroundColor: preview ?? data.primaryColor }}>
                    <div className="w-6 h-6 rounded bg-white/20" />
                    Navbar preview
                    <div className="ml-auto flex gap-2">
                      <div className="w-12 h-5 rounded bg-white/20 text-[10px] flex items-center justify-center">Menu</div>
                      <div className="w-16 h-5 rounded bg-white text-[10px] flex items-center justify-center font-bold"
                        style={{ color: preview ?? data.primaryColor }}>Sign In</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-4 flex items-center gap-3">
                    <div className="px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-sm"
                      style={{ backgroundColor: preview ?? data.primaryColor }}>Primary Button</div>
                    <div className="px-4 py-2 rounded-lg text-xs font-semibold border-2"
                      style={{ color: preview ?? data.primaryColor, borderColor: preview ?? data.primaryColor }}>Outline Button</div>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preview ?? data.primaryColor }} />
                    <span className="text-sm font-semibold" style={{ color: preview ?? data.primaryColor }}>Link text</span>
                  </div>
                </div>
              </div>

              {/* Company name */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h2 className="font-bold text-gray-900">Company Identity</h2>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Company Name</Label>
                  <Input value={data.companyName ?? ""} onChange={(e) => setForm({ ...data, companyName: e.target.value })}
                    placeholder="e.g. Geodata World Services Limited" className="max-w-md" />
                  <p className="text-xs text-gray-400 mt-1">Shown in the browser tab, footer, and meta tags.</p>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Logo</Label>
                  <FileUploadButton
                    variant="dropzone"
                    mediaType="image"
                    label="Upload logo (PNG with transparent background recommended)"
                    currentUrl={data.logoUrl ?? undefined}
                    currentStorageId={data.logoStorageId ? data.logoStorageId as unknown as Id<"_storage"> : null}
                    onUpload={(storageId, url) => setForm({ ...data, logoStorageId: storageId as unknown as string, logoUrl: url ?? data.logoUrl })}
                    onClear={() => setForm({ ...data, logoStorageId: null, logoUrl: BRANDING_DEFAULTS.logoUrl })}
                    className="max-w-xs"
                  />
                </div>
              </div>

              {/* Save */}
              <div className="flex justify-end gap-3">
                <Button onClick={reset} className="bg-gray-100 text-gray-700 hover:bg-gray-200 gap-2">
                  <RefreshCw size={13} /> Reset to Default
                </Button>
                <Button onClick={save} disabled={saving} className="gap-2 text-white"
                  style={{ backgroundColor: preview ?? data.primaryColor }}>
                  {saving ? "Saving…" : "Save Branding"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Profile tab ────────────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5 font-semibold text-gray-700 text-sm">
              <User size={15} className="text-[var(--brand)]" /> My Profile
            </div>
            {!currentUser ? <Skeleton className="h-20 w-full" /> : (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0"
                  style={{ backgroundColor: "var(--brand)" }}>
                  {(currentUser.name ?? "A").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-lg">{currentUser.name ?? user?.profile.name}</div>
                  <div className="text-sm text-gray-500">{currentUser.email ?? user?.profile.email}</div>
                  <div className="text-xs font-medium capitalize mt-1 px-2 py-0.5 rounded-full inline-block text-white"
                    style={{ backgroundColor: "var(--brand)" }}>{currentUser.role}</div>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5 font-semibold text-gray-700 text-sm">
              <Database size={15} className="text-[var(--brand)]" /> System Info
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                { label: "Platform", value: "Geodata ERP v1.0" },
                { label: "Backend", value: "Secure Cloud Database" },
                { label: "Auth", value: "Managed Authentication" },
                { label: "Environment", value: "Production" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-medium text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Access Control tab ────────────────────────────────────────── */}
      {activeTab === "access" && (
        <AccessControlTab rawAccess={rawAccess} rawLock={rawLock} upsert={upsert} />
      )}

      {/* ── Notifications tab ─────────────────────────────────────────── */}
      {activeTab === "notifications" && <NotificationsTab />}

      {/* ── Features tab ──────────────────────────────────────────────── */}
      {activeTab === "features" && <FeaturesTab />}
      {activeTab === "currency" && <CurrencySettingsTab />}

      {/* ── Audit tab ──────────────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Shield size={15} className="text-[var(--brand)]" /> Audit Log (Last 50 Actions)
          </div>
          {!activityLog ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : activityLog.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No activity recorded yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activityLog.map((log) => (
                <div key={log._id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 text-sm">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${actionColor[log.action] ?? "text-gray-600 bg-gray-100"}`}>{log.action}</span>
                  <span className="text-gray-500 capitalize">{log.entity}</span>
                  <span className="text-gray-800 truncate flex-1">{log.details ?? "—"}</span>
                  <span className="text-xs text-gray-400 shrink-0">{formatDistanceToNow(log._creationTime, { addSuffix: true })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Access Control Tab ────────────────────────────────────────────────────

type UpsertFn = (args: { key: string; value: string }) => Promise<unknown>;

// ── Default launch date: 30 days from now ─────────────────────────────────
function defaultLaunchDate() {
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  // Format for datetime-local input: YYYY-MM-DDTHH:mm
  return d.toISOString().slice(0, 16);
}

const DEFAULT_MESSAGE =
  "We're putting the finishing touches on something extraordinary. Nigeria's most trusted real estate platform is being upgraded — bigger, better, and built for you.";

type LandingLock = { enabled: boolean; launchDate: string; message: string };

function parseLock(raw: string | null | undefined): LandingLock {
  const def: LandingLock = { enabled: false, launchDate: defaultLaunchDate(), message: DEFAULT_MESSAGE };
  if (!raw) return def;
  try { return { ...def, ...(JSON.parse(raw) as Partial<LandingLock>) }; } catch { return def; }
}

function AccessControlTab({ rawAccess, rawLock, upsert }: {
  rawAccess: string | null | undefined;
  rawLock: string | null | undefined;
  upsert: UpsertFn;
}) {
  // Admin sign-in toggle — default: visible (true)
  const signInVisible = rawAccess === null || rawAccess === undefined
    ? true
    : rawAccess === "true";

  const rawPartner = useQuery(api.cms.getSiteSettings, { key: "partner_signin_visible" });
  const rawReadyMix = useQuery(api.cms.getSiteSettings, { key: "readymix_button_visible" });
  // Partner sign-in toggle — default: visible (true)
  const partnerSignInVisible = rawPartner === null || rawPartner === undefined
    ? true
    : rawPartner === "true";
  // ReadyMix button — default: visible (true)
  const readyMixVisible = rawReadyMix === null || rawReadyMix === undefined
    ? true
    : rawReadyMix === "true";

  // Group directory "Featured Projects" section — default: visible (true)
  const rawFeaturedProjects = useQuery(api.cms.getSiteSettings, { key: "group_featured_projects_visible" });
  const featuredProjectsVisible = rawFeaturedProjects === null || rawFeaturedProjects === undefined
    ? true
    : rawFeaturedProjects === "true";
  const [togglingFeatured, setTogglingFeatured] = useState(false);

  const [toggling, setToggling] = useState(false);
  const [togglingPartner, setTogglingPartner] = useState(false);
  const [togglingReadyMix, setTogglingReadyMix] = useState(false);

  // ── Landing lock state ──
  const lock = parseLock(rawLock);
  const [lockForm, setLockForm] = useState<LandingLock | null>(null);
  const activeLock = lockForm ?? lock;
  const [savingLock, setSavingLock] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);

  const saveLock = async (patch: Partial<LandingLock>) => {
    const next = { ...activeLock, ...patch };
    setLockForm(next);
    setSavingLock(true);
    try {
      // Ensure ISO format for storage
      const launchIso = new Date(next.launchDate).toISOString();
      await upsert({ key: "landing_lock", value: JSON.stringify({ ...next, launchDate: launchIso }) });
      toast.success("Landing page lock updated");
    } catch { toast.error("Failed to save"); }
    finally { setSavingLock(false); }
  };

  const toggleLock = async (enabled: boolean) => {
    setTogglingLock(true);
    try {
      const launchIso = new Date(activeLock.launchDate).toISOString();
      await upsert({ key: "landing_lock", value: JSON.stringify({ ...activeLock, enabled, launchDate: launchIso }) });
      setLockForm({ ...activeLock, enabled });
      toast.success(enabled ? "Coming Soon page is now LIVE — landing page is locked" : "Landing page is now public again");
    } catch { toast.error("Failed to update lock"); }
    finally { setTogglingLock(false); }
  };

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await upsert({ key: "access_control", value: String(checked) });
      toast.success(checked ? "Sign-in button is now visible on the public site" : "Sign-in button hidden from the public site");
    } catch { toast.error("Failed to save setting"); }
    finally { setToggling(false); }
  };

  const handlePartnerToggle = async (checked: boolean) => {
    setTogglingPartner(true);
    try {
      await upsert({ key: "partner_signin_visible", value: String(checked) });
      toast.success(checked ? "Partner sign-in button is now visible" : "Partner sign-in button hidden from the portal");
    } catch { toast.error("Failed to save setting"); }
    finally { setTogglingPartner(false); }
  };

  const handleFeaturedProjectsToggle = async (checked: boolean) => {
    setTogglingFeatured(true);
    try {
      await upsert({ key: "group_featured_projects_visible", value: String(checked) });
      toast.success(checked ? "Featured Projects section is now visible" : "Featured Projects section hidden");
    } catch { toast.error("Failed to save setting"); }
    finally { setTogglingFeatured(false); }
  };

  const handleReadyMixToggle = async (checked: boolean) => {
    setTogglingReadyMix(true);
    try {
      await upsert({ key: "readymix_button_visible", value: String(checked) });
      toast.success(checked ? "Geodata ReadyMix button is now visible on the hero" : "Geodata ReadyMix button hidden from the hero");
    } catch { toast.error("Failed to save setting"); }
    finally { setTogglingReadyMix(false); }
  };

  return (
    <div className="space-y-5 max-w-xl">
      {/* ── Admin toggle ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Lock size={16} className="text-[var(--brand)]" /> Admin Sign-In Visibility
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Controls whether the "Login" button appears in the public navbar.
          </p>
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4">
          <div>
            <p className="font-medium text-sm text-gray-800">Show sign-in button on public site</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {signInVisible ? "Visible — the Login button appears in the navbar" : "Hidden — the Login button is not shown to visitors"}
            </p>
          </div>
          <Switch
            checked={signInVisible}
            onCheckedChange={handleToggle}
            disabled={toggling || rawAccess === undefined}
            className="cursor-pointer"
          />
        </div>

        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit ${signInVisible ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${signInVisible ? "bg-green-500" : "bg-amber-500"}`} />
          {signInVisible ? "Admin sign-in button is currently visible" : "Admin sign-in button is currently hidden"}
        </div>
      </div>

      {/* ── Partner toggle ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Handshake size={16} className="text-[var(--brand)]" /> Partner Sign-In Visibility
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Controls whether the sign-in button appears on the Partner Portal page. When off, partners are directed to use the private login URL instead.
          </p>
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4">
          <div>
            <p className="font-medium text-sm text-gray-800">Show sign-in button on Partner Portal</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {partnerSignInVisible ? "Visible — sign-in button shows on the Partner Portal" : "Hidden — partners must use the private login URL"}
            </p>
          </div>
          <Switch
            checked={partnerSignInVisible}
            onCheckedChange={handlePartnerToggle}
            disabled={togglingPartner || rawPartner === undefined}
            className="cursor-pointer"
          />
        </div>

        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit ${partnerSignInVisible ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${partnerSignInVisible ? "bg-green-500" : "bg-amber-500"}`} />
          {partnerSignInVisible ? "Partner sign-in button is currently visible" : "Partner sign-in button is currently hidden"}
        </div>
      </div>

      {/* ── ReadyMix button toggle ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Factory size={16} className="text-[var(--brand)]" /> Geodata ReadyMix Button
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Controls whether the "Geodata ReadyMix" button appears on the hero section of the homepage. Turn off to hide it while the portal is not ready.
          </p>
        </div>
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4">
          <div>
            <p className="font-medium text-sm text-gray-800">Show ReadyMix button on homepage hero</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {readyMixVisible ? "Visible — ReadyMix button shows in the hero section" : "Hidden — ReadyMix button is not shown to visitors"}
            </p>
          </div>
          <Switch
            checked={readyMixVisible}
            onCheckedChange={handleReadyMixToggle}
            disabled={togglingReadyMix || rawReadyMix === undefined}
            className="cursor-pointer"
          />
        </div>
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit ${readyMixVisible ? "bg-blue-50 text-[var(--brand)]" : "bg-gray-50 text-gray-500"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${readyMixVisible ? "bg-[var(--brand)]" : "bg-gray-400"}`} />
          {readyMixVisible ? "ReadyMix button is visible on the hero" : "ReadyMix button is hidden from the hero"}
        </div>
      </div>

      {/* ── Group directory: Featured Projects section toggle ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Building2 size={16} className="text-[var(--brand)]" /> Featured Projects Section
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Controls the "Real Estate Developments From the Group" section on the Geodata World Corporate Directory page.
          </p>
        </div>
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4">
          <div>
            <p className="font-medium text-sm text-gray-800">Show Featured Projects section</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {featuredProjectsVisible ? "Visible — shown on the Group directory page" : "Hidden — not shown to visitors"}
            </p>
          </div>
          <Switch
            checked={featuredProjectsVisible}
            onCheckedChange={handleFeaturedProjectsToggle}
            disabled={togglingFeatured || rawFeaturedProjects === undefined}
            className="cursor-pointer"
          />
        </div>
      </div>

      {/* ── Landing Page Lock ── */}
      <div className={`bg-white rounded-2xl border shadow-sm p-6 space-y-5 ${activeLock.enabled ? "border-red-200 ring-2 ring-red-100" : "border-gray-100"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Globe size={16} className="text-[var(--brand)]" /> Landing Page Lock
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Replace the public homepage with a branded Coming Soon page. Perfect for maintenance or before launch.
            </p>
          </div>
          <Switch
            checked={activeLock.enabled}
            onCheckedChange={toggleLock}
            disabled={togglingLock || rawLock === undefined}
            className="cursor-pointer mt-1 shrink-0"
          />
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit ${activeLock.enabled ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${activeLock.enabled ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
          {activeLock.enabled ? "Coming Soon page is LIVE — homepage is locked" : "Homepage is live and public"}
        </div>

        {/* Config fields */}
        <div className="space-y-4 pt-2 border-t border-gray-50">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Launch Date & Time</Label>
            <input
              type="datetime-local"
              value={activeLock.launchDate.slice(0, 16)}
              onChange={(e) => setLockForm({ ...activeLock, launchDate: e.target.value })}
              className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 text-gray-800"
            />
            <p className="text-xs text-gray-400 mt-1">Countdown on the Coming Soon page counts down to this moment.</p>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Message</Label>
            <Textarea
              value={activeLock.message}
              onChange={(e) => setLockForm({ ...activeLock, message: e.target.value })}
              rows={3}
              placeholder="We're putting the finishing touches..."
              className="text-sm resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Shown below the headline on the Coming Soon page.</p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => { saveLock(activeLock).catch(() => null); }}
              disabled={savingLock}
              size="sm"
              className="bg-[var(--brand)] text-white hover:opacity-90 cursor-pointer"
            >
              {savingLock ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Private login URLs ── */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4">
        <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
          <Shield size={14} /> Private Login URLs
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">Admin login:</p>
            <div className="bg-white rounded-lg px-3 py-2 font-mono text-xs text-blue-800 border border-blue-100 select-all break-all">
              {window.location.origin}/admin/login
            </div>
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">Partner login:</p>
            <div className="bg-white rounded-lg px-3 py-2 font-mono text-xs text-blue-800 border border-blue-100 select-all break-all">
              {window.location.origin}/partner/login
            </div>
          </div>
        </div>
        <p className="text-xs text-blue-500">
          These URLs always work regardless of the toggle states above. Bookmark them and keep them private.
        </p>
      </div>

      {/* ── Navigation Structure toggle ── */}
      <NavEnhancedToggle upsert={upsert} />

      {/* ── Live Virtual Inspection feature toggle ── */}
      <LiveInspectionToggle />

      {/* ── Interactive 360°/VR Tour feature toggle ── */}
      <TourFeatureToggle />

      {/* ── Corporate Marketing & Bulk Sales feature toggle ── */}
      <CorporateMarketingToggle />
    </div>
  );
}

// ─── Live Virtual Inspection Toggle ─────────────────────────────────────────

function LiveInspectionToggle() {
  const status = useQuery(api.liveInspections.getFeatureStatus, {});
  const setStatus = useMutation(api.liveInspections.setFeatureStatus);
  const [toggling, setToggling] = useState(false);

  const enabled = status?.enabled ?? false;

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await setStatus({ enabled: checked });
      toast.success(checked
        ? "Live Virtual Inspection is now ON for authorized users"
        : "Live Virtual Inspection is now OFF — existing inspection records are preserved"
      );
    } catch {
      toast.error("Failed to update this setting");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Radio size={16} className="text-[var(--brand)]" /> GEODATA LIVE INSPECT™ — Live Inspection
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Enables or disables Geodata's live remote property, estate and construction inspection functionality (Live Property Inspection &amp; Live Construction Inspection modes).
        </p>
      </div>

      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4">
        <div>
          <p className="font-medium text-sm text-gray-800">Live Virtual Inspection</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {enabled
              ? "ON — authorized staff and clients can create, schedule, and join live inspections"
              : "OFF — inspection navigation and actions are hidden; existing records remain preserved"}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={toggling || status === undefined}
          className="cursor-pointer"
        />
      </div>

      <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit ${enabled ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-green-500" : "bg-amber-500"}`} />
        {enabled ? "Live Virtual Inspection is currently ON" : "Live Virtual Inspection is currently OFF"}
      </div>

      <p className="text-xs text-gray-400">
        Access still requires each user to hold the relevant Live Inspection permissions under Users &amp; Roles — turning this on does not grant universal access.
      </p>
    </div>
  );
}

// ─── Interactive 360°/VR Tour Toggle ────────────────────────────────────────
// Independent of the Live Inspection toggle above — flipping one never
// affects the other. Together they make up the two active modes of the
// GEODATA LIVE INSPECT™ product (the third, Live Construction Inspection,
// reuses the same Live Inspection toggle since it's the same session system).

function TourFeatureToggle() {
  const status = useQuery(api.propertyTours.getFeatureStatus, {});
  const setStatus = useMutation(api.propertyTours.setFeatureStatus);
  const [toggling, setToggling] = useState(false);

  const enabled = status?.enabled ?? false;

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await setStatus({ enabled: checked });
      toast.success(checked
        ? "Interactive 360°/VR Tour is now ON"
        : "Interactive 360°/VR Tour is now OFF — existing tours are preserved but hidden from visitors"
      );
    } catch {
      toast.error("Failed to update this setting");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Radio size={16} className="text-[var(--brand)]" /> GEODATA LIVE INSPECT™ — 360°/VR Tour
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Enables or disables the self-guided Interactive 360°/VR Tour mode on property pages, independently of Live Inspection.
        </p>
      </div>

      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4">
        <div>
          <p className="font-medium text-sm text-gray-800">Interactive 360°/VR Tour</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {enabled
              ? "ON — visitors can start a 360° tour on properties with a published tour"
              : "OFF — \"Start 360° Tour\" is hidden; existing tours and scenes remain preserved for admins"}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={toggling || status === undefined}
          className="cursor-pointer"
        />
      </div>

      <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit ${enabled ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-green-500" : "bg-amber-500"}`} />
        {enabled ? "Interactive 360°/VR Tour is currently ON" : "Interactive 360°/VR Tour is currently OFF"}
      </div>

      <p className="text-xs text-gray-400">
        Access to tour management still requires each user to hold the relevant 360°/VR Tour permissions under Users &amp; Roles — turning this on does not grant universal access.
      </p>
    </div>
  );
}

// ─── Corporate Marketing & Bulk Sales Toggle ────────────────────────────────

function CorporateMarketingToggle() {
  const status = useQuery(api.corporateMarketing.feature.getFeatureStatus, {});
  const setStatus = useMutation(api.corporateMarketing.feature.setFeatureStatus);
  const [toggling, setToggling] = useState(false);

  const enabled = status?.enabled ?? false;

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await setStatus({ enabled: checked });
      toast.success(checked
        ? "Corporate Marketing & Bulk Sales is now ON for authorized users"
        : "Corporate Marketing & Bulk Sales is now OFF — existing records are preserved"
      );
    } catch {
      toast.error("Failed to update this setting");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Handshake size={16} className="text-[var(--brand)]" /> Corporate Marketing &amp; Bulk Sales
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Enables or disables institutional/corporate bulk property acquisition — organisations, opportunities, partnership letters, EOIs, proposals, negotiation and closing.
        </p>
      </div>

      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4">
        <div>
          <p className="font-medium text-sm text-gray-800">Corporate Marketing &amp; Bulk Sales</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {enabled
              ? "ON — authorized staff can manage corporate organisations and bulk opportunities"
              : "OFF — navigation and actions are hidden; existing records remain preserved"}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={toggling || status === undefined}
          className="cursor-pointer"
        />
      </div>

      <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit ${enabled ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-green-500" : "bg-amber-500"}`} />
        {enabled ? "Corporate Marketing & Bulk Sales is currently ON" : "Corporate Marketing & Bulk Sales is currently OFF"}
      </div>

      <p className="text-xs text-gray-400">
        Access still requires each user to hold the relevant Corporate Marketing permissions under Users &amp; Roles — turning this on does not grant universal access. Strategic/external partners never receive this access automatically.
      </p>
    </div>
  );
}

// ─── Nav Enhanced Toggle ─────────────────────────────────────────────────────

function NavEnhancedToggle({ upsert }: { upsert: UpsertFn }) {
  const raw = useQuery(api.cms.getSiteSettings, { key: "nav_enhanced" });
  const enhanced = raw === "true";
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await upsert({ key: "nav_enhanced", value: String(checked) });
      toast.success(checked
        ? "Enhanced navigation is now LIVE — new Company items & updated labels active"
        : "Navigation reverted to the original structure"
      );
    } catch { toast.error("Failed to update navigation setting"); }
    finally { setToggling(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Globe size={16} className="text-[var(--brand)]" /> Navigation Structure
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Switch between the original navigation and the enhanced structure which adds <strong>Organisational Structure</strong> and <strong>Corporate Governance</strong> under the Company menu, and renames property categories to their full labels.
        </p>
      </div>

      {raw === undefined ? (
        <div className="h-14 bg-gray-50 rounded-xl animate-pulse" />
      ) : (
        <>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4">
            <div>
              <p className="font-medium text-sm text-gray-800">
                {enhanced ? "Enhanced navigation — 6 Company items" : "Original navigation — 4 Company items"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {enhanced
                  ? "Company menu: About Us · Leadership & Our Team · Organisational Structure · Corporate Governance · Careers · News & Blog"
                  : "Company menu: About Us · Our Team · Careers · News & Blog"}
              </p>
            </div>
            <Switch
              checked={enhanced}
              onCheckedChange={handleToggle}
              disabled={toggling}
              className="ml-4 cursor-pointer"
            />
          </div>

          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit ${enhanced ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${enhanced ? "bg-green-500" : "bg-amber-500"}`} />
            {enhanced ? "Enhanced navigation is currently active on the public site" : "Original navigation is currently active"}
          </div>

          {enhanced && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-2 text-xs text-blue-800">
              <p className="font-semibold">Enhanced nav is ON. Active changes:</p>
              <ul className="space-y-1 list-disc list-inside text-blue-700">
                <li>Properties: "Residential" → "Residential Properties", "Commercial" → "Commercial Properties"</li>
                <li>Company: "Our Team" → "Leadership &amp; Our Team"</li>
                <li>Company: + Organisational Structure (<code>/org-structure</code>)</li>
                <li>Company: + Corporate Governance (<code>/corporate-governance</code>)</li>
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Notifications Tab ──────────────────────────────────────────────────────

function NotificationsTab() {
  const enabledRaw = useQuery(api.whatsappSettings.getWhatsAppEnabled);
  const setEnabled = useMutation(api.whatsappSettings.setWhatsAppEnabled);
  const [toggling, setToggling] = useState(false);

  const enabled = enabledRaw === "true";

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await setEnabled({ enabled: checked });
      toast.success(checked ? "WhatsApp copies enabled" : "WhatsApp copies turned off");
    } catch { toast.error("Failed to save setting"); }
    finally { setToggling(false); }
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle size={16} className="text-[var(--brand)]" /> WhatsApp Notification Copies
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            When turned on, every email notification (leads, KYC, finance, payments, transactions, partner decisions, admin alerts) also sends a short WhatsApp message to the recipient's phone number on file.
          </p>
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4">
          <div>
            <p className="font-medium text-sm text-gray-800">Send WhatsApp copies of notifications</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {enabled ? "On — a WhatsApp copy is sent alongside every email notification" : "Off — notifications are only sent by email"}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={toggling || enabledRaw === undefined}
            className="cursor-pointer"
          />
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <ExternalLink size={12} /> Connect WhatsApp Business first
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            This requires connecting the WhatsApp Business App Connector. Look for <strong>Connectors</strong> in the app's left sidebar, find <strong>WhatsApp</strong>, and follow its connect flow. This is an early-access feature — if you don't see Connectors in your sidebar yet, contact Hercules support to have it enabled. Until it's connected, this toggle can be turned on safely — WhatsApp sends are simply skipped until the connector is linked.
          </p>
        </div>

        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit ${enabled ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-green-500" : "bg-gray-400"}`} />
          {enabled ? "WhatsApp copies are currently on" : "WhatsApp copies are currently off"}
        </div>
      </div>
    </div>
  );
}

// ─── Features Tab — System Feature Toggle / Control Centre ─────────────────
// Extends the existing Settings page with controlled activation switches for
// the Documents/E-Signature/E-Stamp, Enhanced Internal Communications, and
// Management Reporting enhancements. Backed by convex/featureToggles.ts —
// state lives in the existing siteSettings table, every change is written to
// the existing audit log, and access requires an explicit FEATURE_TOGGLES
// permission (or legacy super_admin/admin) enforced server-side.

const FEATURE_ICONS: Record<string, React.ElementType> = {
  feature_enhanced_documents: FileText,
  feature_esignature: PenTool,
  feature_corporate_estamp: Stamp,
  feature_enhanced_communications: MessagesSquare,
  feature_management_reporting: BarChart3,
  feature_corporate_directory: Building2,
};

function FeaturesTab() {
  const access = useQuery(api.featureToggles.getMyFeatureSettingsAccess, {});
  const toggles = useQuery(api.featureToggles.listFeatureToggles, {});
  const setToggle = useMutation(api.featureToggles.setFeatureToggle);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState<string | null>(null);

  if (access === undefined) {
    return <div className="space-y-3 max-w-2xl">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>;
  }

  if (!access.canView) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <Lock size={28} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">You don't have permission to view system features</p>
        <p className="text-xs text-gray-400 mt-1">Ask a super administrator to grant the "View System Feature Toggles" permission under Access Control.</p>
      </div>
    );
  }

  const handleToggle = async (key: string, name: string, checked: boolean) => {
    setPendingKey(key);
    try {
      await setToggle({ key, enabled: checked });
      toast.success(checked ? `${name} is now ON` : `${name} is now OFF — existing data is preserved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update this feature");
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
        <ToggleLeft size={14} className="shrink-0 mt-0.5" />
        <span>
          Turning a feature <strong>OFF</strong> hides it from use — it never deletes documents, reports, or audit history.
          {!access.canManage && " You have view-only access; ask a super administrator to change these."}
        </span>
      </div>

      {!toggles ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : (
        toggles.map((t) => {
          const Icon = FEATURE_ICONS[t.key] ?? ToggleLeft;
          return (
            <div key={t.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Icon size={16} className="text-[var(--brand)]" /> {t.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{t.description}</p>
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-4">
                <div>
                  <p className="font-medium text-sm text-gray-800">{t.enabled ? "ON" : "OFF"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.changedByName
                      ? `Last changed by ${t.changedByName}${t.changedAt ? ` · ${formatDistanceToNow(new Date(t.changedAt), { addSuffix: true })}` : ""}`
                      : "Not changed yet"}
                  </p>
                </div>
                <Switch
                  checked={t.enabled}
                  onCheckedChange={(checked) => handleToggle(t.key, t.name, checked)}
                  disabled={!access.canManage || pendingKey === t.key}
                  className="cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg w-fit ${t.enabled ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${t.enabled ? "bg-green-500" : "bg-amber-500"}`} />
                  {t.name} is currently {t.enabled ? "ON" : "OFF"}
                </div>
                <button
                  onClick={() => setHistoryKey(historyKey === t.key ? null : t.key)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 cursor-pointer"
                >
                  <History size={12} /> {historyKey === t.key ? "Hide history" : "Audit history"}
                </button>
              </div>

              {historyKey === t.key && <FeatureToggleHistory featureKey={t.key} />}
            </div>
          );
        })
      )}
    </div>
  );
}

// Reuses the existing audit log (auditLog table via taskboard.listAuditLogPaginated)
// filtered to this feature's entityRef — no separate history store.
function FeatureToggleHistory({ featureKey }: { featureKey: string }) {
  const entries = useQuery(api.taskboard.listAuditLogPaginated, {
    entity: "feature_toggle",
    paginationOpts: { numItems: 10, cursor: null },
  });

  const rows = entries?.page.filter((e) => e.entityRef === featureKey) ?? [];

  if (entries === undefined) return <div className="pt-2"><Skeleton className="h-16 w-full" /></div>;
  if (rows.length === 0) return <p className="text-xs text-gray-400 pt-2">No changes recorded yet for this feature.</p>;

  return (
    <div className="pt-2 space-y-1.5 border-t border-gray-100 mt-2">
      {rows.map((e) => (
        <div key={e._id} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-gray-50">
          <span className="text-gray-700">{e.description}</span>
          <span className="text-gray-400 shrink-0 ml-2">{formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}</span>
        </div>
      ))}
    </div>
  );
}
