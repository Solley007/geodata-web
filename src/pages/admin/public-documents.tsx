import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { FileText, Plus, Pencil, Trash2, ArrowUpDown, EyeOff, Lock, Star, Globe2 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { DOC_CATEGORIES, type DocAccess } from "@/lib/public-documents.ts";

type Form = {
  title: string; description: string; category: string; access: DocAccess;
  storageId: Id<"_storage"> | null; fileName: string;
  coverStorageId: Id<"_storage"> | null; coverUrl: string;
  featured: boolean; visible: boolean; diasporaVisible: boolean; publishAt: string; // datetime-local value (user's local time)
};

const EMPTY: Form = {
  title: "", description: "", category: DOC_CATEGORIES[0], access: "public",
  storageId: null, fileName: "", coverStorageId: null, coverUrl: "",
  featured: false, visible: true, diasporaVisible: false, publishAt: "",
};

const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function SectionSwitch() {
  const raw = useQuery(api.cms.getSiteSettings, { key: "public_documents_visible" });
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const on = raw !== "false";
  const toggle = async (checked: boolean) => {
    try {
      await upsert({ key: "public_documents_visible", value: String(checked) });
      toast.success(checked ? "Downloads page is now visible" : "Downloads page is hidden");
    } catch { toast.error("Failed to save setting"); }
  };
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-gray-900">Show the Downloads page on the website</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {on ? "Visitors can reach it at /downloads, from the Company menu and the footer." : "Hidden everywhere. Your documents are kept and return when you switch this on."}
        </p>
      </div>
      <Switch checked={on} onCheckedChange={toggle} disabled={raw === undefined} className="cursor-pointer" />
    </div>
  );
}

export default function AdminPublicDocuments() {
  const docs = useQuery(api.publicDocuments.listAll, {});
  const create = useMutation(api.publicDocuments.createDocument);
  const update = useMutation(api.publicDocuments.updateDocument);
  const remove = useMutation(api.publicDocuments.deleteDocument);
  const reorder = useMutation(api.publicDocuments.reorderDocuments);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"publicDocuments"> | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Id<"publicDocuments"> | null>(null);

  const set = <K extends keyof Form>(k: K, val: Form[K]) => setForm((f) => ({ ...f, [k]: val }));
  const errMsg = (e: unknown) => (e instanceof ConvexError ? (e.data as { message: string }).message : "Something went wrong");

  const openAdd = () => { setEditingId(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (d: NonNullable<typeof docs>[number]) => {
    setEditingId(d._id);
    setForm({
      title: d.title, description: d.description ?? "", category: d.category, access: d.access,
      storageId: d.storageId, fileName: d.fileName,
      coverStorageId: d.coverStorageId ?? null, coverUrl: d.coverUrl ?? "",
      featured: d.featured, visible: d.visible, diasporaVisible: d.diasporaVisible === true, publishAt: toLocalInput(d.publishAt),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Please enter a title");
    if (!form.storageId) return toast.error("Please upload the document file");
    const payload = {
      title: form.title, description: form.description.trim() || undefined, category: form.category,
      storageId: form.storageId, fileName: form.fileName,
      coverStorageId: form.coverStorageId ?? undefined, access: form.access,
      featured: form.featured, visible: form.visible, diasporaVisible: form.diasporaVisible,
      publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : undefined,
    };
    setSaving(true);
    try {
      if (editingId) await update({ documentId: editingId, ...payload });
      else await create(payload);
      toast.success(editingId ? "Document updated" : "Document added");
      setOpen(false);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setSaving(false); }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!docs) return;
    const ids = docs.map((d) => d._id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try { await reorder({ orderedIds: ids }); } catch { toast.error("Could not reorder"); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try { await remove({ documentId: deleting }); toast.success("Document deleted"); }
    catch { toast.error("Could not delete"); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Public Documents</h1>
          <p className="text-sm text-gray-500">Brochures, price lists, maps and policies that visitors can view, share and download.</p>
        </div>
        <Button onClick={openAdd} className="cursor-pointer"><Plus size={16} /> Add document</Button>
      </div>

      <SectionSwitch />

      {docs === undefined ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : docs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileText /></EmptyMedia>
            <EmptyTitle>No documents yet</EmptyTitle>
            <EmptyDescription>Upload your company profile or a brochure to get started.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button size="sm" onClick={openAdd} className="cursor-pointer">Add your first document</Button></EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {docs.map((d, i) => (
            <div key={d._id} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="cursor-pointer text-gray-300 hover:text-gray-600 disabled:opacity-30" aria-label="Move up"><ArrowUpDown size={14} className="rotate-180" /></button>
                <button onClick={() => move(i, 1)} disabled={i === docs.length - 1} className="cursor-pointer text-gray-300 hover:text-gray-600 disabled:opacity-30" aria-label="Move down"><ArrowUpDown size={14} /></button>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400"><FileText size={20} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-gray-900">{d.title}</p>
                  {d.featured && <Badge className="gap-1"><Star size={10} /> Featured</Badge>}
                  {!d.visible && <Badge variant="secondary" className="gap-1"><EyeOff size={10} /> Hidden</Badge>}
                  {d.access === "signin" && <Badge variant="secondary" className="gap-1"><Lock size={10} /> Sign-in only</Badge>}
                  {d.diasporaVisible && <Badge variant="secondary" className="gap-1"><Globe2 size={10} /> Diaspora</Badge>}
                </div>
                <p className="truncate text-xs text-gray-500">{d.category} · {d.fileName} · {d.viewCount} views · {d.downloadCount} downloads</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(d)} className="cursor-pointer" aria-label="Edit"><Pencil size={15} /></Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleting(d._id)} className="cursor-pointer text-red-500" aria-label="Delete"><Trash2 size={15} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit document" : "Add document"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Document file</Label>
              <FileUploadButton
                mediaType="any"
                accept="*/*"
                label={form.storageId ? "Replace file" : "Upload file"}
                onUpload={(id, _url, name) => setForm((f) => ({ ...f, storageId: id, fileName: name ?? f.fileName, title: f.title || (name ?? "").replace(/\.[^.]+$/, "") }))}
              />
              {form.fileName && <p className="truncate text-xs text-gray-500">{form.fileName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Title</Label>
              <Input id="doc-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Company Profile 2026" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-desc">Short description</Label>
              <Textarea id="doc-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Who can open it</Label>
                <Select value={form.access} onValueChange={(v) => set("access", v as DocAccess)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Everyone</SelectItem>
                    <SelectItem value="signin">Signed-in users only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cover image (optional)</Label>
              <FileUploadButton
                mediaType="image"
                variant="dropzone"
                currentStorageId={form.coverStorageId}
                currentUrl={form.coverUrl || null}
                onUpload={(id, url) => setForm((f) => ({ ...f, coverStorageId: id, coverUrl: url ?? "" }))}
                onClear={() => setForm((f) => ({ ...f, coverStorageId: null, coverUrl: "" }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-publish">Publish on (optional)</Label>
              <Input id="doc-publish" type="datetime-local" value={form.publishAt} onChange={(e) => set("publishAt", e.target.value)} />
              <p className="text-xs text-gray-500">Leave empty to publish straight away. Uses your local time.</p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="doc-visible">Visible on the website</Label>
              <Switch id="doc-visible" checked={form.visible} onCheckedChange={(c) => set("visible", c)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="doc-featured">Featured (shown first)</Label>
              <Switch id="doc-featured" checked={form.featured} onCheckedChange={(c) => set("featured", c)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="doc-diaspora">Show on Diaspora page</Label>
                <p className="text-xs text-gray-500 mt-0.5">Listed in the "Downloads" section of the Diaspora landing page.</p>
              </div>
              <Switch id="doc-diaspora" checked={form.diasporaVisible} onCheckedChange={(c) => set("diasporaVisible", c)} />
            </div>
            <Button onClick={save} disabled={saving} className="w-full cursor-pointer">{saving ? "Saving…" : "Save document"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete this document?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">The file is removed permanently and old shared links stop working.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)} className="cursor-pointer">Cancel</Button>
            <Button onClick={confirmDelete} className="cursor-pointer bg-red-600 text-white hover:bg-red-700">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
