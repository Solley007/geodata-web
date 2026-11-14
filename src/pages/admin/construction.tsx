import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { motion } from "motion/react";
import { Plus, Pencil, Trash2, HardHat, Package, Truck, FileText, BarChart2, Search, X, Video } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { getEmbedUrl } from "@/components/track-record/track-record-utils.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

const SITE_STATUS_COLOR: Record<string, string> = {
  planning: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
};

const MAT_STATUS_COLOR: Record<string, string> = {
  ordered: "bg-purple-100 text-purple-700",
  delivered: "bg-blue-100 text-blue-700",
  in_use: "bg-green-100 text-green-700",
  depleted: "bg-red-100 text-red-600",
};

const MAT_CATEGORIES = ["Cement", "Steel", "Wood", "Sand", "Tiles", "Paint", "Electrical", "Plumbing", "Roofing", "Glass", "Other"];

type SiteForm = { name: string; location: string; projectManager: string; startDate: string; expectedEndDate: string; status: string; completionPercent: string; budget: string; spent: string; description: string; image: string; published: boolean };
const emptySite: SiteForm = { name: "", location: "", projectManager: "", startDate: new Date().toISOString().split("T")[0], expectedEndDate: "", status: "planning", completionPercent: "0", budget: "", spent: "0", description: "", image: "", published: false };

type ReportMedia = {
  photos: { storageId: Id<"_storage">; url: string }[];
  videos: { link?: string; storageId?: Id<"_storage"> }[];
  published: boolean;
};
const emptyMedia: ReportMedia = { photos: [], videos: [], published: false };

type SupplierForm = { name: string; contactPerson: string; phone: string; email: string; address: string; category: string; rating: string; status: string; notes: string };
const emptySupplier: SupplierForm = { name: "", contactPerson: "", phone: "", email: "", address: "", category: "", rating: "", status: "active", notes: "" };

function OngoingSwitch() {
  const raw = useQuery(api.cms.getSiteSettings, { key: "ongoing_projects_visible" });
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const on = raw !== "false";
  const toggle = async (checked: boolean) => {
    try {
      await upsert({ key: "ongoing_projects_visible", value: String(checked) });
      toast.success(checked ? "Ongoing Projects page is visible" : "Ongoing Projects page is hidden");
    } catch { toast.error("Failed to save setting"); }
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-sm text-gray-900">Show the public Ongoing Projects page</p>
        <p className="text-xs text-gray-500 mt-0.5">{on ? "Published sites appear at /ongoing-projects and in the Services menu." : "Hidden everywhere. Your sites and reports are kept."}</p>
      </div>
      <Switch checked={on} onCheckedChange={toggle} disabled={raw === undefined} className="cursor-pointer" />
    </div>
  );
}

export default function AdminConstruction() {
  const [tab, setTab] = useState<"sites" | "materials" | "suppliers" | "reports">("sites");
  const [selectedSiteId, setSelectedSiteId] = useState<Id<"constructionSites"> | null>(null);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [editSiteId, setEditSiteId] = useState<Id<"constructionSites"> | null>(null);
  const [siteForm, setSiteForm] = useState<SiteForm>(emptySite);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editSupplierId, setEditSupplierId] = useState<Id<"suppliers"> | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplier);
  const [showMatForm, setShowMatForm] = useState(false);
  const [matForm, setMatForm] = useState({ name: "", category: "Cement", unit: "bags", quantityOrdered: "", quantityDelivered: "0", quantityUsed: "0", unitCost: "", supplier: "", deliveryDate: "", status: "ordered" });
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportMedia, setReportMedia] = useState<ReportMedia>(emptyMedia);
  const [videoLinkDraft, setVideoLinkDraft] = useState("");
  const setReportPublished = useMutation(api.construction.setReportPublished);
  const [reportForm, setReportForm] = useState({ reportDate: new Date().toISOString().split("T")[0], reportedBy: "", workDone: "", challenges: "", nextSteps: "", workersPresent: "", weatherCondition: "" });
  const [loading, setLoading] = useState(false);
  const [siteSearch, setSiteSearch] = useState("");
  const [debouncedSiteSearch] = useDebounce(siteSearch, 350);

  const allSites = useQuery(api.construction.listSites, {});
  const {
    rows: sites,
    pageIndex: sitePageIndex,
    hasNextPage: siteHasNext,
    hasPrevPage: siteHasPrev,
    isLoading: sitesLoading,
    nextPage: siteNextPage,
    prevPage: sitePrevPage,
    reset: resetSitePage,
  } = useCursorPagination(api.construction.listSitesPaginated, { search: debouncedSiteSearch || undefined }, 9);
  const stats = useQuery(api.construction.getConstructionStats);
  const materials = useQuery(api.construction.listMaterials, { siteId: selectedSiteId ?? undefined });
  const {
    rows: suppliers,
    pageIndex: supplierPageIndex,
    hasNextPage: supplierHasNext,
    hasPrevPage: supplierHasPrev,
    isLoading: suppliersLoading,
    nextPage: supplierNextPage,
    prevPage: supplierPrevPage,
  } = useCursorPagination(api.construction.listSuppliersPaginated, {}, 9);
  const reports = useQuery(api.construction.listReports, selectedSiteId ? { siteId: selectedSiteId } : "skip");

  useEffect(() => {
    resetSitePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSiteSearch]);

  const createSite = useMutation(api.construction.createSite);
  const updateSite = useMutation(api.construction.updateSite);
  const deleteSite = useMutation(api.construction.deleteSite);
  const createMat = useMutation(api.construction.createMaterial);
  const deleteMat = useMutation(api.construction.deleteMaterial);
  const createSupplier = useMutation(api.construction.createSupplier);
  const updateSupplier = useMutation(api.construction.updateSupplier);
  const deleteSupplier = useMutation(api.construction.deleteSupplier);
  const createReport = useMutation(api.construction.createReport);

  const openEditSite = (s: NonNullable<typeof sites>[0]) => {
    setSiteForm({ name: s.name, location: s.location, projectManager: s.projectManager ?? "", startDate: s.startDate, expectedEndDate: s.expectedEndDate, status: s.status, completionPercent: String(s.completionPercent), budget: String(s.budget), spent: String(s.spent), description: s.description ?? "", image: s.image ?? "", published: s.published ?? false });
    setEditSiteId(s._id); setShowSiteForm(true);
  };

  const handleSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteForm.name || !siteForm.location || !siteForm.budget) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      const p = { ...siteForm, completionPercent: Number(siteForm.completionPercent), budget: Number(siteForm.budget), spent: Number(siteForm.spent), projectManager: siteForm.projectManager || undefined, description: siteForm.description || undefined, image: siteForm.image || undefined };
      if (editSiteId) await updateSite({ id: editSiteId, ...p });
      else await createSite(p);
      toast.success(editSiteId ? "Site updated!" : "Site created!"); setShowSiteForm(false); setEditSiteId(null);
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.phone) { toast.error("Fill required fields"); return; }
    try {
      const p = { ...supplierForm, rating: supplierForm.rating ? Number(supplierForm.rating) : undefined, email: supplierForm.email || undefined, address: supplierForm.address || undefined, notes: supplierForm.notes || undefined };
      if (editSupplierId) await updateSupplier({ id: editSupplierId, ...p });
      else await createSupplier(p);
      toast.success("Supplier saved!"); setShowSupplierForm(false); setEditSupplierId(null);
    } catch { toast.error("Failed"); }
  };

  const handleMatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId || !matForm.name || !matForm.quantityOrdered || !matForm.unitCost) { toast.error("Select a site and fill required fields"); return; }
    try {
      await createMat({ siteId: selectedSiteId, ...matForm, quantityOrdered: Number(matForm.quantityOrdered), quantityDelivered: Number(matForm.quantityDelivered), quantityUsed: Number(matForm.quantityUsed), unitCost: Number(matForm.unitCost), supplier: matForm.supplier || undefined, deliveryDate: matForm.deliveryDate || undefined });
      toast.success("Material added!"); setShowMatForm(false);
    } catch { toast.error("Failed"); }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId || !reportForm.workDone || !reportForm.reportedBy) { toast.error("Select a site and fill required fields"); return; }
    try {
      await createReport({
        siteId: selectedSiteId, ...reportForm,
        workersPresent: reportForm.workersPresent ? Number(reportForm.workersPresent) : undefined,
        challenges: reportForm.challenges || undefined, nextSteps: reportForm.nextSteps || undefined,
        weatherCondition: reportForm.weatherCondition || undefined,
        photoStorageIds: reportMedia.photos.map((p) => p.storageId),
        videos: reportMedia.videos,
        published: reportMedia.published,
      });
      setReportMedia(emptyMedia);
      toast.success("Report submitted!"); setShowReportForm(false);
    } catch { toast.error("Failed"); }
  };

  const sf = (k: keyof SiteForm, v: string) => setSiteForm((p) => ({ ...p, [k]: v }));
  const suppf = (k: keyof SupplierForm, v: string) => setSupplierForm((p) => ({ ...p, [k]: v }));
  const selectedSite = allSites?.find((s) => s._id === selectedSiteId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Construction Management</h1>
          <p className="text-sm text-gray-500">Sites, materials, suppliers & daily reports</p>
        </div>
        <Button onClick={() => { setSiteForm(emptySite); setEditSiteId(null); setShowSiteForm(true); }} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 h-9 text-sm">
          <Plus size={14} /> Add Site
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Sites", value: stats.totalSites, icon: HardHat, color: "var(--brand)" },
            { label: "Active Sites", value: stats.activeSites, icon: BarChart2, color: "#22c55e" },
            { label: "Total Budget", value: `₦${(stats.totalBudget / 1_000_000).toFixed(0)}M`, icon: Package, color: "#f59e0b" },
            { label: "Suppliers", value: stats.totalSuppliers, icon: Truck, color: "#8b5cf6" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{s.label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.color + "20" }}>
                  <s.icon size={15} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <OngoingSwitch />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {[["sites","Sites"], ["materials","Materials"], ["suppliers","Suppliers"], ["reports","Reports"]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v as typeof tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === v ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
        ))}
      </div>

      {/* Sites */}
      {tab === "sites" && (
        <div className="space-y-4">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="pl-8 h-9" placeholder="Search sites…" value={siteSearch} onChange={(e) => setSiteSearch(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sitesLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)
              : sites.length === 0 ? <div className="col-span-3 bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm">No construction sites. Add your first site.</div>
              : sites.map((site, i) => (
              <motion.div key={site._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${selectedSiteId === site._id ? "border-[var(--brand)]" : "border-gray-100"}`}>
                <div className="h-32 relative overflow-hidden">
                  <img src={site.image || "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400"} alt={site.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2"><Badge className={`text-xs border-0 capitalize ${SITE_STATUS_COLOR[site.status]}`}>{site.status.replace("_", " ")}</Badge></div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{site.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{site.location}{site.projectManager && ` · PM: ${site.projectManager}`}</p>
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Progress</span><span>{site.completionPercent}%</span></div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--brand)] rounded-full transition-all" style={{ width: `${site.completionPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-3">
                    <span>Budget: <span className="font-medium text-gray-800">₦{(site.budget / 1_000_000).toFixed(1)}M</span></span>
                    <span>Spent: <span className="font-medium text-gray-800">₦{(site.spent / 1_000_000).toFixed(1)}M</span></span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className={`flex-1 h-7 text-xs ${selectedSiteId === site._id ? "bg-[var(--brand)] text-white" : "bg-gray-50 text-gray-700"}`} onClick={() => setSelectedSiteId(selectedSiteId === site._id ? null : site._id)}>
                      {selectedSiteId === site._id ? "Selected" : "Select"}
                    </Button>
                    <Button size="sm" className="h-7 w-7 p-0 bg-blue-50 hover:bg-blue-100 text-[var(--brand)]" onClick={() => openEditSite(site)}><Pencil size={12} /></Button>
                    <Button size="sm" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 text-red-600" onClick={async () => { if (confirm("Delete site?")) { await deleteSite({ id: site._id }); toast.success("Deleted"); } }}><Trash2 size={12} /></Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {!sitesLoading && sites.length > 0 && (
            <TablePager pageIndex={sitePageIndex} hasNextPage={siteHasNext} hasPrevPage={siteHasPrev} onNext={siteNextPage} onPrev={sitePrevPage} className="bg-white rounded-2xl border border-gray-100 shadow-sm" />
          )}
        </div>
      )}

      {/* Materials */}
      {tab === "materials" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedSiteId ?? ""} onValueChange={(v) => setSelectedSiteId(v as Id<"constructionSites">)}>
              <SelectTrigger className="w-52 h-9 text-sm"><SelectValue placeholder="Select site..." /></SelectTrigger>
              <SelectContent>{allSites?.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedSiteId && <Button onClick={() => setShowMatForm(true)} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 h-9 text-sm"><Plus size={14} /> Add Material</Button>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {!selectedSiteId ? <div className="py-12 text-center text-gray-400 text-sm">Select a site to view materials</div>
              : !materials ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              : materials.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm">No materials for this site yet</div>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Material</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Category</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Qty (Ord/Del/Used)</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Cost</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {materials.map((m) => (
                        <tr key={m._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3"><div className="font-medium text-gray-900">{m.name}</div><div className="text-xs text-gray-400">{m.supplier}</div></td>
                          <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">{m.category}</td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-700">{m.quantityOrdered} / {m.quantityDelivered} / {m.quantityUsed} {m.unit}</td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-700 font-medium">₦{(m.unitCost * m.quantityOrdered).toLocaleString()}</td>
                          <td className="px-4 py-3"><Badge className={`text-xs border-0 capitalize ${MAT_STATUS_COLOR[m.status] ?? "bg-gray-100 text-gray-500"}`}>{m.status.replace("_", " ")}</Badge></td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 text-red-600" onClick={async () => { await deleteMat({ id: m._id }); toast.success("Removed"); }}><Trash2 size={12} /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Suppliers */}
      {tab === "suppliers" && (
        <div className="space-y-4">
          <Button onClick={() => { setSupplierForm(emptySupplier); setEditSupplierId(null); setShowSupplierForm(true); }} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 h-9 text-sm">
            <Plus size={14} /> Add Supplier
          </Button>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliersLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
              : suppliers.length === 0 ? <div className="col-span-3 bg-white rounded-2xl border py-12 text-center text-gray-400 text-sm">No suppliers yet</div>
              : suppliers.map((sup, i) => (
                <motion.div key={sup._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{sup.name}</div>
                      <div className="text-xs text-gray-500">{sup.category}</div>
                    </div>
                    <Badge className={`text-xs border-0 capitalize ${sup.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{sup.status}</Badge>
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5 mb-3">
                    <div>{sup.contactPerson} · {sup.phone}</div>
                    {sup.email && <div>{sup.email}</div>}
                    {sup.rating && <div className="flex gap-0.5 text-yellow-400">{Array.from({ length: sup.rating }).map((_, i) => <span key={i}>★</span>)}</div>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-7 text-xs bg-blue-50 text-[var(--brand)]" onClick={() => { setSupplierForm({ name: sup.name, contactPerson: sup.contactPerson, phone: sup.phone, email: sup.email ?? "", address: sup.address ?? "", category: sup.category, rating: sup.rating ? String(sup.rating) : "", status: sup.status, notes: sup.notes ?? "" }); setEditSupplierId(sup._id); setShowSupplierForm(true); }}>Edit</Button>
                    <Button size="sm" className="h-7 w-7 p-0 bg-red-50 text-red-600" onClick={async () => { await deleteSupplier({ id: sup._id }); toast.success("Removed"); }}><Trash2 size={12} /></Button>
                  </div>
                </motion.div>
              ))}
          </div>
          {!suppliersLoading && suppliers.length > 0 && (
            <TablePager pageIndex={supplierPageIndex} hasNextPage={supplierHasNext} hasPrevPage={supplierHasPrev} onNext={supplierNextPage} onPrev={supplierPrevPage} className="bg-white rounded-2xl border border-gray-100 shadow-sm" />
          )}
        </div>
      )}

      {/* Reports */}
      {tab === "reports" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedSiteId ?? ""} onValueChange={(v) => setSelectedSiteId(v as Id<"constructionSites">)}>
              <SelectTrigger className="w-52 h-9 text-sm"><SelectValue placeholder="Select site..." /></SelectTrigger>
              <SelectContent>{allSites?.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedSiteId && <Button onClick={() => setShowReportForm(true)} className="bg-[var(--brand)] text-white gap-2 h-9 text-sm"><Plus size={14} /> File Report</Button>}
          </div>
          {!selectedSiteId ? <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm">Select a site to view reports</div>
            : !reports ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
            : reports.length === 0 ? <div className="bg-white rounded-2xl border py-12 text-center text-gray-400 text-sm">No reports for this site</div>
            : (
              <div className="space-y-3">
                {reports.map((r, i) => (
                  <motion.div key={r._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[var(--brand)]" />
                        <span className="font-semibold text-gray-900 text-sm">{r.reportDate}</span>
                        <span className="text-xs text-gray-400">by {r.reportedBy}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-400">
                        {r.workersPresent && <span>{r.workersPresent} workers</span>}
                        {r.weatherCondition && <span>{r.weatherCondition}</span>}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 mb-2">{r.workDone}</div>
                    {r.challenges && <div className="text-xs text-red-600 mb-1"><span className="font-medium">Challenges: </span>{r.challenges}</div>}
                    {r.nextSteps && <div className="text-xs text-blue-600"><span className="font-medium">Next Steps: </span>{r.nextSteps}</div>}
                    {(r.photoUrls.length > 0 || r.videoItems.length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {r.photoUrls.map((u) => <img key={u} src={u} alt="Progress" className="w-16 h-16 rounded-lg object-cover" />)}
                        {r.videoItems.map((vd, j) => (
                          <div key={vd.fileUrl ?? vd.link ?? j} className="w-16 h-16 rounded-lg bg-gray-900 text-white flex items-center justify-center"><Video size={18} /></div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">{r.published ? "Shown on the public page" : "Internal only"}</span>
                      <Switch checked={r.published ?? false} className="cursor-pointer"
                        onCheckedChange={(c) => setReportPublished({ id: r._id, published: c }).catch(() => toast.error("Failed to update"))} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Site Form Dialog */}
      <Dialog open={showSiteForm} onOpenChange={setShowSiteForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>{editSiteId ? "Edit Site" : "Add Construction Site"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSiteSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Site Name *</Label><Input value={siteForm.name} onChange={(e) => sf("name", e.target.value)} /></div>
              <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Location *</Label><Input value={siteForm.location} onChange={(e) => sf("location", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Project Manager</Label><Input value={siteForm.projectManager} onChange={(e) => sf("projectManager", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Status</Label>
                <Select value={siteForm.status} onValueChange={(v) => sf("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["planning","active","on_hold","completed"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold mb-1 block">Start Date</Label><Input type="date" value={siteForm.startDate} onChange={(e) => sf("startDate", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Expected End Date</Label><Input type="date" value={siteForm.expectedEndDate} onChange={(e) => sf("expectedEndDate", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Budget (₦) *</Label><Input type="number" value={siteForm.budget} onChange={(e) => sf("budget", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Amount Spent (₦)</Label><Input type="number" value={siteForm.spent} onChange={(e) => sf("spent", e.target.value)} /></div>
              <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Completion % (0-100)</Label><Input type="number" min="0" max="100" value={siteForm.completionPercent} onChange={(e) => sf("completionPercent", e.target.value)} /></div>
              <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Site Image URL</Label><Input value={siteForm.image} onChange={(e) => sf("image", e.target.value)} placeholder="https://..." /></div>
              <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Description</Label><Textarea value={siteForm.description} onChange={(e) => sf("description", e.target.value)} rows={2} className="resize-none text-sm" /></div>
              <div className="col-span-2 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm text-gray-700">Show on the public Ongoing Projects page</p>
                  <p className="text-xs text-gray-400">Only name, location, progress and published updates are shown. Budget and spending stay private.</p>
                </div>
                <Switch checked={siteForm.published} onCheckedChange={(c) => setSiteForm((p) => ({ ...p, published: c }))} className="cursor-pointer" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowSiteForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-[var(--brand)] text-white">{loading ? "Saving..." : editSiteId ? "Update" : "Create Site"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Material Form Dialog */}
      <Dialog open={showMatForm} onOpenChange={setShowMatForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Material — {selectedSite?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleMatSubmit} className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Material Name *</Label><Input value={matForm.name} onChange={(e) => setMatForm((p) => ({ ...p, name: e.target.value }))} placeholder="Portland Cement" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Category</Label>
                <Select value={matForm.category} onValueChange={(v) => setMatForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MAT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold mb-1 block">Unit</Label>
                <Select value={matForm.unit} onValueChange={(v) => setMatForm((p) => ({ ...p, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["bags","tonnes","pieces","litres","metres","rolls","sheets"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold mb-1 block">Qty Ordered *</Label><Input type="number" value={matForm.quantityOrdered} onChange={(e) => setMatForm((p) => ({ ...p, quantityOrdered: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Unit Cost (₦) *</Label><Input type="number" value={matForm.unitCost} onChange={(e) => setMatForm((p) => ({ ...p, unitCost: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Supplier</Label><Input value={matForm.supplier} onChange={(e) => setMatForm((p) => ({ ...p, supplier: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Delivery Date</Label><Input type="date" value={matForm.deliveryDate} onChange={(e) => setMatForm((p) => ({ ...p, deliveryDate: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Status</Label>
                <Select value={matForm.status} onValueChange={(v) => setMatForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["ordered","delivered","in_use","depleted"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowMatForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" className="bg-[var(--brand)] text-white">Add Material</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Form Dialog */}
      <Dialog open={showSupplierForm} onOpenChange={setShowSupplierForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editSupplierId ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSupplierSubmit} className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Company Name *</Label><Input value={supplierForm.name} onChange={(e) => suppf("name", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Contact Person</Label><Input value={supplierForm.contactPerson} onChange={(e) => suppf("contactPerson", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Phone *</Label><Input value={supplierForm.phone} onChange={(e) => suppf("phone", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Email</Label><Input type="email" value={supplierForm.email} onChange={(e) => suppf("email", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Category</Label><Input value={supplierForm.category} onChange={(e) => suppf("category", e.target.value)} placeholder="e.g. Cement, Steel" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Rating (1-5)</Label><Input type="number" min="1" max="5" value={supplierForm.rating} onChange={(e) => suppf("rating", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Status</Label>
                <Select value={supplierForm.status} onValueChange={(v) => suppf("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Address</Label><Input value={supplierForm.address} onChange={(e) => suppf("address", e.target.value)} /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Notes</Label><Textarea value={supplierForm.notes} onChange={(e) => suppf("notes", e.target.value)} rows={2} className="resize-none text-sm" /></div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowSupplierForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" className="bg-[var(--brand)] text-white">{editSupplierId ? "Update" : "Add Supplier"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report Form Dialog */}
      <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>File Daily Report — {selectedSite?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleReportSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Date</Label><Input type="date" value={reportForm.reportDate} onChange={(e) => setReportForm((p) => ({ ...p, reportDate: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Reported By *</Label><Input value={reportForm.reportedBy} onChange={(e) => setReportForm((p) => ({ ...p, reportedBy: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Workers Present</Label><Input type="number" value={reportForm.workersPresent} onChange={(e) => setReportForm((p) => ({ ...p, workersPresent: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Weather</Label><Input value={reportForm.weatherCondition} onChange={(e) => setReportForm((p) => ({ ...p, weatherCondition: e.target.value }))} placeholder="Sunny, Rainy..." /></div>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Work Done Today *</Label><Textarea value={reportForm.workDone} onChange={(e) => setReportForm((p) => ({ ...p, workDone: e.target.value }))} rows={3} className="resize-none text-sm" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Challenges</Label><Textarea value={reportForm.challenges} onChange={(e) => setReportForm((p) => ({ ...p, challenges: e.target.value }))} rows={2} className="resize-none text-sm" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Next Steps</Label><Textarea value={reportForm.nextSteps} onChange={(e) => setReportForm((p) => ({ ...p, nextSteps: e.target.value }))} rows={2} className="resize-none text-sm" /></div>
            <div className="rounded-xl border border-gray-200 p-3 space-y-3">
              <Label className="text-xs font-semibold block">Progress photos and videos (optional)</Label>
              {reportMedia.photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {reportMedia.photos.map((ph) => (
                    <div key={ph.storageId} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img src={ph.url} alt="" className="w-full h-full object-cover" />
                      <button type="button" aria-label="Remove photo" onClick={() => setReportMedia((m) => ({ ...m, photos: m.photos.filter((x) => x.storageId !== ph.storageId) }))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"><X size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
              <FileUploadButton multiple mediaType="image" label="Add photos (select several)"
                onUpload={(id, url) => setReportMedia((m) => ({ ...m, photos: [...m.photos, { storageId: id, url: url ?? "" }] }))} />
              {reportMedia.videos.length > 0 && (
                <ul className="space-y-2">
                  {reportMedia.videos.map((vd, i) => (
                    <li key={vd.storageId ?? vd.link ?? i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs">
                      <Video size={14} className="text-gray-400 shrink-0" />
                      <span className="flex-1 truncate">{vd.link ?? "Uploaded video file"}</span>
                      <button type="button" aria-label="Remove video" onClick={() => setReportMedia((m) => ({ ...m, videos: m.videos.filter((_, j) => j !== i) }))}
                        className="w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 flex items-center justify-center cursor-pointer"><X size={11} /></button>
                    </li>
                  ))}
                </ul>
              )}
              <FileUploadButton multiple mediaType="video" label="Upload videos (select several)"
                onUpload={(id) => setReportMedia((m) => ({ ...m, videos: [...m.videos, { storageId: id }] }))} />
              <div className="flex gap-2">
                <Input value={videoLinkDraft} onChange={(e) => setVideoLinkDraft(e.target.value)} placeholder="Or paste a YouTube / Vimeo link" />
                <Button type="button" className="bg-gray-100 text-gray-700 shrink-0 cursor-pointer" onClick={() => {
                  const link = videoLinkDraft.trim();
                  if (!link) return;
                  if (!getEmbedUrl(link)) { toast.error("Video link must be a YouTube or Vimeo link"); return; }
                  setReportMedia((m) => ({ ...m, videos: [...m.videos, { link }] }));
                  setVideoLinkDraft("");
                }}>Add</Button>
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-700">Show this update on the public page</span>
              <Switch checked={reportMedia.published} onCheckedChange={(c) => setReportMedia((m) => ({ ...m, published: c }))} className="cursor-pointer" />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowReportForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" className="bg-[var(--brand)] text-white">Submit Report</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
