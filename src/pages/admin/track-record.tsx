import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Trophy, Plus, Pencil, Trash2, ArrowUpDown, EyeOff, ImageIcon, X, Video } from "lucide-react";
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
import { CATEGORY_LABEL, getEmbedUrl } from "@/components/track-record/track-record-utils.ts";

type Category = "real_estate" | "road_infrastructure";
type VideoItem = { link?: string; storageId?: Id<"_storage">; url?: string };
type GalleryItem = { storageId: Id<"_storage">; url: string };

type Form = {
  name: string; category: Category; projectType: string; location: string; state: string;
  yearCompleted: string; status: string; shortDescription: string; fullDescription: string;
  coverStorageId: Id<"_storage"> | null; coverUrl: string; gallery: GalleryItem[];
  videos: VideoItem[];
  unitsBuilt: string; landSize: string; familiesHoused: string;
  roadLengthKm: string; roadType: string; client: string; visible: boolean;
};

const emptyForm: Form = {
  name: "", category: "real_estate", projectType: "", location: "", state: "",
  yearCompleted: String(new Date().getFullYear()), status: "Completed", shortDescription: "", fullDescription: "",
  coverStorageId: null, coverUrl: "", gallery: [], videos: [],
  unitsBuilt: "", landSize: "", familiesHoused: "", roadLengthKm: "", roadType: "", client: "", visible: true,
};

const TYPE_HINT: Record<Category, string> = {
  real_estate: "e.g. Residential Estate, Mixed-Use, Land Only",
  road_infrastructure: "e.g. Asphalt Road, Drainage, Interlocking",
};

// Empty text -> undefined; otherwise a number (NaN guarded by caller)
const optNum = (s: string): number | undefined => (s.trim() === "" ? undefined : Number(s));
const optStr = (s: string): string | undefined => (s.trim() === "" ? undefined : s.trim());

function Num({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs font-semibold mb-1 block">{label}</Label>
      <Input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// Master switch for the whole Track Record section (siteSettings key).
function SectionSwitch() {
  const raw = useQuery(api.cms.getSiteSettings, { key: "track_record_visible" });
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [busy, setBusy] = useState(false);
  const on = raw !== "false";

  const toggle = async (checked: boolean) => {
    setBusy(true);
    try {
      await upsert({ key: "track_record_visible", value: String(checked) });
      toast.success(checked ? "Track Record is now visible on the website" : "Track Record is hidden from the website");
    } catch { toast.error("Failed to save setting"); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-sm text-gray-900">Show Track Record on the website</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {on ? "Visible on the Real Estate landing page, the Road & Infrastructure page and /track-record." : "Hidden everywhere. Your projects are kept and will return when you switch this on."}
        </p>
      </div>
      <Switch checked={on} onCheckedChange={toggle} disabled={busy || raw === undefined} className="cursor-pointer" />
    </div>
  );
}

export default function AdminTrackRecord() {
  const projects = useQuery(api.trackRecord.listAll);
  const createProject = useMutation(api.trackRecord.createProject);
  const updateProject = useMutation(api.trackRecord.updateProject);
  const deleteProject = useMutation(api.trackRecord.deleteProject);
  const reorder = useMutation(api.trackRecord.reorderProjects);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<Id<"trackRecordProjects"> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"trackRecordProjects"> | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const f = (patch: Partial<Form>) => setForm((p) => ({ ...p, ...patch }));

  const addLink = () => {
    const link = linkDraft.trim();
    if (!link) return;
    if (!getEmbedUrl(link)) { toast.error("Video link must be a YouTube or Vimeo link"); return; }
    setForm((p) => ({ ...p, videos: [...p.videos, { link }] }));
    setLinkDraft("");
  };

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (p: NonNullable<typeof projects>[number]) => {
    const storageIds = p.galleryStorageIds ?? [];
    setForm({
      name: p.name, category: p.category, projectType: p.projectType ?? "", location: p.location, state: p.state ?? "",
      yearCompleted: String(p.yearCompleted), status: p.status, shortDescription: p.shortDescription, fullDescription: p.fullDescription ?? "",
      coverStorageId: p.coverImageStorageId ?? null, coverUrl: p.coverResolvedUrl ?? "",
      videos: p.videoItems.map((x) => ({ link: x.link ?? undefined, storageId: x.storageId ?? undefined, url: x.fileUrl ?? undefined })),
      // galleryUrls only contains resolved files, so pair by position with the ids that resolved
      gallery: storageIds.slice(0, p.galleryUrls.length).map((id, i) => ({ storageId: id, url: p.galleryUrls[i] })),
      unitsBuilt: p.unitsBuilt?.toString() ?? "", landSize: p.landSize ?? "", familiesHoused: p.familiesHoused?.toString() ?? "",
      roadLengthKm: p.roadLengthKm?.toString() ?? "", roadType: p.roadType ?? "", client: p.client ?? "", visible: p.visible,
    });
    setEditId(p._id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const year = Number(form.yearCompleted);
    if (!form.name.trim() || !form.location.trim() || !form.shortDescription.trim() || !form.status.trim()) { toast.error("Fill in the required fields"); return; }
    if (!Number.isInteger(year) || year < 1900 || year > 2100) { toast.error("Enter a valid year"); return; }
    const isRoad = form.category === "road_infrastructure";
    const nums = [optNum(form.unitsBuilt), optNum(form.familiesHoused), optNum(form.roadLengthKm)];
    if (nums.some((n) => n !== undefined && (Number.isNaN(n) || n < 0))) { toast.error("Figures must be positive numbers"); return; }

    // Only send the figures that belong to the chosen category
    const payload = {
      name: form.name.trim(), category: form.category, projectType: optStr(form.projectType),
      location: form.location.trim(), state: optStr(form.state), yearCompleted: year, status: form.status.trim(),
      shortDescription: form.shortDescription.trim(), fullDescription: optStr(form.fullDescription),
      coverImageStorageId: form.coverStorageId ?? undefined,
      galleryStorageIds: form.gallery.map((g) => g.storageId),
      videos: form.videos.map((x) => ({ link: x.link, storageId: x.storageId })),
      unitsBuilt: isRoad ? undefined : optNum(form.unitsBuilt),
      landSize: isRoad ? undefined : optStr(form.landSize),
      familiesHoused: isRoad ? undefined : optNum(form.familiesHoused),
      roadLengthKm: isRoad ? optNum(form.roadLengthKm) : undefined,
      roadType: isRoad ? optStr(form.roadType) : undefined,
      client: isRoad ? optStr(form.client) : undefined,
      visible: form.visible,
    };

    setSaving(true);
    try {
      if (editId) await updateProject({ id: editId, ...payload });
      else await createProject(payload);
      toast.success(editId ? "Project updated" : "Project added");
      setShowForm(false); setEditId(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save project"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteProject({ id: deleteId }); toast.success("Project deleted"); setDeleteId(null); }
    catch { toast.error("Failed to delete project"); }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!projects) return;
    const target = index + dir;
    if (target < 0 || target >= projects.length) return;
    const ordered = [...projects];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try { await reorder({ orderedIds: ordered.map((p) => p._id) }); }
    catch { toast.error("Failed to reorder"); }
  };

  const isRoad = form.category === "road_infrastructure";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy size={20} className="text-[var(--brand)]" /> Track Record
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Completed real estate and road projects shown on the website</p>
        </div>
        <Button onClick={openAdd} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer">
          <Plus size={16} /> Add Project
        </Button>
      </div>

      <SectionSwitch />

      {projects === undefined ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : projects.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Trophy /></EmptyMedia>
            <EmptyTitle>No completed projects yet</EmptyTitle>
            <EmptyDescription>Add the estates and roads you have delivered to build trust with visitors.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button size="sm" onClick={openAdd}>Add your first project</Button></EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {projects.map((p, i) => (
            <div key={p._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-30 cursor-pointer" aria-label="Move up"><ArrowUpDown size={14} className="rotate-180" /></button>
                <button onClick={() => move(i, 1)} disabled={i === projects.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-30 cursor-pointer" aria-label="Move down"><ArrowUpDown size={14} /></button>
              </div>
              {p.coverResolvedUrl ? (
                <img src={p.coverResolvedUrl} alt={p.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-300"><ImageIcon size={22} /></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">{p.name}</span>
                  <Badge className="text-[10px] border-0 bg-blue-50 text-blue-700">{CATEGORY_LABEL[p.category]}</Badge>
                  {!p.visible && <Badge className="text-[10px] border-0 bg-gray-100 text-gray-500 gap-1"><EyeOff size={10} /> Hidden</Badge>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{p.location} · {p.yearCompleted} · {p.status}</p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-1">{p.shortDescription}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-[var(--brand)] flex items-center justify-center cursor-pointer" title="Edit"><Pencil size={13} /></button>
                <button onClick={() => setDeleteId(p._id)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center cursor-pointer" title="Delete"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Project" : "Add Project"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1 block">Project Name *</Label>
                <Input value={form.name} onChange={(e) => f({ name: e.target.value })} placeholder="e.g. Geodata Gardens Estate" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">Category *</Label>
                <Select value={form.category} onValueChange={(v) => f({ category: v as Category })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="real_estate">Real Estate</SelectItem>
                    <SelectItem value="road_infrastructure">Roads & Infrastructure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">Project Type</Label>
                <Input value={form.projectType} onChange={(e) => f({ projectType: e.target.value })} placeholder={TYPE_HINT[form.category]} />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">Location *</Label>
                <Input value={form.location} onChange={(e) => f({ location: e.target.value })} placeholder="e.g. Lekki, Lagos" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1 block">State</Label>
                <Input value={form.state} onChange={(e) => f({ state: e.target.value })} placeholder="e.g. Lagos" />
              </div>
              <Num label="Year Completed *" value={form.yearCompleted} onChange={(v) => f({ yearCompleted: v })} />
              <div>
                <Label className="text-xs font-semibold mb-1 block">Status *</Label>
                <Input value={form.status} onChange={(e) => f({ status: e.target.value })} placeholder="Completed, Handed Over" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1 block">Short Description *</Label>
                <Input value={form.shortDescription} onChange={(e) => f({ shortDescription: e.target.value })} placeholder="One or two sentences shown on the card" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1 block">Full Description</Label>
                <Textarea rows={4} value={form.fullDescription} onChange={(e) => f({ fullDescription: e.target.value })} placeholder="The full story shown on the project page" />
              </div>

              <div className="col-span-2 text-xs font-semibold text-gray-500 pt-1">{isRoad ? "Road details (optional)" : "Estate details (optional)"}</div>
              {isRoad ? (
                <>
                  <Num label="Road length (km)" value={form.roadLengthKm} onChange={(v) => f({ roadLengthKm: v })} />
                  <div><Label className="text-xs font-semibold mb-1 block">Road type</Label><Input value={form.roadType} onChange={(e) => f({ roadType: e.target.value })} placeholder="Asphalt" /></div>
                  <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Client</Label><Input value={form.client} onChange={(e) => f({ client: e.target.value })} placeholder="e.g. State Ministry of Works" /></div>
                </>
              ) : (
                <>
                  <Num label="Units built" value={form.unitsBuilt} onChange={(v) => f({ unitsBuilt: v })} />
                  <div><Label className="text-xs font-semibold mb-1 block">Land size</Label><Input value={form.landSize} onChange={(e) => f({ landSize: e.target.value })} placeholder="e.g. 20 hectares" /></div>
                  <Num label="Families housed" value={form.familiesHoused} onChange={(v) => f({ familiesHoused: v })} />
                </>
              )}

              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1 block">Cover Image</Label>
                <FileUploadButton
                  variant="dropzone" mediaType="image"
                  currentStorageId={form.coverStorageId} currentUrl={form.coverUrl}
                  onUpload={(id, url) => f({ coverStorageId: id, coverUrl: url ?? "" })}
                  onClear={() => f({ coverStorageId: null, coverUrl: "" })}
                />
              </div>

              <div className="col-span-2 rounded-xl border border-gray-200 p-3 space-y-3">
                <Label className="text-xs font-semibold block">Project Videos (optional, add as many as you like)</Label>
                {form.videos.length > 0 && (
                  <ul className="space-y-2">
                    {form.videos.map((vd, i) => (
                      <li key={vd.storageId ?? vd.link ?? i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs">
                        <Video size={14} className="text-gray-400 shrink-0" />
                        <span className="flex-1 truncate">{vd.link ?? "Uploaded video file"}</span>
                        <button type="button" aria-label="Remove video" onClick={() => f({ videos: form.videos.filter((_, j) => j !== i) })}
                          className="w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center cursor-pointer"><X size={11} /></button>
                      </li>
                    ))}
                  </ul>
                )}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Add a YouTube or Vimeo link</Label>
                  <div className="flex gap-2">
                    <Input value={linkDraft} onChange={(e) => setLinkDraft(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
                    <Button type="button" onClick={addLink} className="bg-gray-100 hover:bg-gray-200 text-gray-700 shrink-0 cursor-pointer">Add</Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-400"><div className="flex-1 h-px bg-gray-200" />or upload a file<div className="flex-1 h-px bg-gray-200" /></div>
                <FileUploadButton
                  multiple mediaType="video" label="Upload videos (select several)"
                  onUpload={(id, url) => setForm((p) => ({ ...p, videos: [...p.videos, { storageId: id, url: url ?? "" }] }))}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1 block">Gallery Photos</Label>
                {form.gallery.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {form.gallery.map((g) => (
                      <div key={g.storageId} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={g.url} alt="" className="w-full h-full object-cover" />
                        <button type="button" aria-label="Remove photo" onClick={() => f({ gallery: form.gallery.filter((x) => x.storageId !== g.storageId) })}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"><X size={11} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <FileUploadButton
                  multiple mediaType="image" label="Add photos (select several)"
                  onUpload={(id, url) => setForm((p) => ({ ...p, gallery: [...p.gallery, { storageId: id, url: url ?? "" }] }))}
                />
              </div>

              <div className="col-span-2 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-sm text-gray-700">Show this project on the website</span>
                <Switch checked={form.visible} onCheckedChange={(c) => f({ visible: c })} className="cursor-pointer" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">
                {saving ? "Saving…" : editId ? "Save Changes" : "Add Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Project</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">This permanently removes the project and its photos. To just hide it, edit the project and switch off visibility.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setDeleteId(null)} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white gap-1.5"><Trash2 size={13} /> Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
