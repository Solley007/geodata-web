import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { motion } from "motion/react";
import {
  Users, Shield, ShieldCheck, UserCheck, UserCog, Plus, Pencil, Trash2, Clock,
  CheckCircle, Mail, Phone, Search, Ban, RefreshCw,
  Eye, Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

type Role = "super_admin" | "admin" | "manager" | "agent" | "client";

const ROLE_INFO: Record<Role, { label: string; color: string; icon: React.ElementType; desc: string }> = {
  super_admin: { label: "Super Admin", color: "bg-rose-100 text-rose-700",     icon: ShieldCheck, desc: "Owner-level access, cannot be restricted" },
  admin:       { label: "Admin",       color: "bg-red-100 text-red-700",       icon: Shield,      desc: "Full access to everything" },
  manager:     { label: "Manager",     color: "bg-purple-100 text-purple-700", icon: UserCog,     desc: "Manage properties & staff" },
  agent:       { label: "Agent",       color: "bg-blue-100 text-blue-700",     icon: UserCheck,   desc: "Handle listings & clients" },
  client:      { label: "Client",      color: "bg-gray-100 text-gray-600",     icon: Users,       desc: "Client portal access only" },
};

const STAFF_ROLES: Role[] = ["super_admin", "admin", "manager", "agent"];
const CLIENT_ROLES: Role[] = ["client"];

// Coarse access level each configurable IAM role maps to, so legacy
// admin-gated queries/mutations (which still key off users.role) keep working
// without any admin having to separately set both fields by hand.
const IAM_ROLE_TO_ACCESS_LEVEL: Record<string, Role> = {
  super_administrator: "admin",
  system_administrator: "admin",
  shareholder: "client",
  board_member: "client",
  board_committee_member: "client",
  md_ceo: "admin",
  director: "manager",
  manager: "manager",
  officer: "agent",
  staff: "agent",
  auditor: "client",
  external_restricted: "client",
};

type UserRecord = {
  _id: Id<"users">;
  _creationTime: number;
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
  department?: string;
  preRegistered?: boolean;
  isActive?: boolean;
  tokenIdentifier: string;
};

type FormState = {
  name: string; email: string; role: Role; systemRoleKey: string; jobTitle: string; phone: string;
  directorateId: string; departmentId: string; unitId: string; positionId: string;
};
const emptyForm = (): FormState => ({
  name: "", email: "", role: "client", systemRoleKey: "none", jobTitle: "", phone: "",
  directorateId: "none", departmentId: "none", unitId: "none", positionId: "none",
});

export default function UsersTab({ audience }: { audience: "staff" | "client" }) {
  const { user: authUser } = useAuth();
  const updateRole    = useMutation(api.users.updateRole);
  const preRegister   = useMutation(api.users.preRegisterUser);
  const adminUpdate   = useMutation(api.users.adminUpdateUser);
  const deleteUser    = useMutation(api.users.deleteUser);
  const setActive     = useMutation(api.users.setUserActive);
  const assignUserToOrg = useMutation(api.iam.userAssignments.assignUserToOrganization);

  const audienceRoles = audience === "staff" ? STAFF_ROLES : CLIENT_ROLES;

  // The 12 configurable IAM system roles — the authoritative role list shown
  // in Add/Edit User. Distinct from the legacy access-level badge (Role
  // above), which is derived automatically from the chosen system role.
  const systemRoles = useQuery(api.iam.roles.listRoles);
  const activeSystemRoles = (systemRoles ?? []).filter((r) => r.status === "active");

  // Organisation structure — same cascading pickers as the Assignments tab,
  // so role assignment and org placement happen together on user creation.
  const directorates = useQuery(api.iam.organization.listDirectorates);
  const departments = useQuery(api.iam.organization.listDepartments, {});
  const units = useQuery(api.iam.organization.listUnits, {});
  const positions = useQuery(api.iam.organization.listPositions, {});

  const [addOpen, setAddOpen]       = useState(false);
  const [editUser, setEditUser]     = useState<Id<"users"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [viewUser, setViewUser]     = useState<UserRecord | null>(null);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState<FormState>(emptyForm());
  const [filterRole, setFilterRole] = useState<"all" | Role>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "pending" | "suspended">("all");
  const [search, setSearch]         = useState("");
  const [debouncedSearch] = useDebounce(search, 350);

  const {
    rows: users,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading: usersLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.users.listAllPaginated,
    {
      role: filterRole !== "all" ? filterRole : undefined,
      audience: filterRole === "all" ? audience : undefined,
      search: debouncedSearch || undefined,
    },
    15,
  );

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterRole]);

  const f = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));

  // Full unpaginated list, used only for role summary cards
  const allUsers = useQuery(api.users.listAll);
  const allUsersInAudience = allUsers?.filter((u) => audienceRoles.includes((u.role ?? "client") as Role));

  // Every user's current primary configurable IAM role, so the inline Role
  // column shows (and can change) the real, up-to-date role list from the
  // Roles tab — not just the 5 legacy access levels.
  const primaryAssignments = useQuery(api.iam.userAssignments.listAllActivePrimaryAssignments);
  const primaryRoleKeyFor = (userId: Id<"users">) =>
    (primaryAssignments ?? []).find((a) => a.userId === userId && a.isPrimary)?.roleKey;

  // Current system-role assignment for the user being edited, so the dialog
  // reopens with their existing System Role + Job Title pre-filled.
  const editingAssignment = useQuery(
    api.iam.userAssignments.getPrimaryAssignment,
    editUser ? { userId: editUser } : "skip",
  );

  // Once the editing user's existing assignment loads, backfill System Role
  // + Job Title + org placement into the form (they start blank because the
  // query is async).
  useEffect(() => {
    if (editUser && editingAssignment) {
      setForm((p) => ({
        ...p,
        systemRoleKey: editingAssignment.roleKey ?? "none",
        jobTitle: editingAssignment.jobTitle ?? "",
        directorateId: editingAssignment.directorateId ?? "none",
        departmentId: editingAssignment.departmentId ?? "none",
        unitId: editingAssignment.unitId ?? "none",
        positionId: editingAssignment.positionId ?? "none",
      }));
    }
  }, [editingAssignment, editUser]);

  const deptsForDirectorate = (id: string) => (departments ?? []).filter((d) => id !== "none" && d.directorateId === id);
  const unitsForDepartment = (id: string) => (units ?? []).filter((u) => id !== "none" && u.departmentId === id);
  const positionsForUnit = (id: string) => (positions ?? []).filter((p) => id !== "none" && p.unitId === id);

  const openAdd = () => { setForm({ ...emptyForm(), role: audience === "staff" ? "agent" : "client" }); setEditUser(null); setAddOpen(true); };
  const openEdit = (u: UserRecord) => {
    setForm({ ...emptyForm(), name: u.name ?? "", email: u.email ?? "", role: (u.role as Role) ?? "client", phone: u.phone ?? "" });
    setEditUser(u._id);
    setAddOpen(true);
    setViewUser(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error("Name and email are required"); return; }
    setSaving(true);
    try {
      // The legacy access-level (Role) drives which admin-gated queries the
      // account can call — derive it automatically from the chosen system
      // role so admins only ever pick one role, not two.
      const accessLevel = form.systemRoleKey !== "none" ? (IAM_ROLE_TO_ACCESS_LEVEL[form.systemRoleKey] ?? form.role) : form.role;

      let userId: Id<"users">;
      if (editUser) {
        await adminUpdate({ userId: editUser, name: form.name, email: form.email, role: accessLevel, phone: form.phone || undefined });
        userId = editUser;
        toast.success("User updated successfully");
      } else {
        userId = await preRegister({ name: form.name, email: form.email, role: accessLevel, phone: form.phone || undefined });
        toast.success(`${form.name} added — they'll get their assigned role when they sign in with ${form.email}`);
      }

      // Record/replace the configurable IAM system-role assignment, plus any
      // organisation placement (directorate/department/unit/position), so
      // role and org placement happen together in one step. Assignment is
      // written whenever a role OR any placement field was chosen.
      const hasPlacement = [form.directorateId, form.departmentId, form.unitId, form.positionId].some((v) => v !== "none");
      if (form.systemRoleKey !== "none" || hasPlacement) {
        await assignUserToOrg({
          userId,
          directorateId: form.directorateId !== "none" ? (form.directorateId as Id<"directorates">) : undefined,
          departmentId: form.departmentId !== "none" ? (form.departmentId as Id<"departments">) : undefined,
          unitId: form.unitId !== "none" ? (form.unitId as Id<"units">) : undefined,
          positionId: form.positionId !== "none" ? (form.positionId as Id<"positions">) : undefined,
          jobTitle: form.jobTitle || undefined,
          roleKey: form.systemRoleKey !== "none" ? form.systemRoleKey : undefined,
          isPrimary: true,
          effectiveFrom: new Date().toISOString(),
        });
      }

      setAddOpen(false); setEditUser(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  // Changing the inline Role select now assigns a real configurable IAM
  // system role (writing a new userOrgAssignments row) and, purely so legacy
  // admin-gated queries/mutations that still key off users.role keep
  // working, derives + patches the matching coarse access level automatically.
  const handleRoleChange = async (targetUser: UserRecord, roleKey: string) => {
    try {
      const accessLevel = IAM_ROLE_TO_ACCESS_LEVEL[roleKey] ?? (targetUser.role as Role) ?? "client";
      await Promise.all([
        updateRole({ userId: targetUser._id, role: accessLevel }),
        assignUserToOrg({ userId: targetUser._id, roleKey, isPrimary: true, effectiveFrom: new Date().toISOString() }),
      ]);
      toast.success("Role updated");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to update role"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteUser({ userId: deleteTarget._id }); toast.success("User deleted"); setDeleteTarget(null); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete"); }
  };

  const handleToggleActive = async (u: UserRecord) => {
    const next = !(u.isActive !== false);
    try {
      await setActive({ userId: u._id, isActive: next });
      toast.success(next ? `${u.name ?? "User"} reactivated` : `${u.name ?? "User"} suspended`);
      if (viewUser?._id === u._id) setViewUser({ ...viewUser, isActive: next });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const isMe = (u: UserRecord) => u.email === authUser?.profile?.email;

  const filtered = users?.filter((u) => {
    const matchStatus =
      filterStatus === "all" ? true :
      filterStatus === "pending" ? !!u.preRegistered :
      filterStatus === "suspended" ? (u.isActive === false && !u.preRegistered) :
      filterStatus === "active" ? (u.isActive !== false && !u.preRegistered) : true;
    return matchStatus;
  });

  const totalByRole = (r: Role) => allUsers?.filter((u) => u.role === r).length ?? 0;

  const audienceLabel = audience === "staff" ? "Staff" : "Clients";

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">{audienceLabel}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {audience === "staff"
              ? "Manage agent, manager, and administrator accounts"
              : "Manage buyer accounts with client portal access"}
          </p>
        </div>
        <Button onClick={openAdd} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer">
          <Plus size={16} /> Add {audience === "staff" ? "Staff" : "Client"}
        </Button>
      </div>

      {/* Role stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(ROLE_INFO) as [Role, typeof ROLE_INFO[Role]][])
          .filter(([role]) => audienceRoles.includes(role))
          .map(([role, info]) => (
          <button key={role} onClick={() => setFilterRole(filterRole === role ? "all" : role)}
            className={cn("bg-white rounded-2xl p-4 border shadow-sm flex items-center gap-3 transition-all text-left cursor-pointer",
              filterRole === role ? "border-[var(--brand)] ring-1 ring-[var(--brand)]/20" : "border-gray-100 hover:border-gray-200")}>
            <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
              <info.icon size={17} className="text-[var(--brand)]" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">{allUsers ? totalByRole(role) : "—"}</div>
              <div className="text-xs text-gray-400">{info.label}s</div>
            </div>
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search by name, email, or department…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
        </div>
        <Select value={filterRole} onValueChange={(v) => setFilterRole(v as "all" | Role)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {audience === "staff" ? (
              <>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </>
            ) : (
              <SelectItem value="client">Client</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary line */}
      {allUsersInAudience && (
        <p className="text-xs text-gray-400">
          Showing <strong className="text-gray-700">{filtered?.length ?? 0}</strong> of <strong className="text-gray-700">{allUsersInAudience.length}</strong> {audienceLabel.toLowerCase()}
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {usersLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : filtered?.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No users found matching your filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Joined</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered?.map((user, i) => {
                  const role = (user.role ?? "client") as Role;
                  const info = ROLE_INFO[role] ?? ROLE_INFO.client;
                  const systemRoleKey = primaryRoleKeyFor(user._id);
                  const systemRoleName = systemRoleKey ? (activeSystemRoles.find((r) => r.key === systemRoleKey)?.name ?? systemRoleKey) : null;
                  const isPending = !!user.preRegistered;
                  const isSuspended = user.isActive === false && !isPending;
                  const self = isMe(user);
                  return (
                    <motion.tr key={user._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className={cn("hover:bg-gray-50 transition-colors", isSuspended && "opacity-60")}>

                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
                            isSuspended ? "bg-gray-300" : isPending ? "bg-amber-400" : "bg-[var(--brand)]")}>
                            {(user.name ?? "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate flex items-center gap-1.5">
                              {user.name ?? "Unknown"}
                              {self && <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">You</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="space-y-0.5">
                          {user.email && <div className="flex items-center gap-1 text-xs text-gray-500"><Mail size={10} className="text-gray-300 shrink-0" />{user.email}</div>}
                          {user.phone && <div className="flex items-center gap-1 text-xs text-gray-400"><Phone size={10} className="text-gray-300 shrink-0" />{user.phone}</div>}
                        </div>
                      </td>

                      {/* Role — inline select, sourced from the configurable IAM
                          Roles list (Users & Roles → Roles), not a fixed set */}
                      <td className="px-4 py-3">
                        <Select
                          value={systemRoleKey ?? "__none__"}
                          onValueChange={(v) => { if (v !== "__none__") void handleRoleChange(user, v); }}
                          disabled={self || activeSystemRoles.length === 0}
                        >
                          <SelectTrigger className="w-auto h-7 text-xs border-0 bg-transparent p-0 shadow-none gap-1 focus:ring-0 [&>svg]:opacity-100 [&>svg]:text-gray-400 [&>svg]:size-3 cursor-pointer disabled:cursor-not-allowed">
                            <Badge className={cn("text-xs border-0", info.color)}>{systemRoleName ?? info.label}</Badge>
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[60]">
                            {activeSystemRoles.length === 0 && (
                              <SelectItem value="__none__" disabled>No roles configured yet</SelectItem>
                            )}
                            {activeSystemRoles.map((r) => (
                              <SelectItem key={r._id} value={r.key}>
                                <div>
                                  <div className="text-xs font-medium">{r.name}</div>
                                  {r.description && <div className="text-[10px] text-gray-400">{r.description}</div>}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">
                            <Clock size={11} /> Pending
                          </span>
                        ) : isSuspended ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full font-medium">
                            <Ban size={11} /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
                            <CheckCircle size={11} /> Active
                          </span>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                        {formatDistanceToNow(user._creationTime, { addSuffix: true })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View */}
                          <button onClick={() => setViewUser(user)}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-[var(--brand)] flex items-center justify-center transition-colors cursor-pointer" title="View details">
                            <Eye size={12} />
                          </button>
                          {/* Edit */}
                          <button onClick={() => openEdit(user)}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-[var(--brand)] flex items-center justify-center transition-colors cursor-pointer" title="Edit user">
                            <Pencil size={12} />
                          </button>
                          {/* Suspend / Reactivate (not self, not pending) */}
                          {!self && !isPending && (
                            <button onClick={() => handleToggleActive(user)}
                              className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                                isSuspended ? "bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600" : "bg-gray-100 hover:bg-amber-100 hover:text-amber-600")}
                              title={isSuspended ? "Reactivate" : "Suspend"}>
                              {isSuspended ? <RefreshCw size={12} /> : <Ban size={12} />}
                            </button>
                          )}
                          {/* Delete (not self) */}
                          {!self && (
                            <button onClick={() => setDeleteTarget(user)}
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer" title="Delete user">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!usersLoading && filtered && filtered.length > 0 && (
          <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
        )}
      </div>

      {/* Pending users notice */}
      {allUsersInAudience && allUsersInAudience.some((u) => u.preRegistered) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
          <Clock size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>Pending users</strong> have been added but have not yet signed in.
            Once they sign in with the matching email, their account activates automatically with the assigned role.
          </div>
        </div>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditUser(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
              {editUser ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>

          {!editUser && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
              The user will receive their assigned role automatically when they sign in with this email address.
            </div>
          )}

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1.5 block">Full Name *</Label>
                <Input placeholder="e.g. John Adeyemi" value={form.name} onChange={(e) => f({ name: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1.5 block">Email Address *</Label>
                <Input type="email" placeholder="john@example.com" value={form.email} onChange={(e) => f({ email: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1.5 block">Phone</Label>
                <Input placeholder="+234 800 000 0000" value={form.phone} onChange={(e) => f({ phone: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1.5 block">Job Title (free text)</Label>
                <Input placeholder="e.g. Senior Engineer, Head of HR" value={form.jobTitle} onChange={(e) => f({ jobTitle: e.target.value })} />
                <p className="text-[10px] text-gray-400 mt-1">Job title is separate from System Role — it never determines access on its own.</p>
              </div>

              <div className="col-span-2 pt-1">
                <Label className="text-xs font-semibold mb-1.5 block">Organisation Placement (optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={form.directorateId} onValueChange={(v) => f({ directorateId: v, departmentId: "none", unitId: "none", positionId: "none" })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Directorate" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No directorate</SelectItem>
                      {(directorates ?? []).map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={form.departmentId} onValueChange={(v) => f({ departmentId: v, unitId: "none", positionId: "none" })} disabled={form.directorateId === "none"}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No department</SelectItem>
                      {deptsForDirectorate(form.directorateId).map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={form.unitId} onValueChange={(v) => f({ unitId: v, positionId: "none" })} disabled={form.departmentId === "none"}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Unit" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No unit</SelectItem>
                      {unitsForDepartment(form.departmentId).map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={form.positionId} onValueChange={(v) => f({ positionId: v })} disabled={form.unitId === "none"}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Position" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No position</SelectItem>
                      {positionsForUnit(form.unitId).map((p) => <SelectItem key={p._id} value={p._id}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Placing a user in the org chart is optional here — it can also be set or changed later from the Assignments tab.</p>
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold mb-1.5 block">System Role *</Label>
                <Select value={form.systemRoleKey} onValueChange={(v) => f({ systemRoleKey: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select a system role…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None assigned</SelectItem>
                    {activeSystemRoles.map((r) => (
                      <SelectItem key={r._id} value={r.key}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {systemRoles !== undefined && activeSystemRoles.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1.5 flex items-start gap-1">
                    <Info size={11} className="shrink-0 mt-0.5" /> No configurable roles found — seed the 12 initial roles under Users &amp; Roles → Roles first.
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-1.5 flex items-start gap-1">
                  <Info size={11} className="shrink-0 mt-0.5" /> The system role sets baseline dashboard access only. Approve, sign, delete, and other sensitive actions always need an explicit permission grant under the Permissions tab.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => { setAddOpen(false); setEditUser(null); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2">
              {saving ? "Saving…" : editUser ? "Save Changes" : "Add User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── User Detail Dialog ── */}
      <Dialog open={!!viewUser} onOpenChange={(o) => { if (!o) setViewUser(null); }}>
        <DialogContent className="max-w-md">
          {viewUser && (() => {
            const role = (viewUser.role ?? "client") as Role;
            const info = ROLE_INFO[role] ?? ROLE_INFO.client;
            const isPending = !!viewUser.preRegistered;
            const isSuspended = viewUser.isActive === false && !isPending;
            const self = isMe(viewUser);
            return (
              <>
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>User Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-5">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-4">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold",
                      isSuspended ? "bg-gray-300" : isPending ? "bg-amber-400" : "bg-[var(--brand)]")}>
                      {(viewUser.name ?? "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-base flex items-center gap-2">
                        {viewUser.name ?? "Unknown"}
                        {self && <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">You</span>}
                      </div>
                      <Badge className={cn("text-xs border-0 mt-1", info.color)}>{info.label}</Badge>
                    </div>
                  </div>

                  {/* Detail rows */}
                  <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                    {[
                      { label: "Email", value: viewUser.email, icon: <Mail size={13} className="text-gray-400" /> },
                      { label: "Phone", value: viewUser.phone ?? "—", icon: <Phone size={13} className="text-gray-400" /> },
                      { label: "Joined", value: format(viewUser._creationTime, "dd MMM yyyy, HH:mm"), icon: <Clock size={13} className="text-gray-400" /> },
                    ].map((row) => (
                      <div key={row.label} className="flex items-start gap-3 px-4 py-3">
                        <div className="mt-0.5">{row.icon}</div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{row.label}</div>
                          <div className="text-sm text-gray-800">{row.value ?? "—"}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Account Status</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isPending ? "Pending first sign-in" : isSuspended ? "Suspended — cannot access the app" : "Active — full access"}
                      </p>
                    </div>
                    {!self && !isPending && (
                      <Switch checked={!isSuspended} onCheckedChange={() => handleToggleActive(viewUser)} className="cursor-pointer" />
                    )}
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100 mt-2">
                  {!self ? (
                    <Button onClick={() => { setDeleteTarget(viewUser); setViewUser(null); }}
                      className="bg-red-50 text-red-500 hover:bg-red-100 gap-1.5 cursor-pointer">
                      <Trash2 size={13} /> Delete User
                    </Button>
                  ) : <div />}
                  <div className="flex gap-2">
                    <Button onClick={() => setViewUser(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Close</Button>
                    <Button onClick={() => openEdit(viewUser)} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-1.5">
                      <Pencil size={13} /> Edit
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Are you sure you want to permanently delete <strong>{deleteTarget?.name ?? "this user"}</strong>?
              This action cannot be undone.
            </p>
            {deleteTarget && !deleteTarget.preRegistered && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700 flex items-start gap-2">
                <Ban size={13} className="shrink-0 mt-0.5" />
                <span>If you want to temporarily block access, consider <strong>suspending</strong> the user instead of deleting them.</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setDeleteTarget(null)} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white gap-1.5">
              <Trash2 size={13} /> Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
