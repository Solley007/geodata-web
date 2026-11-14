import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { motion } from "motion/react";
import { Shield, Plus, Pencil, Trash2, Sparkles, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

const DASHBOARD_PROFILES = [
  { key: "shareholder", label: "Shareholder" },
  { key: "board", label: "Board" },
  { key: "md_ceo", label: "MD / CEO" },
  { key: "director", label: "Director" },
  { key: "manager", label: "Manager" },
  { key: "officer_staff", label: "Officer / Staff" },
  { key: "auditor", label: "Auditor" },
  { key: "external_restricted", label: "External / Restricted" },
];

type IamRole = {
  _id: Id<"iamRoles">;
  key: string;
  name: string;
  description?: string;
  inheritsFromKey?: string;
  isSystem: boolean;
  dashboardProfileKey: string;
  status: "active" | "inactive";
};

type FormState = { key: string; name: string; description: string; inheritsFromKey: string; dashboardProfileKey: string };
const emptyForm = (): FormState => ({ key: "", name: "", description: "", inheritsFromKey: "none", dashboardProfileKey: "officer_staff" });

export default function RolesTab() {
  const roles = useQuery(api.iam.roles.listRoles);
  const seedRoles = useMutation(api.iam.roles.seedInitialRoles);
  const createRole = useMutation(api.iam.roles.createRole);
  const updateRole = useMutation(api.iam.roles.updateRole);
  const deleteRole = useMutation(api.iam.roles.deleteRole);

  const [seeding, setSeeding] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<IamRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IamRole | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const f = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedRoles({});
      toast.success(res.inserted > 0 ? `Seeded ${res.inserted} initial roles` : "Initial roles already exist");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to seed roles"); }
    finally { setSeeding(false); }
  };

  const openAdd = () => { setForm(emptyForm()); setEditing(null); setAddOpen(true); };
  const openEdit = (r: IamRole) => {
    setForm({ key: r.key, name: r.name, description: r.description ?? "", inheritsFromKey: r.inheritsFromKey ?? "none", dashboardProfileKey: r.dashboardProfileKey });
    setEditing(r);
    setAddOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || (!editing && !form.key.trim())) { toast.error("Name and key are required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateRole({
          id: editing._id, name: form.name, description: form.description || undefined,
          inheritsFromKey: form.inheritsFromKey === "none" ? undefined : form.inheritsFromKey,
          dashboardProfileKey: form.dashboardProfileKey,
        });
        toast.success("Role updated");
      } else {
        await createRole({
          key: form.key.trim().toLowerCase().replace(/\s+/g, "_"), name: form.name,
          description: form.description || undefined,
          inheritsFromKey: form.inheritsFromKey === "none" ? undefined : form.inheritsFromKey,
          dashboardProfileKey: form.dashboardProfileKey,
        });
        toast.success("Role created");
      }
      setAddOpen(false); setEditing(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save role"); }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (r: IamRole) => {
    try {
      await updateRole({ id: r._id, status: r.status === "active" ? "inactive" : "active" });
      toast.success(r.status === "active" ? "Role deactivated" : "Role activated");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteRole({ id: deleteTarget._id }); toast.success("Role deleted"); setDeleteTarget(null); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Configurable Roles</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Roles are separate from job titles and can be created, edited, or deactivated. Sensitive permissions (approve, sign, admin, delete) always require explicit grants.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {roles && roles.length === 0 && (
            <Button onClick={handleSeed} disabled={seeding} className="bg-amber-500 hover:bg-amber-600 text-white gap-2 cursor-pointer">
              <Sparkles size={14} /> {seeding ? "Seeding…" : "Seed 12 Initial Roles"}
            </Button>
          )}
          <Button onClick={openAdd} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer">
            <Plus size={14} /> Add Role
          </Button>
        </div>
      </div>

      {roles === undefined ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : roles.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Shield /></EmptyMedia>
            <EmptyTitle>No roles configured yet</EmptyTitle>
            <EmptyDescription>Seed the 12 initial Geodata roles to get started, or create your own.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={handleSeed} disabled={seeding} className="cursor-pointer">
              {seeding ? "Seeding…" : "Seed Initial Roles"}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {roles.map((r, i) => (
            <motion.div key={r._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={cn("bg-white rounded-2xl border p-4 shadow-sm", r.status === "inactive" ? "opacity-60 border-gray-100" : "border-gray-100")}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                    <Shield size={14} className="text-[var(--brand)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate flex items-center gap-1.5">
                      {r.name}
                      {r.isSystem && <Badge className="text-[9px] bg-blue-50 text-blue-600 border-0">System</Badge>}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">{r.key}</div>
                  </div>
                </div>
                <Switch checked={r.status === "active"} onCheckedChange={() => handleToggleStatus(r)} className="cursor-pointer shrink-0" />
              </div>
              {r.description && <p className="text-xs text-gray-500 mt-2 leading-relaxed">{r.description}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <Badge className="text-[10px] bg-gray-100 text-gray-600 border-0">
                  Dashboard: {DASHBOARD_PROFILES.find((d) => d.key === r.dashboardProfileKey)?.label ?? r.dashboardProfileKey}
                </Badge>
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(r)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-[var(--brand)] flex items-center justify-center transition-colors cursor-pointer">
                    <Pencil size={12} />
                  </button>
                  {!r.isSystem && (
                    <button onClick={() => setDeleteTarget(r)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">
        <Info size={13} className="shrink-0 mt-0.5" />
        <span>Role inheritance is supported, but sensitive permissions (approve, sign, admin, delete) must always be granted explicitly under the Permissions tab — inheritance never grants them automatically.</span>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>{editing ? "Edit Role" : "Create Role"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!editing && (
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Role Key *</Label>
                <Input placeholder="e.g. regional_manager" value={form.key} onChange={(e) => f({ key: e.target.value })} />
              </div>
            )}
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Display Name *</Label>
              <Input placeholder="e.g. Regional Manager" value={form.name} onChange={(e) => f({ name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Description</Label>
              <Textarea placeholder="What this role is responsible for…" value={form.description} onChange={(e) => f({ description: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Dashboard Profile</Label>
              <div className="grid grid-cols-2 gap-2">
                {DASHBOARD_PROFILES.map((d) => (
                  <button key={d.key} type="button" onClick={() => f({ dashboardProfileKey: d.key })}
                    className={cn("px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors cursor-pointer",
                      form.dashboardProfileKey === d.key ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => { setAddOpen(false); setEditing(null); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Role</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Delete <strong>{deleteTarget?.name}</strong>? Users currently assigned this role keep their assignment record, but it will no longer resolve to an active role.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setDeleteTarget(null)} className="bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</Button>
            <Button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white gap-1.5"><Trash2 size={13} /> Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
