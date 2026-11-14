import { useState } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.js";
import {
  ArrowLeft, Megaphone, Plus, Target, Trophy, Download, Building2, Briefcase,
  TrendingUp, Pencil,
} from "lucide-react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

type CampaignDoc = Doc<"corporateCampaigns">;

const CAMPAIGN_STATUS_COLOR: Record<string, string> = {
  planned: "bg-gray-100 text-gray-500",
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
};

const ORG_STATUS_PIE_COLORS: Record<string, string> = {
  prospect: "#3b82f6",
  active: "#22c55e",
  dormant: "#9ca3af",
  disengaged: "#ef4444",
};

function fmtCurrency(n: number): string {
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

/**
 * Campaigns, dashboards and analytics for Corporate Marketing & Bulk Sales.
 * Reads exclusively from the existing corporate marketing tables (never a
 * second CRM/analytics system) via convex/corporateMarketing/campaigns.ts
 * and analytics.ts. Gated by the same feature toggle + permission catalogue
 * enforced by the parent page (corporate.tsx).
 */
export default function CampaignsAndAnalytics({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2 cursor-pointer text-gray-500">
        <ArrowLeft size={14} /> Back to organisations
      </Button>

      <div>
        <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
          Campaigns &amp; Analytics
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Marketing campaigns, pipeline performance, and the Bulk Acquisition Register.
        </p>
      </div>

      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics" className="cursor-pointer gap-1.5"><Target size={13} /> Analytics</TabsTrigger>
          <TabsTrigger value="campaigns" className="cursor-pointer gap-1.5"><Megaphone size={13} /> Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-3">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-3">
          <CampaignsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Analytics ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const data = useQuery(api.corporateMarketing.analytics.getPipelineAnalytics, {});
  const convex = useConvex();
  const [exporting, setExporting] = useState(false);
  const [exportingAcquisitions, setExportingAcquisitions] = useState(false);

  const handleExportRegister = async () => {
    setExporting(true);
    try {
      const rows = await convex.query(api.corporateMarketing.analytics.getBulkAcquisitionRegister, {});
      if (rows.length === 0) {
        toast.error("No opportunities to export yet");
        return;
      }
      const csv = "\ufeff" + Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bulk-acquisition-register-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Bulk Acquisition Register exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed. You may not have export permission.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportAcquisitions = async () => {
    setExportingAcquisitions(true);
    try {
      const rows = await convex.query(api.corporateMarketing.analytics.getAcquisitionRegister, {});
      if (rows.length === 0) {
        toast.error("No bulk acquisitions to export yet");
        return;
      }
      const csv = "\ufeff" + Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `institutional-bulk-acquisitions-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Institutional Bulk Acquisitions register exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed. You may not have export permission.");
    } finally {
      setExportingAcquisitions(false);
    }
  };

  if (data === undefined) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const orgStatusData = Object.entries(data.orgsByStatus)
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({ status, value }));

  return (
    <div className="space-y-5">
      <div className="flex justify-end gap-2 flex-wrap">
        <Button size="sm" variant="secondary" onClick={handleExportAcquisitions} disabled={exportingAcquisitions} className="gap-2 cursor-pointer">
          <Download size={13} /> {exportingAcquisitions ? "Exporting…" : "Export Institutional Bulk Acquisitions"}
        </Button>
        <Button size="sm" variant="secondary" onClick={handleExportRegister} disabled={exporting} className="gap-2 cursor-pointer">
          <Download size={13} /> {exporting ? "Exporting…" : "Export Bulk Acquisition Register"}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Corporate Organisations", value: String(data.totals.organisations), icon: Building2 },
          { label: "Open Opportunities", value: String(data.totals.openOpportunities), icon: Briefcase },
          { label: "Open Pipeline Value", value: fmtCurrency(data.totals.openPipelineValue), icon: TrendingUp },
          { label: "Win Rate", value: `${data.totals.winRatePercent}%`, icon: Trophy },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{s.label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--brand)]/10">
                <s.icon size={15} className="text-[var(--brand)]" />
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Closed Won", value: data.totals.closedWon, color: "text-green-600" },
          { label: "Closed Lost", value: data.totals.closedLost, color: "text-red-600" },
          { label: "Nurture", value: data.totals.nurture, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
            <p className={cn("text-xl font-bold", s.color)} style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Pipeline by Stage</h3>
          {data.funnel.length === 0 ? (
            <p className="text-xs text-gray-400">No pipeline stages configured yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, data.funnel.length * 32)}>
              <BarChart data={data.funnel} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {data.funnel.map((f, i) => (
                    <Cell key={i} fill={f.isClosedWon ? "#22c55e" : f.isClosedLost ? "#ef4444" : "var(--brand)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Organisations by Status</h3>
          {orgStatusData.length === 0 ? (
            <p className="text-xs text-gray-400">No corporate organisations yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={orgStatusData} dataKey="value" nameKey="status" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {orgStatusData.map((d, i) => <Cell key={i} fill={ORG_STATUS_PIE_COLORS[d.status] ?? "#9ca3af"} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {orgStatusData.map((d) => (
              <div key={d.status} className="flex items-center gap-1.5 text-xs text-gray-500 capitalize">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: ORG_STATUS_PIE_COLORS[d.status] ?? "#9ca3af" }} />
                {d.status} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Officer Performance</h3>
        {data.officerPerformance.length === 0 ? (
          <p className="text-xs text-gray-400">No opportunities have been assigned to an officer yet.</p>
        ) : (
          <div className="grid gap-2">
            {data.officerPerformance.map((o) => (
              <div key={o.officerId} className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-gray-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{o.officerName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{o.opportunities} opportunities · {o.closedWon} won · {o.closedLost} lost</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0">{fmtCurrency(o.pipelineValue)} open</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Campaign Performance</h3>
        {data.campaignPerformance.length === 0 ? (
          <p className="text-xs text-gray-400">No campaigns created yet — see the Campaigns tab.</p>
        ) : (
          <div className="grid gap-2">
            {data.campaignPerformance.map((c) => (
              <div key={c.campaignId} className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-gray-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{c.campaignName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.organisationsTargeted} organisations · {c.opportunities} opportunities · {c.closedWon} won</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0">{fmtCurrency(c.pipelineValue)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Campaigns ─────────────────────────────────────────────────────────────
function CampaignsTab() {
  const campaigns = useQuery(api.corporateMarketing.campaigns.listCampaigns, {});
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignDoc | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setCreateOpen(true); }} className="gap-2 cursor-pointer">
          <Plus size={13} /> New Campaign
        </Button>
      </div>

      {campaigns === undefined ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : campaigns.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Megaphone /></EmptyMedia>
            <EmptyTitle>No campaigns yet</EmptyTitle>
            <EmptyDescription>Create a marketing campaign to organise outreach to corporate organisations by sector or initiative.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
              <Plus size={13} /> New Campaign
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-3">
          {campaigns.map((c) => (
            <div key={c._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                    <Megaphone size={16} className="text-[var(--brand)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.campaignRef}{c.targetSector ? ` · ${c.targetSector}` : ""}{c.ownerName ? ` · Owner: ${c.ownerName}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={cn("text-[10px] border-0 capitalize", CAMPAIGN_STATUS_COLOR[c.status])}>{c.status}</Badge>
                  <Button size="sm" variant="ghost" className="cursor-pointer h-7 w-7 p-0" onClick={() => { setEditing(c); setCreateOpen(true); }}>
                    <Pencil size={13} />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: "Organisations Targeted", value: c.organisationsTargeted },
                  { label: "Opportunities", value: c.opportunitiesCount },
                  { label: "Closed Won", value: c.closedWonCount },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-gray-50 p-2.5 text-center">
                    <p className="text-sm font-bold text-gray-900">{s.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {c.description && <p className="text-xs text-gray-500 mt-3 border-t border-gray-50 pt-3">{c.description}</p>}
            </div>
          ))}
        </div>
      )}

      <CampaignDialog open={createOpen} onOpenChange={setCreateOpen} campaign={editing} />
    </div>
  );
}

function CampaignDialog({
  open,
  onOpenChange,
  campaign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignDoc | null;
}) {
  const createCampaign = useMutation(api.corporateMarketing.campaigns.createCampaign);
  const updateCampaign = useMutation(api.corporateMarketing.campaigns.updateCampaign);
  const [form, setForm] = useState({
    name: "", description: "", targetSector: "", startDate: "", endDate: "", budget: "", objectives: "", notes: "",
    status: "planned" as CampaignDoc["status"],
  });
  const [saving, setSaving] = useState(false);

  const key = campaign?._id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setForm({
      name: campaign?.name ?? "",
      description: campaign?.description ?? "",
      targetSector: campaign?.targetSector ?? "",
      startDate: campaign?.startDate ?? "",
      endDate: campaign?.endDate ?? "",
      budget: campaign?.budget !== undefined ? String(campaign.budget) : "",
      objectives: campaign?.objectives ?? "",
      notes: campaign?.notes ?? "",
      status: campaign?.status ?? "planned",
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Campaign name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || undefined,
        targetSector: form.targetSector || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        objectives: form.objectives || undefined,
        notes: form.notes || undefined,
      };
      if (campaign) {
        await updateCampaign({ id: campaign._id, ...payload, status: form.status });
        toast.success("Campaign updated");
      } else {
        await createCampaign(payload);
        toast.success("Campaign created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{campaign ? "Edit Campaign" : "New Marketing Campaign"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Campaign Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Public Sector Housing Drive 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Target Sector</Label>
              <Input value={form.targetSector} onChange={(e) => setForm({ ...form, targetSector: e.target.value })} placeholder="Government Agencies" />
            </div>
            <div className="space-y-1.5">
              <Label>Budget (₦)</Label>
              <Input type="number" min={0} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          {campaign && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CampaignDoc["status"] })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Objectives</Label>
            <Textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Saving…" : campaign ? "Save Changes" : "Create Campaign"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
