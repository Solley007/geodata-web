import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import {
  Handshake, Plus, Building2, Pencil, Clock, CheckCircle2, XCircle,
  PauseCircle, Ban, History, Link2, Trash2, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { format, parseISO } from "date-fns";

type EngagementStatus = "draft" | "pending_approval" | "active" | "suspended" | "expired" | "terminated" | "completed";

const STATUS_META: Record<EngagementStatus, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: Pencil },
  pending_approval: { label: "Pending Approval", color: "bg-amber-100 text-amber-700", icon: Clock },
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  suspended: { label: "Suspended", color: "bg-orange-100 text-orange-700", icon: PauseCircle },
  expired: { label: "Expired", color: "bg-gray-200 text-gray-500", icon: Clock },
  terminated: { label: "Terminated", color: "bg-red-100 text-red-700", icon: Ban },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
};

/**
 * External Strategic Partner Engagements — time-bound advisory/functional
 * relationships (e.g. GRBS). A partner engagement is NEVER a permanent
 * organisational node: no directorate/department/unit/position is created
 * for it, and any alignment to the org structure is always
 * "advisory_functional", never "reporting".
 */
export default function PartnersTab() {
  const partners = useQuery(api.iam.partnerEngagements.listExternalPartners);
  const engagements = useQuery(api.iam.partnerEngagements.listPartnerEngagements, {});
  const directorates = useQuery(api.iam.organization.listDirectorates);
  const departments = useQuery(api.iam.organization.listDepartments, {});
  const units = useQuery(api.iam.organization.listUnits, {});
  const allUsers = useQuery(api.users.listAll);
  // Only accounts explicitly assigned the "external_restricted" system role
  // are offered as the linked login account — this is what determines
  // whose dashboard shows this engagement's Advisory/Functional Alignment.
  const primaryAssignments = useQuery(api.iam.userAssignments.listAllActivePrimaryAssignments);
  const externalRestrictedUserIds = new Set(
    (primaryAssignments ?? []).filter((a) => a.roleKey === "external_restricted").map((a) => a.userId)
  );
  const externalRestrictedUsers = (allUsers ?? []).filter((u) => externalRestrictedUserIds.has(u._id));

  const createPartner = useMutation(api.iam.partnerEngagements.createExternalPartner);
  const updatePartner = useMutation(api.iam.partnerEngagements.updateExternalPartner);
  const createEngagement = useMutation(api.iam.partnerEngagements.createPartnerEngagement);
  const updateScope = useMutation(api.iam.partnerEngagements.updatePartnerEngagementScope);
  const transition = useMutation(api.iam.partnerEngagements.transitionPartnerEngagement);
  const decideApproval = useMutation(api.iam.partnerEngagements.decidePartnerEngagementApproval);
  const extendEngagement = useMutation(api.iam.partnerEngagements.extendPartnerEngagement);
  const addAlignment = useMutation(api.iam.partnerEngagements.addPartnerAlignment);
  const removeAlignment = useMutation(api.iam.partnerEngagements.removePartnerAlignment);
  const sweep = useMutation(api.iam.partnerEngagements.sweepExpiredEngagements);

  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [pName, setPName] = useState("");
  const [pType, setPType] = useState("advisory");
  const [pDesc, setPDesc] = useState("");
  const [pContact, setPContact] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const [addEngagementFor, setAddEngagementFor] = useState<Id<"externalPartners"> | null>(null);
  const [eType, setEType] = useState("advisory");
  const [eScope, setEScope] = useState("");
  const [eStart, setEStart] = useState(new Date().toISOString().slice(0, 10));
  const [eEnd, setEEnd] = useState("");
  const [eTemporary, setETemporary] = useState(true);
  const [eLiaison, setELiaison] = useState<string>("none");
  const [eExternalUser, setEExternalUser] = useState<string>("none");
  const [eDashboard, setEDashboard] = useState(false);
  const [eDocs, setEDocs] = useState(false);
  const [eWorkflow, setEWorkflow] = useState(false);
  const [eExport, setEExport] = useState(false);

  const [detailId, setDetailId] = useState<Id<"partnerEngagements"> | null>(null);
  const [alignType, setAlignType] = useState<"directorate" | "department" | "unit" | "project" | "programme">("directorate");
  const [alignTargetId, setAlignTargetId] = useState<string>("");
  const [alignLabel, setAlignLabel] = useState("");
  const [terminateReason, setTerminateReason] = useState("");
  const [terminateFor, setTerminateFor] = useState<Id<"partnerEngagements"> | null>(null);
  const [extendFor, setExtendFor] = useState<Id<"partnerEngagements"> | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [editLiaisonFor, setEditLiaisonFor] = useState<Id<"partnerEngagements"> | null>(null);
  const [editLiaisonValue, setEditLiaisonValue] = useState<string>("none");
  const [savingLiaison, setSavingLiaison] = useState(false);
  const [editExternalUserFor, setEditExternalUserFor] = useState<Id<"partnerEngagements"> | null>(null);
  const [editExternalUserValue, setEditExternalUserValue] = useState<string>("none");
  const [savingExternalUser, setSavingExternalUser] = useState(false);

  const detail = useQuery(api.iam.partnerEngagements.getPartnerEngagement, detailId ? { id: detailId } : "skip");

  const resetPartnerForm = () => { setPName(""); setPType("advisory"); setPDesc(""); setPContact(""); setPEmail(""); };

  const savePartner = async () => {
    if (!pName.trim()) { toast.error("Partner name is required"); return; }
    setSaving(true);
    try {
      await createPartner({ name: pName, partnerType: pType, description: pDesc || undefined, contactName: pContact || undefined, contactEmail: pEmail || undefined });
      toast.success("Strategic partner added");
      setAddPartnerOpen(false); resetPartnerForm();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save partner"); }
    finally { setSaving(false); }
  };

  const togglePartnerStatus = async (id: Id<"externalPartners">, status: "active" | "inactive") => {
    try {
      await updatePartner({ id, status: status === "active" ? "inactive" : "active" });
      toast.success(status === "active" ? "Partner deactivated" : "Partner activated");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const resetEngagementForm = () => {
    setEType("advisory"); setEScope(""); setEStart(new Date().toISOString().slice(0, 10)); setEEnd("");
    setETemporary(true); setELiaison("none"); setEExternalUser("none"); setEDashboard(false); setEDocs(false); setEWorkflow(false); setEExport(false);
  };

  const saveEngagement = async () => {
    if (!addEngagementFor) return;
    if (eTemporary && !eEnd) { toast.error("Temporary engagements require an end date"); return; }
    setSaving(true);
    try {
      await createEngagement({
        partnerId: addEngagementFor,
        engagementType: eType,
        strategicScope: eScope || undefined,
        startDate: eStart,
        endDate: eEnd || undefined,
        liaisonUserId: eLiaison !== "none" ? (eLiaison as Id<"users">) : undefined,
        externalUserId: eExternalUser !== "none" ? (eExternalUser as Id<"users">) : undefined,
        dashboardAccess: eDashboard,
        documentAccess: eDocs,
        workflowAccess: eWorkflow,
        exportAccess: eExport,
        isTemporary: eTemporary,
      });
      toast.success("Engagement created as Draft");
      setAddEngagementFor(null); resetEngagementForm();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to create engagement"); }
    finally { setSaving(false); }
  };

  const handleTransition = async (id: Id<"partnerEngagements">, toStatus: EngagementStatus, detailText?: string) => {
    try {
      await transition({ id, toStatus, detail: detailText });
      toast.success(`Engagement marked ${STATUS_META[toStatus].label}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to change status"); }
  };

  const handleApproval = async (id: Id<"partnerEngagements">, decision: "approved" | "rejected") => {
    try {
      await decideApproval({ id, decision });
      toast.success(decision === "approved" ? "Engagement approved" : "Engagement rejected");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const handleExtend = async () => {
    if (!extendFor || !extendDate) return;
    try {
      await extendEngagement({ id: extendFor, newEndDate: extendDate });
      toast.success("Engagement extended");
      setExtendFor(null); setExtendDate("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to extend"); }
  };

  const handleTerminate = async () => {
    if (!terminateFor) return;
    await handleTransition(terminateFor, "terminated", terminateReason || undefined);
    setTerminateFor(null); setTerminateReason("");
  };

  const handleAddAlignment = async () => {
    if (!detailId) return;
    try {
      await addAlignment({
        engagementId: detailId,
        alignmentType: alignType,
        directorateId: alignType === "directorate" ? (alignTargetId as Id<"directorates">) : undefined,
        departmentId: alignType === "department" ? (alignTargetId as Id<"departments">) : undefined,
        unitId: alignType === "unit" ? (alignTargetId as Id<"units">) : undefined,
        label: (alignType === "project" || alignType === "programme") ? alignLabel : undefined,
      });
      toast.success("Advisory/functional alignment added");
      setAlignTargetId(""); setAlignLabel("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to add alignment"); }
  };

  const handleSweep = async () => {
    try {
      const res = await sweep({});
      toast.success(res.expired > 0 ? `${res.expired} engagement(s) auto-expired` : "No engagements have passed their end date");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Sweep failed"); }
  };

  const openEditLiaison = (id: Id<"partnerEngagements">, currentLiaisonId: Id<"users"> | undefined) => {
    setEditLiaisonFor(id);
    setEditLiaisonValue(currentLiaisonId ?? "none");
  };

  const handleSaveLiaison = async () => {
    if (!editLiaisonFor) return;
    setSavingLiaison(true);
    try {
      await updateScope({
        id: editLiaisonFor,
        liaisonUserId: editLiaisonValue !== "none" ? (editLiaisonValue as Id<"users">) : undefined,
      });
      toast.success("Liaison updated");
      setEditLiaisonFor(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to update liaison"); }
    finally { setSavingLiaison(false); }
  };

  const openEditExternalUser = (id: Id<"partnerEngagements">, currentExternalUserId: Id<"users"> | undefined) => {
    setEditExternalUserFor(id);
    setEditExternalUserValue(currentExternalUserId ?? "none");
  };

  const handleSaveExternalUser = async () => {
    if (!editExternalUserFor) return;
    setSavingExternalUser(true);
    try {
      await updateScope({
        id: editExternalUserFor,
        externalUserId: editExternalUserValue !== "none" ? (editExternalUserValue as Id<"users">) : undefined,
      });
      toast.success("Linked login account updated");
      setEditExternalUserFor(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to update linked login account"); }
    finally { setSavingExternalUser(false); }
  };

  if (partners === undefined || engagements === undefined) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 flex items-start gap-2.5">
        <ShieldAlert size={15} className="text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700 leading-relaxed">
          External strategic partners (e.g. GRBS) are time-bound, advisory/functional relationships. They are never a permanent directorate, department, unit, or position — any alignment to the org structure is a dotted line, never a reporting relationship.
        </p>
      </div>

      {/* ── Partners list ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-sm">Strategic Partners</h2>
        <div className="flex gap-2">
          <Button onClick={handleSweep} className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs gap-1.5 cursor-pointer h-8">
            <Clock size={12} /> Sweep Expired
          </Button>
          <Button onClick={() => setAddPartnerOpen(true)} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-1.5 cursor-pointer h-8 text-xs">
            <Plus size={13} /> Add Partner
          </Button>
        </div>
      </div>

      {partners.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Handshake /></EmptyMedia>
            <EmptyTitle>No strategic partners yet</EmptyTitle>
            <EmptyDescription>Add an external strategic partner (e.g. GRBS) to create time-bound advisory engagements.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button size="sm" onClick={() => setAddPartnerOpen(true)}>Add Partner</Button></EmptyContent>
        </Empty>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {partners.map((p) => {
            const partnerEngagements = engagements.filter((e) => e.partnerId === p._id);
            const activeCount = partnerEngagements.filter((e) => e.status === "active").length;
            return (
              <div key={p._id} className={cn("bg-white rounded-2xl border p-4 shadow-sm", p.status === "inactive" ? "opacity-60 border-gray-100" : "border-gray-100")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0"><Handshake size={15} className="text-indigo-600" /></div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">{p.name}</div>
                      <div className="text-[10px] text-gray-400 capitalize">{p.partnerType.replace(/_/g, " ")} · {activeCount} active engagement{activeCount !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <Switch checked={p.status === "active"} onCheckedChange={() => togglePartnerStatus(p._id, p.status)} className="cursor-pointer shrink-0" />
                </div>
                {p.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{p.description}</p>}

                <div className="mt-3 space-y-1.5">
                  {partnerEngagements.length === 0 ? (
                    <p className="text-[11px] text-gray-400">No engagements yet</p>
                  ) : partnerEngagements.map((e) => {
                    const meta = STATUS_META[e.status];
                    return (
                      <button key={e._id} onClick={() => setDetailId(e._id)} className="w-full flex items-center justify-between gap-2 bg-gray-50 hover:bg-gray-100 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer text-left">
                        <span className="text-[11px] text-gray-600 capitalize truncate">{e.engagementType.replace(/_/g, " ")}</span>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0", meta.color)}>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setAddEngagementFor(p._id)} className="mt-2.5 w-full text-[11px] font-medium text-[var(--brand)] hover:bg-blue-50 rounded-lg py-1.5 transition-colors cursor-pointer flex items-center justify-center gap-1">
                  <Plus size={11} /> New Engagement
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Partner ───────────────────────────────────────────────── */}
      <Dialog open={addPartnerOpen} onOpenChange={(o) => { setAddPartnerOpen(o); if (!o) resetPartnerForm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Strategic Partner</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1.5 block">Name *</Label><Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="e.g. GRBS" /></div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Partner Type</Label>
              <Select value={pType} onValueChange={setPType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="advisory">Advisory</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold mb-1.5 block">Description</Label><Textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs font-semibold mb-1.5 block">Contact Name</Label><Input value={pContact} onChange={(e) => setPContact(e.target.value)} placeholder="John Smith" /></div>
              <div><Label className="text-xs font-semibold mb-1.5 block">Contact Email</Label><Input value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="example@gmail.com" /></div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => setAddPartnerOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={savePartner} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Engagement ────────────────────────────────────────────── */}
      <Dialog open={!!addEngagementFor} onOpenChange={(o) => { if (!o) { setAddEngagementFor(null); resetEngagementForm(); } }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Partner Engagement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Engagement Type</Label>
              <Select value={eType} onValueChange={setEType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strategic_technical_partnership">Strategic Technical Partnership</SelectItem>
                  <SelectItem value="advisory">Advisory</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold mb-1.5 block">Strategic Scope</Label><Textarea value={eScope} onChange={(e) => setEScope(e.target.value)} rows={2} placeholder="What does this engagement cover?" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs font-semibold mb-1.5 block">Start Date *</Label><Input type="date" value={eStart} onChange={(e) => setEStart(e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1.5 block">End Date {eTemporary && "*"}</Label><Input type="date" value={eEnd} onChange={(e) => setEEnd(e.target.value)} /></div>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
              <div>
                <span className="text-xs font-medium text-gray-700">Time-bound (temporary)</span>
                <p className="text-[10px] text-gray-400">Requires an end date; access ends automatically</p>
              </div>
              <Switch checked={eTemporary} onCheckedChange={setETemporary} className="cursor-pointer" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Geodata Liaison / Sponsor</Label>
              <Select value={eLiaison} onValueChange={setELiaison}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(allUsers ?? []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email ?? "Unnamed"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Linked Login Account (External / Restricted)</Label>
              <Select value={eExternalUser} onValueChange={setEExternalUser}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {externalRestrictedUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email ?? "Unnamed"}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-400 mt-1">
                {externalRestrictedUsers.length === 0
                  ? "No accounts hold the External / Restricted system role yet — assign it under Users & Roles → Users first."
                  : "Links this engagement to that person's own login so they see their Advisory/Functional Alignment on their dashboard."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold block">Access Grants</Label>
              {[
                { key: "dashboard", label: "Dashboard visibility", val: eDashboard, set: setEDashboard },
                { key: "docs", label: "Document access", val: eDocs, set: setEDocs },
                { key: "workflow", label: "Workflow/task visibility", val: eWorkflow, set: setEWorkflow },
                { key: "export", label: "Export access", val: eExport, set: setEExport },
              ].map((row) => (
                <div key={row.key} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                  <span className="text-[11px] text-gray-600">{row.label}</span>
                  <Switch checked={row.val} onCheckedChange={row.set} className="cursor-pointer scale-75" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => { setAddEngagementFor(null); resetEngagementForm(); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={saveEngagement} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Creating…" : "Create as Draft"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Engagement Detail ─────────────────────────────────────────── */}
      <Dialog open={!!detailId} onOpenChange={(o) => { if (!o) setDetailId(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Engagement Detail</DialogTitle></DialogHeader>
          {detail === undefined ? <Skeleton className="h-40 w-full" /> : !detail ? (
            <p className="text-sm text-gray-400">Engagement not found.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{detail.partnerName}</div>
                  <div className="text-xs text-gray-500 capitalize">{detail.engagement.engagementType.replace(/_/g, " ")}</div>
                </div>
                <span className={cn("text-xs font-medium px-2 py-1 rounded-full", STATUS_META[detail.engagement.status].color)}>{STATUS_META[detail.engagement.status].label}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">Start</span><div className="font-medium text-gray-700">{format(parseISO(detail.engagement.startDate), "d MMM yyyy")}</div></div>
                <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400">End</span><div className="font-medium text-gray-700">{detail.engagement.endDate ? format(parseISO(detail.engagement.endDate), "d MMM yyyy") : "Open-ended"}</div></div>
              </div>

              {detail.engagement.strategicScope && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5">{detail.engagement.strategicScope}</p>}

              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-2">
                <div>
                  <span className="text-[10px] text-gray-400 block">Geodata Liaison / Sponsor</span>
                  <span className="text-xs font-medium text-gray-700">{detail.liaisonName ?? "Not assigned"}</span>
                </div>
                {!["terminated", "expired", "completed"].includes(detail.engagement.status) && (
                  <Button
                    onClick={() => openEditLiaison(detail.engagement._id, detail.engagement.liaisonUserId)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs h-7 gap-1 px-2.5"
                  >
                    <Pencil size={11} /> Change
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-2">
                <div>
                  <span className="text-[10px] text-gray-400 block">Linked Login Account</span>
                  <span className="text-xs font-medium text-gray-700">{detail.externalUserName ?? "Not linked"}</span>
                  <p className="text-[10px] text-gray-400 mt-0.5">Determines whose dashboard shows this engagement's Advisory/Functional Alignment.</p>
                </div>
                {!["terminated", "expired", "completed"].includes(detail.engagement.status) && (
                  <Button
                    onClick={() => openEditExternalUser(detail.engagement._id, detail.engagement.externalUserId)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs h-7 gap-1 px-2.5 shrink-0"
                  >
                    <Pencil size={11} /> Change
                  </Button>
                )}
              </div>

              <div className="text-xs text-gray-500">
                Approval:{" "}
                <span className={cn("font-medium", detail.engagement.approvalStatus === "approved" ? "text-emerald-600" : detail.engagement.approvalStatus === "rejected" ? "text-red-600" : "text-amber-600")}>
                  {detail.engagement.approvalStatus ?? "pending"}
                </span>
              </div>

              {/* Lifecycle actions */}
              <div className="flex flex-wrap gap-2">
                {detail.engagement.approvalStatus !== "approved" && !["terminated", "expired", "completed"].includes(detail.engagement.status) && (
                  <>
                    <Button onClick={() => handleApproval(detail.engagement._id, "approved")} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8 gap-1"><CheckCircle2 size={12} /> Approve</Button>
                    <Button onClick={() => handleApproval(detail.engagement._id, "rejected")} className="bg-red-500 hover:bg-red-600 text-white text-xs h-8 gap-1"><XCircle size={12} /> Reject</Button>
                  </>
                )}
                {detail.engagement.status === "draft" && <Button onClick={() => handleTransition(detail.engagement._id, "pending_approval")} className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-8">Submit for Approval</Button>}
                {["draft", "pending_approval"].includes(detail.engagement.status) && detail.engagement.approvalStatus === "approved" && (
                  <Button onClick={() => handleTransition(detail.engagement._id, "active")} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8">Activate</Button>
                )}
                {detail.engagement.status === "active" && <Button onClick={() => handleTransition(detail.engagement._id, "suspended")} className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8">Suspend</Button>}
                {detail.engagement.status === "suspended" && <Button onClick={() => handleTransition(detail.engagement._id, "active")} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8">Reactivate</Button>}
                {["active", "suspended"].includes(detail.engagement.status) && <Button onClick={() => handleTransition(detail.engagement._id, "completed")} className="bg-blue-500 hover:bg-blue-600 text-white text-xs h-8">Mark Completed</Button>}
                {!["terminated", "expired", "completed"].includes(detail.engagement.status) && (
                  <Button onClick={() => setTerminateFor(detail.engagement._id)} className="bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-600 text-xs h-8 gap-1"><Ban size={12} /> Terminate</Button>
                )}
                {detail.engagement.endDate && !["terminated", "expired", "completed"].includes(detail.engagement.status) && (
                  <Button onClick={() => { setExtendFor(detail.engagement._id); setExtendDate(detail.engagement.endDate ?? ""); }} className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs h-8 gap-1"><Clock size={12} /> Extend</Button>
                )}
              </div>

              {/* Alignments */}
              <div className="border-t border-gray-100 pt-3">
                <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><Link2 size={12} /> Advisory / Functional Alignment</h4>
                <p className="text-[10px] text-gray-400 mb-2">Dotted-line alignment only — never a reporting relationship.</p>
                <div className="space-y-1.5 mb-2.5">
                  {detail.alignments.length === 0 ? (
                    <p className="text-[11px] text-gray-400">No alignment configured yet.</p>
                  ) : detail.alignments.map((a) => (
                    <div key={a._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-[11px] text-gray-600 capitalize">
                        {a.alignmentType}: {a.directorateName ?? a.departmentName ?? a.unitName ?? a.label ?? "—"}
                      </span>
                      <button onClick={() => removeAlignment({ id: a._id })} className="text-gray-300 hover:text-red-500 cursor-pointer"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Select value={alignType} onValueChange={(v) => { setAlignType(v as typeof alignType); setAlignTargetId(""); setAlignLabel(""); }}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="directorate">Directorate</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="unit">Unit</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="programme">Programme</SelectItem>
                    </SelectContent>
                  </Select>
                  {alignType === "project" || alignType === "programme" ? (
                    <Input value={alignLabel} onChange={(e) => setAlignLabel(e.target.value)} placeholder="Name" className="h-8 text-xs flex-1" />
                  ) : (
                    <Select value={alignTargetId} onValueChange={setAlignTargetId}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {alignType === "directorate" && (directorates ?? []).map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                        {alignType === "department" && (departments ?? []).map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                        {alignType === "unit" && (units ?? []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Button onClick={handleAddAlignment} className="h-8 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-xs px-3">Add</Button>
                </div>
              </div>

              {/* History */}
              <div className="border-t border-gray-100 pt-3">
                <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><History size={12} /> History</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {detail.history.length === 0 ? <p className="text-[11px] text-gray-400">No history yet.</p> : detail.history.map((h) => (
                    <div key={h._id} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                      <span className="text-gray-300 shrink-0">{format(parseISO(h.timestamp), "d MMM, HH:mm")}</span>
                      <span className="capitalize">{h.action.replace(/_/g, " ")}{h.detail ? ` — ${h.detail}` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Terminate confirm ─────────────────────────────────────────── */}
      <Dialog open={!!terminateFor} onOpenChange={(o) => { if (!o) { setTerminateFor(null); setTerminateReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Terminate Engagement</DialogTitle></DialogHeader>
          <div><Label className="text-xs font-semibold mb-1.5 block">Reason</Label><Textarea value={terminateReason} onChange={(e) => setTerminateReason(e.target.value)} rows={3} placeholder="Why is this engagement being terminated?" /></div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => setTerminateFor(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={handleTerminate} className="bg-red-500 hover:bg-red-600 text-white">Terminate</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Extend confirm ────────────────────────────────────────────── */}
      <Dialog open={!!extendFor} onOpenChange={(o) => { if (!o) { setExtendFor(null); setExtendDate(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Extend Engagement</DialogTitle></DialogHeader>
          <div><Label className="text-xs font-semibold mb-1.5 block">New End Date</Label><Input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} /></div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => setExtendFor(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={handleExtend} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">Extend</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Change Liaison ────────────────────────────────────────────── */}
      <Dialog open={!!editLiaisonFor} onOpenChange={(o) => { if (!o) setEditLiaisonFor(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Geodata Liaison / Sponsor</DialogTitle></DialogHeader>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Geodata Liaison / Sponsor</Label>
            <Select value={editLiaisonValue} onValueChange={setEditLiaisonValue}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(allUsers ?? []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email ?? "Unnamed"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => setEditLiaisonFor(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={handleSaveLiaison} disabled={savingLiaison} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{savingLiaison ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Change Linked Login Account ──────────────────────────────── */}
      <Dialog open={!!editExternalUserFor} onOpenChange={(o) => { if (!o) setEditExternalUserFor(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Linked Login Account</DialogTitle></DialogHeader>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">External / Restricted Account</Label>
            <Select value={editExternalUserValue} onValueChange={setEditExternalUserValue}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {externalRestrictedUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email ?? "Unnamed"}</SelectItem>)}
              </SelectContent>
            </Select>
            {externalRestrictedUsers.length === 0 && (
              <p className="text-[10px] text-amber-600 mt-1.5">No accounts hold the External / Restricted system role yet — assign it under Users &amp; Roles → Users first.</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => setEditExternalUserFor(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={handleSaveExternalUser} disabled={savingExternalUser} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{savingExternalUser ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
