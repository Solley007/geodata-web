import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { UserCog, Search, Pencil, Clock, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils.ts";

type UserRecord = { _id: Id<"users">; name?: string; email?: string; role?: string };

type FormState = {
  directorateId: string;
  departmentId: string;
  unitId: string;
  positionId: string;
  jobTitle: string;
  roleKey: string;
  isPrimary: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  reason: string;
};

const emptyForm = (): FormState => ({
  directorateId: "none", departmentId: "none", unitId: "none", positionId: "none",
  jobTitle: "", roleKey: "none", isPrimary: true,
  effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: "", reason: "",
});

export default function UserAssignmentsTab() {
  const allUsers = useQuery(api.users.listAll);
  const directorates = useQuery(api.iam.organization.listDirectorates);
  const departments = useQuery(api.iam.organization.listDepartments, {});
  const units = useQuery(api.iam.organization.listUnits, {});
  const positions = useQuery(api.iam.organization.listPositions, {});
  const roles = useQuery(api.iam.roles.listRoles);
  const primaryAssignments = useQuery(api.iam.userAssignments.listAllActivePrimaryAssignments);

  const assignUser = useMutation(api.iam.userAssignments.assignUserToOrganization);
  const endAssignment = useMutation(api.iam.userAssignments.endUserAssignment);

  const [search, setSearch] = useState("");
  const [assignUserTarget, setAssignUserTarget] = useState<UserRecord | null>(null);
  const [assignmentHistoryUser, setAssignmentHistoryUser] = useState<UserRecord | null>(null);
  const [endTarget, setEndTarget] = useState<{ id: Id<"userOrgAssignments">; userName: string } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const history = useQuery(
    api.iam.userAssignments.listAssignmentsForUser,
    assignmentHistoryUser ? { userId: assignmentHistoryUser._id } : "skip"
  );

  const f = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));

  const primaryFor = (userId: Id<"users">) => (primaryAssignments ?? []).find((a) => a.userId === userId);
  const dirName = (id?: Id<"directorates">) => (directorates ?? []).find((d) => d._id === id)?.name;
  const deptName = (id?: Id<"departments">) => (departments ?? []).find((d) => d._id === id)?.name;
  const unitName = (id?: Id<"units">) => (units ?? []).find((u) => u._id === id)?.name;
  const positionTitle = (id?: Id<"positions">) => (positions ?? []).find((p) => p._id === id)?.title;
  const roleName = (key?: string) => (roles ?? []).find((r) => r.key === key)?.name ?? key;

  const filtered = (allUsers ?? []).filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  const openAssign = (u: UserRecord) => {
    const existing = primaryFor(u._id);
    if (existing) {
      setForm({
        directorateId: existing.directorateId ?? "none",
        departmentId: existing.departmentId ?? "none",
        unitId: existing.unitId ?? "none",
        positionId: existing.positionId ?? "none",
        jobTitle: existing.jobTitle ?? "",
        roleKey: existing.roleKey ?? "none",
        isPrimary: true,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        effectiveTo: "",
        reason: "",
      });
    } else {
      setForm(emptyForm());
    }
    setAssignUserTarget(u);
  };

  const deptsForDirectorate = (id: string) => (departments ?? []).filter((d) => id !== "none" && d.directorateId === id);
  const unitsForDepartment = (id: string) => (units ?? []).filter((u) => id !== "none" && u.departmentId === id);
  const positionsForUnit = (id: string) => (positions ?? []).filter((p) => id !== "none" && p.unitId === id);

  const handleSave = async () => {
    if (!assignUserTarget) return;
    setSaving(true);
    try {
      await assignUser({
        userId: assignUserTarget._id,
        directorateId: form.directorateId !== "none" ? (form.directorateId as Id<"directorates">) : undefined,
        departmentId: form.departmentId !== "none" ? (form.departmentId as Id<"departments">) : undefined,
        unitId: form.unitId !== "none" ? (form.unitId as Id<"units">) : undefined,
        positionId: form.positionId !== "none" ? (form.positionId as Id<"positions">) : undefined,
        jobTitle: form.jobTitle || undefined,
        roleKey: form.roleKey !== "none" ? form.roleKey : undefined,
        isPrimary: form.isPrimary,
        effectiveFrom: new Date(form.effectiveFrom).toISOString(),
        effectiveTo: form.effectiveTo ? new Date(form.effectiveTo).toISOString() : undefined,
        reason: form.reason || undefined,
      });
      toast.success(`${assignUserTarget.name ?? "User"} assigned`);
      setAssignUserTarget(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to assign"); }
    finally { setSaving(false); }
  };

  const handleEnd = async () => {
    if (!endTarget) return;
    try {
      await endAssignment({ id: endTarget.id });
      toast.success(`Assignment ended for ${endTarget.userName}`);
      setEndTarget(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to end assignment"); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-gray-900">User Organisation Assignments</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Place each user in the organisation (directorate/department/unit/position) and assign their system role. Assignments are time-bound and tracked in organisational change history.
        </p>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm max-w-sm" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {allUsers === undefined ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Placement</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">System Role</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => {
                  const assignment = primaryFor(u._id);
                  return (
                    <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.name ?? "Unknown"}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {assignment ? (
                          <div className="text-xs text-gray-600 space-y-0.5">
                            {assignment.jobTitle && <div className="font-medium text-gray-800">{assignment.jobTitle}</div>}
                            <div className="text-gray-400">
                              {[dirName(assignment.directorateId), deptName(assignment.departmentId), unitName(assignment.unitId), positionTitle(assignment.positionId)]
                                .filter(Boolean).join(" · ") || "—"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not placed</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {assignment?.roleKey ? (
                          <Badge className="text-xs bg-purple-50 text-purple-600 border-0">{roleName(assignment.roleKey)}</Badge>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setAssignmentHistoryUser(u)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-[var(--brand)] flex items-center justify-center transition-colors cursor-pointer" title="View history">
                            <Clock size={12} />
                          </button>
                          <button onClick={() => openAssign(u)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-[var(--brand)] flex items-center justify-center transition-colors cursor-pointer" title="Assign / Transfer">
                            <Pencil size={12} />
                          </button>
                          {assignment && (
                            <button onClick={() => setEndTarget({ id: assignment._id, userName: u.name ?? "User" })} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer" title="End assignment">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign / Transfer dialog */}
      <Dialog open={!!assignUserTarget} onOpenChange={(o) => { if (!o) setAssignUserTarget(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
              Assign {assignUserTarget?.name ?? "User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Directorate</Label>
                <Select value={form.directorateId} onValueChange={(v) => f({ directorateId: v, departmentId: "none", unitId: "none", positionId: "none" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(directorates ?? []).map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Department</Label>
                <Select value={form.departmentId} onValueChange={(v) => f({ departmentId: v, unitId: "none", positionId: "none" })} disabled={form.directorateId === "none"}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {deptsForDirectorate(form.directorateId).map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Unit</Label>
                <Select value={form.unitId} onValueChange={(v) => f({ unitId: v, positionId: "none" })} disabled={form.departmentId === "none"}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {unitsForDepartment(form.departmentId).map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Position</Label>
                <Select value={form.positionId} onValueChange={(v) => f({ positionId: v })} disabled={form.unitId === "none"}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {positionsForUnit(form.unitId).map((p) => <SelectItem key={p._id} value={p._id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Job Title (free text)</Label>
                <Input value={form.jobTitle} onChange={(e) => f({ jobTitle: e.target.value })} placeholder="e.g. Senior Engineer" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">System Role</Label>
                <Select value={form.roleKey} onValueChange={(v) => f({ roleKey: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(roles ?? []).filter((r) => r.status === "active").map((r) => <SelectItem key={r._id} value={r.key}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              Job title, system role, and approval authority are independent — assigning a role here does not grant approval authority automatically.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Effective From</Label>
                <Input type="date" value={form.effectiveFrom} onChange={(e) => f({ effectiveFrom: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Effective To (optional)</Label>
                <Input type="date" value={form.effectiveTo} onChange={(e) => f({ effectiveTo: e.target.value })} />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Reason for change</Label>
              <Textarea value={form.reason} onChange={(e) => f({ reason: e.target.value })} placeholder="e.g. Promotion, transfer, new hire…" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => setAssignUserTarget(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Save Assignment"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={!!assignmentHistoryUser} onOpenChange={(o) => { if (!o) setAssignmentHistoryUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assignment History — {assignmentHistoryUser?.name}</DialogTitle></DialogHeader>
          {history === undefined ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No assignment history yet</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {[...history].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map((h) => (
                <div key={h._id} className={cn("rounded-xl border px-3 py-2.5 text-xs", h.status === "active" ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100 bg-gray-50")}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={cn("text-[10px] border-0", h.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600")}>{h.status}</Badge>
                    <span className="text-gray-400 flex items-center gap-1"><ArrowRight size={10} />{format(new Date(h.effectiveFrom), "dd MMM yyyy")}{h.effectiveTo ? ` – ${format(new Date(h.effectiveTo), "dd MMM yyyy")}` : ""}</span>
                  </div>
                  <div className="text-gray-700">{h.jobTitle || positionTitle(h.positionId) || "—"}</div>
                  <div className="text-gray-400">
                    {[dirName(h.directorateId), deptName(h.departmentId), unitName(h.unitId)].filter(Boolean).join(" · ")}
                    {h.roleKey && ` · ${roleName(h.roleKey)}`}
                  </div>
                  {h.reason && <div className="text-gray-400 mt-1 italic">"{h.reason}"</div>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* End assignment confirm */}
      <Dialog open={!!endTarget} onOpenChange={(o) => { if (!o) setEndTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>End Assignment</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">End the current organisation assignment for <strong>{endTarget?.userName}</strong>? This does not delete their user account.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setEndTarget(null)} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</Button>
            <Button onClick={handleEnd} className="bg-red-500 hover:bg-red-600 text-white gap-1.5"><UserCog size={13} /> End Assignment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
