"use client";
import { useState, useRef } from "react";
import type React from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { sourceOf, STAT_SOURCE_LABELS, type StatItem, type StatSource } from "@/lib/stats.ts";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { RichTextEditor } from "@/components/ui/rich-text-editor.tsx";
import SeoFields from "@/components/SeoFields.tsx";
import { toast } from "sonner";
import { Layers, Newspaper, Star, BarChart2, Info, Wrench, Handshake,
  Users, Plus, Pencil, Trash2, Eye, EyeOff, GripVertical,
  CheckCircle2, XCircle, Image as ImageIcon, Video, LayoutGrid, Link2,
  MessageCircle, Upload, Search, Loader2, ExternalLink, Monitor
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import type { ContactData, Office } from "@/hooks/use-contact-info.ts";
import { parseContact } from "@/hooks/use-contact-info.ts";

// ─── Tab types ────────────────────────────────────────────────────────────

type Tab = "hero" | "categories" | "about" | "services" | "blog" | "testimonials" | "stats" | "partners" | "subscribers" | "comments" | "contact" | "legal";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "hero", label: "Hero Slides", icon: Layers },
  { id: "categories", label: "Property Categories", icon: LayoutGrid },
  { id: "about", label: "About Section", icon: Info },
  { id: "contact", label: "Contact Info", icon: MessageCircle },
  { id: "services", label: "Services", icon: Wrench },
  { id: "blog", label: "Blog / News", icon: Newspaper },
  { id: "comments", label: "Comments", icon: MessageCircle },
  { id: "testimonials", label: "Testimonials", icon: Star },
  { id: "stats", label: "Stats Bar", icon: BarChart2 },
  { id: "partners", label: "Partners & Awards", icon: Handshake },
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "legal", label: "Legal Pages", icon: Link2 },
];

// ─── Default content ──────────────────────────────────────────────────────

const DEFAULT_STATS = [
  { value: "500+", label: "Properties Sold", icon: "🏠" },
  { value: "50+", label: "Premium Estates", icon: "🏙️" },
  { value: "12,000+", label: "Happy Clients", icon: "👥" },
  { value: "₦50B+", label: "Total Transactions", icon: "💰" },
  { value: "15+", label: "Years Experience", icon: "🏆" },
  { value: "26", label: "States Covered", icon: "📍" },
];

const DEFAULT_ABOUT = {
  heading: "Nigeria's Premier Real Estate Development Company",
  tagline: "Who We Are",
  para1: "Geodata World Services Limited is a leading real estate development and property management company with over 15 years of experience transforming Nigeria's built environment.",
  para2: "Our mission is to make quality real estate ownership accessible, transparent, and rewarding for every Nigerian — from first-time buyers to institutional investors.",
  badgeText: "15+ Years",
  badgeSub: "Of Trusted Real Estate Excellence",
  imageUrl: "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
  imageStorageId: null as string | null,
  services: ["Property Sales & Leasing","Estate Development","Land Acquisition","Construction Management","Property Management","Investment Advisory","Legal Documentation","Valuation Services"],
};

const DEFAULT_SERVICES = [
  { title: "Estate Development", description: "Master-planned residential and commercial estates with full infrastructure — roads, water, electricity, and security.", imageUrl: "https://images.unsplash.com/photo-1543414347-1c348021f279?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", imageStorageId: null as string | null },
  { title: "Property Investment", description: "Expert advisory on high-yield real estate investments with proven returns across Nigeria's fastest-growing cities.", imageUrl: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", imageStorageId: null as string | null },
  { title: "Construction Services", description: "End-to-end construction management for residential and commercial projects, delivered on time and on budget.", imageUrl: "https://images.unsplash.com/photo-1515263487990-61b07816b324?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600", imageStorageId: null as string | null },
];

const DEFAULT_PARTNERS = {
  partners: ["Access Bank","GTBank","Zenith Bank","First Bank","UBA","Stanbic IBTC","FMBN","Family Homes Fund"],
  awards: [
    { year: "2023", award: "Best Real Estate Company – Nigeria Property Awards" },
    { year: "2022", award: "Excellence in Estate Development – West Africa Real Estate Summit" },
    { year: "2021", award: "Top 10 Property Developers – Housing Finance Africa" },
    { year: "2020", award: "Customer Excellence Award – Nigerian Institute of Estate Surveyors" },
  ],
};

// ─── Shared helpers ──────────────────────────────────────────────────────

function useSetting(key: string) {
  return useQuery(api.cms.getSiteSettings, { key });
}
function parseSetting<T>(raw: string | null | undefined, def: T): T {
  if (!raw) return def;
  try { return JSON.parse(raw) as T; } catch { return def; }
}

// ─── Hero Slides Tab ─────────────────────────────────────────────────────

type SlideRecord = {
  _id: Id<"heroSlides">;
  mediaType: "image" | "video";
  mediaStorageId?: Id<"_storage">;
  mediaUrl: string | null;
  tag: string; headline: string; subheadline: string; body: string;
  order: number; active: boolean;
};

type SlideForm = {
  mediaType: "image" | "video";
  mediaStorageId: Id<"_storage"> | null;
  mediaPreviewUrl: string;
  externalUrl: string; // URL-based alternative
  useUrl: boolean; // whether to use external URL instead of upload
  tag: string;
  headline: string;
  subheadline: string;
  body: string;
  order: number;
  active: boolean;
};

const emptySlide = (): SlideForm => ({
  mediaType: "image", mediaStorageId: null, mediaPreviewUrl: "",
  externalUrl: "", useUrl: false,
  tag: "", headline: "", subheadline: "", body: "", order: 0, active: true,
});

function HeroSlidesTab() {
  const slides = useQuery(api.cms.listHeroSlides);
  const createSlide = useMutation(api.cms.createHeroSlide);
  const updateSlide = useMutation(api.cms.updateHeroSlide);
  const deleteSlide = useMutation(api.cms.deleteHeroSlide);
  const upsertStyle = useMutation(api.cms.upsertSiteSettings);
  const rawStyle = useQuery(api.cms.getSiteSettings, { key: "hero_style" });
  const heroStyle: "A" | "B" | "C" = rawStyle === "B" ? "B" : rawStyle === "C" ? "C" : "A";
  const [savingStyle, setSavingStyle] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<SlideForm>(emptySlide());
  const [saving, setSaving] = useState(false);

  const openNew = () => { setEditing(null); setForm({ ...emptySlide(), order: (slides?.length ?? 0) + 1 }); setOpen(true); };
  const openEdit = (s: SlideRecord) => {
    const hasStorageId = !!s.mediaStorageId;
    setEditing(s._id);
    setForm({
      mediaType: s.mediaType,
      mediaStorageId: s.mediaStorageId ?? null,
      mediaPreviewUrl: s.mediaUrl ?? "",
      externalUrl: !hasStorageId ? (s.mediaUrl ?? "") : "",
      useUrl: !hasStorageId,
      tag: s.tag, headline: s.headline, subheadline: s.subheadline, body: s.body, order: s.order, active: s.active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const hasMedia = form.useUrl ? !!form.externalUrl.trim() : !!form.mediaStorageId;
    if (!hasMedia) { toast.error("Please upload a file or enter an image URL"); return; }
    if (!form.headline || !form.tag) { toast.error("Headline and tag are required"); return; }
    setSaving(true);
    try {
      const payload = {
        mediaType: form.mediaType,
        mediaStorageId: form.useUrl ? undefined : (form.mediaStorageId ?? undefined),
        mediaUrl: form.useUrl ? form.externalUrl.trim() : undefined,
        tag: form.tag, headline: form.headline, subheadline: form.subheadline,
        body: form.body, order: form.order, active: form.active,
      };
      if (editing) {
        await updateSlide({ id: editing as Id<"heroSlides">, ...payload });
      } else {
        await createSlide(payload);
      }
      toast.success(editing ? "Slide updated" : "Slide created");
      setOpen(false);
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const handleToggle = async (s: SlideRecord) => {
    await updateSlide({ id: s._id, active: !s.active });
    toast.success(s.active ? "Slide hidden" : "Slide visible");
  };

  const handleDelete = async (s: SlideRecord) => {
    if (!confirm(`Delete slide "${s.headline}"?`)) return;
    await deleteSlide({ id: s._id });
    toast.success("Slide deleted");
  };

  return (
    <div className="space-y-6">

      {/* ── Hero Style Switcher ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Monitor size={15} className="text-[var(--brand)]" />
          <h2 className="font-bold text-gray-900">Hero Style</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">Choose the visual layout of your homepage hero. Changes live immediately.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            {
              id: "A" as const,
              label: "Cinematic Fade",
              desc: "Full-screen image with dark overlay, bold headline centred, and a search bar at the bottom.",
              preview: (
                <div className="w-full h-full bg-gray-900 relative overflow-hidden rounded-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-gray-900/40" />
                  <div className="absolute inset-0 flex flex-col justify-center px-3 gap-1">
                    <div className="w-12 h-1.5 rounded-full bg-[var(--brand)]" />
                    <div className="w-24 h-2.5 rounded bg-white/80" />
                    <div className="w-16 h-2 rounded bg-white/50" />
                    <div className="w-20 h-1.5 rounded bg-white/30 mt-1" />
                    <div className="flex gap-1 mt-2">
                      <div className="h-4 w-10 rounded bg-[var(--brand)]" />
                      <div className="h-4 w-10 rounded bg-white/20 border border-white/30" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 h-5 rounded-lg bg-white/90" />
                </div>
              ),
            },
            {
              id: "B" as const,
              label: "Split-Screen Editorial",
              desc: "Brand-coloured left panel with bold typography. Property image wipes in from the right.",
              preview: (
                <div className="w-full h-full flex rounded-lg overflow-hidden">
                  <div className="w-1/2 bg-[var(--brand)] flex flex-col justify-center px-2 gap-1">
                    <div className="w-8 h-1 rounded bg-white/40" />
                    <div className="w-14 h-2 rounded bg-white/90" />
                    <div className="w-10 h-1.5 rounded bg-white/50" />
                    <div className="w-12 h-1 rounded bg-white/30 mt-0.5" />
                    <div className="flex gap-1 mt-1.5">
                      <div className="h-3 w-8 rounded bg-white" />
                      <div className="h-3 w-8 rounded border border-white/40" />
                    </div>
                  </div>
                  <div className="w-1/2 bg-gray-700 relative">
                    <div className="absolute inset-x-0 left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-[var(--brand)] to-transparent" />
                    <div className="absolute bottom-2 left-2 right-1 h-5 bg-white/90 rounded-lg" />
                  </div>
                </div>
              ),
            },
            {
              id: "C" as const,
              label: "Card Stack (3D)",
              desc: "Active card centre-stage with peek cards on each side. 3D perspective tilt transitions.",
              preview: (
                <div className="w-full h-full bg-[#0c1a2e] relative flex rounded-lg overflow-hidden">
                  <div className="w-[14%] bg-gray-700/60 relative">
                    <div className="absolute right-0 inset-y-0 w-4 bg-gradient-to-r from-transparent to-[#0c1a2e]" />
                  </div>
                  <div className="flex-1 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gray-600" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c1a2e]/80 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-end px-2 pb-2 gap-1">
                      <div className="w-16 h-2.5 rounded bg-white/80" />
                      <div className="w-12 h-1.5 rounded bg-[var(--brand)]" />
                      <div className="w-full h-4 rounded-lg bg-white/15 mt-1" />
                    </div>
                  </div>
                  <div className="w-[14%] bg-gray-700/60 relative">
                    <div className="absolute left-0 inset-y-0 w-4 bg-gradient-to-l from-transparent to-[#0c1a2e]" />
                  </div>
                </div>
              ),
            },
          ] satisfies { id: "A" | "B" | "C"; label: string; desc: string; preview: React.ReactNode }[]).map(({ id, label, desc, preview }) => {
            const active = heroStyle === id;
            return (
              <button
                key={id}
                onClick={async () => {
                  if (active) return;
                  setSavingStyle(true);
                  try {
                    await upsertStyle({ key: "hero_style", value: id });
                    toast.success(`Hero style switched to "${label}"`);
                  } catch { toast.error("Failed to save style"); }
                  finally { setSavingStyle(false); }
                }}
                disabled={savingStyle}
                className={cn(
                  "text-left rounded-2xl border-2 p-3 transition-all duration-200 cursor-pointer group",
                  active
                    ? "border-[var(--brand)] bg-[var(--brand)]/5 shadow-md"
                    : "border-gray-200 hover:border-[var(--brand)]/50 hover:shadow-sm"
                )}
              >
                {/* Mini preview */}
                <div className="w-full aspect-video mb-3 rounded-lg overflow-hidden border border-gray-100">
                  {preview}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className={cn("text-sm font-bold", active ? "text-[var(--brand)]" : "text-gray-800")}>{label}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</div>
                  </div>
                  {active && (
                    <span className="shrink-0 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-[var(--brand)] text-white mt-0.5">
                      Active
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Slides management ── */}
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg text-gray-900">Hero Slides</h2>
          <p className="text-sm text-gray-500">Manage the homepage hero carousel. Supports images and videos.</p>
        </div>
        <Button onClick={openNew} className="bg-[var(--brand)] text-white gap-1.5"><Plus size={15} />Add Slide</Button>
      </div>

      {slides === undefined ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : slides.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
          <Layers size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No slides yet</p>
          <p className="text-sm mt-1">Add your first hero slide to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((s) => (
            <div key={s._id} className={cn("bg-white rounded-2xl border p-4 flex items-center gap-4", !s.active && "opacity-60")}>
              <GripVertical size={16} className="text-gray-300 shrink-0" />
              <div className="w-20 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {s.mediaType === "video" ? (
                  <video src={s.mediaUrl ?? undefined} className="w-full h-full object-cover" />
                ) : (
                  <img src={s.mediaUrl ?? undefined} alt={s.headline} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm text-gray-900 truncate">{s.headline}</span>
                  {s.mediaType === "video" ? <Badge className="text-[10px] bg-purple-100 text-purple-700 border-0"><Video size={9} className="mr-0.5" />Video</Badge> : <Badge className="text-[10px] bg-blue-50 text-[var(--brand)] border-0"><ImageIcon size={9} className="mr-0.5" />Image</Badge>}
                  {!s.active && <Badge className="text-[10px] bg-gray-100 text-gray-500 border-0">Hidden</Badge>}
                </div>
                <p className="text-xs text-gray-400 truncate">{s.tag} · {s.subheadline}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => handleToggle(s)} title={s.active ? "Hide" : "Show"} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  {s.active ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => openEdit(s)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(s)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Slide" : "New Hero Slide"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Media Type</label>
              <div className="flex gap-2">
                {(["image","video"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, mediaType: t }))}
                    className={cn("flex-1 py-2 rounded-xl border text-sm font-medium capitalize transition-colors flex items-center justify-center gap-1.5",
                      form.mediaType === t ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand)]/50")}>
                    {t === "image" ? <ImageIcon size={14} /> : <Video size={14} />}{t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                {form.mediaType === "video" ? "Video File" : "Image File"}
              </label>
              {/* Toggle between upload and URL */}
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setForm((f) => ({ ...f, useUrl: false }))}
                  className={cn("flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1",
                    !form.useUrl ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand)]/40")}>
                  <ImageIcon size={12} /> Upload File
                </button>
                <button type="button" onClick={() => setForm((f) => ({ ...f, useUrl: true }))}
                  className={cn("flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1",
                    form.useUrl ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand)]/40")}>
                  <Link2 size={12} /> Paste URL
                </button>
              </div>
              {form.useUrl ? (
                <div>
                  <Input
                    placeholder="https://images.unsplash.com/..."
                    value={form.externalUrl}
                    onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))}
                    className="text-sm"
                  />
                  {form.externalUrl && (
                    <img src={form.externalUrl} alt="Preview" className="mt-2 rounded-xl h-28 w-full object-cover border border-gray-200" onError={(e) => (e.currentTarget.style.display = "none")} />
                  )}
                </div>
              ) : (
                <FileUploadButton
                  variant="dropzone"
                  mediaType={form.mediaType}
                  label={`Click to upload ${form.mediaType}`}
                  currentUrl={form.mediaPreviewUrl || null}
                  currentStorageId={form.mediaStorageId}
                  onUpload={(storageId) => setForm((f) => ({ ...f, mediaStorageId: storageId }))}
                  onClear={() => setForm((f) => ({ ...f, mediaStorageId: null, mediaPreviewUrl: "" }))}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Tag / Badge</label>
                <Input placeholder="e.g. Luxury Residences" value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Order</label>
                <Input type="number" min={1} value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Headline</label>
              <Input placeholder="Unlock Your Future" value={form.headline} onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Sub-headline</label>
              <Input placeholder="One Key. Endless Opportunities." value={form.subheadline} onChange={(e) => setForm((f) => ({ ...f, subheadline: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Body Text</label>
              <Textarea rows={3} placeholder="Slide body text…" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="rounded" />
              <label htmlFor="active" className="text-sm text-gray-700 cursor-pointer">Visible on website</label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[var(--brand)] text-white">{saving ? "Saving…" : "Save Slide"}</Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>{/* end slides management */}
    </div>
  );
}

const ICON_OPTIONS = ["Home", "Building2", "Trees", "Landmark", "Store", "Warehouse"];
const DEFAULT_CATEGORIES = [
  { icon: "Home", label: "Residential", count: "120+", href: "/properties?type=residential", image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400", mediaType: "image" as const, imageStorageId: null as string | null, active: true },
  { icon: "Building2", label: "Commercial", count: "45+", href: "/properties?type=commercial", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400", mediaType: "image" as const, imageStorageId: null as string | null, active: true },
];
type CategoryItem = {
  icon: string; label: string; count: string; href: string; image: string;
  mediaType: "image" | "video";
  imageStorageId: string | null;
  active: boolean;
  useUrl?: boolean; // UI-only: toggle between upload and URL
};

function parseCategoryItems(raw: string | null | undefined): CategoryItem[] {
  if (!raw) return DEFAULT_CATEGORIES;
  try {
    const parsed = JSON.parse(raw) as Partial<CategoryItem>[];
    return parsed.map((c) => ({
      icon: c.icon ?? "Home",
      label: c.label ?? "",
      count: c.count ?? "0+",
      href: c.href ?? "/properties",
      image: c.image ?? "",
      mediaType: (c.mediaType as "image" | "video") ?? "image",
      imageStorageId: c.imageStorageId ?? null,
      active: c.active !== false, // default true for existing items without the field
      useUrl: !c.imageStorageId,
    }));
  } catch { return DEFAULT_CATEGORIES; }
}

function CategoriesTab() {
  const raw = useSetting("categories");
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [cats, setCats] = useState<CategoryItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [highlightLast, setHighlightLast] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const data: CategoryItem[] = cats ?? parseCategoryItems(raw);

  const update = (i: number, patch: Partial<CategoryItem>) => {
    const next = [...data]; next[i] = { ...next[i], ...patch }; setCats(next);
  };

  const addCategory = () => {
    const current = cats ?? parseCategoryItems(raw);
    setCats([...current, {
      icon: "Home", label: "New Category", count: "0+",
      href: "/properties", image: "", mediaType: "image",
      imageStorageId: null, useUrl: true, active: true,
    }]);
    // Scroll the new card into view after React re-renders
    setHighlightLast(true);
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => setHighlightLast(false), 1500);
    }, 80);
  };

  const removeCategory = (i: number) => setCats(data.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true);
    try {
      // Strip UI-only `useUrl` field before saving
      const toSave = data.map(({ useUrl: _u, ...rest }) => rest);
      await upsert({ key: "categories", value: JSON.stringify(toSave) });
      toast.success("Categories saved!");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg text-gray-900">Property Categories</h2>
          <p className="text-sm text-gray-500">Edit the "Browse by Category" section. Each card supports an uploaded image or video, or a URL.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={addCategory} className="gap-1"><Plus size={13} />Add Category</Button>
          <Button onClick={save} disabled={saving} className="bg-[var(--brand)] text-white">{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>
      {raw === undefined ? <Skeleton className="h-48 w-full" /> : (
        <div className="space-y-4">
          {data.map((cat, i) => {
            const isNew = highlightLast && i === data.length - 1;
            return (
            <div
              key={i}
              ref={isNew ? bottomRef : null}
              className={cn(
                "bg-white rounded-2xl border p-4 space-y-4 transition-all duration-500",
                isNew ? "border-[var(--brand)] shadow-[0_0_0_3px_rgba(11,77,187,0.15)]" : "border-gray-100",
                !cat.active && "opacity-60"
              )}
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => update(i, { active: !cat.active })}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                      cat.active ? "bg-[var(--brand)]" : "bg-gray-300"
                    )}
                    title={cat.active ? "Click to hide on landing page" : "Click to show on landing page"}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200",
                      cat.active ? "translate-x-4" : "translate-x-0"
                    )} />
                  </button>
                  <span className={cn("text-sm font-semibold", cat.active ? "text-gray-700" : "text-gray-400 line-through")}>
                    Category {i + 1} — {cat.label || "Untitled"}
                  </span>
                  {!cat.active && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Hidden</span>
                  )}
                </div>
                <button type="button" onClick={() => removeCategory(i)}
                  className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 text-red-500 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Text fields */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Label</label>
                  <Input value={cat.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Residential" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Count Text</label>
                  <Input value={cat.count} onChange={(e) => update(i, { count: e.target.value })} placeholder="120+" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Link URL</label>
                  <Input value={cat.href} onChange={(e) => update(i, { href: e.target.value })} placeholder="/properties?type=residential" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Icon</label>
                  <select value={cat.icon} onChange={(e) => update(i, { icon: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    {ICON_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Media type toggle */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Background Media Type</label>
                <div className="flex gap-2 mb-3">
                  {(["image", "video"] as const).map((t) => (
                    <button key={t} type="button"
                      onClick={() => update(i, { mediaType: t, imageStorageId: null, image: "", useUrl: true })}
                      className={cn("flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-colors flex items-center justify-center gap-1.5",
                        cat.mediaType === t ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand)]/40")}>
                      {t === "image" ? <ImageIcon size={12} /> : <Video size={12} />}{t}
                    </button>
                  ))}
                </div>

                {/* Upload vs URL toggle */}
                <div className="flex gap-2 mb-2">
                  <button type="button"
                    onClick={() => update(i, { useUrl: false })}
                    className={cn("flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1",
                      !cat.useUrl ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand)]/40")}>
                    <Upload size={11} /> Upload File
                  </button>
                  <button type="button"
                    onClick={() => update(i, { useUrl: true })}
                    className={cn("flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1",
                      cat.useUrl ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand)]/40")}>
                    <Link2 size={11} /> Paste URL
                  </button>
                </div>

                {cat.useUrl ? (
                  <div>
                    <Input
                      placeholder={cat.mediaType === "video" ? "https://example.com/video.mp4" : "https://images.unsplash.com/…"}
                      value={cat.image}
                      onChange={(e) => update(i, { image: e.target.value, imageStorageId: null })}
                    />
                    {cat.image && cat.mediaType === "image" && (
                      <img src={cat.image} alt={cat.label} className="mt-2 h-20 w-full rounded-xl object-cover border border-gray-200"
                        onError={(e) => (e.currentTarget.style.display = "none")} />
                    )}
                    {cat.image && cat.mediaType === "video" && (
                      <video src={cat.image} className="mt-2 h-20 w-full rounded-xl object-cover border border-gray-200" muted />
                    )}
                  </div>
                ) : (
                  <FileUploadButton
                    variant="dropzone"
                    mediaType={cat.mediaType}
                    label={`Click to upload ${cat.mediaType}`}
                    currentUrl={cat.imageStorageId ? cat.image : null}
                    currentStorageId={cat.imageStorageId ? (cat.imageStorageId as Id<"_storage">) : null}
                    onUpload={(storageId) => update(i, { imageStorageId: storageId, useUrl: false })}
                    onClear={() => update(i, { imageStorageId: null, image: "", useUrl: false })}
                  />
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Blog Tab ─────────────────────────────────────────────────────────────

type ArticleRecord = {
  _id: Id<"newsArticles">; title: string; excerpt: string; content: string;
  imageUrl: string | null; imageStorageId?: Id<"_storage">;
  category: string; author: string; published: boolean;
  featured?: boolean; slug: string; tags?: string[];
  seoTitle?: string; seoDescription?: string;
};

type ArticleForm = {
  title: string; excerpt: string; content: string;
  imageStorageId: Id<"_storage"> | null; imagePreviewUrl: string;
  category: string; author: string;
  published: boolean; featured: boolean; slug: string; tags: string;
  seoTitle: string; seoDescription: string;
};

const ARTICLE_CATEGORIES = ["Market Insights","Investment","Legal Guide","Company News","Buyer Guide","Lifestyle","Events","Announcements"];

const emptyArticle = (): ArticleForm => ({
  title: "", excerpt: "", content: "", imageStorageId: null, imagePreviewUrl: "",
  category: "Market Insights", author: "Geodata World Services", published: false,
  featured: false, slug: "", tags: "", seoTitle: "", seoDescription: "",
});

function BlogTab() {
  const ADMIN_PAGE_SIZE = 15;
  const { results: articles, status, loadMore } = usePaginatedQuery(
    api.cms.listNewsArticlesAdmin,
    {},
    { initialNumItems: ADMIN_PAGE_SIZE }
  );
  const createArticle = useMutation(api.cms.createNewsArticle);
  const updateArticle = useMutation(api.cms.updateNewsArticle);
  const deleteArticle = useMutation(api.cms.deleteNewsArticle);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleForm>(emptyArticle());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const makeSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const openNew = () => { setEditing(null); setForm(emptyArticle()); setOpen(true); };
  const openEdit = (a: ArticleRecord) => {
    setEditing(a._id);
    setForm({
      title: a.title, excerpt: a.excerpt, content: a.content,
      imageStorageId: a.imageStorageId ?? null, imagePreviewUrl: a.imageUrl ?? "",
      category: a.category, author: a.author, published: a.published,
      featured: a.featured ?? false, slug: a.slug, tags: (a.tags ?? []).join(", "),
      seoTitle: a.seoTitle ?? "", seoDescription: a.seoDescription ?? "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error("Title is required"); return; }
    const slug = form.slug || makeSlug(form.title);
    setSaving(true);
    try {
      const payload = {
        title: form.title, excerpt: form.excerpt, content: form.content,
        imageStorageId: form.imageStorageId ?? undefined,
        category: form.category, author: form.author,
        published: form.published, featured: form.featured, slug,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        seoTitle: form.seoTitle.trim(),
        seoDescription: form.seoDescription.trim(),
      };
      if (editing) {
        await updateArticle({ id: editing as Id<"newsArticles">, ...payload });
      } else {
        await createArticle(payload);
      }
      toast.success(editing ? "Article updated" : "Article created");
      setOpen(false);
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const handleTogglePublish = async (a: ArticleRecord) => {
    await updateArticle({ id: a._id, published: !a.published });
    toast.success(a.published ? "Unpublished" : "Published");
  };

  const handleDelete = async (a: ArticleRecord) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    await deleteArticle({ id: a._id });
    toast.success("Article deleted");
  };

  const filtered = articles.filter((a) => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.category ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (statusFilter === "published" ? a.published : !a.published);
    return matchSearch && matchStatus;
  });

  const isLoading = status === "LoadingFirstPage";
  const canLoadMore = status === "CanLoadMore";
  const isLoadingMore = status === "LoadingMore";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-lg text-gray-900">Blog & News Articles</h2>
          <p className="text-sm text-gray-500">Create, edit, and publish blog posts and market updates.</p>
        </div>
        <Button onClick={openNew} className="bg-[var(--brand)] text-white gap-1.5"><Plus size={15} />New Article</Button>
      </div>

      {/* Search & filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles..." className="pl-8 h-8 text-sm" />
        </div>
        <div className="flex gap-1">
          {(["all", "published", "draft"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer capitalize",
                statusFilter === s ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        {articles.length > 0 && (
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} article{filtered.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
          <Newspaper size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">{articles.length === 0 ? "No articles yet" : "No matching articles"}</p>
          <p className="text-sm mt-1">{articles.length === 0 ? "Create your first article to share news and insights." : "Try a different search or filter."}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            {filtered.map((a) => (
              <div key={a._id} className="bg-white rounded-2xl border p-4 flex items-center gap-4 hover:border-gray-200 transition-colors">
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {a.imageUrl ? <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Newspaper size={18} /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-gray-900 truncate">{a.title}</span>
                    {a.featured && <Badge className="text-[10px] bg-amber-50 text-amber-700 border-0">Featured</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-[10px] border-0", a.published ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500")}>
                      {a.published ? <><CheckCircle2 size={9} className="mr-0.5" />Published</> : <><XCircle size={9} className="mr-0.5" />Draft</>}
                    </Badge>
                    <span className="text-xs text-gray-400">{a.category}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{a.author}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleTogglePublish(a)} title={a.published ? "Unpublish" : "Publish"} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer">
                    {a.published ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => openEdit(a)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(a)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 text-red-500 transition-colors cursor-pointer"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Load more / pagination footer */}
          {(canLoadMore || isLoadingMore) && !search && statusFilter === "all" && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button onClick={() => loadMore(ADMIN_PAGE_SIZE)} disabled={isLoadingMore} variant="ghost"
                className="border border-gray-200 hover:border-[var(--brand)] text-sm gap-2 cursor-pointer">
                {isLoadingMore ? <><Loader2 size={14} className="animate-spin" /> Loading...</> : "Load More Articles"}
              </Button>
            </div>
          )}
          {status === "Exhausted" && articles.length > ADMIN_PAGE_SIZE && !search && (
            <p className="text-center text-xs text-gray-400 pt-2">All {articles.length} articles loaded</p>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Article" : "New Article"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Featured Image</label>
              <FileUploadButton
                variant="dropzone"
                mediaType="image"
                label="Click to upload cover image"
                currentUrl={form.imagePreviewUrl || null}
                currentStorageId={form.imageStorageId}
                onUpload={(storageId) => setForm((f) => ({ ...f, imageStorageId: storageId }))}
                onClear={() => setForm((f) => ({ ...f, imageStorageId: null, imagePreviewUrl: "" }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Title *</label>
              <Input placeholder="Article title…" value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: makeSlug(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Category</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  {ARTICLE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Author</label>
                <Input placeholder="Author name" value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Slug (URL)</label>
              <Input placeholder="article-url-slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Excerpt / Summary</label>
              <Textarea rows={2} placeholder="Short description shown in the article list…" value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Content</label>
              <RichTextEditor
                value={form.content}
                onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                placeholder="Start writing your article here. Use the toolbar above to format headings, bold text, lists, alignment, and more."
                minHeight={360}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Tags (comma-separated)</label>
              <Input placeholder="real estate, abuja, investment" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
            </div>
            <SeoFields
              title={form.seoTitle}
              description={form.seoDescription}
              fallbackTitle={form.title ? `${form.title} | Geodata World Services` : "Automatic title from the article title"}
              fallbackDescription={form.excerpt || "Automatic description from the article excerpt"}
              path={`/news/${form.slug || makeSlug(form.title) || "…"}`}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">Published</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">Featured (hero slot)</span>
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[var(--brand)] text-white">{saving ? "Saving…" : "Save Article"}</Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Testimonials Tab ────────────────────────────────────────────────────

// ─── Comments Tab ─────────────────────────────────────────────────────────

type CommentRecord = {
  _id: Id<"blogComments">;
  articleId: Id<"newsArticles">;
  name: string;
  email?: string;
  content: string;
  approved: boolean;
  _creationTime: number;
};

function CommentsTab() {
  const {
    rows: pending,
    pageIndex: pendingPageIndex,
    hasNextPage: pendingHasNext,
    hasPrevPage: pendingHasPrev,
    isLoading: pendingLoading,
    nextPage: pendingNextPage,
    prevPage: pendingPrevPage,
  } = useCursorPagination(api.cms.listAllCommentsPaginated, { approved: false }, 10);
  const {
    rows: approved,
    pageIndex: approvedPageIndex,
    hasNextPage: approvedHasNext,
    hasPrevPage: approvedHasPrev,
    isLoading: approvedLoading,
    nextPage: approvedNextPage,
    prevPage: approvedPrevPage,
  } = useCursorPagination(api.cms.listAllCommentsPaginated, { approved: true }, 10);
  const approve = useMutation(api.cms.approveComment);
  const del = useMutation(api.cms.deleteComment);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });

  const handleApprove = async (c: CommentRecord, approved: boolean) => {
    await approve({ id: c._id as Id<"blogComments">, approved });
    toast.success(approved ? "Comment approved" : "Comment hidden");
  };

  const handleDelete = async (c: CommentRecord) => {
    if (!confirm("Delete this comment?")) return;
    await del({ id: c._id as Id<"blogComments"> });
    toast.success("Comment deleted");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-lg text-gray-900">Blog Comments</h2>
        <p className="text-sm text-gray-500">Review and approve reader comments on blog articles.</p>
      </div>

      {pendingLoading && approvedLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          <div>
            <h3 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-xs">{pending.length}</span>
              Pending Review
            </h3>
            {pendingLoading ? (
              <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : pending.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No pending comments.</p>
            ) : (
              <div className="space-y-2">
                {pending.map((c) => (
                  <div key={c._id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900">{c.name}</span>
                          {c.email && <span className="text-xs text-gray-400">{c.email}</span>}
                          <span className="text-xs text-gray-400">{formatDate(c._creationTime)}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleApprove(c as CommentRecord, true)}
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors cursor-pointer">
                          Approve
                        </button>
                        <button onClick={() => handleDelete(c as CommentRecord)}
                          className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!pendingLoading && pending.length > 0 && (
              <TablePager pageIndex={pendingPageIndex} hasNextPage={pendingHasNext} hasPrevPage={pendingHasPrev} onNext={pendingNextPage} onPrev={pendingPrevPage} className="bg-white rounded-2xl border border-gray-100" />
            )}
          </div>

          {/* Approved */}
          <div>
            <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-xs">{approved.length}</span>
              Published Comments
            </h3>
            {approvedLoading ? (
              <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : approved.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No published comments yet.</p>
            ) : (
              <div className="space-y-2">
                {approved.map((c) => (
                  <div key={c._id} className="bg-white border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900">{c.name}</span>
                          {c.email && <span className="text-xs text-gray-400">{c.email}</span>}
                          <span className="text-xs text-gray-400">{formatDate(c._creationTime)}</span>
                          <Badge className="text-[10px] bg-green-50 text-green-700 border-0"><CheckCircle2 size={9} className="mr-0.5" />Approved</Badge>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleApprove(c as CommentRecord, false)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer">
                          Unpublish
                        </button>
                        <button onClick={() => handleDelete(c as CommentRecord)}
                          className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!approvedLoading && approved.length > 0 && (
              <TablePager pageIndex={approvedPageIndex} hasNextPage={approvedHasNext} hasPrevPage={approvedHasPrev} onNext={approvedNextPage} onPrev={approvedPrevPage} className="bg-white rounded-2xl border border-gray-100" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}



type TestimonialRecord = {
  _id: Id<"testimonials">; name: string; role: string; content: string;
  rating: number; avatarUrl: string | null; avatarStorageId?: Id<"_storage">; featured: boolean;
  location?: string; propertyType?: string; date?: string; order?: number;
};

type TestimonialForm = {
  name: string; role: string; content: string; rating: number;
  avatarStorageId: Id<"_storage"> | null; avatarPreviewUrl: string; featured: boolean;
  location: string; propertyType: string; date: string;
};

const emptyTestimonial = (): TestimonialForm => ({
  name: "", role: "", content: "", rating: 5,
  avatarStorageId: null, avatarPreviewUrl: "", featured: false,
  location: "", propertyType: "", date: "",
});

function TestimonialDialog({
  open,
  onClose,
  editing,
  form,
  setForm,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  editing: string | null;
  form: TestimonialForm;
  setForm: React.Dispatch<React.SetStateAction<TestimonialForm>>;
  onSave: () => void;
  saving: boolean;
}) {
  const set = (k: keyof TestimonialForm, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Client Story" : "Add Client Story"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Photo */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Client Photo</label>
            <FileUploadButton
              variant="button"
              mediaType="image"
              label="Upload Photo"
              currentUrl={form.avatarPreviewUrl || null}
              currentStorageId={form.avatarStorageId}
              onUpload={(id) => set("avatarStorageId", id)}
              onClear={() => { set("avatarStorageId", null); set("avatarPreviewUrl", ""); }}
            />
          </div>

          {/* Name + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name <span className="text-red-500">*</span></label>
              <Input placeholder="e.g. Adaeze Okonkwo" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Title / Role</label>
              <Input placeholder="e.g. Property Investor" value={form.role} onChange={(e) => set("role", e.target.value)} />
            </div>
          </div>

          {/* Location + Property Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Location</label>
              <Input placeholder="e.g. Lagos, Nigeria" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Property Type</label>
              <Input placeholder="e.g. Residential Plot" value={form.propertyType} onChange={(e) => set("propertyType", e.target.value)} />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Date of Review</label>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>

          {/* Review */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Review / Testimonial <span className="text-red-500">*</span></label>
            <Textarea rows={4} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Write the client's experience in their own words…" />
            <p className="text-[11px] text-gray-400 mt-1">{form.content.length} characters</p>
          </div>

          {/* Rating */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Star Rating</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("rating", n)}
                  className={cn("text-3xl transition-transform hover:scale-110 cursor-pointer", n <= form.rating ? "text-amber-400" : "text-gray-200")}
                >★</button>
              ))}
              <span className="ml-2 self-center text-sm text-gray-500">{form.rating} / 5</span>
            </div>
          </div>

          {/* Featured */}
          <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
            <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="rounded w-4 h-4" />
            <div>
              <span className="text-sm font-medium text-gray-800 block">Show on homepage</span>
              <span className="text-xs text-gray-400">Featured stories appear in the "Client Stories" section</span>
            </div>
          </label>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={onSave} disabled={saving} className="flex-1">{saving ? "Saving…" : editing ? "Save Changes" : "Add Story"}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TestimonialsTab() {
  const items = useQuery(api.cms.listTestimonials);
  const sectionRaw = useQuery(api.cms.getSiteSettings, { key: "testimonials_section" });
  const create = useMutation(api.cms.createTestimonial);
  const update = useMutation(api.cms.updateTestimonial);
  const del = useMutation(api.cms.deleteTestimonial);
  const upsert = useMutation(api.cms.upsertSiteSettings);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<TestimonialForm>(emptyTestimonial());
  const [saving, setSaving] = useState(false);
  const [sectionForm, setSectionForm] = useState<{ eyebrow: string; heading: string; subheading: string } | null>(null);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [filterFeatured, setFilterFeatured] = useState<"all" | "featured" | "hidden">("all");

  // Parse section settings
  const defaultSection = { eyebrow: "Client Stories", heading: "What Our Clients Say", subheading: "Join thousands of satisfied property owners and investors who have trusted Geodata to deliver on their real estate dreams." };
  const sectionData = sectionForm ?? (() => {
    try { return sectionRaw ? { ...defaultSection, ...JSON.parse(sectionRaw) } : defaultSection; } catch { return defaultSection; }
  })();

  const openCreate = () => { setEditing(null); setForm(emptyTestimonial()); setOpen(true); };
  const openEdit = (t: TestimonialRecord) => {
    setEditing(t._id);
    setForm({ name: t.name, role: t.role, content: t.content, rating: t.rating, avatarStorageId: t.avatarStorageId ?? null, avatarPreviewUrl: t.avatarUrl ?? "", featured: t.featured, location: t.location ?? "", propertyType: t.propertyType ?? "", date: t.date ?? "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.content) { toast.error("Name and review are required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, role: form.role, content: form.content, rating: form.rating,
        avatarStorageId: form.avatarStorageId ?? undefined, featured: form.featured,
        location: form.location || undefined, propertyType: form.propertyType || undefined,
        date: form.date || undefined,
      };
      if (editing) { await update({ id: editing as Id<"testimonials">, ...payload }); toast.success("Story updated"); }
      else { await create(payload); toast.success("Story added!"); }
      setOpen(false);
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const handleToggleFeatured = async (t: TestimonialRecord) => {
    await update({ id: t._id, featured: !t.featured });
    toast.success(t.featured ? "Removed from homepage" : "Now showing on homepage");
  };

  const handleDelete = async (t: TestimonialRecord) => {
    if (!confirm(`Delete ${t.name}'s testimonial?`)) return;
    await del({ id: t._id });
    toast.success("Deleted");
  };

  const handleSectionSave = async () => {
    setSectionSaving(true);
    try {
      await upsert({ key: "testimonials_section", value: JSON.stringify(sectionData) });
      toast.success("Section heading saved");
    } catch { toast.error("Save failed"); }
    finally { setSectionSaving(false); }
  };

  const filtered = (items ?? []).filter((t) => {
    if (filterFeatured === "featured") return t.featured;
    if (filterFeatured === "hidden") return !t.featured;
    return true;
  });

  const featuredCount = (items ?? []).filter((t) => t.featured).length;

  return (
    <div className="space-y-6">
      {/* Section Heading Settings */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-base text-gray-900">Section Heading</h2>
            <p className="text-xs text-gray-500 mt-0.5">Edit the text displayed above the testimonials grid on the homepage.</p>
          </div>
          <Button size="sm" onClick={handleSectionSave} disabled={sectionSaving}>{sectionSaving ? "Saving…" : "Save Heading"}</Button>
        </div>
        {sectionRaw === undefined ? <Skeleton className="h-28 w-full" /> : (
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Eyebrow Label</label>
              <Input value={sectionData.eyebrow} placeholder="Client Stories" onChange={(e) => setSectionForm({ ...sectionData, eyebrow: e.target.value })} />
              <p className="text-[11px] text-gray-400 mt-1">Small uppercase text above heading</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Main Heading</label>
              <Input value={sectionData.heading} placeholder="What Our Clients Say" onChange={(e) => setSectionForm({ ...sectionData, heading: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Sub-heading</label>
              <Input value={sectionData.subheading} placeholder="Subtitle text…" onChange={(e) => setSectionForm({ ...sectionData, subheading: e.target.value })} />
            </div>
          </div>
        )}
        {/* Live preview */}
        <div className="mt-4 bg-white rounded-xl p-4 border border-blue-100 text-center">
          <span className="text-[var(--brand)] text-xs font-semibold tracking-widest uppercase block mb-1">{sectionData.eyebrow || "Eyebrow"}</span>
          <p className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{sectionData.heading || "Main Heading"}</p>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">{sectionData.subheading}</p>
        </div>
      </div>

      {/* Client Stories List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-base text-gray-900">Client Stories</h2>
            <p className="text-sm text-gray-500">
              {(items ?? []).length} total · <span className="text-green-600 font-medium">{featuredCount} on homepage</span>
            </p>
          </div>
          <Button onClick={openCreate} className="gap-1.5"><Plus size={14} /> Add Story</Button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(["all", "featured", "hidden"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterFeatured(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border", filterFeatured === f ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand)]")}
            >
              {f === "all" ? `All (${(items ?? []).length})` : f === "featured" ? `On Homepage (${featuredCount})` : `Hidden (${(items ?? []).length - featuredCount})`}
            </button>
          ))}
        </div>

        {items === undefined ? (
          <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
            <Star size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">{filterFeatured === "all" ? "No client stories yet" : `No ${filterFeatured} stories`}</p>
            {filterFeatured === "all" && <Button size="sm" className="mt-4 gap-1" onClick={openCreate}><Plus size={13} /> Add First Story</Button>}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((t) => (
              <div key={t._id} className={cn("bg-white rounded-2xl border p-4 flex items-start gap-4 transition-all hover:shadow-sm", t.featured ? "border-amber-200 bg-amber-50/30" : "border-gray-200")}>
                {/* Avatar */}
                {t.avatarUrl
                  ? <img src={t.avatarUrl} alt={t.name} className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-white shadow-sm" />
                  : <div className="w-14 h-14 rounded-full bg-[var(--brand)] flex items-center justify-center text-white font-bold text-xl shrink-0">{t.name[0]}</div>
                }

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900">{t.name}</span>
                    {t.featured && <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0"><Star size={8} className="mr-0.5 fill-amber-600" />Homepage</Badge>}
                  </div>
                  <p className="text-xs text-gray-500">{t.role}{t.location ? ` · ${t.location}` : ""}{t.propertyType ? ` · ${t.propertyType}` : ""}</p>
                  <div className="flex items-center gap-0.5 my-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={11} className={i < t.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed italic">&ldquo;{t.content}&rdquo;</p>
                  {t.date && <p className="text-[11px] text-gray-400 mt-1">{new Date(t.date).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</p>}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t as TestimonialRecord)} title="Edit"><Pencil size={13} /></Button>
                  <button
                    onClick={() => handleToggleFeatured(t as TestimonialRecord)}
                    title={t.featured ? "Remove from homepage" : "Show on homepage"}
                    className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer", t.featured ? "bg-amber-100 text-amber-600 hover:bg-amber-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200")}
                  >
                    <Star size={13} className={t.featured ? "fill-amber-500" : ""} />
                  </button>
                  <button onClick={() => handleDelete(t as TestimonialRecord)} className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 transition-colors cursor-pointer"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TestimonialDialog
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

// ─── Stats Tab ───────────────────────────────────────────────────────────

function StatsTab() {
  const raw = useSetting("stats");
  const modeRaw = useSetting("stats_mode");
  const [stats, setStats] = useState<StatItem[] | null>(null);
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [saving, setSaving] = useState(false);

  const data: StatItem[] = stats ?? parseSetting<StatItem[]>(raw, DEFAULT_STATS);
  const auto = modeRaw === "auto";

  const setMode = async (on: boolean) => {
    try {
      await upsert({ key: "stats_mode", value: on ? "auto" : "manual" });
      toast.success(on ? "Automatic updates on" : "Manual mode on");
    } catch { toast.error("Could not change mode"); }
  };

  const update = (i: number, patch: Partial<StatItem>) => {
    setStats(data.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const save = async () => {
    setSaving(true);
    try { await upsert({ key: "stats", value: JSON.stringify(data) }); toast.success("Stats saved"); }
    catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="font-bold text-lg text-gray-900">Stats Bar</h2><p className="text-sm text-gray-500">Edit the numbers displayed in the blue stats section.</p></div>
        <Button onClick={save} disabled={saving} className="bg-[var(--brand)] text-white">{saving ? "Saving…" : "Save Changes"}</Button>
      </div>
      <div className="bg-white rounded-2xl border p-4 flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-sm text-gray-900">Update numbers automatically</div>
          <p className="text-xs text-gray-500">
            {auto
              ? "On: stats linked to live data show real counts. Others keep the value you typed."
              : "Off: the website shows exactly the numbers you type below."}
          </p>
        </div>
        <Switch checked={auto} disabled={modeRaw === undefined} onCheckedChange={setMode} />
      </div>
      {raw === undefined ? <Skeleton className="h-48 w-full" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.map((s, i) => {
            const source = sourceOf(s, i);
            const live = auto && source !== "manual";
            return (
              <div key={i} className="bg-white rounded-2xl border p-4 space-y-2">
                <div className="flex gap-2">
                  <Input placeholder="Icon (emoji)" value={s.icon} onChange={(e) => update(i, { icon: e.target.value })} className="w-20" />
                  <Input placeholder="Value e.g. 500+" value={s.value} disabled={live} onChange={(e) => update(i, { value: e.target.value })} />
                </div>
                <Input placeholder="Label e.g. Properties Sold" value={s.label} onChange={(e) => update(i, { label: e.target.value })} />
                <Select value={source} onValueChange={(v) => update(i, { source: v as StatSource })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STAT_SOURCE_LABELS) as StatSource[]).map((k) => (
                      <SelectItem key={k} value={k}>{STAT_SOURCE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {live && <p className="text-[11px] text-emerald-600">Shows the live count while automatic mode is on.</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Contact Tab ─────────────────────────────────────────────────────────

function ContactTab() {
  const raw = useSetting("contact");
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [form, setForm] = useState<ContactData | null>(null);
  const [saving, setSaving] = useState(false);

  const data = form ?? parseContact(raw);
  const f = (patch: Partial<ContactData>) => setForm({ ...data, ...patch });

  const updateOffice = (i: number, patch: Partial<Office>) => {
    const offices = data.offices.map((o, idx) => idx === i ? { ...o, ...patch } : o);
    f({ offices });
  };
  const addOffice = () => f({ offices: [...data.offices, { city: "New Office", address: "", phone: "", email: "", mapEmbedUrl: "" }] });
  const removeOffice = (i: number) => f({ offices: data.offices.filter((_, idx) => idx !== i) });

  const save = async () => {
    setSaving(true);
    try { await upsert({ key: "contact", value: JSON.stringify(data) }); toast.success("Contact info saved"); }
    catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg text-gray-900">Contact Information</h2>
          <p className="text-sm text-gray-500">Updates the Navbar, Footer, Contact page, and WhatsApp button across the whole site.</p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-[var(--brand)] text-white">{saving ? "Saving…" : "Save Changes"}</Button>
      </div>

      {raw === undefined ? <Skeleton className="h-64 w-full" /> : (
        <div className="space-y-5">

          {/* Primary contact */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-700">Primary Contact Details</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Primary Phone Number</label>
                <Input value={data.primaryPhone} onChange={(e) => f({ primaryPhone: e.target.value })} placeholder="(+234) 704 762 0492" />
                <p className="text-xs text-gray-400 mt-1">Shown in the top navbar bar.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Primary Email Address</label>
                <Input value={data.primaryEmail} onChange={(e) => f({ primaryEmail: e.target.value })} placeholder="hello@geodata.com.ng" />
                <p className="text-xs text-gray-400 mt-1">Shown in the top navbar bar.</p>
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-700">WhatsApp</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">WhatsApp Number <span className="text-gray-400 font-normal">(digits only, with country code)</span></label>
                <Input value={data.whatsappNumber} onChange={(e) => f({ whatsappNumber: e.target.value })} placeholder="2347047620492" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Pre-filled Message</label>
                <Input value={data.whatsappMessage} onChange={(e) => f({ whatsappMessage: e.target.value })} placeholder="Hello, I am interested in your properties." />
              </div>
            </div>
          </div>

          {/* Social links */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">Social Media Handles</p>
              <p className="text-xs text-gray-400 mt-0.5">Paste full profile URLs. These appear as icons in the website footer and contact sections.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {([
                { key: "facebook",  label: "Facebook",  placeholder: "https://facebook.com/yourpage" },
                { key: "twitter",   label: "X (Twitter)", placeholder: "https://x.com/yourhandle" },
                { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
                { key: "linkedin",  label: "LinkedIn",  placeholder: "https://linkedin.com/company/yourcompany" },
                { key: "youtube",   label: "YouTube",   placeholder: "https://youtube.com/@yourchannel" },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{label}</label>
                  <Input value={data[key]} onChange={(e) => f({ [key]: e.target.value })} placeholder={placeholder} />
                </div>
              ))}
            </div>
          </div>

          {/* Offices */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Office Locations</p>
              <Button onClick={addOffice} className="bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs gap-1.5">
                <Plus size={13} /> Add Office
              </Button>
            </div>
            <div className="space-y-4">
              {data.offices.map((o, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Office {i + 1}{i === 0 ? " (HQ)" : ""}</span>
                    {data.offices.length > 1 && (
                      <button onClick={() => removeOffice(i)} className="text-red-400 hover:text-red-600 cursor-pointer text-xs flex items-center gap-1">
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">City / Branch Name</label>
                      <Input value={o.city} onChange={(e) => updateOffice(i, { city: e.target.value })} placeholder="e.g. Abuja (HQ)" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone</label>
                      <Input value={o.phone} onChange={(e) => updateOffice(i, { phone: e.target.value })} placeholder="+234 700 000 0000" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Address</label>
                      <Input value={o.address} onChange={(e) => updateOffice(i, { address: e.target.value })} placeholder="Full street address" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
                      <Input value={o.email} onChange={(e) => updateOffice(i, { email: e.target.value })} placeholder="office@company.com" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Google Maps Embed URL <span className="text-gray-400 font-normal">(optional)</span></label>
                      <Input value={o.mapEmbedUrl ?? ""} onChange={(e) => updateOffice(i, { mapEmbedUrl: e.target.value })} placeholder="https://www.google.com/maps/embed?pb=..." />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="bg-[var(--brand)] text-white">{saving ? "Saving…" : "Save Changes"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── About Tab — delegated to new sub-tab editors below ──────────────────

// ─── Default About extended data ─────────────────────────────────────────

const DEFAULT_ABOUT_HERO = {
  title: "About Geodata World\nServices Limited",
  subtitle: "Nigeria's premier real estate development company, building dreams and transforming communities since 2009.",
};

const DEFAULT_ABOUT_MISSION = [
  { icon: "Target", title: "Our Mission", text: "To deliver exceptional real estate products and services that create lasting value for our clients, investors, and communities across Nigeria." },
  { icon: "Eye", title: "Our Vision", text: "To be Africa's most trusted real estate company, known for transforming lives through innovative property development and unmatched client service." },
  { icon: "Heart", title: "Our Purpose", text: "To build homes, estates, and commercial properties that become the foundation of thriving communities and generational wealth." },
];

const DEFAULT_ABOUT_VALUES = [
  { icon: "CheckCircle", title: "Integrity", desc: "We operate with the highest standards of transparency and honesty in every transaction." },
  { icon: "Users", title: "Client First", desc: "Every decision is made with our clients' best interests at heart." },
  { icon: "Award", title: "Excellence", desc: "We deliver world-class properties and services that exceed expectations." },
  { icon: "Globe", title: "Innovation", desc: "We continuously adopt new technologies and approaches to real estate." },
];

const DEFAULT_ABOUT_STATS = [
  { value: "2009", label: "Founded" },
  { value: "500+", label: "Properties" },
  { value: "₦50B+", label: "Transactions" },
  { value: "26", label: "States" },
];

type TeamMember = { name: string; role: string; bio: string; imageUrl: string; imageStorageId: string | null };

const DEFAULT_ABOUT_TEAM: TeamMember[] = [
  { name: "Engr. Chukwuemeka Obi", role: "Managing Director / CEO", bio: "Visionary leader with over 20 years experience in real estate development and engineering.", imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&crop=faces", imageStorageId: null },
  { name: "Mrs. Adaeze Nwosu", role: "Executive Director, Operations", bio: "Expert in operational excellence and client relationship management.", imageUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&h=300&fit=crop&crop=faces", imageStorageId: null },
  { name: "Barr. Uche Eze", role: "Director, Legal & Compliance", bio: "Specialist in real estate law, property documentation and regulatory compliance.", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=faces", imageStorageId: null },
  { name: "Arc. Funmi Adeyemi", role: "Head of Construction", bio: "Award-winning architect leading design and construction of all Geodata estates.", imageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&h=300&fit=crop&crop=faces", imageStorageId: null },
];

// ─── About Tab ────────────────────────────────────────────────────────────

type AboutSubTab = "who-we-are" | "hero" | "stats" | "mission" | "values" | "team";

const ABOUT_SUBTABS: { id: AboutSubTab; label: string }[] = [
  { id: "who-we-are", label: "Who We Are" },
  { id: "hero", label: "Page Hero" },
  { id: "stats", label: "Stats Row" },
  { id: "mission", label: "Mission / Vision" },
  { id: "values", label: "Core Values" },
  { id: "team", label: "Team Members" },
];

function AboutTab() {
  const [subTab, setSubTab] = useState<AboutSubTab>("who-we-are");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-lg text-gray-900">About Us Page</h2>
        <p className="text-sm text-gray-500">Manage all sections of the About Us page — text, images, team, values, and more.</p>
      </div>

      {/* Sub-tab pills */}
      <div className="flex flex-wrap gap-2">
        {ABOUT_SUBTABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
              subTab === t.id
                ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        {subTab === "who-we-are" && <AboutWhoWeAreEditor />}
        {subTab === "hero" && <AboutHeroEditor />}
        {subTab === "stats" && <AboutStatsEditor />}
        {subTab === "mission" && <AboutMissionEditor />}
        {subTab === "values" && <AboutValuesEditor />}
        {subTab === "team" && <AboutTeamEditor />}
      </div>
    </div>
  );
}

// ── Who We Are ─────────────────────────────────────────────────────────

function AboutWhoWeAreEditor() {
  const raw = useSetting("about");
  const [form, setForm] = useState<typeof DEFAULT_ABOUT | null>(null);
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [saving, setSaving] = useState(false);

  const data = form ?? parseSetting(raw, DEFAULT_ABOUT);

  const save = async () => {
    setSaving(true);
    try {
      await upsert({ key: "about", value: JSON.stringify({ ...data, services: data.services.filter((s) => s.trim()) }) });
      toast.success("Who We Are section saved");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (raw === undefined) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Who We Are — Controls the split-layout section on the About page</p>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
      </div>

      {/* Image */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-600 block">Section Image <span className="font-normal text-gray-400">(landscape, 800×600px+)</span></label>
        <FileUploadButton
          variant="dropzone"
          mediaType="image"
          label="Click to upload or drag an image here"
          currentUrl={data.imageUrl ?? undefined}
          currentStorageId={data.imageStorageId ? data.imageStorageId as unknown as Id<"_storage"> : null}
          onUpload={(storageId, url) => setForm({ ...data, imageStorageId: storageId as unknown as string, imageUrl: url ?? data.imageUrl })}
          onClear={() => setForm({ ...data, imageStorageId: null, imageUrl: DEFAULT_ABOUT.imageUrl })}
          className="max-w-xl"
        />
      </div>

      {/* Text fields */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Tagline <span className="text-gray-400 font-normal">(small text above heading)</span></label>
          <Input value={data.tagline} onChange={(e) => setForm({ ...data, tagline: e.target.value })} placeholder="e.g. Who We Are" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Badge Text <span className="text-gray-400 font-normal">(image overlay)</span></label>
          <Input value={data.badgeText} onChange={(e) => setForm({ ...data, badgeText: e.target.value })} placeholder="e.g. 15+ Years" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Badge Sub-text</label>
        <Input value={data.badgeSub} onChange={(e) => setForm({ ...data, badgeSub: e.target.value })} placeholder="e.g. Of Trusted Real Estate Excellence" />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Main Heading</label>
        <Input value={data.heading} onChange={(e) => setForm({ ...data, heading: e.target.value })} />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Paragraph 1</label>
        <Textarea rows={3} value={data.para1} onChange={(e) => setForm({ ...data, para1: e.target.value })} />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Paragraph 2</label>
        <Textarea rows={3} value={data.para2} onChange={(e) => setForm({ ...data, para2: e.target.value })} />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Services / Bullet Points <span className="text-gray-400 font-normal">(one per line)</span></label>
        <Textarea rows={6} value={data.services.join("\n")} onChange={(e) => setForm({ ...data, services: e.target.value.split("\n") })} className="font-mono text-sm" />
        <p className="text-xs text-gray-400 mt-1">Each line becomes a checkmark bullet. Blank lines are ignored on save.</p>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
      </div>
    </div>
  );
}

// ── Page Hero ──────────────────────────────────────────────────────────

function AboutHeroEditor() {
  const raw = useSetting("about_hero");
  const [form, setForm] = useState<typeof DEFAULT_ABOUT_HERO | null>(null);
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [saving, setSaving] = useState(false);

  const data = form ?? parseSetting(raw, DEFAULT_ABOUT_HERO);

  const save = async () => {
    setSaving(true);
    try { await upsert({ key: "about_hero", value: JSON.stringify(data) }); toast.success("Hero saved"); }
    catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (raw === undefined) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Page Hero — The blue banner at the top of the About page</p>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Hero Title</label>
        <Textarea rows={2} value={data.title} onChange={(e) => setForm({ ...data, title: e.target.value })} placeholder="About Geodata World Services Limited" />
        <p className="text-xs text-gray-400 mt-1">Use a line break to split the title onto two lines.</p>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Hero Subtitle</label>
        <Textarea rows={2} value={data.subtitle} onChange={(e) => setForm({ ...data, subtitle: e.target.value })} />
      </div>
      {/* Preview */}
      <div className="rounded-2xl bg-[var(--brand)] px-8 py-8 mt-2">
        <p className="text-4xl font-bold text-white whitespace-pre-line" style={{ fontFamily: "'Playfair Display', serif" }}>{data.title || "Title"}</p>
        <p className="text-blue-100 text-sm mt-3">{data.subtitle}</p>
      </div>
    </div>
  );
}

// ── Stats Row ──────────────────────────────────────────────────────────

function AboutStatsEditor() {
  const raw = useSetting("about_stats");
  const [form, setForm] = useState<typeof DEFAULT_ABOUT_STATS | null>(null);
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [saving, setSaving] = useState(false);

  const data = form ?? parseSetting(raw, DEFAULT_ABOUT_STATS);

  const save = async () => {
    setSaving(true);
    try { await upsert({ key: "about_stats", value: JSON.stringify(data) }); toast.success("Stats saved"); }
    catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (raw === undefined) return <Skeleton className="h-48 w-full" />;

  const update = (i: number, field: "value" | "label", val: string) => {
    const d = [...data];
    d[i] = { ...d[i], [field]: val };
    setForm(d);
  };

  const add = () => setForm([...data, { value: "", label: "" }]);
  const remove = (i: number) => setForm(data.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Stats Row — Highlighted numbers in the Who We Are section</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={add} className="gap-1"><Plus size={13} /> Add Stat</Button>
          <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {data.map((s, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Value</label>
              <Input placeholder="e.g. 500+" value={s.value} onChange={(e) => update(i, "value", e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Label</label>
              <Input placeholder="e.g. Properties" value={s.label} onChange={(e) => update(i, "label", e.target.value)} />
            </div>
            <button onClick={() => remove(i)} className="h-9 w-9 mb-0.5 shrink-0 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 cursor-pointer"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      {/* Preview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
        {data.map((s, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
            <div className="text-2xl font-bold text-[var(--brand)]" style={{ fontFamily: "'Playfair Display', serif" }}>{s.value || "—"}</div>
            <div className="text-sm text-gray-500">{s.label || "Label"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mission / Vision / Purpose ─────────────────────────────────────────

function AboutMissionEditor() {
  const raw = useSetting("about_mission");
  const [form, setForm] = useState<typeof DEFAULT_ABOUT_MISSION | null>(null);
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [saving, setSaving] = useState(false);

  const data = form ?? parseSetting(raw, DEFAULT_ABOUT_MISSION);

  const save = async () => {
    setSaving(true);
    try { await upsert({ key: "about_mission", value: JSON.stringify(data) }); toast.success("Mission/Vision/Purpose saved"); }
    catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (raw === undefined) return <Skeleton className="h-64 w-full" />;

  const update = (i: number, field: "title" | "text" | "icon", val: string) => {
    const d = [...data];
    d[i] = { ...d[i], [field]: val };
    setForm(d);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Mission / Vision / Purpose — The three cards below the Who We Are section</p>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {data.map((card, i) => (
          <div key={i} className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Card Title</label>
              <Input value={card.title} onChange={(e) => update(i, "title", e.target.value)} placeholder="e.g. Our Mission" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Content</label>
              <Textarea rows={4} value={card.text} onChange={(e) => update(i, "text", e.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Core Values ────────────────────────────────────────────────────────

function AboutValuesEditor() {
  const raw = useSetting("about_values");
  const [form, setForm] = useState<typeof DEFAULT_ABOUT_VALUES | null>(null);
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [saving, setSaving] = useState(false);

  const data = form ?? parseSetting(raw, DEFAULT_ABOUT_VALUES);

  const save = async () => {
    setSaving(true);
    try { await upsert({ key: "about_values", value: JSON.stringify(data) }); toast.success("Values saved"); }
    catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (raw === undefined) return <Skeleton className="h-64 w-full" />;

  const add = () => setForm([...data, { icon: "Star", title: "", desc: "" }]);
  const remove = (i: number) => setForm(data.filter((_, idx) => idx !== i));
  const update = (i: number, field: "title" | "desc" | "icon", val: string) => {
    const d = [...data];
    d[i] = { ...d[i], [field]: val };
    setForm(d);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Core Values — The value cards in the grey section of the About page</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={add} className="gap-1"><Plus size={13} /> Add Value</Button>
          <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {data.map((v, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Value {i + 1}</span>
              <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600 cursor-pointer"><Trash2 size={13} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Title</label>
                <Input value={v.title} onChange={(e) => update(i, "title", e.target.value)} placeholder="e.g. Integrity" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Icon name</label>
                <Input value={v.icon} onChange={(e) => update(i, "icon", e.target.value)} placeholder="e.g. CheckCircle" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
              <Textarea rows={2} value={v.desc} onChange={(e) => update(i, "desc", e.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Team Members ───────────────────────────────────────────────────────

function AboutTeamEditor() {
  const raw = useSetting("about_team");
  const [form, setForm] = useState<TeamMember[] | null>(null);
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [saving, setSaving] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const data: TeamMember[] = form ?? parseSetting(raw, DEFAULT_ABOUT_TEAM);

  const save = async () => {
    setSaving(true);
    try { await upsert({ key: "about_team", value: JSON.stringify(data) }); toast.success("Team saved"); }
    catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (raw === undefined) return <Skeleton className="h-64 w-full" />;

  const add = () => {
    const newMember: TeamMember = { name: "", role: "", bio: "", imageUrl: "", imageStorageId: null };
    setForm([...data, newMember]);
    setExpandedIdx(data.length);
  };

  const remove = (i: number) => {
    setForm(data.filter((_, idx) => idx !== i));
    if (expandedIdx === i) setExpandedIdx(null);
  };

  const update = (i: number, field: keyof TeamMember, val: string | null) => {
    const d = [...data];
    d[i] = { ...d[i], [field]: val };
    setForm(d);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Team Members — Leadership cards on the About page</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={add} className="gap-1"><Plus size={13} /> Add Member</Button>
          <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((m, i) => (
          <div key={i} className={cn("rounded-xl border overflow-hidden transition-all", expandedIdx === i ? "border-[var(--brand)]/40 shadow-sm" : "border-gray-200")}>
            {/* Row header */}
            <button
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer text-left"
            >
              {m.imageUrl
                ? <img src={m.imageUrl} alt={m.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200" />
                : <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">{m.name?.[0] ?? "?"}</div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{m.name || "New Team Member"}</p>
                <p className="text-xs text-gray-500 truncate">{m.role || "No role set"}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); remove(i); }} className="text-red-400 hover:text-red-600 cursor-pointer p-1"><Trash2 size={13} /></button>
                <EyeOff size={13} className={cn("text-gray-300 transition-transform", expandedIdx === i && "rotate-180")} />
              </div>
            </button>

            {/* Expanded form */}
            {expandedIdx === i && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3 bg-gray-50/50">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Photo</label>
                  <FileUploadButton
                    variant="button"
                    mediaType="image"
                    label="Upload photo"
                    currentUrl={m.imageUrl || null}
                    currentStorageId={m.imageStorageId as unknown as Id<"_storage"> | null}
                    onUpload={(storageId, url) => { update(i, "imageStorageId", storageId as unknown as string); update(i, "imageUrl", url ?? m.imageUrl); }}
                    onClear={() => { update(i, "imageStorageId", null); update(i, "imageUrl", ""); }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name</label>
                    <Input value={m.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="e.g. Engr. John Doe" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Role / Title</label>
                    <Input value={m.role} onChange={(e) => update(i, "role", e.target.value)} placeholder="e.g. Managing Director" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Short Bio</label>
                  <Textarea rows={2} value={m.bio} onChange={(e) => update(i, "bio", e.target.value)} placeholder="Brief biography shown on the About page…" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save All Changes"}</Button>
      </div>
    </div>
  );
}

// ─── Services Tab ────────────────────────────────────────────────────────

function ServicesTab() {
  const raw = useSetting("services");
  const [form, setForm] = useState<typeof DEFAULT_SERVICES | null>(null);
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [saving, setSaving] = useState(false);

  const data = form ?? parseSetting(raw, DEFAULT_SERVICES);

  const save = async () => {
    setSaving(true);
    try { await upsert({ key: "services", value: JSON.stringify(data) }); toast.success("Services saved"); }
    catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="font-bold text-lg text-gray-900">Services Section</h2><p className="text-sm text-gray-500">Edit the three service cards on the homepage.</p></div>
        <Button onClick={save} disabled={saving} className="bg-[var(--brand)] text-white">{saving ? "Saving…" : "Save Changes"}</Button>
      </div>
      {raw === undefined ? <Skeleton className="h-64 w-full" /> : (
        <div className="space-y-4">
          {data.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border p-4 space-y-3">
              <h3 className="font-semibold text-sm text-gray-700">Service {i + 1}</h3>
              <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Title</label><Input value={s.title} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], title: e.target.value }; setForm(d); }} /></div>
              <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label><Textarea rows={2} value={s.description} onChange={(e) => { const d = [...data]; d[i] = { ...d[i], description: e.target.value }; setForm(d); }} /></div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Image</label>
                <FileUploadButton variant="dropzone" mediaType="image" label="Upload service image"
                  currentUrl={s.imageStorageId ? undefined : s.imageUrl}
                  currentStorageId={s.imageStorageId ? s.imageStorageId as unknown as Id<"_storage"> : null}
                  onUpload={(storageId) => { const d = [...data]; d[i] = { ...d[i], imageStorageId: storageId as unknown as string }; setForm(d); }}
                  onClear={() => { const d = [...data]; d[i] = { ...d[i], imageStorageId: null }; setForm(d); }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Partners Tab ─────────────────────────────────────────────────────────

function PartnersTab() {
  const raw = useSetting("partners");
  const [form, setForm] = useState<typeof DEFAULT_PARTNERS | null>(null);
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [saving, setSaving] = useState(false);

  const data = form ?? parseSetting(raw, DEFAULT_PARTNERS);

  const save = async () => {
    setSaving(true);
    try { await upsert({ key: "partners", value: JSON.stringify(data) }); toast.success("Partners & Awards saved"); }
    catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="font-bold text-lg text-gray-900">Partners & Awards</h2><p className="text-sm text-gray-500">Edit banking partners and award recognitions.</p></div>
        <Button onClick={save} disabled={saving} className="bg-[var(--brand)] text-white">{saving ? "Saving…" : "Save Changes"}</Button>
      </div>
      {raw === undefined ? <Skeleton className="h-48 w-full" /> : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Finance / Banking Partners</h3>
            <p className="text-xs text-gray-400">One partner name per line</p>
            <Textarea rows={8} value={data.partners.join("\n")} onChange={(e) => setForm({ ...data, partners: e.target.value.split("\n").filter(Boolean) })} />
          </div>
          <div className="bg-white rounded-2xl border p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">Awards</h3>
            {data.awards.map((a, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <Input placeholder="Year" value={a.year} onChange={(e) => { const d = [...data.awards]; d[i] = { ...d[i], year: e.target.value }; setForm({ ...data, awards: d }); }} />
                <Input placeholder="Award name" className="col-span-2" value={a.award} onChange={(e) => { const d = [...data.awards]; d[i] = { ...d[i], award: e.target.value }; setForm({ ...data, awards: d }); }} />
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={() => setForm({ ...data, awards: [...data.awards, { year: "", award: "" }] })} className="gap-1"><Plus size={13} />Add Award</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subscribers Tab ──────────────────────────────────────────────────────

function SubscribersTab() {
  const totalSubs = useQuery(api.cms.listSubscribers);
  const {
    rows: subs,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
  } = useCursorPagination(api.cms.listSubscribersPaginated, {}, 20);
  return (
    <div className="space-y-4">
      <div><h2 className="font-bold text-lg text-gray-900">Subscribers</h2><p className="text-sm text-gray-500">Newsletter subscribers from the homepage footer.</p></div>
      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{totalSubs?.length ?? subs.length} subscribers</span>
          </div>
          <div className="divide-y">
            {subs.length === 0 ? (
              <div className="p-8 text-center text-gray-400"><Users size={28} className="mx-auto mb-2 opacity-40" /><p className="text-sm">No subscribers yet</p></div>
            ) : subs.map((s) => (
              <div key={s._id} className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-gray-700">{s.email}</span>
                <Badge className={cn("text-[10px] border-0", s.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500")}>{s.active ? "Active" : "Inactive"}</Badge>
              </div>
            ))}
          </div>
          {subs.length > 0 && (
            <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Legal Pages Tab ──────────────────────────────────────────────────────

type LegalSubTab = "privacy" | "terms";

const LEGAL_SUBTABS: { id: LegalSubTab; label: string; key: string; title: string; path: string }[] = [
  { id: "privacy", label: "Privacy Policy", key: "privacy", title: "Privacy Policy", path: "/privacy" },
  { id: "terms",   label: "Terms of Service", key: "terms", title: "Terms of Service", path: "/terms" },
];

const PRIVACY_DEFAULT = `<h2>Introduction</h2><p>Geodata World Services Limited ("we", "our", or "us") is committed to protecting your personal information and your right to privacy.</p><h2>Information We Collect</h2><p>We may collect personal data such as your name, email address, phone number, and postal address when you make an inquiry or contact us.</p><h2>How We Use Your Information</h2><p>We use information to process inquiries, send updates, and improve our services.</p><h2>Contact Us</h2><p>For questions, contact us at hello@geodata.com.ng</p><p><em>Last updated: January 2025</em></p>`;
const TERMS_DEFAULT = `<h2>Acceptance of Terms</h2><p>By using Geodata World Services Limited's website and services, you agree to be bound by these Terms of Service.</p><h2>Use of Services</h2><p>You agree to use our services only for lawful purposes and in accordance with these terms.</p><h2>Intellectual Property</h2><p>All content on this website is the property of Geodata World Services Limited.</p><h2>Contact Us</h2><p>For questions, contact us at legal@geodata.com.ng</p><p><em>Last updated: January 2025</em></p>`;

function LegalTab() {
  const [subTab, setSubTab] = useState<LegalSubTab>("privacy");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-lg text-gray-900">Legal Pages</h2>
        <p className="text-sm text-gray-500">Edit the content of your Privacy Policy and Terms of Service pages. Changes appear immediately on the live site.</p>
      </div>

      <div className="flex gap-2">
        {LEGAL_SUBTABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
              subTab === t.id
                ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {LEGAL_SUBTABS.map((t) => subTab === t.id && (
        <LegalPageEditor key={t.id} settingKey={t.key} title={t.title} path={t.path} defaultContent={t.id === "privacy" ? PRIVACY_DEFAULT : TERMS_DEFAULT} />
      ))}
    </div>
  );
}

function LegalPageEditor({ settingKey, title, path, defaultContent }: { settingKey: string; title: string; path: string; defaultContent: string }) {
  const raw = useSetting(settingKey);
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [html, setHtml] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const content = html ?? (raw ?? defaultContent);

  const save = async () => {
    setSaving(true);
    try { await upsert({ key: settingKey, value: content }); toast.success(`${title} saved`); }
    catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (raw === undefined) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">{title}</p>
          <a href={path} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--brand)] hover:underline flex items-center gap-1">
            <ExternalLink size={10} /> View live page
          </a>
        </div>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <RichTextEditor value={content} onChange={setHtml} placeholder={`Write your ${title} here…`} minHeight={400} />
      </div>
      <p className="text-xs text-gray-400">Use the editor toolbar to format headings, bullets, links, and bold text. Changes take effect immediately on the live page.</p>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
      </div>
    </div>
  );
}

// ─── Main Content Page ────────────────────────────────────────────────────

export default function AdminContent() {
  const [activeTab, setActiveTab] = useState<Tab>("hero");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Content Manager</h1>
        <p className="text-sm text-gray-500">Manage all website content — slides, blog, testimonials, stats, and more.</p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-2xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
              activeTab === t.id ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <t.icon size={14} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "hero" && <HeroSlidesTab />}
        {activeTab === "categories" && <CategoriesTab />}
        {activeTab === "blog" && <BlogTab />}
        {activeTab === "comments" && <CommentsTab />}
        {activeTab === "testimonials" && <TestimonialsTab />}
        {activeTab === "stats" && <StatsTab />}
        {activeTab === "about" && <AboutTab />}
        {activeTab === "contact" && <ContactTab />}
        {activeTab === "services" && <ServicesTab />}
        {activeTab === "partners" && <PartnersTab />}
        {activeTab === "subscribers" && <SubscribersTab />}
        {activeTab === "legal" && <LegalTab />}
      </div>
    </div>
  );
}
