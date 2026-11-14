import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, MapPin, Video } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { toast } from "sonner";

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  upcoming: "bg-yellow-100 text-yellow-700",
};

type EstateForm = {
  name: string; description: string; state: string; lga: string; location: string;
  totalPlots: string; availablePlots: string; soldPlots: string; reservedPlots: string;
  pricePerPlot: string; image: string; status: string; features: string;
};

const emptyForm: EstateForm = { name: "", description: "", state: "", lga: "", location: "", totalPlots: "", availablePlots: "", soldPlots: "0", reservedPlots: "0", pricePerPlot: "", image: "", status: "active", features: "" };

export default function AdminEstates() {
  const navigate = useNavigate();
  const liveInspectionStatus = useQuery(api.liveInspections.getFeatureStatus, {});
  const liveInspectionEnabled = liveInspectionStatus?.enabled === true;
  const estates = useQuery(api.admin.listEstates);
  const createEstate = useMutation(api.admin.createEstate);
  const updateEstate = useMutation(api.admin.updateEstate);
  const deleteEstate = useMutation(api.admin.deleteEstate);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<Id<"estates"> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"estates"> | null>(null);
  const [form, setForm] = useState<EstateForm>(emptyForm);
  const [loading, setLoading] = useState(false);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };
  const openEdit = (e: NonNullable<typeof estates>[0]) => {
    setForm({ name: e.name, description: e.description, state: e.state, lga: e.lga, location: e.location, totalPlots: String(e.totalPlots), availablePlots: String(e.availablePlots), soldPlots: String(e.soldPlots), reservedPlots: String(e.reservedPlots), pricePerPlot: String(e.pricePerPlot), image: e.image, status: e.status, features: e.features.join(", ") });
    setEditId(e._id);
    setShowForm(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.name || !form.state || !form.pricePerPlot) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      const payload = {
        name: form.name, description: form.description, state: form.state, lga: form.lga, location: form.location,
        totalPlots: Number(form.totalPlots), availablePlots: Number(form.availablePlots), soldPlots: Number(form.soldPlots),
        reservedPlots: Number(form.reservedPlots), pricePerPlot: Number(form.pricePerPlot),
        image: form.image, status: form.status,
        features: form.features.split(",").map((f) => f.trim()).filter(Boolean),
      };
      if (editId) await updateEstate({ id: editId, ...payload });
      else await createEstate(payload);
      toast.success(editId ? "Estate updated!" : "Estate created!");
      setShowForm(false);
    } catch { toast.error("Failed to save"); }
    finally { setLoading(false); }
  };

  const f = (field: keyof EstateForm, val: string) => setForm({ ...form, [field]: val });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Estates</h1>
          <p className="text-sm text-gray-500">Manage housing estate projects</p>
        </div>
        <Button onClick={openCreate} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2"><Plus size={16} /> Add Estate</Button>
      </div>

      {!estates ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
      ) : estates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400 text-sm">No estates yet. Create your first estate.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {estates.map((estate, i) => (
            <motion.div key={estate._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-36 overflow-hidden relative">
                <img src={estate.image || "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=400"} alt={estate.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2">
                  <Badge className={`text-xs border-0 capitalize ${STATUS_COLOR[estate.status] ?? "bg-gray-100 text-gray-600"}`}>{estate.status}</Badge>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{estate.name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3"><MapPin size={11} />{estate.location}, {estate.state}</div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center"><div className="text-sm font-bold text-[var(--brand)]">{estate.totalPlots}</div><div className="text-[10px] text-gray-400">Total</div></div>
                  <div className="text-center"><div className="text-sm font-bold text-green-600">{estate.availablePlots}</div><div className="text-[10px] text-gray-400">Available</div></div>
                  <div className="text-center"><div className="text-sm font-bold text-gray-600">{estate.soldPlots}</div><div className="text-[10px] text-gray-400">Sold</div></div>
                </div>
                <div className="text-xs font-semibold text-gray-700 mb-3">₦{(estate.pricePerPlot / 1_000_000).toFixed(1)}M per plot</div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 bg-blue-50 hover:bg-blue-100 text-[var(--brand)] text-xs" onClick={() => openEdit(estate)}>
                    <Pencil size={12} className="mr-1" /> Edit
                  </Button>
                  {liveInspectionEnabled && (
                    <Button size="sm" title="Schedule live inspection" className="h-8 w-8 p-0 bg-red-50 hover:bg-red-100 text-red-500" onClick={() => navigate(`/admin/live-inspections?estateId=${estate._id}&action=schedule`)}>
                      <Video size={13} />
                    </Button>
                  )}
                  <Button size="sm" className="h-8 w-8 p-0 bg-red-50 hover:bg-red-100 text-red-600" onClick={() => setDeleteId(estate._id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>{editId ? "Edit Estate" : "Add New Estate"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Estate Name *</Label><Input value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="e.g. Royal Gardens" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Status</Label>
                <Select value={form.status} onValueChange={(v) => f("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Description</Label><Textarea value={form.description} onChange={(e) => f("description", e.target.value)} rows={2} className="resize-none" /></div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">State *</Label><Input value={form.state} onChange={(e) => f("state", e.target.value)} placeholder="FCT" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">LGA</Label><Input value={form.lga} onChange={(e) => f("lga", e.target.value)} placeholder="Abuja Municipal" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Location</Label><Input value={form.location} onChange={(e) => f("location", e.target.value)} placeholder="Gwarimpa" /></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Total Plots</Label><Input type="number" value={form.totalPlots} onChange={(e) => f("totalPlots", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Available</Label><Input type="number" value={form.availablePlots} onChange={(e) => f("availablePlots", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Sold</Label><Input type="number" value={form.soldPlots} onChange={(e) => f("soldPlots", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Reserved</Label><Input type="number" value={form.reservedPlots} onChange={(e) => f("reservedPlots", e.target.value)} /></div>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Price Per Plot (₦) *</Label><Input type="number" value={form.pricePerPlot} onChange={(e) => f("pricePerPlot", e.target.value)} placeholder="5000000" /></div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Estate Image</Label>
              <FileUploadButton
                variant="dropzone"
                mediaType="image"
                label="Upload estate image"
                currentUrl={form.image || null}
                onUpload={(_storageId, url) => f("image", url ?? "")}
                onClear={() => f("image", "")}
              />
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Features (comma separated)</Label><Input value={form.features} onChange={(e) => f("features", e.target.value)} placeholder="Gated, Electricity, Water, Tarred Road" /></div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{loading ? "Saving..." : editId ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Estate?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">All estate data will be permanently removed.</p>
          <div className="flex gap-3 justify-end mt-2">
            <Button className="bg-gray-100 text-gray-700" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={async () => { if (deleteId) { await deleteEstate({ id: deleteId }); setDeleteId(null); toast.success("Estate deleted"); } }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
