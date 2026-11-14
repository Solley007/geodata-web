import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, Eye, Star, Video, Orbit } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";
import PropertyForm from "./_components/PropertyForm.tsx";

const PAGE_SIZE = 10;

const STATUS_COLOR: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  reserved: "bg-yellow-100 text-yellow-700",
  under_construction: "bg-purple-100 text-purple-700",
};

export default function AdminProperties() {
  const navigate = useNavigate();
  const liveInspectionStatus = useQuery(api.liveInspections.getFeatureStatus, {});
  const liveInspectionEnabled = liveInspectionStatus?.enabled === true;
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [status, setStatus] = useState("all");
  const [propertyType, setPropertyType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<Id<"properties"> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"properties"> | null>(null);

  const {
    rows: properties,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.admin.listPropertiesPaginated,
    { status: status !== "all" ? status : undefined, propertyType: propertyType !== "all" ? propertyType : undefined, search: debouncedSearch || undefined },
    PAGE_SIZE,
  );

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, propertyType]);

  const deleteProperty = useMutation(api.admin.deleteProperty);
  const updateProperty = useMutation(api.admin.updateProperty);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProperty({ id: deleteId });
      toast.success("Property deleted");
      setDeleteId(null);
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Properties</h1>
          <p className="text-sm text-gray-500">Manage your property listings</p>
        </div>
        <Button onClick={() => { setEditId(null); setShowForm(true); }} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2">
          <Plus size={16} /> Add Property
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search properties..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="under_construction">Under Construction</SelectItem>
          </SelectContent>
        </Select>
        <Select value={propertyType} onValueChange={setPropertyType}>
          <SelectTrigger className="w-full sm:w-44 h-9 text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : properties.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No properties found. Add your first property.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Views</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {properties.map((p, i) => (
                  <motion.tr key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.featuredImage} alt={p.title} className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100" />
                        <div>
                          <div className="font-medium text-gray-900 text-sm flex items-center gap-1">
                            {p.title}
                            {p.featured && <Star size={11} className="text-yellow-400 fill-yellow-400" />}
                          </div>
                          <div className="text-xs text-gray-400">{p.location}, {p.state}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-600 capitalize">{p.propertyType}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      ₦{(p.price / 1_000_000).toFixed(1)}M
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs border-0 capitalize ${STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {p.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">{p.views}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" title={p.featured ? "Remove from featured" : "Add to featured"} className={`h-7 w-7 p-0 ${p.featured ? "bg-yellow-50 hover:bg-yellow-100 text-yellow-500" : "bg-gray-100 hover:bg-yellow-50 text-gray-400 hover:text-yellow-400"}`} onClick={async () => { await updateProperty({ id: p._id, featured: !p.featured }); toast.success(p.featured ? "Removed from featured" : "Added to featured"); }}>
                          <Star size={13} className={p.featured ? "fill-yellow-400" : ""} />
                        </Button>
                        <Button size="sm" className="h-7 w-7 p-0 bg-gray-100 hover:bg-gray-200 text-gray-600" onClick={() => window.open(`/properties/${p._id}`, "_blank")}>
                          <Eye size={13} />
                        </Button>
                        {liveInspectionEnabled && (
                          <Button size="sm" title="Schedule live inspection" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 text-red-500" onClick={() => navigate(`/admin/live-inspections?propertyId=${p._id}&action=schedule`)}>
                            <Video size={13} />
                          </Button>
                        )}
                        <Button size="sm" title="Manage 360°/VR Tour" className="h-7 w-7 p-0 bg-indigo-50 hover:bg-indigo-100 text-indigo-500" onClick={() => navigate(`/admin/properties/${p._id}/tour`)}>
                          <Orbit size={13} />
                        </Button>
                        <Button size="sm" className="h-7 w-7 p-0 bg-blue-50 hover:bg-blue-100 text-[var(--brand)]" onClick={() => { setEditId(p._id); setShowForm(true); }}>
                          <Pencil size={13} />
                        </Button>
                        <Button size="sm" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 text-red-600" onClick={() => setDeleteId(p._id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && properties.length > 0 && (
          <TablePager
            pageIndex={pageIndex}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onNext={nextPage}
            onPrev={prevPage}
          />
        )}
      </div>

      {/* Property Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
              {editId ? "Edit Property" : "Add New Property"}
            </DialogTitle>
          </DialogHeader>
          <PropertyForm
            propertyId={editId}
            onSuccess={() => { setShowForm(false); setEditId(null); toast.success(editId ? "Property updated!" : "Property created!"); }}
            onCancel={() => { setShowForm(false); setEditId(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Property?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">This action cannot be undone. The property will be permanently removed.</p>
          <div className="flex gap-3 justify-end mt-2">
            <Button className="bg-gray-100 hover:bg-gray-200 text-gray-700" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white gap-1" onClick={handleDelete}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
