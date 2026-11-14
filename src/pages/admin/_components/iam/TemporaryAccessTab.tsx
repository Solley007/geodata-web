import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Clock, Plus, X, RotateCw, ClipboardCheck, History } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils.ts";

const APPROVAL_TYPES = ["kyc", "finance", "payment_exception", "reservation", "allocation", "refund", "transaction_completion", "other"];

type TempForm = { userId: string; accessType: "role" | "permission" | "scope"; grantedKey: string; reason: string; startAt: string; endAt: string };
const emptyTempForm = (): TempForm => ({ userId: "", accessType: "role", grantedKey: "", reason: "", startAt: new Date().toISOString().slice(0, 10), endAt: "" });

type DelegationForm = { delegatorId: string; delegateId: string; approvalType: string; scopeNote: string; maxAmount: string; reason: string; startAt: string; endAt: string };
const emptyDelegationForm = (): DelegationForm => ({ delegatorId: "", delegateId: "", approvalType: "", scopeNote: "", maxAmount: "", reason: "", startAt: new Date().toISOString().slice(0, 10), endAt: "" });

type ReviewForm = { userId: string; scopeReviewed: string; outcome: "confirmed" | "modified" | "revoked" | "flagged"; notes: string };
const emptyReviewForm = (): ReviewForm => ({ userId: "", scopeReviewed: "roles", outcome: "confirmed", notes: "" });

export default function TemporaryAccessTab() {
  const allUsers = useQuery(api.users.listAll);
  const roles = useQuery(api.iam.roles.listRoles);
  const permissions = useQuery(api.iam.permissions.listPermissions, {});
  const temporaryAccess = useQuery(api.iam.temporaryAccess.listTemporaryAccess, {});
  const delegations = useQuery(api.iam.temporaryAccess.listApprovalDelegations, {});
  const accessReviews = useQuery(api.iam.temporaryAccess.listAccessReviews, {});
  const orgChanges = useQuery(api.iam.organization.listOrganizationalChanges, {});

  const grantTemp = useMutation(api.iam.temporaryAccess.grantTemporaryAccess);
  const revokeTemp = useMutation(api.iam.temporaryAccess.revokeTemporaryAccess);
  const sweepTemp = useMutation(api.iam.temporaryAccess.sweepExpiredAccess);
  const createDelegation = useMutation(api.iam.temporaryAccess.createApprovalDelegation);
  const revokeDelegation = useMutation(api.iam.temporaryAccess.revokeApprovalDelegation);
  const sweepDelegations = useMutation(api.iam.temporaryAccess.sweepExpiredDelegationsMutation);
  const recordReview = useMutation(api.iam.temporaryAccess.recordAccessReview);

  const [section, setSection] = useState<"temp" | "delegation" | "review" | "history">("temp");
  const [tempOpen, setTempOpen] = useState(false);
  const [tempForm, setTempForm] = useState<TempForm>(emptyTempForm());
  const [delegationOpen, setDelegationOpen] = useState(false);
  const [delegationForm, setDelegationForm] = useState<DelegationForm>(emptyDelegationForm());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(emptyReviewForm());
  const [saving, setSaving] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  const userName = (id: Id<"users">) => (allUsers ?? []).find((u) => u._id === id)?.name ?? "Unknown user";

  const tf = (patch: Partial<TempForm>) => setTempForm((p) => ({ ...p, ...patch }));
  const df = (patch: Partial<DelegationForm>) => setDelegationForm((p) => ({ ...p, ...patch }));
  const rf = (patch: Partial<ReviewForm>) => setReviewForm((p) => ({ ...p, ...patch }));

  const saveTemp = async () => {
    if (!tempForm.userId || !tempForm.grantedKey || !tempForm.reason || !tempForm.endAt) { toast.error("All fields except start date are required"); return; }
    setSaving(true);
    try {
      await grantTemp({
        userId: tempForm.userId as Id<"users">,
        accessType: tempForm.accessType,
        grantedKey: tempForm.grantedKey,
        reason: tempForm.reason,
        startAt: new Date(tempForm.startAt).toISOString(),
        endAt: new Date(tempForm.endAt).toISOString(),
      });
      toast.success("Temporary access granted");
      setTempOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to grant access"); }
    finally { setSaving(false); }
  };

  const handleRevokeTemp = async (id: Id<"temporaryAccess">) => {
    try { await revokeTemp({ id }); toast.success("Temporary access revoked"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed to revoke"); }
  };

  const handleSweepTemp = async () => {
    setSweeping(true);
    try {
      const res = await sweepTemp({});
      toast.success(res.expired > 0 ? `${res.expired} grant(s) expired` : "No expired grants found");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Sweep failed"); }
    finally { setSweeping(false); }
  };

  const saveDelegation = async () => {
    if (!delegationForm.delegatorId || !delegationForm.delegateId || !delegationForm.approvalType || !delegationForm.reason || !delegationForm.endAt) {
      toast.error("Delegator, delegate, approval type, reason, and end date are required"); return;
    }
    setSaving(true);
    try {
      await createDelegation({
        delegatorId: delegationForm.delegatorId as Id<"users">,
        delegateId: delegationForm.delegateId as Id<"users">,
        approvalType: delegationForm.approvalType,
        scopeNote: delegationForm.scopeNote || undefined,
        maxAmount: delegationForm.maxAmount ? Number(delegationForm.maxAmount) : undefined,
        reason: delegationForm.reason,
        startAt: new Date(delegationForm.startAt).toISOString(),
        endAt: new Date(delegationForm.endAt).toISOString(),
      });
      toast.success("Approval delegation created");
      setDelegationOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to create delegation"); }
    finally { setSaving(false); }
  };

  const handleRevokeDelegation = async (id: Id<"approvalDelegations">) => {
    try { await revokeDelegation({ id }); toast.success("Delegation revoked"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed to revoke"); }
  };

  const handleSweepDelegations = async () => {
    try {
      const res = await sweepDelegations({});
      toast.success(res.expired > 0 ? `${res.expired} delegation(s) expired` : "No expired delegations found");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Sweep failed"); }
  };

  const saveReview = async () => {
    if (!reviewForm.userId) { toast.error("Select a user"); return; }
    setSaving(true);
    try {
      await recordReview({
        userId: reviewForm.userId as Id<"users">,
        scopeReviewed: reviewForm.scopeReviewed,
        outcome: reviewForm.outcome,
        notes: reviewForm.notes || undefined,
      });
      toast.success("Access review recorded");
      setReviewOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to record review"); }
    finally { setSaving(false); }
  };

  const grantedKeyOptions = tempForm.accessType === "role"
    ? (roles ?? []).filter((r) => r.status === "active").map((r) => ({ value: r.key, label: r.name }))
    : tempForm.accessType === "permission"
    ? (permissions ?? []).map((p) => ({ value: p.key, label: p.label }))
    : [
        { value: "own", label: "Own" }, { value: "assigned", label: "Assigned" }, { value: "department", label: "Department" },
        { value: "directorate", label: "Directorate" }, { value: "enterprise", label: "Enterprise" }, { value: "governance", label: "Governance" }, { value: "audit", label: "Audit" },
      ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-gray-900">Temporary Access, Delegation &amp; Reviews</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Auto-expiring access grants, approval delegation bounded by the delegator's own authority, and periodic access reviews with organisational change history.
        </p>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {([["temp", "Temporary Access"], ["delegation", "Delegation"], ["review", "Access Reviews"], ["history", "Change History"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setSection(key)} className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer", section === key ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>
            {label}
          </button>
        ))}
      </div>

      {section === "temp" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <Button onClick={handleSweepTemp} disabled={sweeping} className="bg-gray-100 hover:bg-gray-200 text-gray-700 gap-2 cursor-pointer">
              <RotateCw size={13} className={sweeping ? "animate-spin" : ""} /> Sweep Expired
            </Button>
            <Button onClick={() => { setTempForm(emptyTempForm()); setTempOpen(true); }} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer">
              <Plus size={14} /> Grant Temporary Access
            </Button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {temporaryAccess === undefined ? (
              <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : temporaryAccess.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">No temporary access grants configured yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Grant</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Window</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {temporaryAccess.map((t) => (
                      <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{userName(t.userId)}</td>
                        <td className="px-4 py-3">
                          <Badge className="text-xs bg-purple-50 text-purple-600 border-0 capitalize mr-1.5">{t.accessType}</Badge>
                          <span className="text-xs text-gray-500">{t.grantedKey}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                          {format(new Date(t.startAt), "dd MMM yyyy")} – {format(new Date(t.endAt), "dd MMM yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn("text-xs border-0", t.status === "active" ? "bg-emerald-50 text-emerald-600" : t.status === "expired" ? "bg-gray-100 text-gray-500" : "bg-red-50 text-red-500")}>{t.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {t.status === "active" && (
                            <button onClick={() => handleRevokeTemp(t._id)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer ml-auto" title="Revoke">
                              <X size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {section === "delegation" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <Button onClick={handleSweepDelegations} className="bg-gray-100 hover:bg-gray-200 text-gray-700 gap-2 cursor-pointer">
              <RotateCw size={13} /> Sweep Expired
            </Button>
            <Button onClick={() => { setDelegationForm(emptyDelegationForm()); setDelegationOpen(true); }} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer">
              <Plus size={14} /> Create Delegation
            </Button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {delegations === undefined ? (
              <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : delegations.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">No approval delegations configured yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Delegator → Delegate</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Window</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {delegations.map((d) => (
                      <tr key={d._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 text-xs">{userName(d.delegatorId)} → {userName(d.delegateId)}</td>
                        <td className="px-4 py-3"><Badge className="text-xs bg-blue-50 text-blue-600 border-0 capitalize">{d.approvalType.replace(/_/g, " ")}</Badge></td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">{format(new Date(d.startAt), "dd MMM yyyy")} – {format(new Date(d.endAt), "dd MMM yyyy")}</td>
                        <td className="px-4 py-3"><Badge className={cn("text-xs border-0", d.status === "active" ? "bg-emerald-50 text-emerald-600" : d.status === "expired" ? "bg-gray-100 text-gray-500" : "bg-red-50 text-red-500")}>{d.status}</Badge></td>
                        <td className="px-4 py-3 text-right">
                          {d.status === "active" && (
                            <button onClick={() => handleRevokeDelegation(d._id)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer ml-auto" title="Revoke">
                              <X size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {section === "review" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { setReviewForm(emptyReviewForm()); setReviewOpen(true); }} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer">
              <ClipboardCheck size={14} /> Record Access Review
            </Button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {accessReviews === undefined ? (
              <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : accessReviews.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">No access reviews recorded yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {accessReviews.map((r) => (
                  <div key={r._id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800">{r.userName} — <span className="capitalize text-gray-500">{r.scopeReviewed}</span></span>
                      <span className="text-[10px] text-gray-400">{format(new Date(r.reviewedAt), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn("text-[10px] border-0 capitalize", r.outcome === "confirmed" ? "bg-emerald-50 text-emerald-600" : r.outcome === "flagged" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600")}>{r.outcome}</Badge>
                      <span className="text-xs text-gray-400">by {r.reviewerName}</span>
                    </div>
                    {r.notes && <p className="text-xs text-gray-500 mt-1">{r.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {section === "history" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {orgChanges === undefined ? (
            <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : orgChanges.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No organisational changes recorded yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orgChanges.map((c) => (
                <div key={c._id} className="px-4 py-3 flex items-start gap-3">
                  <History size={14} className="text-gray-300 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800 capitalize">{c.changeType.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{format(new Date(c.timestamp), "dd MMM yyyy HH:mm")}</span>
                    </div>
                    <p className="text-xs text-gray-500 capitalize">{c.entityType}{c.reason ? ` — ${c.reason}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grant temporary access dialog */}
      <Dialog open={tempOpen} onOpenChange={setTempOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Grant Temporary Access</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">User *</Label>
              <Select value={tempForm.userId} onValueChange={(v) => tf({ userId: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select user…" /></SelectTrigger>
                <SelectContent>{(allUsers ?? []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Access Type</Label>
                <Select value={tempForm.accessType} onValueChange={(v) => tf({ accessType: v as TempForm["accessType"], grantedKey: "" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="permission">Permission</SelectItem>
                    <SelectItem value="scope">Data Scope</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Grant *</Label>
                <Select value={tempForm.grantedKey} onValueChange={(v) => tf({ grantedKey: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent className="max-h-64">{grantedKeyOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs font-semibold mb-1.5 block">Reason *</Label><Textarea value={tempForm.reason} onChange={(e) => tf({ reason: e.target.value })} placeholder="Why this temporary access is needed…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1.5 block">Start Date</Label><Input type="date" value={tempForm.startAt} onChange={(e) => tf({ startAt: e.target.value })} /></div>
              <div><Label className="text-xs font-semibold mb-1.5 block">End Date *</Label><Input type="date" value={tempForm.endAt} onChange={(e) => tf({ endAt: e.target.value })} /></div>
            </div>
            <p className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">This access automatically expires at the end date — no manual cleanup required.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => setTempOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={saveTemp} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Grant Access"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create delegation dialog */}
      <Dialog open={delegationOpen} onOpenChange={setDelegationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Create Approval Delegation</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Delegator (has authority) *</Label>
                <Select value={delegationForm.delegatorId} onValueChange={(v) => df({ delegatorId: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{(allUsers ?? []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Delegate (receives authority) *</Label>
                <Select value={delegationForm.delegateId} onValueChange={(v) => df({ delegateId: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{(allUsers ?? []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Approval Type *</Label>
              <Select value={delegationForm.approvalType} onValueChange={(v) => df({ approvalType: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent>{APPROVAL_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1.5 block">Max Amount (₦, optional)</Label><Input type="number" value={delegationForm.maxAmount} onChange={(e) => df({ maxAmount: e.target.value })} placeholder="Same as delegator" /></div>
              <div><Label className="text-xs font-semibold mb-1.5 block">Scope Note</Label><Input value={delegationForm.scopeNote} onChange={(e) => df({ scopeNote: e.target.value })} placeholder="e.g. Only Lagos region" /></div>
            </div>
            <div><Label className="text-xs font-semibold mb-1.5 block">Reason *</Label><Textarea value={delegationForm.reason} onChange={(e) => df({ reason: e.target.value })} placeholder="e.g. Delegator on leave 12–20 Sept" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1.5 block">Start Date</Label><Input type="date" value={delegationForm.startAt} onChange={(e) => df({ startAt: e.target.value })} /></div>
              <div><Label className="text-xs font-semibold mb-1.5 block">End Date *</Label><Input type="date" value={delegationForm.endAt} onChange={(e) => df({ endAt: e.target.value })} /></div>
            </div>
            <p className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              The delegate can never receive more authority than the delegator currently holds — this is enforced automatically.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => setDelegationOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={saveDelegation} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Create Delegation"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record access review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Record Access Review</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">User *</Label>
              <Select value={reviewForm.userId} onValueChange={(v) => rf({ userId: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select user…" /></SelectTrigger>
                <SelectContent>{(allUsers ?? []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Scope Reviewed</Label>
                <Select value={reviewForm.scopeReviewed} onValueChange={(v) => rf({ scopeReviewed: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roles">Roles</SelectItem>
                    <SelectItem value="permissions">Permissions</SelectItem>
                    <SelectItem value="scopes">Data Scopes</SelectItem>
                    <SelectItem value="approval_authority">Approval Authority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Outcome</Label>
                <Select value={reviewForm.outcome} onValueChange={(v) => rf({ outcome: v as ReviewForm["outcome"] })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="modified">Modified</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs font-semibold mb-1.5 block">Notes</Label><Textarea value={reviewForm.notes} onChange={(e) => rf({ notes: e.target.value })} placeholder="Findings or follow-up actions…" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => setReviewOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={saveReview} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Record Review"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
