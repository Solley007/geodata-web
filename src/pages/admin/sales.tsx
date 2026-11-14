import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp, Plus, Pencil, Trash2, ChevronRight, DollarSign,
  Target, Award, Clock, CheckCircle, XCircle, Users, Search, Globe2
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
import { formatDistanceToNow } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

const STAGES = [
  { id: "new", label: "New", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  { id: "contacted", label: "Contacted", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  { id: "qualified", label: "Qualified", color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  { id: "proposal", label: "Proposal", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  { id: "negotiation", label: "Negotiation", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  { id: "won", label: "Won", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  { id: "lost", label: "Lost", color: "bg-red-100 text-red-600", dot: "bg-red-500" },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-100 text-red-600",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-500",
};

const SOURCE_LABELS: Record<string, string> = {
  walk_in: "Walk-in", referral: "Referral", website: "Website",
  social: "Social Media", cold_call: "Cold Call", event: "Event",
  diaspora_platform: "Diaspora Platform", qr_code: "QR Code",
};

const DIASPORA_PROGRAMME_LABELS: Record<string, string> = {
  own: "Own", invest: "Invest", partner: "Partner", refer: "Refer", corporate: "Corporate",
};

const FINANCE_PREFERENCE_LABELS: Record<string, { label: string; color: string }> = {
  outright: { label: "Buy Outright", color: "bg-blue-100 text-blue-700" },
  mortgage: { label: "Buy w/ Mortgage", color: "bg-emerald-100 text-emerald-700" },
};

type LeadForm = {
  name: string; email: string; phone: string; source: string; stage: string;
  propertyInterest: string; estateInterest: string; budget: string;
  notes: string; expectedCloseDate: string; priority: string;
};

const emptyLead: LeadForm = {
  name: "", email: "", phone: "", source: "website", stage: "new",
  propertyInterest: "", estateInterest: "", budget: "", notes: "",
  expectedCloseDate: "", priority: "medium",
};

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

export default function AdminSales() {
  const [viewMode, setViewMode] = useState<"pipeline" | "list" | "commission">("pipeline");
  const [filterStage, setFilterStage] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<Id<"leads"> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"leads"> | null>(null);
  const [form, setForm] = useState<LeadForm>(emptyLead);
  const [loading, setLoading] = useState(false);
  const [commForm, setCommForm] = useState({ agentId: "", saleAmount: "", commissionRate: "5", transactionDate: new Date().toISOString().split("T")[0], notes: "" });
  const [showCommForm, setShowCommForm] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [debouncedLeadSearch] = useDebounce(leadSearch, 350);
  const [commStatusFilter, setCommStatusFilter] = useState("all");

  const leads = useQuery(api.sales.listLeads, { stage: filterStage !== "all" ? filterStage : undefined });
  const {
    rows: leadRows,
    pageIndex: leadPageIndex,
    hasNextPage: leadHasNext,
    hasPrevPage: leadHasPrev,
    isLoading: leadsLoading,
    nextPage: leadNextPage,
    prevPage: leadPrevPage,
    reset: resetLeadPage,
  } = useCursorPagination(
    api.sales.listLeadsPaginated,
    { stage: filterStage !== "all" ? filterStage : undefined, search: debouncedLeadSearch || undefined },
    10,
  );
  const stats = useQuery(api.sales.getSalesStats);
  const {
    rows: commissions,
    pageIndex: commPageIndex,
    hasNextPage: commHasNext,
    hasPrevPage: commHasPrev,
    isLoading: commissionsLoading,
    nextPage: commNextPage,
    prevPage: commPrevPage,
    reset: resetCommPage,
  } = useCursorPagination(api.sales.listCommissionsPaginated, { status: commStatusFilter !== "all" ? commStatusFilter : undefined }, 10);
  const users = useQuery(api.users.listAll);
  const createLead = useMutation(api.sales.createLead);
  const updateLead = useMutation(api.sales.updateLead);
  const deleteLead = useMutation(api.sales.deleteLead);
  const createCommission = useMutation(api.sales.createCommission);
  const updateCommStatus = useMutation(api.sales.updateCommissionStatus);

  useEffect(() => {
    resetLeadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLeadSearch, filterStage]);

  useEffect(() => {
    resetCommPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commStatusFilter]);

  const openCreate = () => { setForm(emptyLead); setEditId(null); setShowForm(true); };
  const openEdit = (lead: NonNullable<typeof leads>[0]) => {
    setForm({ name: lead.name, email: lead.email ?? "", phone: lead.phone, source: lead.source, stage: lead.stage, propertyInterest: lead.propertyInterest ?? "", estateInterest: lead.estateInterest ?? "", budget: lead.budget ? String(lead.budget) : "", notes: lead.notes ?? "", expectedCloseDate: lead.expectedCloseDate ?? "", priority: lead.priority });
    setEditId(lead._id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) { toast.error("Name and phone are required"); return; }
    setLoading(true);
    try {
      const payload = { ...form, budget: form.budget ? Number(form.budget) : undefined, email: form.email || undefined, propertyInterest: form.propertyInterest || undefined, estateInterest: form.estateInterest || undefined, expectedCloseDate: form.expectedCloseDate || undefined, notes: form.notes || undefined };
      if (editId) await updateLead({ id: editId, ...payload });
      else await createLead(payload);
      toast.success(editId ? "Lead updated!" : "Lead created!");
      setShowForm(false);
    } catch { toast.error("Failed to save"); }
    finally { setLoading(false); }
  };

  const handleStageChange = async (leadId: Id<"leads">, newStage: string) => {
    try { await updateLead({ id: leadId, stage: newStage }); toast.success("Stage updated"); }
    catch { toast.error("Failed"); }
  };

  const handleCommSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commForm.agentId || !commForm.saleAmount) { toast.error("Agent and sale amount required"); return; }
    const saleAmt = Number(commForm.saleAmount);
    const rate = Number(commForm.commissionRate);
    try {
      await createCommission({ agentId: commForm.agentId as Id<"users">, saleAmount: saleAmt, commissionRate: rate, commissionAmount: Math.round(saleAmt * rate / 100), status: "pending", transactionDate: commForm.transactionDate, notes: commForm.notes || undefined });
      toast.success("Commission logged!"); setShowCommForm(false);
    } catch { toast.error("Failed"); }
  };

  const f = (k: keyof LeadForm, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const agents = users?.filter((u) => u.role === "agent" || u.role === "admin" || u.role === "manager") ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Sales & Pipeline</h1>
          <p className="text-sm text-gray-500">Lead management, pipeline tracking & commissions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCommForm(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2 h-9 text-sm">
            <DollarSign size={14} /> Log Commission
          </Button>
          <Button onClick={openCreate} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 h-9 text-sm">
            <Plus size={14} /> Add Lead
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {!stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Leads" value={stats.totalLeads} icon={Users} color="var(--brand)" sub={`${stats.pipelineLeads} in pipeline`} />
          <StatCard label="Won Deals" value={stats.wonLeads} icon={CheckCircle} color="#22c55e" sub={`${stats.lostLeads} lost`} />
          <StatCard label="Commission Due" value={`₦${(stats.pendingCommissionValue / 1_000_000).toFixed(1)}M`} icon={DollarSign} color="#f59e0b" sub={`${stats.pendingCommissions} pending`} />
          <StatCard label="Total Commission" value={`₦${(stats.totalCommissionValue / 1_000_000).toFixed(1)}M`} icon={Award} color="#8b5cf6" sub="all time" />
        </div>
      )}

      {/* View tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[["pipeline", "Pipeline"], ["list", "List"], ["commission", "Commissions"]].map(([v, l]) => (
          <button key={v} onClick={() => setViewMode(v as typeof viewMode)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === v ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Pipeline Kanban */}
      {viewMode === "pipeline" && (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-[900px]">
            {STAGES.map((stage) => {
              const stageLeads = leads?.filter((l) => l.stage === stage.id) ?? [];
              return (
                <div key={stage.id} className="flex-1 min-w-[160px]">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{stage.label}</span>
                    <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-1.5 rounded-full">{stageLeads.length}</span>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-2 min-h-[120px] space-y-2">
                    {!leads ? <Skeleton className="h-16 w-full" /> : stageLeads.map((lead) => (
                      <motion.div key={lead._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                        onClick={() => openEdit(lead)}>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="text-xs font-semibold text-gray-800 leading-tight">{lead.name}</span>
                          <Badge className={`text-[9px] border-0 shrink-0 px-1.5 ${PRIORITY_COLOR[lead.priority]}`}>{lead.priority}</Badge>
                        </div>
                        {lead.propertyInterest && <div className="text-[10px] text-gray-400 truncate mb-1">{lead.propertyInterest}</div>}
                        {lead.country && (
                          <div className="text-[10px] text-gray-400 truncate mb-1 flex items-center gap-1"><Globe2 size={10} /> {lead.country}</div>
                        )}
                        {lead.programmeInterest && lead.programmeInterest.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {lead.programmeInterest.map((p) => (
                              <Badge key={p} className="text-[9px] border-0 px-1.5 bg-violet-100 text-violet-700">{DIASPORA_PROGRAMME_LABELS[p] ?? p}</Badge>
                            ))}
                          </div>
                        )}
                        {lead.financePreference && (
                          <Badge className={`text-[9px] border-0 mb-1 ${FINANCE_PREFERENCE_LABELS[lead.financePreference].color}`}>
                            {FINANCE_PREFERENCE_LABELS[lead.financePreference].label}
                          </Badge>
                        )}
                        {lead.budget && <div className="text-[10px] font-medium text-[var(--brand)]">₦{(lead.budget / 1_000_000).toFixed(1)}M</div>}
                        <div className="text-[9px] text-gray-400 mt-1">{formatDistanceToNow(lead._creationTime, { addSuffix: true })}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex flex-wrap gap-2">
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input className="pl-8 h-8 text-sm" placeholder="Search leads…" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} />
            </div>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {leadsLoading ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            : leadRows.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm">No leads found</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Lead</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Source</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Stage</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Budget</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Added</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leadRows.map((lead) => {
                      const stageInfo = STAGES.find((s) => s.id === lead.stage);
                      return (
                        <tr key={lead._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{lead.name}</div>
                            <div className="text-xs text-gray-400">{lead.phone}</div>
                            {lead.country && (
                              <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Globe2 size={10} /> {lead.country}</div>
                            )}
                            {lead.programmeInterest && lead.programmeInterest.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {lead.programmeInterest.map((p) => (
                                  <Badge key={p} className="text-[9px] border-0 px-1.5 bg-violet-100 text-violet-700">{DIASPORA_PROGRAMME_LABELS[p] ?? p}</Badge>
                                ))}
                              </div>
                            )}
                            {lead.financePreference && (
                              <Badge className={`text-[9px] border-0 mt-1 ${FINANCE_PREFERENCE_LABELS[lead.financePreference].color}`}>
                                {FINANCE_PREFERENCE_LABELS[lead.financePreference].label}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">{SOURCE_LABELS[lead.source] ?? lead.source}</td>
                          <td className="px-4 py-3">
                            <Select value={lead.stage} onValueChange={(v) => handleStageChange(lead._id, v)}>
                              <SelectTrigger className="h-7 w-32 text-xs border-0 p-0 shadow-none bg-transparent">
                                <Badge className={`text-xs border-0 capitalize cursor-pointer ${stageInfo?.color ?? "bg-gray-100 text-gray-500"}`}>{stageInfo?.label ?? lead.stage}</Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs font-medium text-gray-700">{lead.budget ? `₦${(lead.budget / 1_000_000).toFixed(1)}M` : "—"}</td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{formatDistanceToNow(lead._creationTime, { addSuffix: true })}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" className="h-7 w-7 p-0 bg-blue-50 hover:bg-blue-100 text-[var(--brand)]" onClick={() => openEdit(lead)}><Pencil size={12} /></Button>
                              <Button size="sm" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 text-red-600" onClick={() => setDeleteId(lead._id)}><Trash2 size={12} /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <TablePager pageIndex={leadPageIndex} hasNextPage={leadHasNext} hasPrevPage={leadHasPrev} onNext={leadNextPage} onPrev={leadPrevPage} />
              </div>
            )}
        </div>
      )}

      {/* Commissions view */}
      {viewMode === "commission" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex gap-2">
            <Select value={commStatusFilter} onValueChange={setCommStatusFilter}>
              <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {commissionsLoading ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            : commissions.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm">No commissions logged yet</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Agent</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Sale Amount</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Rate</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Commission</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {commissions.map((c) => {
                      const agent = users?.find((u) => u._id === c.agentId);
                      return (
                        <tr key={c._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{agent?.name ?? "Unknown"}</td>
                          <td className="px-4 py-3 text-gray-700">₦{c.saleAmount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-500">{c.commissionRate}%</td>
                          <td className="px-4 py-3 font-semibold text-[var(--brand)]">₦{c.commissionAmount.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <Badge className={`text-xs border-0 capitalize ${c.status === "paid" ? "bg-green-100 text-green-700" : c.status === "approved" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>{c.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Select value={c.status} onValueChange={(v) => updateCommStatus({ id: c._id, status: v })}>
                              <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <TablePager pageIndex={commPageIndex} hasNextPage={commHasNext} hasPrevPage={commHasPrev} onNext={commNextPage} onPrev={commPrevPage} />
              </div>
            )}
        </div>
      )}

      {/* Lead Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>{editId ? "Edit Lead" : "Add New Lead"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Full Name *</Label><Input value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="John Adeyemi" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Phone *</Label><Input value={form.phone} onChange={(e) => f("phone", e.target.value)} placeholder="+234..." /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Email</Label><Input value={form.email} onChange={(e) => f("email", e.target.value)} type="email" placeholder="john@email.com" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Source</Label>
                <Select value={form.source} onValueChange={(v) => f("source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold mb-1 block">Stage</Label>
                <Select value={form.stage} onValueChange={(v) => f("stage", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold mb-1 block">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => f("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold mb-1 block">Budget (₦)</Label><Input type="number" value={form.budget} onChange={(e) => f("budget", e.target.value)} placeholder="5000000" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Property Interest</Label><Input value={form.propertyInterest} onChange={(e) => f("propertyInterest", e.target.value)} placeholder="e.g. 3-bed apartment" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Estate Interest</Label><Input value={form.estateInterest} onChange={(e) => f("estateInterest", e.target.value)} placeholder="e.g. Royal Gardens" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Expected Close Date</Label><Input type="date" value={form.expectedCloseDate} onChange={(e) => f("expectedCloseDate", e.target.value)} /></div>
              <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Notes</Label><Textarea value={form.notes} onChange={(e) => f("notes", e.target.value)} rows={2} className="resize-none text-sm" placeholder="Additional notes..." /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{loading ? "Saving..." : editId ? "Update" : "Create Lead"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Commission Form Dialog */}
      <Dialog open={showCommForm} onOpenChange={setShowCommForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Commission</DialogTitle></DialogHeader>
          <form onSubmit={handleCommSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Agent *</Label>
              <Select value={commForm.agentId} onValueChange={(v) => setCommForm((p) => ({ ...p, agentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select agent..." /></SelectTrigger>
                <SelectContent>
                  {agents.map((a) => <SelectItem key={a._id} value={a._id}>{a.name ?? a.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Sale Amount (₦) *</Label><Input type="number" value={commForm.saleAmount} onChange={(e) => setCommForm((p) => ({ ...p, saleAmount: e.target.value }))} placeholder="45000000" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Commission Rate (%)</Label><Input type="number" value={commForm.commissionRate} onChange={(e) => setCommForm((p) => ({ ...p, commissionRate: e.target.value }))} /></div>
            </div>
            {commForm.saleAmount && (
              <div className="bg-green-50 rounded-xl p-3 text-sm">
                <span className="text-gray-500">Commission: </span>
                <span className="font-bold text-green-700">₦{(Number(commForm.saleAmount) * Number(commForm.commissionRate) / 100).toLocaleString()}</span>
              </div>
            )}
            <div><Label className="text-xs font-semibold mb-1 block">Transaction Date</Label><Input type="date" value={commForm.transactionDate} onChange={(e) => setCommForm((p) => ({ ...p, transactionDate: e.target.value }))} /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Notes</Label><Textarea value={commForm.notes} onChange={(e) => setCommForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="resize-none text-sm" /></div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowCommForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">Log Commission</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Lead?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">This lead will be permanently removed.</p>
          <div className="flex justify-end gap-3 mt-3">
            <Button className="bg-gray-100 text-gray-700" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={async () => { if (deleteId) { await deleteLead({ id: deleteId }); setDeleteId(null); toast.success("Deleted"); } }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
