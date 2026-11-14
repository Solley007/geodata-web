import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Building2, Plus, Pencil, Trash2, ArrowUpDown, EyeOff, ImageIcon, Copy, Archive, ArchiveRestore } from "lucide-react";
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
import { BUILDING_STAGES } from "@/lib/development-stages.ts";

type EstateForm = { name: string; location: string; intro: string; visible: boolean };
type TypeForm = {
  name: string; groupName: string; description: string; plotsCovered: string; stage: string;
  completion: string; published: boolean; coverStorageId: Id<"_storage"> | null; coverUrl: string;
};

const emptyEstate: EstateForm = { name: "", location: "", intro: "", visible: true };
const emptyType: TypeForm = { name: "", groupName: "", description: "", plotsCovered: "", stage: "Not started", completion: "0", published: false, coverStorageId: null, coverUrl: "" };
const optStr = (s: string): string | undefined => (s.trim() === "" ? undefined : s.trim());
const errMsg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

// Master switch for the public estate pages (siteSettings key)
function SectionSwitch() {
  const raw = useQuery(api.cms.getSiteSettings, { key: "estates_visible" });
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const on = raw !== "false";
  const toggle = async (checked: boolean) => {
    try {
      await upsert({ key: "estates_visible", value: String(checked) });
      toast.success(checked ? "Estate pages are visible" : "Estate pages are hidden");
    } catch { toast.error("Failed to save setting"); }
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-sm text-gray-900">Show estate development pages on the website</p>
        <p className="text-xs text-gray-500 mt-0.5">{on ? "Visible at /southern-bridge-city and in the Services menu." : "Hidden everywhere. Your estates and building types are kept."}</p>
      </div>
      <Switch checked={on} onCheckedChange={toggle} disabled={raw === undefined} className="cursor-pointer" />
    </div>
  );
}

function EstateDialog({ open, editId, initial, onClose }: { open: boolean; editId: Id<"developmentEstates"> | null; initial: EstateForm; onClose: () => void }) {
  const create = useMutation(api.developments.createEstate);
  const update = useMutation(api.developments.updateEstate);
  const [form, setForm] = useState<EstateForm>(initial);
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Enter the estate name"); return; }
    const payload = { name: form.name.trim(), location: optStr(form.location), intro: optStr(form.intro), visible: form.visible };
    setSaving(true);
    try {
      if (editId) await update({ id: editId, ...payload }); else await create(payload);
      toast.success(editId ? "Estate updated" : "Estate added");
      onClose();
    } catch (err) { toast.error(errMsg(err, "Failed to save estate")); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editId ? "Edit Estate" : "Add Estate"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label className="text-xs font-semibold mb-1 block">Estate name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Southern Bridge City" /></div>
          <div><Label className="text-xs font-semibold mb-1 block">Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Lagos" /></div>
          <div><Label className="text-xs font-semibold mb-1 block">Introduction</Label><Textarea rows={4} value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} placeholder="A short welcome shown at the top of the page" /></div>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-700">Show this estate on the website</span>
            <Switch checked={form.visible} onCheckedChange={(c) => setForm({ ...form, visible: c })} className="cursor-pointer" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TypeDialog({ open, estateId, editId, initial, onClose }: { open: boolean; estateId: Id<"developmentEstates">; editId: Id<"developmentBuildingTypes"> | null; initial: TypeForm; onClose: () => void }) {
  const create = useMutation(api.developments.createBuildingType);
  const update = useMutation(api.developments.updateBuildingType);
  const [form, setForm] = useState<TypeForm>(initial);
  const [saving, setSaving] = useState(false);
  const f = (patch: Partial<TypeForm>) => setForm((p) => ({ ...p, ...patch }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(form.completion);
    if (!form.name.trim()) { toast.error("Enter the building type name"); return; }
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) { toast.error("Completion must be between 0 and 100"); return; }
    const payload = {
      name: form.name.trim(), groupName: optStr(form.groupName), description: optStr(form.description),
      plotsCovered: optStr(form.plotsCovered), stage: form.stage, completionPercent: pct, published: form.published,
      coverImageStorageId: form.coverStorageId ?? undefined,
    };
    setSaving(true);
    try {
      if (editId) await update({ id: editId, ...payload }); else await create({ estateId, ...payload });
      toast.success(editId ? "Building type updated" : "Building type added");
      onClose();
    } catch (err) { toast.error(errMsg(err, "Failed to save building type")); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editId ? "Edit Building Type" : "Add Building Type"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Name *</Label><Input value={form.name} onChange={(e) => f({ name: e.target.value })} placeholder="e.g. 3-Bedroom Terrace" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Group</Label><Input value={form.groupName} onChange={(e) => f({ groupName: e.target.value })} placeholder="e.g. Terraces" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Plots covered</Label><Input value={form.plotsCovered} onChange={(e) => f({ plotsCovered: e.target.value })} placeholder="e.g. Plots 7, 8 and 9" /></div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Stage</Label>
              <Select value={form.stage} onValueChange={(s) => f({ stage: s })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{BUILDING_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Completion (%)</Label><Input type="number" min="0" max="100" value={form.completion} onChange={(e) => f({ completion: e.target.value })} /></div>
            <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Description</Label><Textarea rows={3} value={form.description} onChange={(e) => f({ description: e.target.value })} placeholder="What visitors should know about this building type" /></div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold mb-1 block">Cover image</Label>
              <FileUploadButton variant="dropzone" mediaType="image" currentStorageId={form.coverStorageId} currentUrl={form.coverUrl}
                onUpload={(id, url) => f({ coverStorageId: id, coverUrl: url ?? "" })} onClear={() => f({ coverStorageId: null, coverUrl: "" })} />
            </div>
            <div className="col-span-2 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-700">Publish on the website (off keeps it as a private draft)</span>
              <Switch checked={form.published} onCheckedChange={(c) => f({ published: c })} className="cursor-pointer" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type TypeRow = NonNullable<ReturnType<typeof useQuery<typeof api.developments.listBuildingTypes>>>[number];

function BuildingTypeList({ estateId }: { estateId: Id<"developmentEstates"> }) {
  const types = useQuery(api.developments.listBuildingTypes, { estateId });
  const setFlags = useMutation(api.developments.setBuildingTypeFlags);
  const duplicate = useMutation(api.developments.duplicateBuildingType);
  const remove = useMutation(api.developments.deleteBuildingType);
  const reorder = useMutation(api.developments.reorderBuildingTypes);
  const [dialog, setDialog] = useState<{ editId: Id<"developmentBuildingTypes"> | null; initial: TypeForm } | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"developmentBuildingTypes"> | null>(null);

  const openEdit = (t: TypeRow) => setDialog({
    editId: t._id,
    initial: { name: t.name, groupName: t.groupName ?? "", description: t.description ?? "", plotsCovered: t.plotsCovered ?? "", stage: t.stage, completion: String(t.completionPercent), published: t.published, coverStorageId: t.coverImageStorageId ?? null, coverUrl: t.coverUrl ?? "" },
  });

  const run = async (fn: () => Promise<unknown>, fail: string) => { try { await fn(); } catch { toast.error(fail); } };

  const move = (i: number, dir: -1 | 1) => {
    if (!types || i + dir < 0 || i + dir >= types.length) return;
    const ordered = [...types];
    [ordered[i], ordered[i + dir]] = [ordered[i + dir], ordered[i]];
    void run(() => reorder({ orderedIds: ordered.map((t) => t._id) }), "Failed to reorder");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Building types</h2>
        <Button size="sm" onClick={() => setDialog({ editId: null, initial: emptyType })} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-1.5 cursor-pointer"><Plus size={14} /> Add Building Type</Button>
      </div>

      {types === undefined ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : types.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
            <EmptyTitle>No building types yet</EmptyTitle>
            <EmptyDescription>Add each building type as a private draft, then publish it when its first photos are ready.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button size="sm" onClick={() => setDialog({ editId: null, initial: emptyType })}>Add the first building type</Button></EmptyContent>
        </Empty>
      ) : types.map((t, i) => (
        <div key={t._id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 ${t.archived ? "opacity-60" : ""}`}>
          <div className="flex flex-col gap-1">
            <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-30 cursor-pointer" aria-label="Move up"><ArrowUpDown size={14} className="rotate-180" /></button>
            <button onClick={() => move(i, 1)} disabled={i === types.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-30 cursor-pointer" aria-label="Move down"><ArrowUpDown size={14} /></button>
          </div>
          {t.coverUrl ? <img src={t.coverUrl} alt={t.name} className="w-14 h-14 rounded-xl object-cover shrink-0" /> : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-300"><ImageIcon size={20} /></div>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900">{t.name}</span>
              {t.groupName && <Badge className="text-[10px] border-0 bg-blue-50 text-blue-700">{t.groupName}</Badge>}
              {!t.published && <Badge className="text-[10px] border-0 bg-gray-100 text-gray-500 gap-1"><EyeOff size={10} /> Draft</Badge>}
              {t.archived && <Badge className="text-[10px] border-0 bg-gray-100 text-gray-500">Archived</Badge>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{t.stage} · {t.completionPercent}% {t.plotsCovered ? `· ${t.plotsCovered}` : ""}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Switch checked={t.published} onCheckedChange={(c) => void run(() => setFlags({ id: t._id, published: c }), "Failed to update")} className="cursor-pointer" aria-label="Publish" />
            <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-100 flex items-center justify-center cursor-pointer" title="Edit"><Pencil size={13} /></button>
            <button onClick={() => void run(() => duplicate({ id: t._id }), "Failed to duplicate")} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-100 flex items-center justify-center cursor-pointer" title="Duplicate"><Copy size={13} /></button>
            <button onClick={() => void run(() => setFlags({ id: t._id, archived: !t.archived }), "Failed to update")} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-100 flex items-center justify-center cursor-pointer" title={t.archived ? "Restore" : "Archive"}>{t.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}</button>
            <button onClick={() => setDeleteId(t._id)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center cursor-pointer" title="Delete"><Trash2 size={13} /></button>
          </div>
        </div>
      ))}

      {dialog && <TypeDialog key={dialog.editId ?? "new"} open estateId={estateId} editId={dialog.editId} initial={dialog.initial} onClose={() => setDialog(null)} />}

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Building Type</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">This permanently removes the building type. To just hide it, use Archive instead.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setDeleteId(null)} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</Button>
            <Button onClick={() => { if (deleteId) void run(() => remove({ id: deleteId }), "Failed to delete"); setDeleteId(null); }} className="bg-red-500 hover:bg-red-600 text-white gap-1.5"><Trash2 size={13} /> Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminDevelopmentStatus() {
  const estates = useQuery(api.developments.listEstates);
  const removeEstate = useMutation(api.developments.deleteEstate);
  const [selectedId, setSelectedId] = useState<Id<"developmentEstates"> | null>(null);
  const [estateDialog, setEstateDialog] = useState<{ editId: Id<"developmentEstates"> | null; initial: EstateForm } | null>(null);

  const selected = estates?.find((e) => e._id === selectedId) ?? estates?.[0];

  const handleDelete = async () => {
    if (!selected || !window.confirm(`Delete ${selected.name} and all its building types? This cannot be undone.`)) return;
    try { await removeEstate({ id: selected._id }); setSelectedId(null); toast.success("Estate deleted"); }
    catch { toast.error("Failed to delete estate"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Building2 size={20} className="text-[var(--brand)]" /> Estates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Development status by estate and building type</p>
        </div>
        <Button onClick={() => setEstateDialog({ editId: null, initial: emptyEstate })} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer"><Plus size={16} /> Add Estate</Button>
      </div>

      <SectionSwitch />

      {estates === undefined ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : estates.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
            <EmptyTitle>No estates yet</EmptyTitle>
            <EmptyDescription>Add Southern Bridge City to start sharing progress by building type.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button size="sm" onClick={() => setEstateDialog({ editId: null, initial: emptyEstate })}>Add your first estate</Button></EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {estates.map((e) => (
              <button key={e._id} onClick={() => setSelectedId(e._id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer ${selected?._id === e._id ? "bg-[var(--brand)] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{e.name}</button>
            ))}
            {selected && (
              <>
                <button onClick={() => setEstateDialog({ editId: selected._id, initial: { name: selected.name, location: selected.location ?? "", intro: selected.intro ?? "", visible: selected.visible } })} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-100 flex items-center justify-center cursor-pointer" title="Edit estate"><Pencil size={13} /></button>
                <button onClick={handleDelete} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center cursor-pointer" title="Delete estate"><Trash2 size={13} /></button>
              </>
            )}
          </div>
          {selected && <BuildingTypeList key={selected._id} estateId={selected._id} />}
        </>
      )}

      {estateDialog && <EstateDialog key={estateDialog.editId ?? "new"} open editId={estateDialog.editId} initial={estateDialog.initial} onClose={() => setEstateDialog(null)} />}
    </div>
  );
}
