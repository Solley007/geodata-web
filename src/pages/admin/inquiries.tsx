import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { motion } from "motion/react";
import { MessageSquare, Check, Clock, AlertCircle, Phone, Mail, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: "New", color: "bg-red-100 text-red-600", icon: AlertCircle },
  contacted: { label: "Contacted", color: "bg-yellow-100 text-yellow-600", icon: Clock },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-600", icon: Check },
};

export default function AdminInquiries() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<{ id: Id<"inquiries">; status: string; notes: string } | null>(null);

  const inquiries = useQuery(api.admin.listInquiries, { status: filterStatus !== "all" ? filterStatus : undefined });
  const updateStatus = useMutation(api.admin.updateInquiryStatus);

  const selectedInquiry = inquiries?.find((i) => i._id === selected);

  const handleStatusUpdate = async () => {
    if (!statusUpdate) return;
    try {
      await updateStatus({ id: statusUpdate.id, status: statusUpdate.status, notes: statusUpdate.notes });
      toast.success("Status updated");
      setStatusUpdate(null);
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Inquiries</h1>
          <p className="text-sm text-gray-500">Manage client inquiries and follow-ups</p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {!inquiries ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : inquiries.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No inquiries found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {inquiries.map((inq, i) => {
                const info = STATUS_INFO[inq.status] ?? STATUS_INFO.new;
                return (
                  <motion.div key={inq._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    onClick={() => setSelected(inq._id === selected ? null : inq._id)}
                    className={`px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors ${selected === inq._id ? "bg-blue-50 border-l-2 border-[var(--brand)]" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] font-bold text-sm shrink-0">
                        {inq.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{inq.name}</span>
                          <Badge className={`text-[10px] border-0 capitalize ${info.color}`}>{info.label}</Badge>
                          {inq.status === "new" && <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />}
                        </div>
                        <div className="text-xs text-gray-400 truncate capitalize">{inq.type} · {inq.email}</div>
                      </div>
                      <span className="text-[10px] text-gray-400 hidden sm:block shrink-0">{formatDistanceToNow(inq._creationTime, { addSuffix: true })}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          {!selectedInquiry ? (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center text-gray-400">
              <MessageSquare size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Select an inquiry to view details</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{selectedInquiry.name}</h3>
                <Badge className={`text-xs border-0 capitalize mt-1 ${STATUS_INFO[selectedInquiry.status]?.color ?? "bg-gray-100 text-gray-500"}`}>{selectedInquiry.status}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <a href={`mailto:${selectedInquiry.email}`} className="flex items-center gap-2 text-gray-600 hover:text-[var(--brand)]"><Mail size={14} />{selectedInquiry.email}</a>
                <a href={`tel:${selectedInquiry.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-[var(--brand)]"><Phone size={14} />{selectedInquiry.phone}</a>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Message</div>
                <p className="text-sm text-gray-700">{selectedInquiry.message}</p>
              </div>
              {selectedInquiry.notes && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="text-xs text-[var(--brand)] mb-1 uppercase tracking-wide">Staff Notes</div>
                  <p className="text-sm text-gray-700">{selectedInquiry.notes}</p>
                </div>
              )}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-500">Update Status</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {["new", "contacted", "resolved"].map((s) => (
                    <button key={s} onClick={() => setStatusUpdate({ id: selectedInquiry._id, status: s, notes: selectedInquiry.notes ?? "" })}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${selectedInquiry.status === s ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[var(--brand)]/50"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <Button className="w-full h-8 text-xs bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white mt-1" onClick={() => setStatusUpdate({ id: selectedInquiry._id, status: selectedInquiry.status, notes: selectedInquiry.notes ?? "" })}>
                  Add Note & Update
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Update dialog */}
      <Dialog open={!!statusUpdate} onOpenChange={() => setStatusUpdate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Inquiry</DialogTitle></DialogHeader>
          {statusUpdate && (
            <div className="space-y-3">
              <Select value={statusUpdate.status} onValueChange={(v) => setStatusUpdate({ ...statusUpdate, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Add a note..." rows={3} value={statusUpdate.notes} onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })} className="resize-none text-sm" />
              <div className="flex gap-3 justify-end">
                <Button className="bg-gray-100 text-gray-700" onClick={() => setStatusUpdate(null)}>Cancel</Button>
                <Button className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white" onClick={handleStatusUpdate}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
