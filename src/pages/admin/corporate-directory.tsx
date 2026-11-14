import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { motion } from "motion/react";
import {
  LayoutGrid, Plus, Pencil, Trash2, Sparkles, Globe2, ArrowUpDown,
  Eye, EyeOff, Star, ExternalLink, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import HeroContentEditor from "./_components/HeroContentEditor.tsx";

type EntityType = "group" | "company" | "operating_business" | "business_unit" | "division" | "business_vertical" | "strategic_partner";
type BizStatus = "live" | "coming_soon" | "inactive";
type DestType = "internal_route" | "external_url";

const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  group: "Group", company: "Company", operating_business: "Operating Business",
  business_unit: "Business Unit", division: "Division", business_vertical: "Business Vertical",
  strategic_partner: "Strategic Partner",
};

const STATUS_STYLE: Record<BizStatus, string> = {
  live: "bg-emerald-100 text-emerald-700",
  coming_soon: "bg-amber-100 text-amber-700",
  inactive: "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<BizStatus, string> = { live: "LIVE", coming_soon: "COMING SOON", inactive: "INACTIVE" };

type Form = {
  slug: string; name: string; legalEntityName: string; entityType: EntityType; sector: string;
  shortDescription: string; fullDescription: string; capabilitiesText: string;
  status: BizStatus; destinationType: DestType; destinationRoute: string; destinationUrl: string;
  featured: boolean; publicVisibility: boolean;
  logoStorageId: Id<"_storage"> | null; logoUrl: string;
  coverImageStorageId: Id<"_storage"> | null; coverImageUrl: string;
};

const emptyForm: Form = {
  slug: "", name: "", legalEntityName: "", entityType: "business_unit", sector: "",
  shortDescription: "", fullDescription: "", capabilitiesText: "",
  status: "coming_soon", destinationType: "internal_route", destinationRoute: "", destinationUrl: "",
  featured: false, publicVisibility: true,
  logoStorageId: null, logoUrl: "", coverImageStorageId: null, coverImageUrl: "",
};

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function AdminCorporateDirectory() {
  const businesses = useQuery(api.corporateDirectory.listAllBusinesses);
  const createBusiness = useMutation(api.corporateDirectory.createBusiness);
  const updateBusiness = useMutation(api.corporateDirectory.updateBusiness);
  const deleteBusiness = useMutation(api.corporateDirectory.deleteBusiness);
  const reorderBusinesses = useMutation(api.corporateDirectory.reorderBusinesses);
  const seedInitial = useMutation(api.corporateDirectory.seedInitialBusinesses);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<Id<"groupBusinesses"> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"groupBusinesses"> | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const f = (patch: Partial<Form>) => setForm((p) => ({ ...p, ...patch }));

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (b: NonNullable<typeof businesses>[number]) => {
    setForm({
      slug: b.slug, name: b.name, legalEntityName: b.legalEntityName ?? "", entityType: b.entityType, sector: b.sector,
      shortDescription: b.shortDescription, fullDescription: b.fullDescription ?? "",
      capabilitiesText: (b.capabilities ?? []).join(", "),
      status: b.status, destinationType: b.destinationType,
      destinationRoute: b.destinationRoute ?? "", destinationUrl: b.destinationUrl ?? "",
      featured: b.featured, publicVisibility: b.publicVisibility,
      logoStorageId: b.logoStorageId ?? null, logoUrl: b.logoUrl ?? "",
      coverImageStorageId: b.coverImageStorageId ?? null, coverImageUrl: b.coverImageResolvedUrl ?? "",
    });
    setEditId(b._id);
    setShowForm(true);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedInitial({});
      if (res.inserted > 0) toast.success(`Added ${res.inserted} initial businesses (${res.skipped} already existed)`);
      else toast.info("All six initial businesses already exist");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to seed businesses"); }
    finally { setSeeding(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sector.trim() || !form.shortDescription.trim()) { toast.error("Fill required fields"); return; }
    if (form.destinationType === "internal_route" && !form.destinationRoute.trim()) { toast.error("Internal route is required"); return; }
    if (form.destinationType === "external_url" && !form.destinationUrl.trim()) { toast.error("External URL is required"); return; }
    setSaving(true);
    try {
      const capabilities = form.capabilitiesText.split(",").map((c) => c.trim()).filter(Boolean);
      if (editId) {
        await updateBusiness({
          id: editId, name: form.name, legalEntityName: form.legalEntityName || undefined, entityType: form.entityType,
          sector: form.sector, shortDescription: form.shortDescription, fullDescription: form.fullDescription || undefined,
          capabilities, status: form.status, destinationType: form.destinationType,
          destinationRoute: form.destinationType === "internal_route" ? form.destinationRoute : undefined,
          destinationUrl: form.destinationType === "external_url" ? form.destinationUrl : undefined,
          featured: form.featured, publicVisibility: form.publicVisibility,
          logoStorageId: form.logoStorageId ?? undefined, coverImageStorageId: form.coverImageStorageId ?? undefined,
          coverImageUrl: form.coverImageUrl || undefined,
        });
        toast.success("Business updated");
      } else {
        const slug = form.slug.trim() ? slugify(form.slug) : slugify(form.name);
        await createBusiness({
          slug, name: form.name, legalEntityName: form.legalEntityName || undefined, entityType: form.entityType,
          sector: form.sector, shortDescription: form.shortDescription, fullDescription: form.fullDescription || undefined,
          capabilities, status: form.status, destinationType: form.destinationType,
          destinationRoute: form.destinationType === "internal_route" ? form.destinationRoute : undefined,
          destinationUrl: form.destinationType === "external_url" ? form.destinationUrl : undefined,
          displayOrder: businesses?.length ?? 0,
          featured: form.featured, publicVisibility: form.publicVisibility,
          logoStorageId: form.logoStorageId ?? undefined, coverImageStorageId: form.coverImageStorageId ?? undefined,
          coverImageUrl: form.coverImageUrl || undefined,
        });
        toast.success("Business added");
      }
      setShowForm(false); setEditId(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteBusiness({ id: deleteId }); toast.success("Business deleted"); setDeleteId(null); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete"); }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!businesses) return;
    const target = index + dir;
    if (target < 0 || target >= businesses.length) return;
    const ordered = [...businesses];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try { await reorderBusinesses({ orderedIds: ordered.map((b) => b._id) }); }
    catch { toast.error("Failed to reorder"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutGrid size={20} className="text-[var(--brand)]" /> Geodata World Corporate Directory
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage the hero content and the six Geodata businesses shown on the corporate gateway</p>
        </div>
        <div className="flex gap-2">
          {businesses && businesses.length === 0 && (
            <Button onClick={handleSeed} disabled={seeding} className="bg-gray-100 hover:bg-gray-200 text-gray-700 gap-2 cursor-pointer">
              <Sparkles size={15} /> {seeding ? "Seeding…" : "Seed Initial 6 Businesses"}
            </Button>
          )}
          <Button onClick={openAdd} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer">
            <Plus size={16} /> Add Business
          </Button>
        </div>
      </div>

      <HeroContentEditor />

      {businesses === undefined ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : businesses.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Globe2 /></EmptyMedia>
            <EmptyTitle>No businesses yet</EmptyTitle>
            <EmptyDescription>Seed the six initial Geodata Group businesses, or add one manually.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={handleSeed} disabled={seeding}>{seeding ? "Seeding…" : "Seed Initial 6 Businesses"}</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {businesses.map((b, i) => (
            <motion.div key={b._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-30 cursor-pointer">
                  <ArrowUpDown size={14} className="rotate-180" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === businesses.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-30 cursor-pointer">
                  <ArrowUpDown size={14} />
                </button>
              </div>

              {b.coverImageResolvedUrl ? (
                <img src={b.coverImageResolvedUrl} alt={b.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-300">
                  <Globe2 size={22} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">{b.name}</span>
                  <Badge className={cn("text-[10px] border-0", STATUS_STYLE[b.status])}>{STATUS_LABEL[b.status]}</Badge>
                  {b.featured && <Badge className="text-[10px] border-0 bg-blue-50 text-blue-600 gap-1"><Star size={10} /> Featured</Badge>}
                  {!b.publicVisibility && <Badge className="text-[10px] border-0 bg-gray-100 text-gray-500 gap-1"><EyeOff size={10} /> Hidden</Badge>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{ENTITY_TYPE_LABEL[b.entityType]} · {b.sector}</p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-1">{b.shortDescription}</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                  {b.destinationType === "internal_route" ? <Link2 size={11} /> : <ExternalLink size={11} />}
                  {b.destinationType === "internal_route" ? b.destinationRoute : b.destinationUrl}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEdit(b)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-[var(--brand)] flex items-center justify-center cursor-pointer" title="Edit">
                  <Pencil size={13} />
                </button>
                <button onClick={() => setDeleteId(b._id)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center cursor-pointer" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Business" : "Add Business"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1 block">Business Name *</Label>
                <Input value={form.name} onChange={(e) => f({ name: e.target.value })} placeholder="e.g. Quarry & Aggregates" />
              </div>
              {!editId && (
                <div className="col-span-2">
                  <Label className="text-xs font-semibold mb-1 block">Slug (URL key)</Label>
                  <Input value={form.slug} onChange={(e) => f({ slug: e.target.value })} placeholder={form.name ? slugify(form.name) : "auto-generated from name"} />
                </div>
              )}
              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1 block">Legal Entity Name</Label>
                <Input value={form.legalEntityName} onChange={(e) => f({ legalEntityName: e.target.value })} placeholder="e.g. Geodata World Services Limited" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">Classification</Label>
                <Select value={form.entityType} onValueChange={(v) => f({ entityType: v as EntityType })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENTITY_TYPE_LABEL).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">Sector *</Label>
                <Input value={form.sector} onChange={(e) => f({ sector: e.target.value })} placeholder="e.g. Construction Materials" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1 block">Short Description *</Label>
                <Input value={form.shortDescription} onChange={(e) => f({ shortDescription: e.target.value })} placeholder="One sentence summary" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1 block">Full Description</Label>
                <Textarea rows={3} value={form.fullDescription} onChange={(e) => f({ fullDescription: e.target.value })} placeholder="Longer description shown on the business's page" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1 block">Capabilities (comma-separated)</Label>
                <Input value={form.capabilitiesText} onChange={(e) => f({ capabilitiesText: e.target.value })} placeholder="Roads, Civil Infrastructure, Development" />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1 block">Cover Image</Label>
                <FileUploadButton
                  variant="dropzone" mediaType="image"
                  currentStorageId={form.coverImageStorageId} currentUrl={form.coverImageUrl}
                  onUpload={(storageId, url) => f({ coverImageStorageId: storageId, coverImageUrl: url ?? "" })}
                  onClear={() => f({ coverImageStorageId: null, coverImageUrl: "" })}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">Status</Label>
                <Select value={form.status} onValueChange={(v) => f({ status: v as BizStatus })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="coming_soon">Coming Soon</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">Destination Type</Label>
                <Select value={form.destinationType} onValueChange={(v) => f({ destinationType: v as DestType })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal_route">Internal Route</SelectItem>
                    <SelectItem value="external_url">External URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                {form.destinationType === "internal_route" ? (
                  <>
                    <Label className="text-xs font-semibold mb-1 block">Internal Route *</Label>
                    <Input value={form.destinationRoute} onChange={(e) => f({ destinationRoute: e.target.value })} placeholder="/businesses/quarry" />
                  </>
                ) : (
                  <>
                    <Label className="text-xs font-semibold mb-1 block">External URL *</Label>
                    <Input value={form.destinationUrl} onChange={(e) => f({ destinationUrl: e.target.value })} placeholder="https://example.com" />
                  </>
                )}
              </div>

              <div className="col-span-2 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2"><Eye size={14} className="text-gray-400" /><span className="text-sm text-gray-700">Public Visibility</span></div>
                <Switch checked={form.publicVisibility} onCheckedChange={(c) => f({ publicVisibility: c })} className="cursor-pointer" />
              </div>
              <div className="col-span-2 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2"><Star size={14} className="text-gray-400" /><span className="text-sm text-gray-700">Featured</span></div>
                <Switch checked={form.featured} onCheckedChange={(c) => f({ featured: c })} className="cursor-pointer" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">
                {saving ? "Saving…" : editId ? "Save Changes" : "Add Business"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Business</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">This permanently removes the business record and its images. This cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setDeleteId(null)} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white gap-1.5"><Trash2 size={13} /> Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
