import { useState, useEffect } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Image as ImageIcon, Video, Upload, Link2, Search } from "lucide-react";
import { cn } from "@/lib/utils.ts";

type GalleryItem = Doc<"galleryItems">;

const CATEGORIES = ["Residential", "Luxury", "Commercial", "Estates", "Interior", "Land"];

type FormState = {
  title: string;
  category: string;
  mediaType: "image" | "video";
  src: string;
  storageId: Id<"_storage"> | null;
  videoUrl: string;
  caption: string;
  order: number;
  active: boolean;
  useUrl: boolean;
};

function defaultForm(maxOrder = 0): FormState {
  return {
    title: "",
    category: "Residential",
    mediaType: "image",
    src: "",
    storageId: null,
    videoUrl: "",
    caption: "",
    order: maxOrder + 1,
    active: true,
    useUrl: false,
  };
}

function GalleryItemForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState;
  onSave: (f: FormState) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const f = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasSrc =
      form.mediaType === "video"
        ? !!form.videoUrl.trim()
        : !!(form.storageId || form.src.trim());
    if (!form.title || !hasSrc) {
      toast.error("Please fill in title and provide media (image/video).");
      return;
    }
    await onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs font-semibold mb-1.5 block">Title *</Label>
          <Input placeholder="e.g. Royal Gardens Villa" value={form.title} onChange={(e) => f({ title: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Category</Label>
          <Select value={form.category} onValueChange={(v) => f({ category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Display Order</Label>
          <Input type="number" value={form.order} onChange={(e) => f({ order: Number(e.target.value) })} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs font-semibold mb-1.5 block">Caption</Label>
          <Input placeholder="Optional short caption…" value={form.caption} onChange={(e) => f({ caption: e.target.value })} />
        </div>
      </div>

      {/* Media type toggle */}
      <div>
        <Label className="text-xs font-semibold mb-1.5 block">Media Type</Label>
        <div className="flex gap-2">
          {(["image", "video"] as const).map((t) => (
            <button key={t} type="button"
              onClick={() => f({ mediaType: t, storageId: null, src: "", videoUrl: "", useUrl: t === "video" })}
              className={cn("flex-1 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
                form.mediaType === t ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand)]/40")}>
              {t === "image" ? <ImageIcon size={13} /> : <Video size={13} />}
              {t === "image" ? "Image" : "Video"}
            </button>
          ))}
        </div>
      </div>

      {/* Media input */}
      {form.mediaType === "video" ? (
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Video URL *</Label>
          <Input placeholder="https://youtube.com/watch?v=... or direct .mp4 URL"
            value={form.videoUrl} onChange={(e) => f({ videoUrl: e.target.value, src: e.target.value })} />
        </div>
      ) : (
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Image *</Label>
          <div className="flex gap-1.5 mb-2">
            {([false, true] as const).map((isUrl) => (
              <button key={String(isUrl)} type="button" onClick={() => f({ useUrl: isUrl })}
                className={cn("flex-1 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 transition-colors",
                  form.useUrl === isUrl ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand)]/40")}>
                {isUrl ? <><Link2 size={10} /> URL</> : <><Upload size={10} /> Upload</>}
              </button>
            ))}
          </div>
          {form.useUrl ? (
            <div>
              <Input placeholder="https://images.unsplash.com/…" value={form.src}
                onChange={(e) => f({ src: e.target.value, storageId: null })} />
              {form.src && <img src={form.src} alt="" className="mt-2 h-28 w-full rounded-xl object-cover border"
                onError={(e) => (e.currentTarget.style.display = "none")} />}
            </div>
          ) : (
            <FileUploadButton
              variant="dropzone"
              mediaType="image"
              label="Click to upload image"
              currentUrl={form.src || null}
              currentStorageId={form.storageId}
              onUpload={(storageId, url) => f({ storageId, src: url ?? "", useUrl: false })}
              onClear={() => f({ storageId: null, src: "", useUrl: false })}
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={() => f({ active: !form.active })}
          className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? "bg-[var(--brand)]" : "bg-gray-200"}`}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
        <Label className="text-xs font-semibold cursor-pointer" onClick={() => f({ active: !form.active })}>
          Visible on public gallery
        </Label>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button type="button" onClick={onCancel} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">
          {saving ? "Saving…" : "Save Item"}
        </Button>
      </div>
    </form>
  );
}

export default function AdminGallery() {
  const convex = useConvex();
  const items = useQuery(api.gallery.listAll);
  const createItem = useMutation(api.gallery.create);
  const updateItem = useMutation(api.gallery.update);
  const removeItem = useMutation(api.gallery.remove);
  const seedIfEmpty = useMutation(api.gallery.seedIfEmpty);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<Id<"galleryItems"> | null>(null);
  const [filterCat, setFilterCat] = useState("All");
  const [search, setSearch] = useState("");

  // Seed on mount if empty
  useEffect(() => {
    if (items !== undefined && items.length === 0) {
      seedIfEmpty({}).then((r) => {
        if ((r as { seeded: boolean }).seeded) toast.success("Gallery seeded with 12 default items");
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items?.length]);

  const maxOrder = items ? Math.max(0, ...items.map((i) => i.order)) : 0;

  const handleSave = async (form: FormState) => {
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        category: form.category,
        mediaType: form.mediaType,
        src: form.src,
        storageId: form.storageId ?? undefined,
        videoUrl: form.mediaType === "video" ? form.videoUrl : undefined,
        caption: form.caption || undefined,
        order: form.order,
        active: form.active,
      };
      if (editing) {
        await updateItem({ id: editing._id, ...payload });
        toast.success("Gallery item updated");
      } else {
        await createItem(payload);
        toast.success("Gallery item added");
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: GalleryItem) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleDelete = async (id: Id<"galleryItems">) => {
    try {
      await removeItem({ id });
      toast.success("Item deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (item: GalleryItem) => {
    await updateItem({ id: item._id, active: !item.active });
  };

  const initialForm = (): FormState =>
    editing
      ? {
          title: editing.title,
          category: editing.category,
          mediaType: editing.mediaType,
          src: editing.src,
          storageId: (editing.storageId ?? null) as Id<"_storage"> | null,
          videoUrl: editing.videoUrl ?? "",
          caption: editing.caption ?? "",
          order: editing.order,
          active: editing.active,
          useUrl: !editing.storageId,
        }
      : defaultForm(maxOrder);

  const filtered = items
    ? (filterCat === "All" ? items : items.filter((i) => i.category === filterCat))
        .filter((i) => !search.trim() || i.title.toLowerCase().includes(search.trim().toLowerCase()))
        .slice()
        .sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Gallery Manager
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage images and videos shown on the public gallery page
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer">
          <Plus size={16} /> Add Item
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-8 h-8 text-sm" placeholder="Search gallery…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {["All", ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={cn("px-4 py-1.5 rounded-xl text-xs font-medium border transition-colors",
              filterCat === c ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand)]/40")}>
            {c}
            {c !== "All" && items && (
              <span className="ml-1 opacity-60">({items.filter((i) => i.category === c).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Stats */}
      {items && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Items", value: items.length, color: "text-gray-900" },
            { label: "Active", value: items.filter((i) => i.active).length, color: "text-green-600" },
            { label: "Hidden", value: items.filter((i) => !i.active).length, color: "text-gray-400" },
            { label: "Videos", value: items.filter((i) => i.mediaType === "video").length, color: "text-[var(--brand)]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {items === undefined ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ImageIcon /></EmptyMedia>
            <EmptyTitle>No gallery items</EmptyTitle>
            <EmptyDescription>Add your first image or video to the gallery</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-[var(--brand)] text-white">
              <Plus size={14} className="mr-1" /> Add Item
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div key={item._id}
              className={cn("group relative rounded-2xl overflow-hidden border shadow-sm bg-white transition-all hover:shadow-md",
                !item.active && "opacity-60")}>
              {/* Thumbnail */}
              <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                {item.mediaType === "video" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white gap-2">
                    <Video size={28} className="text-[var(--brand)]" />
                    <span className="text-xs text-gray-300">Video</span>
                  </div>
                ) : (
                  <img src={item.src} alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                )}
                {/* Category badge */}
                <div className="absolute top-2 left-2">
                  <Badge className="bg-[var(--brand)]/90 text-white border-0 text-[10px] px-2 py-0.5">{item.category}</Badge>
                </div>
                {/* Hidden badge */}
                {!item.active && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-gray-800/80 text-white border-0 text-[10px]">Hidden</Badge>
                  </div>
                )}
                {/* Action overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => handleEdit(item)}
                    className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[var(--brand)] hover:bg-blue-50 transition-colors cursor-pointer">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleToggleActive(item)}
                    className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                    {item.active ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => setDeleteId(item._id)}
                    className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{item.title}</p>
                    {item.caption && <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.caption}</p>}
                  </div>
                  <div className="flex items-center gap-0.5 text-[10px] text-gray-400 shrink-0">
                    <GripVertical size={12} className="text-gray-300" />
                    <span>#{item.order}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) { setModalOpen(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
              {editing ? "Edit Gallery Item" : "Add Gallery Item"}
            </DialogTitle>
          </DialogHeader>
          {modalOpen && (
            <GalleryItemForm
              key={editing?._id ?? "new"}
              initial={initialForm()}
              onSave={handleSave}
              onCancel={() => { setModalOpen(false); setEditing(null); }}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Gallery Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Are you sure you want to permanently delete this item?</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setDeleteId(null)} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</Button>
            <Button onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-500 hover:bg-red-600 text-white">Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
