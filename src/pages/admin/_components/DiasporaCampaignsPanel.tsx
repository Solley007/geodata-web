import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, X, ArrowLeft, QrCode, Home, TrendingUp, Handshake, Users, Building, Sparkles, Download, Copy, ExternalLink, Save } from "lucide-react";
import QRCodeLib from "qrcode";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils.ts";

/**
 * Diaspora Campaigns = activations of the permanent platform (e.g. NBLBF2026
 * is the first, never the platform's identity). Fully editable/renameable.
 */

type CampaignStatus = Doc<"diasporaCampaigns">["status"];
type ProgrammeKey = Doc<"diasporaCampaignProgrammes">["programmeKey"];

const STATUS_OPTIONS: Array<{ value: CampaignStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const STATUS_COLOR: Record<CampaignStatus, string> = {
  draft: "bg-gray-100 text-gray-500",
  scheduled: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-indigo-100 text-indigo-700",
  archived: "bg-red-100 text-red-600",
};

const PROGRAMME_META: Array<{ key: ProgrammeKey; label: string; icon: React.ElementType }> = [
  { key: "own", label: "Own", icon: Home },
  { key: "invest", label: "Invest", icon: TrendingUp },
  { key: "partner", label: "Partner", icon: Handshake },
  { key: "refer", label: "Refer", icon: Users },
  { key: "corporate", label: "Corporate", icon: Building },
];

export default function DiasporaCampaignsPanel() {
  const campaigns = useQuery(api.diaspora.campaigns.listCampaigns, {});
  const seedNblbf = useMutation(api.diaspora.campaigns.seedNblbf2026);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"diasporaCampaigns"> | null>(null);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedNblbf({});
      toast.success(res.created ? "Seeded the NBLBF2026 example campaign" : "NBLBF2026 already exists");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed campaign");
    } finally {
      setSeeding(false);
    }
  };

  if (campaigns === undefined) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  if (selectedId) {
    return <CampaignDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Campaigns</h2>
          <p className="text-sm text-gray-500 mt-0.5">Activations of the platform — e.g. a business forum, roadshow, or webinar.</p>
        </div>
        <div className="flex gap-2">
          {!campaigns.some((c) => c.code === "NBLBF2026") && (
            <Button variant="secondary" onClick={handleSeed} disabled={seeding} className="gap-2 cursor-pointer">
              <Sparkles size={16} /> {seeding ? "Seeding…" : "Seed NBLBF2026 Example"}
            </Button>
          )}
          <Button onClick={() => setShowCreate(true)} className="gap-2 cursor-pointer">
            <Plus size={16} /> New Campaign
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Megaphone /></EmptyMedia>
            <EmptyTitle>No campaigns yet</EmptyTitle>
            <EmptyDescription>Create a campaign to activate the platform for a specific event, market, or push.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setShowCreate(true)} className="cursor-pointer">Create Campaign</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {campaigns.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedId(c._id)}
              className="w-full text-left p-5 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <Badge className={cn("text-xs", STATUS_COLOR[c.status])}>{STATUS_OPTIONS.find((s) => s.value === c.status)?.label}</Badge>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {c.code}
                  {c.city || c.country ? ` · ${[c.city, c.country].filter(Boolean).join(", ")}` : ""}
                  {c.startDate ? ` · ${c.startDate}${c.endDate ? ` – ${c.endDate}` : ""}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {c.qrEnabled && <QrCode size={16} className="text-gray-400" />}
                <span className="text-xs text-gray-400">{c.leadCount} leads</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && <CreateCampaignDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateCampaignDialog({ onClose }: { onClose: () => void }) {
  const createCampaign = useMutation(api.diaspora.campaigns.createCampaign);
  const markets = useQuery(api.diaspora.markets.listMarkets, {});
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [marketId, setMarketId] = useState<string>("none");
  const [campaignType, setCampaignType] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [qrEnabled, setQrEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    setSubmitting(true);
    try {
      await createCampaign({
        name: name.trim(),
        code: code.trim(),
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        marketId: marketId !== "none" ? (marketId as Id<"diasporaMarkets">) : undefined,
        campaignType: campaignType.trim() || undefined,
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        qrEnabled,
      });
      toast.success(`Created campaign "${name.trim()}"`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="c-name">Campaign Name</Label>
              <Input id="c-name" placeholder="Nigeria–Belgium–Luxembourg Business Forum 2026" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-code">Code</Label>
              <Input id="c-code" placeholder="NBLBF2026" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-type">Type</Label>
              <Input id="c-type" placeholder="business_forum" value={campaignType} onChange={(e) => setCampaignType(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-country">Country</Label>
              <Input id="c-country" placeholder="Belgium" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-city">City</Label>
              <Input id="c-city" placeholder="Brussels" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-start">Start Date</Label>
              <Input id="c-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-end">End Date</Label>
              <Input id="c-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Market</Label>
            <Select value={marketId} onValueChange={setMarketId}>
              <SelectTrigger className="cursor-pointer"><SelectValue placeholder="Select a market" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(markets ?? []).map((m) => (
                  <SelectItem key={m._id} value={m._id}>{m.country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-desc">Description (optional)</Label>
            <Textarea id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
            <span className="text-sm font-medium text-gray-700">Enable QR Code Attribution</span>
            <Switch checked={qrEnabled} onCheckedChange={setQrEnabled} className="cursor-pointer" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="cursor-pointer gap-2">
            <X size={14} /> Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="cursor-pointer">
            {submitting ? "Creating…" : "Create Campaign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CampaignDetail({ id, onBack }: { id: Id<"diasporaCampaigns">; onBack: () => void }) {
  const campaign = useQuery(api.diaspora.campaigns.getCampaign, { id });
  const updateStatus = useMutation(api.diaspora.campaigns.updateCampaignStatus);
  const updateProgrammeToggle = useMutation(api.diaspora.campaigns.updateCampaignProgrammeToggle);
  const updateCampaign = useMutation(api.diaspora.campaigns.updateCampaign);
  const deleteCampaign = useMutation(api.diaspora.campaigns.deleteCampaign);

  if (campaign === undefined) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  const handleStatusChange = async (status: CampaignStatus) => {
    try {
      await updateStatus({ id, status });
      toast.success(`Status updated to ${STATUS_OPTIONS.find((s) => s.value === status)?.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleProgrammeToggle = async (programmeKey: ProgrammeKey, enabled: boolean) => {
    try {
      await updateProgrammeToggle({ campaignId: id, programmeKey, enabled });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update programme");
    }
  };

  const handlePublishedChange = async (value: Doc<"diasporaCampaigns">["landingPagePublished"]) => {
    try {
      await updateCampaign({ id, landingPagePublished: value });
      toast.success("Landing page state updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update landing page state");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete campaign "${campaign.name}"? This cannot be undone.`)) return;
    try {
      await deleteCampaign({ id });
      toast.success("Campaign deleted");
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete campaign");
    }
  };

  const programmeByKey = new Map(campaign.programmes.map((p) => [p.programmeKey, p.enabled]));

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
        <ArrowLeft size={14} /> Back to Campaigns
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{campaign.name}</h2>
            <p className="text-xs text-gray-400 mt-1">
              {campaign.code}
              {campaign.city || campaign.country ? ` · ${[campaign.city, campaign.country].filter(Boolean).join(", ")}` : ""}
              {campaign.startDate ? ` · ${campaign.startDate}${campaign.endDate ? ` – ${campaign.endDate}` : ""}` : ""}
            </p>
            {campaign.description && <p className="text-sm text-gray-600 mt-2 max-w-xl">{campaign.description}</p>}
          </div>
          <button onClick={handleDelete} className="text-gray-400 hover:text-red-600 cursor-pointer shrink-0">
            <Trash2 size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={campaign.status} onValueChange={(v) => handleStatusChange(v as CampaignStatus)}>
              <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(campaign.status === "completed" || campaign.status === "archived") && (
              <p className="text-xs text-amber-600">This campaign cannot accept new leads while {campaign.status}. Reopen it to resume.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Landing Page</Label>
            <Select value={campaign.landingPagePublished} onValueChange={(v) => handlePublishedChange(v as Doc<"diasporaCampaigns">["landingPagePublished"])}>
              <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="preview">Preview</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
          <span className="flex items-center gap-1.5"><QrCode size={14} /> QR Attribution: {campaign.qrEnabled ? "Enabled" : "Disabled"}</span>
          <span>·</span>
          <span>{campaign.leadCount} attributed leads</span>
        </div>

        {campaign.qrEnabled && <CampaignQrCard campaign={campaign} />}
      </div>

      <CampaignLandingPagePanel campaign={campaign} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="font-bold text-gray-900">Programme Assignment</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Turn programmes ON or OFF for this campaign specifically. A programme disabled platform-wide can't be turned on here until it's
            re-enabled under Programmes.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PROGRAMME_META.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
              <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Icon size={14} className="text-gray-400" /> {label}
              </span>
              <Switch
                checked={programmeByKey.get(key) ?? false}
                onCheckedChange={(checked) => handleProgrammeToggle(key, checked)}
                className="cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Landing page settings: URL slug + campaign-specific hero/SEO content.
//    Falls back to the platform-wide content block when left blank, so an
//    admin never has to fill these in unless they want campaign-specific copy.
function CampaignLandingPagePanel({ campaign }: { campaign: Doc<"diasporaCampaigns"> & { programmes: Array<{ programmeKey: ProgrammeKey; enabled: boolean }> } }) {
  const updateCampaign = useMutation(api.diaspora.campaigns.updateCampaign);
  const [slug, setSlug] = useState(campaign.slug ?? "");
  const [heroHeadline, setHeroHeadline] = useState(campaign.heroHeadline ?? "");
  const [heroSubheadline, setHeroSubheadline] = useState(campaign.heroSubheadline ?? "");
  const [metaTitle, setMetaTitle] = useState(campaign.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(campaign.metaDescription ?? "");
  const [saving, setSaving] = useState(false);

  const landingUrl = `${window.location.origin}/diaspora/${campaign.slug || slug || "…"}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCampaign({
        id: campaign._id,
        slug: slug.trim() || undefined,
        heroHeadline: heroHeadline.trim(),
        heroSubheadline: heroSubheadline.trim(),
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
      });
      toast.success("Landing page content saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save landing page content");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div>
        <h3 className="font-bold text-gray-900">Campaign Landing Page</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          This campaign's own branded page at a clean URL. Only the assigned/enabled programmes above appear here. Leave the hero/SEO fields blank to
          use the platform-wide default copy.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="camp-slug">Page URL</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 shrink-0">/diaspora/</span>
          <Input id="camp-slug" placeholder="nblbf-2026" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        {campaign.slug && (
          <div className="flex items-center gap-2 pt-1">
            <p className="text-xs text-gray-400 break-all flex-1">{landingUrl}</p>
            <a href={`/diaspora/${campaign.slug}`} target="_blank" rel="noreferrer" className="text-xs text-[var(--brand)] hover:underline flex items-center gap-1 shrink-0">
              <ExternalLink size={12} /> Open
            </a>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="camp-hero-headline">Hero Headline (optional)</Label>
        <Input id="camp-hero-headline" placeholder={campaign.name} value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="camp-hero-sub">Hero Sub-headline (optional)</Label>
        <Textarea id="camp-hero-sub" rows={2} placeholder={campaign.description || "Own. Invest. Develop. Partner. From Anywhere."} value={heroSubheadline} onChange={(e) => setHeroSubheadline(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="camp-meta-title">Meta Title (optional)</Label>
          <Input id="camp-meta-title" placeholder={`${campaign.name} | Geodata Diaspora Platform`} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="camp-meta-desc">Meta Description (optional)</Label>
          <Input id="camp-meta-desc" placeholder={campaign.description} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button onClick={handleSave} disabled={saving} className="cursor-pointer gap-2">
          <Save size={14} /> {saving ? "Saving…" : "Save Landing Page Content"}
        </Button>
      </div>
    </div>
  );
}

// ── QR code card — reuses the exact `qrcode` package pattern already used
//    for property/allocation QR codes (never a new dependency). The encoded
//    value is the campaign's public landing URL with `?ref=CODE` so a scan
//    both opens the right page and attributes any lead it produces.
function CampaignQrCard({ campaign }: { campaign: Doc<"diasporaCampaigns"> }) {
  const stats = useQuery(api.diaspora.qr.getCampaignQrStats, { campaignId: campaign._id });
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const landingUrl = `${window.location.origin}/diaspora?ref=${campaign.code}`;

  if (qrUrl === null) {
    QRCodeLib.toDataURL(landingUrl, { width: 300, margin: 2, color: { dark: "#0B4DBB", light: "#FFFFFF" } })
      .then(setQrUrl)
      .catch(() => null);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(landingUrl).then(() => toast.success("Landing link copied"));
  };

  return (
    <div className="bg-gray-50 rounded-xl p-5 flex flex-wrap items-center gap-5">
      {qrUrl ? (
        <img src={qrUrl} alt="Campaign QR Code" className="w-32 h-32 rounded-lg border border-gray-200 bg-white shrink-0" />
      ) : (
        <div className="w-32 h-32 bg-white rounded-lg border border-gray-200 flex items-center justify-center shrink-0"><Spinner /></div>
      )}
      <div className="flex-1 min-w-[200px] space-y-2">
        <p className="text-sm font-medium text-gray-700 break-all">{landingUrl}</p>
        <p className="text-xs text-gray-400">{stats === undefined ? "Loading scan stats…" : `${stats.scanCount} scan${stats.scanCount === 1 ? "" : "s"} recorded`}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleCopy} className="cursor-pointer gap-1.5 h-8 text-xs">
            <Copy size={13} /> Copy Link
          </Button>
          {qrUrl && (
            <a href={qrUrl} download={`qr-${campaign.code}.png`}>
              <Button size="sm" className="cursor-pointer gap-1.5 h-8 text-xs bg-[var(--brand)] text-white"><Download size={13} /> Download QR</Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
