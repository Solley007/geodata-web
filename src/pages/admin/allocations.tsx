import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.js";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Pencil, Trash2, MapPin, LayoutGrid, List, ChevronDown, ChevronUp,
  FileText, Download, CheckCircle, XCircle, History, QrCode, Eye, RotateCcw,
  DollarSign, Building2, LandPlot, Users, AlertCircle, Layers, Search
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner.tsx";
import QRCodeLib from "qrcode";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

// ─── Types ───────────────────────────────────────────────────────
type PlotDoc = Doc<"plots">;
type AllocDoc = Doc<"allocations">;

// ─── Constants ────────────────────────────────────────────────────
const PLOT_STATUS_COLOR: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  reserved: "bg-yellow-100 text-yellow-700",
  allocated: "bg-blue-100 text-blue-700",
  sold: "bg-gray-100 text-gray-600",
};
const ALLOC_STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  revoked: "bg-red-100 text-red-600",
};

// ─── Stat Card ────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + "20" }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── QR Code Modal ───────────────────────────────────────────────
function QRModal({ qrData, allocationNumber, onClose }: { qrData: string; allocationNumber: string; onClose: () => void }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  QRCodeLib.toDataURL(qrData, { width: 300, margin: 2, color: { dark: "var(--brand)", light: "#FFFFFF" } })
    .then(setQrUrl)
    .catch(() => null);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>QR Code — {allocationNumber}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {qrUrl ? <img src={qrUrl} alt="QR Code" className="w-56 h-56 rounded-xl border border-gray-100" /> : <div className="w-56 h-56 bg-gray-100 rounded-xl flex items-center justify-center"><Spinner /></div>}
          <p className="text-xs text-gray-500 text-center">Scan this QR code to verify the allocation at <strong>geodata.com.ng/verify</strong></p>
          {qrUrl && (
            <a href={qrUrl} download={`qr-${allocationNumber}.png`}>
              <Button className="bg-[var(--brand)] text-white gap-2 h-8 text-sm"><Download size={13} />Download QR</Button>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ownership History Modal ─────────────────────────────────────
function OwnershipModal({ plotId, plotNumber, onClose }: { plotId: Id<"plots">; plotNumber: string; onClose: () => void }) {
  const history = useQuery(api.allocations.listOwnershipHistory, { plotId });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Ownership History — Plot {plotNumber}</DialogTitle></DialogHeader>
        {!history ? <Skeleton className="h-32 w-full" /> : history.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No ownership records yet</p>
        ) : (
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={h._id} className="relative pl-6">
                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-[var(--brand)] border-2 border-white ring-1 ring-[var(--brand)]" />
                {i < history.length - 1 && <div className="absolute left-1.5 top-4 w-px h-full bg-gray-200" />}
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-900">{h.newOwnerName}</span>
                    <Badge className="text-[10px] border-0 bg-blue-100 text-blue-700 capitalize">{h.transferType.replace("_", " ")}</Badge>
                  </div>
                  <div className="text-xs text-gray-500">Date: {h.transferDate}</div>
                  {h.previousOwnerName && <div className="text-xs text-gray-400">From: {h.previousOwnerName}</div>}
                  {h.salePrice && <div className="text-xs text-gray-500 font-medium">Price: ₦{h.salePrice.toLocaleString()}</div>}
                  {h.notes && <div className="text-xs text-gray-400 mt-1">{h.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Allocation Detail / Documents ───────────────────────────────
function AllocationDetail({ alloc, plot, estate, client, onClose, onGenerate }: {
  alloc: AllocDoc; plot: PlotDoc | null; estate: Doc<"estates"> | null;
  client: Doc<"clients"> | null; onClose: () => void;
  onGenerate: (type: string) => void;
}) {
  const updateAllocation = useMutation(api.allocations.updateAllocation);
  const revokeAllocation = useMutation(api.allocations.revokeAllocation);
  const [qrOpen, setQrOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);

  const docs = [
    { key: "offerLetterIssued", label: "Offer Letter", field: alloc.offerLetterIssued },
    { key: "receiptIssued", label: "Receipt", field: alloc.receiptIssued },
    { key: "contractIssued", label: "Sales Contract", field: alloc.contractIssued },
    { key: "allocationLetterIssued", label: "Allocation Letter", field: alloc.allocationLetterIssued },
    { key: "deedIssued", label: "Deed of Assignment", field: alloc.deedIssued },
  ] as const;

  const handleGenerate = async (docType: string) => {
    setGeneratingDoc(docType);
    try {
      await onGenerate(docType);
    } finally {
      setGeneratingDoc(null);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-[var(--brand)] p-5 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-white/70 text-xs font-medium mb-1">{alloc.allocationNumber}</div>
              <h2 className="text-white text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                Plot {plot?.plotNumber ?? "—"}
              </h2>
              <div className="text-blue-200 text-sm mt-0.5">{estate?.name} · {plot?.size}</div>
            </div>
            <div className="flex gap-2">
              <Badge className={`text-xs border-0 capitalize ${ALLOC_STATUS_COLOR[alloc.status]}`}>{alloc.status}</Badge>
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <button onClick={() => setQrOpen(true)} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
              <QrCode size={12} />QR Code
            </button>
            {plot && (
              <button onClick={() => setHistoryOpen(true)} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                <History size={12} />Ownership History
              </button>
            )}
            {alloc.status === "active" && (
              <button onClick={() => revokeAllocation({ id: alloc._id }).then(() => { toast.success("Allocation revoked"); onClose(); })}
                className="flex items-center gap-1.5 bg-red-500/30 hover:bg-red-500/50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                <RotateCcw size={12} />Revoke
              </button>
            )}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Client & Plot Info */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 font-medium mb-2">Client</div>
              <div className="font-bold text-gray-900 text-sm">{client?.fullName ?? "—"}</div>
              <div className="text-xs text-gray-500">{client?.phone}</div>
              <div className="text-xs text-gray-500">{client?.email}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 font-medium mb-2">Plot Details</div>
              <div className="text-sm space-y-0.5">
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Plot No</span><span className="font-medium text-xs">{plot?.plotNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Size</span><span className="font-medium text-xs">{plot?.size}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Purchase Price</span><span className="font-semibold text-xs text-[var(--brand)]">₦{alloc.purchasePrice.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Payment</span><span className="font-medium text-xs capitalize">{alloc.paymentType}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-xs">Date</span><span className="font-medium text-xs">{alloc.allocatedDate}</span></div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <div className="text-sm font-bold text-gray-900 mb-3">Documents</div>
            <div className="grid grid-cols-1 gap-2">
              {docs.map(({ key, label, field }) => (
                <div key={key} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2.5">
                    {field ? <CheckCircle size={15} className="text-green-600 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />}
                    <span className="text-sm text-gray-800 font-medium">{label}</span>
                    {field && <Badge className="text-[10px] border-0 bg-green-100 text-green-700">Issued</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={generatingDoc === key}
                      className="h-7 text-xs bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/20 gap-1"
                      onClick={() => handleGenerate(key)}>
                      {generatingDoc === key ? <Spinner /> : <Download size={11} />}
                      {field ? "Re-download" : "Generate & Download"}
                    </Button>
                    {!field && (
                      <Button size="sm" className="h-7 text-xs bg-green-50 text-green-700 hover:bg-green-100"
                        onClick={() => updateAllocation({ id: alloc._id, [key]: true }).then(() => toast.success(`${label} marked as issued`))}>
                        Mark Issued
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {alloc.notes && (
            <div className="bg-yellow-50 rounded-xl p-3 text-sm text-gray-700">
              <span className="font-semibold text-yellow-700">Notes: </span>{alloc.notes}
            </div>
          )}
        </div>

        {qrOpen && alloc.qrCode && <QRModal qrData={alloc.qrCode} allocationNumber={alloc.allocationNumber} onClose={() => setQrOpen(false)} />}
        {historyOpen && plot && <OwnershipModal plotId={plot._id} plotNumber={plot.plotNumber} onClose={() => setHistoryOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function AdminAllocations() {
  const [tab, setTab] = useState<"overview" | "plots" | "allocations">("overview");
  const [estateFilter, setEstateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewAlloc, setViewAlloc] = useState<AllocDoc | null>(null);
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [showAllocForm, setShowAllocForm] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plotSearch, setPlotSearch] = useState("");
  const [debouncedPlotSearch] = useDebounce(plotSearch, 350);
  const [allocSearch, setAllocSearch] = useState("");
  const [debouncedAllocSearch] = useDebounce(allocSearch, 350);

  // Plot form
  const [plotForm, setPlotForm] = useState({ estateId: "", blockId: "", plotNumber: "", size: "", price: "", coordinates: "", notes: "" });
  // Alloc form
  const [allocForm, setAllocForm] = useState({ plotId: "", estateId: "", clientId: "", allocatedDate: new Date().toISOString().split("T")[0], purchasePrice: "", paymentType: "outright", paymentPlanId: "", notes: "" });
  // Block form
  const [blockForm, setBlockForm] = useState({ estateId: "", name: "", description: "", totalPlots: "" });

  // Data
  const estates = useQuery(api.admin.listEstates, {});
  const clients = useQuery(api.clients.listClients, {});
  const stats = useQuery(api.allocations.getAllocationStats, {});
  const plots = useQuery(api.allocations.listPlots, {
    estateId: estateFilter !== "all" ? estateFilter as Id<"estates"> : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const {
    rows: plotRows,
    pageIndex: plotPageIndex,
    hasNextPage: plotHasNext,
    hasPrevPage: plotHasPrev,
    isLoading: plotsLoading,
    nextPage: plotNextPage,
    prevPage: plotPrevPage,
    reset: resetPlotPage,
  } = useCursorPagination(
    api.allocations.listPlotsPaginated,
    {
      estateId: estateFilter !== "all" ? (estateFilter as Id<"estates">) : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: debouncedPlotSearch || undefined,
    },
    12,
  );
  const allAllocations = useQuery(api.allocations.listAllocations, {
    estateId: estateFilter !== "all" ? estateFilter as Id<"estates"> : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const {
    rows: allocRows,
    pageIndex: allocPageIndex,
    hasNextPage: allocHasNext,
    hasPrevPage: allocHasPrev,
    isLoading: allocsLoading,
    nextPage: allocNextPage,
    prevPage: allocPrevPage,
    reset: resetAllocPage,
  } = useCursorPagination(
    api.allocations.listAllocationsPaginated,
    {
      estateId: estateFilter !== "all" ? (estateFilter as Id<"estates">) : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: debouncedAllocSearch || undefined,
    },
    9,
  );
  const blocks = useQuery(api.allocations.listBlocks,
    estateFilter !== "all" ? { estateId: estateFilter as Id<"estates"> } : "skip"
  );

  useEffect(() => {
    resetPlotPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPlotSearch, estateFilter, statusFilter]);

  useEffect(() => {
    resetAllocPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAllocSearch, estateFilter, statusFilter]);

  // Mutations
  const createPlot = useMutation(api.allocations.createPlot);
  const deletePlot = useMutation(api.allocations.deletePlot);
  const updatePlot = useMutation(api.allocations.updatePlot);
  const createAllocation = useMutation(api.allocations.createAllocation);
  const createBlock = useMutation(api.allocations.createBlock);

  // Document generation actions
  const genOfferLetter = useAction(api.documents.generateOfferLetter);
  const genAllocLetter = useAction(api.documents.generateAllocationLetter);
  const genReceipt = useAction(api.documents.generateReceipt);
  const genInvoice = useAction(api.documents.generateInvoicePDF);
  const genContract = useAction(api.documents.generateContract);
  const genDeed = useAction(api.documents.generateDeed);
  const updateAllocation = useMutation(api.allocations.updateAllocation);

  // Build doc args from current alloc/plot/estate/client
  function buildDocArgs(alloc: AllocDoc) {
    const plot = plots?.find((p) => p._id === alloc.plotId) ?? null;
    const estate = estates?.find((e) => e._id === alloc.estateId) ?? null;
    const client = clients?.find((c) => c._id === alloc.clientId) ?? null;
    return {
      allocationNumber: alloc.allocationNumber,
      clientName: client?.fullName ?? "N/A",
      clientPhone: client?.phone ?? "N/A",
      clientEmail: client?.email ?? "N/A",
      clientAddress: client?.address ?? "N/A",
      estateName: estate?.name ?? "N/A",
      estateLocation: estate?.location ?? "N/A",
      plotNumber: plot?.plotNumber ?? "N/A",
      plotSize: plot?.size ?? "N/A",
      purchasePrice: alloc.purchasePrice,
      allocatedDate: alloc.allocatedDate,
      paymentType: alloc.paymentType,
      qrData: alloc.qrCode ?? alloc.allocationNumber,
    };
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }

  async function handleGenerate(alloc: AllocDoc, docType: string) {
    const docArgs = buildDocArgs(alloc);
    try {
      let pdfUrl: string;
      let filename: string;
      const num = alloc.allocationNumber;

      switch (docType) {
        case "offerLetterIssued":
          pdfUrl = await genOfferLetter(docArgs);
          filename = `offer-letter-${num}.pdf`;
          await updateAllocation({ id: alloc._id, offerLetterIssued: true });
          break;
        case "allocationLetterIssued":
          pdfUrl = await genAllocLetter(docArgs);
          filename = `allocation-letter-${num}.pdf`;
          await updateAllocation({ id: alloc._id, allocationLetterIssued: true });
          break;
        case "receiptIssued":
          pdfUrl = await genReceipt({ ...docArgs, amountPaid: alloc.purchasePrice, receiptNumber: `RCP-${num}` });
          filename = `receipt-${num}.pdf`;
          await updateAllocation({ id: alloc._id, receiptIssued: true });
          break;
        case "invoicePDF":
          pdfUrl = await genInvoice({
            ...docArgs,
            invoiceNumber: `INV-${num}`,
            dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
            items: [{ description: `Plot ${docArgs.plotNumber} — ${docArgs.estateName}`, amount: alloc.purchasePrice }],
          });
          filename = `invoice-${num}.pdf`;
          break;
        case "contractIssued":
          pdfUrl = await genContract(docArgs);
          filename = `contract-${num}.pdf`;
          await updateAllocation({ id: alloc._id, contractIssued: true });
          break;
        case "deedIssued":
          pdfUrl = await genDeed(docArgs);
          filename = `deed-${num}.pdf`;
          await updateAllocation({ id: alloc._id, deedIssued: true });
          break;
        default:
          toast.error("Unknown document type");
          return;
      }

      downloadDataUrl(pdfUrl, filename);
      toast.success("Document downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate document");
    }
  }

  const handleCreatePlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotForm.estateId || !plotForm.plotNumber || !plotForm.size || !plotForm.price) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      await createPlot({
        estateId: plotForm.estateId as Id<"estates">,
        blockId: plotForm.blockId && plotForm.blockId !== "none" ? plotForm.blockId as Id<"estateBlocks"> : undefined,
        plotNumber: plotForm.plotNumber,
        size: plotForm.size,
        price: Number(plotForm.price),
        coordinates: plotForm.coordinates || undefined,
        notes: plotForm.notes || undefined,
      });
      toast.success("Plot created!"); setShowPlotForm(false);
      setPlotForm({ estateId: "", blockId: "", plotNumber: "", size: "", price: "", coordinates: "", notes: "" });
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  const handleCreateAlloc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocForm.plotId || !allocForm.clientId || !allocForm.purchasePrice) { toast.error("Fill required fields"); return; }
    const selectedPlot = plots?.find((p) => p._id === allocForm.plotId);
    if (!selectedPlot) { toast.error("Plot not found"); return; }
    if (selectedPlot.status !== "available" && selectedPlot.status !== "reserved") {
      toast.error("This plot is already allocated or sold");
      return;
    }
    setLoading(true);
    try {
      await createAllocation({
        plotId: allocForm.plotId as Id<"plots">,
        estateId: allocForm.estateId as Id<"estates">,
        clientId: allocForm.clientId as Id<"clients">,
        allocatedDate: allocForm.allocatedDate,
        purchasePrice: Number(allocForm.purchasePrice),
        paymentType: allocForm.paymentType,
        paymentPlanId: allocForm.paymentPlanId ? allocForm.paymentPlanId as Id<"paymentPlans"> : undefined,
        notes: allocForm.notes || undefined,
      });
      toast.success("Allocation created!"); setShowAllocForm(false);
      setAllocForm({ plotId: "", estateId: "", clientId: "", allocatedDate: new Date().toISOString().split("T")[0], purchasePrice: "", paymentType: "outright", paymentPlanId: "", notes: "" });
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockForm.estateId || !blockForm.name) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      await createBlock({ estateId: blockForm.estateId as Id<"estates">, name: blockForm.name, description: blockForm.description || undefined, totalPlots: Number(blockForm.totalPlots) || 0 });
      toast.success("Block created!"); setShowBlockForm(false);
      setBlockForm({ estateId: "", name: "", description: "", totalPlots: "" });
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  // Get the current viewAlloc's related data
  const viewPlot = viewAlloc ? (plots?.find((p) => p._id === viewAlloc.plotId) ?? null) : null;
  const viewEstate = viewAlloc ? (estates?.find((e) => e._id === viewAlloc.estateId) ?? null) : null;
  const viewClient = viewAlloc ? (clients?.find((c) => c._id === viewAlloc.clientId) ?? null) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Plot Allocation</h1>
          <p className="text-sm text-gray-500">Manage plots, allocations, documents & QR verification</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowBlockForm(true)} className="h-9 text-sm gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700"><Layers size={14} />Add Block</Button>
          <Button onClick={() => setShowPlotForm(true)} className="h-9 text-sm gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700"><Plus size={14} />Add Plot</Button>
          <Button onClick={() => setShowAllocForm(true)} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-1.5 h-9 text-sm"><LandPlot size={14} />Allocate Plot</Button>
        </div>
      </div>

      {/* Stats */}
      {!stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="Total Plots" value={stats.totalPlots} icon={LandPlot} color="var(--brand)" />
          <StatCard label="Available" value={stats.availablePlots} icon={CheckCircle} color="#22c55e" />
          <StatCard label="Allocated" value={stats.allocatedPlots} icon={Building2} color="#3b82f6" />
          <StatCard label="Reserved" value={stats.reservedPlots} icon={AlertCircle} color="#f59e0b" />
          <StatCard label="Active Alloc." value={stats.activeAllocations} icon={Users} color="#8b5cf6" />
          <StatCard label="Revenue" value={`₦${(stats.totalRevenue / 1_000_000).toFixed(1)}M`} icon={DollarSign} color="#10b981" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[["overview", "Overview"], ["plots", "Plots"], ["allocations", "Allocations"]].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v as typeof tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === v ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
          ))}
        </div>
        <Select value={estateFilter} onValueChange={setEstateFilter}>
          <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="All Estates" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Estates</SelectItem>
            {estates?.map((e) => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="allocated">Allocated</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Blocks */}
          {estateFilter !== "all" && blocks && blocks.length > 0 && (
            <div>
              <div className="text-sm font-bold text-gray-700 mb-2">Blocks in Estate</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {blocks.map((b) => (
                  <div key={b._id} className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
                    <div className="font-bold text-gray-900 text-sm">{b.name}</div>
                    <div className="text-xs text-gray-400">{b.totalPlots} plots</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plot grid visual */}
          <div>
            <div className="text-sm font-bold text-gray-700 mb-2">Plot Map</div>
            {!plots ? (
              <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">{Array.from({ length: 30 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
            ) : plots.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm">No plots found. Add plots to get started.</div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                {plots.map((plot) => (
                  <motion.div key={plot._id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-lg p-1.5 cursor-pointer hover:ring-2 hover:ring-[var(--brand)] transition-all ${
                      plot.status === "available" ? "bg-green-100" :
                      plot.status === "reserved" ? "bg-yellow-100" :
                      plot.status === "allocated" ? "bg-blue-100" : "bg-gray-200"
                    }`}
                    title={`Plot ${plot.plotNumber} — ${plot.status}`}>
                    <div className="text-[9px] font-bold text-center text-gray-700 leading-tight">{plot.plotNumber}</div>
                    <div className="text-[8px] text-center text-gray-500 truncate">{plot.size}</div>
                  </motion.div>
                ))}
              </div>
            )}
            {/* Legend */}
            <div className="flex gap-4 mt-3 flex-wrap">
              {[["bg-green-100", "Available"], ["bg-yellow-100", "Reserved"], ["bg-blue-100", "Allocated"], ["bg-gray-200", "Sold"]].map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${color}`} /><span className="text-xs text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PLOTS TAB ── */}
      {tab === "plots" && (
        <div className="space-y-3">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="pl-8 h-9" placeholder="Search plots…" value={plotSearch} onChange={(e) => setPlotSearch(e.target.value)} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {plotsLoading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : plotRows.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No plots found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Plot No</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Estate</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Size</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Price</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {plotRows.map((plot) => {
                    const estate = estates?.find((e) => e._id === plot.estateId);
                    return (
                      <tr key={plot._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-gray-900">{plot.plotNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{estate?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{plot.size}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">₦{plot.price.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Select value={plot.status} onValueChange={(v) => updatePlot({ id: plot._id, status: v }).catch(() => toast.error("Failed"))}>
                            <SelectTrigger className={`h-7 text-xs w-28 border-0 ${PLOT_STATUS_COLOR[plot.status]}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="reserved">Reserved</SelectItem>
                              <SelectItem value="allocated">Allocated</SelectItem>
                              <SelectItem value="sold">Sold</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 text-red-600"
                            onClick={() => deletePlot({ id: plot._id }).then(() => toast.success("Plot deleted")).catch(() => toast.error("Failed"))}>
                            <Trash2 size={12} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <TablePager pageIndex={plotPageIndex} hasNextPage={plotHasNext} hasPrevPage={plotHasPrev} onNext={plotNextPage} onPrev={plotPrevPage} />
            </div>
          )}
          </div>
        </div>
      )}

      {/* ── ALLOCATIONS TAB ── */}
      {tab === "allocations" && (
        <div className="space-y-3">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input className="pl-8 h-9" placeholder="Search allocations…" value={allocSearch} onChange={(e) => setAllocSearch(e.target.value)} />
          </div>
          {allocsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
          ) : allocRows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-sm">No allocations found</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allocRows.map((alloc, i) => {
                const plot = plots?.find((p) => p._id === alloc.plotId);
                const estate = estates?.find((e) => e._id === alloc.estateId);
                const client = clients?.find((c) => c._id === alloc.clientId);
                const docsIssued = [alloc.offerLetterIssued, alloc.receiptIssued, alloc.contractIssued, alloc.allocationLetterIssued, alloc.deedIssued].filter(Boolean).length;
                return (
                  <motion.div key={alloc._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setViewAlloc(alloc)}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-xs text-gray-400 font-medium">{alloc.allocationNumber}</div>
                        <div className="font-bold text-gray-900 text-sm mt-0.5">Plot {plot?.plotNumber ?? "—"}</div>
                        <div className="text-xs text-gray-500">{estate?.name}</div>
                      </div>
                      <Badge className={`text-xs border-0 capitalize shrink-0 ${ALLOC_STATUS_COLOR[alloc.status]}`}>{alloc.status}</Badge>
                    </div>
                    <div className="border-t border-gray-100 pt-2 mt-2">
                      <div className="font-medium text-sm text-gray-800">{client?.fullName ?? "—"}</div>
                      <div className="text-xs text-gray-500">{client?.phone}</div>
                      <div className="text-xs font-semibold text-[var(--brand)] mt-1">₦{alloc.purchasePrice.toLocaleString()}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex gap-0.5">
                        {[alloc.offerLetterIssued, alloc.receiptIssued, alloc.contractIssued, alloc.allocationLetterIssued, alloc.deedIssued].map((issued, j) => (
                          <div key={j} className={`w-5 h-1.5 rounded-full ${issued ? "bg-green-500" : "bg-gray-200"}`} title={["Offer", "Receipt", "Contract", "Allocation", "Deed"][j]} />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400">{docsIssued}/5 docs</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          {!allocsLoading && allocRows.length > 0 && (
            <TablePager pageIndex={allocPageIndex} hasNextPage={allocHasNext} hasPrevPage={allocHasPrev} onNext={allocNextPage} onPrev={allocPrevPage} className="bg-white rounded-2xl border border-gray-100 shadow-sm" />
          )}
        </div>
      )}

      {/* ── ALLOCATION DETAIL ── */}
      {viewAlloc && (
        <AllocationDetail
          alloc={viewAlloc}
          plot={viewPlot}
          estate={viewEstate}
          client={viewClient}
          onClose={() => setViewAlloc(null)}
          onGenerate={(docType) => handleGenerate(viewAlloc, docType)}
        />
      )}

      {/* ── ADD PLOT FORM ── */}
      <Dialog open={showPlotForm} onOpenChange={setShowPlotForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Add New Plot</DialogTitle></DialogHeader>
          <form onSubmit={handleCreatePlot} className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Estate *</Label>
              <Select value={plotForm.estateId} onValueChange={(v) => setPlotForm((p) => ({ ...p, estateId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select estate..." /></SelectTrigger>
                <SelectContent>{estates?.map((e) => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {plotForm.estateId && blocks && blocks.length > 0 && (
              <div><Label className="text-xs font-semibold mb-1 block">Block (optional)</Label>
                <Select value={plotForm.blockId} onValueChange={(v) => setPlotForm((p) => ({ ...p, blockId: v }))}>
                  <SelectTrigger><SelectValue placeholder="No block" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Block</SelectItem>
                    {blocks.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Plot Number *</Label><Input value={plotForm.plotNumber} onChange={(e) => setPlotForm((p) => ({ ...p, plotNumber: e.target.value }))} placeholder="A-001" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Size *</Label><Input value={plotForm.size} onChange={(e) => setPlotForm((p) => ({ ...p, size: e.target.value }))} placeholder="500sqm" /></div>
              <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Price (₦) *</Label><Input type="number" value={plotForm.price} onChange={(e) => setPlotForm((p) => ({ ...p, price: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Coordinates / Survey Desc.</Label><Input value={plotForm.coordinates} onChange={(e) => setPlotForm((p) => ({ ...p, coordinates: e.target.value }))} placeholder="Lat/Lng or Survey description" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Notes</Label><Textarea value={plotForm.notes} onChange={(e) => setPlotForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="resize-none text-sm" /></div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowPlotForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-[var(--brand)] text-white">{loading ? "Saving..." : "Add Plot"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ALLOCATE PLOT FORM ── */}
      <Dialog open={showAllocForm} onOpenChange={setShowAllocForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Allocate Plot</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateAlloc} className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Estate *</Label>
              <Select value={allocForm.estateId} onValueChange={(v) => setAllocForm((p) => ({ ...p, estateId: v, plotId: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select estate..." /></SelectTrigger>
                <SelectContent>{estates?.map((e) => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Plot *</Label>
              <Select value={allocForm.plotId} onValueChange={(v) => {
                const p = plots?.find((pl) => pl._id === v);
                setAllocForm((prev) => ({ ...prev, plotId: v, purchasePrice: p?.price?.toString() ?? prev.purchasePrice }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select available plot..." /></SelectTrigger>
                <SelectContent>
                  {plots?.filter((p) => (allocForm.estateId === "all" || p.estateId === allocForm.estateId) && (p.status === "available" || p.status === "reserved"))
                    .map((p) => <SelectItem key={p._id} value={p._id}>Plot {p.plotNumber} — {p.size} (₦{p.price.toLocaleString()})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Client *</Label>
              <Select value={allocForm.clientId} onValueChange={(v) => setAllocForm((p) => ({ ...p, clientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>{clients?.map((c) => <SelectItem key={c._id} value={c._id}>{c.fullName} — {c.phone}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Allocation Date *</Label><Input type="date" value={allocForm.allocatedDate} onChange={(e) => setAllocForm((p) => ({ ...p, allocatedDate: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Purchase Price (₦) *</Label><Input type="number" value={allocForm.purchasePrice} onChange={(e) => setAllocForm((p) => ({ ...p, purchasePrice: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Payment Type</Label>
              <Select value={allocForm.paymentType} onValueChange={(v) => setAllocForm((p) => ({ ...p, paymentType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outright">Outright</SelectItem>
                  <SelectItem value="installment">Installment</SelectItem>
                  <SelectItem value="mortgage">Mortgage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Notes</Label><Textarea value={allocForm.notes} onChange={(e) => setAllocForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="resize-none text-sm" /></div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowAllocForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-[var(--brand)] text-white">{loading ? "Processing..." : "Create Allocation"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ADD BLOCK FORM ── */}
      <Dialog open={showBlockForm} onOpenChange={setShowBlockForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Estate Block</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateBlock} className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Estate *</Label>
              <Select value={blockForm.estateId} onValueChange={(v) => setBlockForm((p) => ({ ...p, estateId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select estate..." /></SelectTrigger>
                <SelectContent>{estates?.map((e) => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Block Name *</Label><Input value={blockForm.name} onChange={(e) => setBlockForm((p) => ({ ...p, name: e.target.value }))} placeholder="Block A" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Total Plots</Label><Input type="number" value={blockForm.totalPlots} onChange={(e) => setBlockForm((p) => ({ ...p, totalPlots: e.target.value }))} /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Description</Label><Textarea value={blockForm.description} onChange={(e) => setBlockForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="resize-none text-sm" /></div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowBlockForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-[var(--brand)] text-white">{loading ? "Saving..." : "Add Block"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
