import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { ShieldCheck, ShieldAlert, Plus, X, Sparkles, AlertTriangle } from "lucide-react";
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

type AuthorityForm = {
  userId: string;
  approvalType: string;
  directorateId: string;
  departmentId: string;
  minAmount: string;
  maxAmount: string;
  approvalLevel: string;
  requiresCoApprover: boolean;
  effectiveFrom: string;
  effectiveTo: string;
};

const emptyAuthorityForm = (): AuthorityForm => ({
  userId: "", approvalType: "", directorateId: "none", departmentId: "none",
  minAmount: "", maxAmount: "", approvalLevel: "", requiresCoApprover: false,
  effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: "",
});

type RuleForm = { name: string; description: string; permissionA: string; permissionB: string; policy: "block" | "flag_and_route" };
const emptyRuleForm = (): RuleForm => ({ name: "", description: "", permissionA: "", permissionB: "", policy: "block" });

export default function ApprovalsSodTab() {
  const authorities = useQuery(api.iam.approvalAuthority.listApprovalAuthorities, {});
  const allUsers = useQuery(api.users.listAll);
  const directorates = useQuery(api.iam.organization.listDirectorates);
  const departments = useQuery(api.iam.organization.listDepartments, {});
  const permissions = useQuery(api.iam.permissions.listPermissions, {});
  const sodRules = useQuery(api.iam.sod.listSodRules);
  const sodViolations = useQuery(api.iam.sod.listSodViolations, {});

  const grantAuthority = useMutation(api.iam.approvalAuthority.grantApprovalAuthority);
  const revokeAuthority = useMutation(api.iam.approvalAuthority.revokeApprovalAuthority);
  const createRule = useMutation(api.iam.sod.createSodRule);
  const updateRule = useMutation(api.iam.sod.updateSodRule);
  const runScan = useMutation(api.iam.sod.runSodScan);

  const [section, setSection] = useState<"authority" | "sod">("authority");
  const [authorityOpen, setAuthorityOpen] = useState(false);
  const [authorityForm, setAuthorityForm] = useState<AuthorityForm>(emptyAuthorityForm());
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState<RuleForm>(emptyRuleForm());
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Id<"approvalAuthorities"> | null>(null);

  const userName = (id: Id<"users">) => (allUsers ?? []).find((u) => u._id === id)?.name ?? "Unknown user";
  const dirName = (id?: Id<"directorates">) => (directorates ?? []).find((d) => d._id === id)?.name;
  const deptName = (id?: Id<"departments">) => (departments ?? []).find((d) => d._id === id)?.name;

  const af = (patch: Partial<AuthorityForm>) => setAuthorityForm((p) => ({ ...p, ...patch }));
  const rf = (patch: Partial<RuleForm>) => setRuleForm((p) => ({ ...p, ...patch }));

  const deptsForDirectorate = (id: string) => (departments ?? []).filter((d) => id !== "none" && d.directorateId === id);

  const openAuthority = () => { setAuthorityForm(emptyAuthorityForm()); setAuthorityOpen(true); };

  const saveAuthority = async () => {
    if (!authorityForm.userId || !authorityForm.approvalType) { toast.error("User and approval type are required"); return; }
    setSaving(true);
    try {
      await grantAuthority({
        userId: authorityForm.userId as Id<"users">,
        approvalType: authorityForm.approvalType,
        directorateId: authorityForm.directorateId !== "none" ? (authorityForm.directorateId as Id<"directorates">) : undefined,
        departmentId: authorityForm.departmentId !== "none" ? (authorityForm.departmentId as Id<"departments">) : undefined,
        minAmount: authorityForm.minAmount ? Number(authorityForm.minAmount) : undefined,
        maxAmount: authorityForm.maxAmount ? Number(authorityForm.maxAmount) : undefined,
        approvalLevel: authorityForm.approvalLevel ? Number(authorityForm.approvalLevel) : undefined,
        requiresCoApprover: authorityForm.requiresCoApprover,
        effectiveFrom: new Date(authorityForm.effectiveFrom).toISOString(),
        effectiveTo: authorityForm.effectiveTo ? new Date(authorityForm.effectiveTo).toISOString() : undefined,
      });
      toast.success("Approval authority granted");
      setAuthorityOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to grant authority"); }
    finally { setSaving(false); }
  };

  const handleRevokeAuthority = async () => {
    if (!revokeTarget) return;
    try {
      await revokeAuthority({ id: revokeTarget });
      toast.success("Approval authority revoked");
      setRevokeTarget(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to revoke"); }
  };

  const openRule = () => { setRuleForm(emptyRuleForm()); setRuleOpen(true); };

  const saveRule = async () => {
    if (!ruleForm.name.trim() || !ruleForm.permissionA || !ruleForm.permissionB) { toast.error("Name and both permissions are required"); return; }
    setSaving(true);
    try {
      await createRule({
        name: ruleForm.name,
        description: ruleForm.description || undefined,
        conflictingPermissionA: ruleForm.permissionA,
        conflictingPermissionB: ruleForm.permissionB,
        policy: ruleForm.policy,
      });
      toast.success("Segregation of duties rule created");
      setRuleOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to create rule"); }
    finally { setSaving(false); }
  };

  const toggleRuleStatus = async (id: Id<"sodRules">, status: "active" | "inactive") => {
    try {
      await updateRule({ id, status: status === "active" ? "inactive" : "active" });
      toast.success(status === "active" ? "Rule deactivated" : "Rule activated");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await runScan({});
      toast.success(res.violationsFound > 0 ? `Scan found ${res.violationsFound} new violation(s)` : "Scan complete — no new violations found");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Scan failed"); }
    finally { setScanning(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-gray-900">Approval Authority &amp; Segregation of Duties</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Approval authority is granted explicitly — it is never inferred from job title, system role, or dashboard profile. Segregation of duties rules prevent or flag conflicting permission combinations.
        </p>
      </div>

      <div className="flex gap-2 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setSection("authority")} className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer", section === "authority" ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>
          Approval Authority
        </button>
        <button onClick={() => setSection("sod")} className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer", section === "sod" ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>
          Segregation of Duties
        </button>
      </div>

      {section === "authority" ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={openAuthority} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer">
              <Plus size={14} /> Grant Approval Authority
            </Button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {authorities === undefined ? (
              <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : authorities.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">No approval authorities configured yet. Approvals of these types will use the legacy staff gate until authority is explicitly granted.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Approval Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Scope</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Amount Range</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {authorities.map((a) => (
                      <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{userName(a.userId)}</td>
                        <td className="px-4 py-3"><Badge className="text-xs bg-blue-50 text-blue-600 border-0 capitalize">{a.approvalType.replace(/_/g, " ")}</Badge></td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">{[dirName(a.directorateId), deptName(a.departmentId)].filter(Boolean).join(" · ") || "Enterprise-wide"}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                          {a.minAmount !== undefined || a.maxAmount !== undefined ? `₦${(a.minAmount ?? 0).toLocaleString()} – ${a.maxAmount !== undefined ? `₦${a.maxAmount.toLocaleString()}` : "∞"}` : "Any amount"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn("text-xs border-0", a.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500")}>{a.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {a.status === "active" && (
                            <button onClick={() => setRevokeTarget(a._id)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer ml-auto" title="Revoke">
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
      ) : (
        <div className="space-y-5">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <Button onClick={handleScan} disabled={scanning} className="bg-amber-500 hover:bg-amber-600 text-white gap-2 cursor-pointer">
              <Sparkles size={14} /> {scanning ? "Scanning…" : "Run Conflict Scan"}
            </Button>
            <Button onClick={openRule} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer">
              <Plus size={14} /> Add SoD Rule
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><ShieldCheck size={14} className="text-[var(--brand)]" /> Rules</h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {sodRules === undefined ? (
                <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : sodRules.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">No segregation of duties rules configured yet.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {sodRules.map((r) => (
                    <div key={r._id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800">{r.name}</div>
                        <div className="text-xs text-gray-400 truncate">{r.conflictingPermissionA} ↔ {r.conflictingPermissionB}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={cn("text-[10px] border-0", r.policy === "block" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>{r.policy === "block" ? "Blocks" : "Flags & Routes"}</Badge>
                        <button onClick={() => toggleRuleStatus(r._id, r.status)} className={cn("text-[10px] font-medium px-2 py-1 rounded-md transition-colors cursor-pointer", r.status === "active" ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                          {r.status === "active" ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><ShieldAlert size={14} className="text-red-500" /> Violations</h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {sodViolations === undefined ? (
                <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : sodViolations.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">No violations recorded.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {sodViolations.map((v) => (
                    <div key={v._id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5"><AlertTriangle size={12} className="text-amber-500" />{v.userName} — {v.ruleName}</span>
                        <span className="text-[10px] text-gray-400">{format(new Date(v.timestamp), "dd MMM yyyy HH:mm")}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{v.context}</p>
                      {v.resolvedAction && <Badge className="text-[10px] bg-gray-100 text-gray-500 border-0 mt-1">{v.resolvedAction}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grant Authority Dialog */}
      <Dialog open={authorityOpen} onOpenChange={setAuthorityOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Grant Approval Authority</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">User *</Label>
                <Select value={authorityForm.userId} onValueChange={(v) => af({ userId: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select user…" /></SelectTrigger>
                  <SelectContent>{(allUsers ?? []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Approval Type *</Label>
                <Select value={authorityForm.approvalType} onValueChange={(v) => af({ approvalType: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>{APPROVAL_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Directorate (optional scope)</Label>
                <Select value={authorityForm.directorateId} onValueChange={(v) => af({ directorateId: v, departmentId: "none" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Enterprise-wide</SelectItem>
                    {(directorates ?? []).map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Department (optional)</Label>
                <Select value={authorityForm.departmentId} onValueChange={(v) => af({ departmentId: v })} disabled={authorityForm.directorateId === "none"}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All departments</SelectItem>
                    {deptsForDirectorate(authorityForm.directorateId).map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1.5 block">Min Amount (₦)</Label><Input type="number" value={authorityForm.minAmount} onChange={(e) => af({ minAmount: e.target.value })} placeholder="0" /></div>
              <div><Label className="text-xs font-semibold mb-1.5 block">Max Amount (₦)</Label><Input type="number" value={authorityForm.maxAmount} onChange={(e) => af({ maxAmount: e.target.value })} placeholder="Unlimited" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1.5 block">Effective From</Label><Input type="date" value={authorityForm.effectiveFrom} onChange={(e) => af({ effectiveFrom: e.target.value })} /></div>
              <div><Label className="text-xs font-semibold mb-1.5 block">Effective To (optional)</Label><Input type="date" value={authorityForm.effectiveTo} onChange={(e) => af({ effectiveTo: e.target.value })} /></div>
            </div>
            <p className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              This authority is independent of the user's job title and system role. It grants permission to decide approvals of this type only, within the scope and amount range configured above.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => setAuthorityOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={saveAuthority} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Grant Authority"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <Dialog open={!!revokeTarget} onOpenChange={(o) => { if (!o) setRevokeTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Revoke Approval Authority</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">This will immediately remove this user's ability to decide approvals of this type.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setRevokeTarget(null)} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</Button>
            <Button onClick={handleRevokeAuthority} className="bg-red-500 hover:bg-red-600 text-white">Revoke</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add SoD rule dialog */}
      <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Add Segregation of Duties Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1.5 block">Rule Name *</Label><Input value={ruleForm.name} onChange={(e) => rf({ name: e.target.value })} placeholder="e.g. Payment creation vs approval" /></div>
            <div><Label className="text-xs font-semibold mb-1.5 block">Description</Label><Textarea value={ruleForm.description} onChange={(e) => rf({ description: e.target.value })} placeholder="Why this combination is a conflict…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Permission A *</Label>
                <Select value={ruleForm.permissionA} onValueChange={(v) => rf({ permissionA: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent className="max-h-64">{(permissions ?? []).map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Permission B *</Label>
                <Select value={ruleForm.permissionB} onValueChange={(v) => rf({ permissionB: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent className="max-h-64">{(permissions ?? []).map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Policy</Label>
              <Select value={ruleForm.policy} onValueChange={(v) => rf({ policy: v as "block" | "flag_and_route" })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">Block — prevent the grant outright</SelectItem>
                  <SelectItem value="flag_and_route">Flag &amp; Route — allow but log for review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => setRuleOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={saveRule} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Create Rule"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
