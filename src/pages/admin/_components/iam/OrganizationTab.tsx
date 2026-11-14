import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { motion, AnimatePresence } from "motion/react";
import { Building2, ChevronDown, Plus, Pencil, Sparkles, AlertTriangle, Layers, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

type DirectorateRecord = { _id: Id<"directorates">; name: string; code?: string; colorTheme?: string; status: "active" | "inactive" };
type DepartmentRecord = { _id: Id<"departments">; directorateId: Id<"directorates">; name: string; status: "active" | "inactive" };
type UnitRecord = { _id: Id<"units">; departmentId: Id<"departments">; name: string; status: "active" | "inactive" };
type PositionRecord = {
  _id: Id<"positions">;
  title: string;
  unitId?: Id<"units">;
  departmentId?: Id<"departments">;
  directorateId?: Id<"directorates">;
  reportsToPositionId?: Id<"positions">;
  status: "active" | "inactive";
};

export default function OrganizationTab() {
  const directorates = useQuery(api.iam.organization.listDirectorates);
  const departments = useQuery(api.iam.organization.listDepartments, {});
  const units = useQuery(api.iam.organization.listUnits, {});
  const positions = useQuery(api.iam.organization.listPositions, {});
  const seedOrg = useMutation(api.iam.organization.seedInitialOrganization);
  const seedUnitsAndPositions = useMutation(api.iam.organization.seedStarterUnitsAndPositions);
  const createDirectorate = useMutation(api.iam.organization.createDirectorate);
  const updateDirectorate = useMutation(api.iam.organization.updateDirectorate);
  const createDepartment = useMutation(api.iam.organization.createDepartment);
  const updateDepartment = useMutation(api.iam.organization.updateDepartment);
  const createUnit = useMutation(api.iam.organization.createUnit);
  const updateUnit = useMutation(api.iam.organization.updateUnit);
  const createPosition = useMutation(api.iam.organization.createPosition);
  const updatePosition = useMutation(api.iam.organization.updatePosition);

  const [seeding, setSeeding] = useState(false);
  const [seedingUnits, setSeedingUnits] = useState(false);
  const [expandedDirectorates, setExpandedDirectorates] = useState<Set<string>>(new Set());
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  const [addDirectorateOpen, setAddDirectorateOpen] = useState(false);
  const [editDirectorate, setEditDirectorate] = useState<DirectorateRecord | null>(null);
  const [addDeptFor, setAddDeptFor] = useState<Id<"directorates"> | null>(null);
  const [editDept, setEditDept] = useState<DepartmentRecord | null>(null);
  const [moveDept, setMoveDept] = useState<DepartmentRecord | null>(null);
  const [addUnitFor, setAddUnitFor] = useState<Id<"departments"> | null>(null);
  const [editUnit, setEditUnit] = useState<UnitRecord | null>(null);
  const [addPositionFor, setAddPositionFor] = useState<{ unitId?: Id<"units">; departmentId?: Id<"departments">; directorateId?: Id<"directorates"> } | null>(null);
  const [editPosition, setEditPosition] = useState<PositionRecord | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  const impact = useQuery(
    api.iam.organization.previewDepartmentMoveImpact,
    moveDept ? { departmentId: moveDept._id } : "skip"
  );

  const toggleSet = (set: Set<string>, setFn: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFn(next);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedOrg({});
      toast.success(res.directoratesInserted > 0
        ? `Seeded ${res.directoratesInserted} directorates and ${res.departmentsInserted} departments`
        : "Initial organisation already exists");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to seed organisation"); }
    finally { setSeeding(false); }
  };

  const handleSeedUnits = async () => {
    setSeedingUnits(true);
    try {
      const res = await seedUnitsAndPositions({});
      toast.success(res.unitsInserted > 0
        ? `Seeded ${res.unitsInserted} starter units and ${res.positionsInserted} positions — edit, rename, or add more anytime`
        : "Every department already has at least one unit configured");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to seed units & positions"); }
    finally { setSeedingUnits(false); }
  };

  const openAddDirectorate = () => { setName(""); setCode(""); setEditDirectorate(null); setAddDirectorateOpen(true); };
  const openEditDirectorate = (d: DirectorateRecord) => { setName(d.name); setCode(d.code ?? ""); setEditDirectorate(d); setAddDirectorateOpen(true); };

  const saveDirectorate = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editDirectorate) {
        await updateDirectorate({ id: editDirectorate._id, name, code: code || undefined });
        toast.success("Directorate updated");
      } else {
        await createDirectorate({ name, code: code || undefined });
        toast.success("Directorate created");
      }
      setAddDirectorateOpen(false); setEditDirectorate(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const toggleDirectorateStatus = async (d: DirectorateRecord) => {
    try {
      await updateDirectorate({ id: d._id, status: d.status === "active" ? "inactive" : "active" });
      toast.success(d.status === "active" ? "Directorate deactivated" : "Directorate activated");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const openAddDept = (directorateId: Id<"directorates">) => { setName(""); setEditDept(null); setAddDeptFor(directorateId); };
  const openEditDept = (dept: DepartmentRecord) => { setName(dept.name); setEditDept(dept); setAddDeptFor(dept.directorateId); };

  const saveDept = async () => {
    if (!name.trim() || !addDeptFor) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editDept) {
        await updateDepartment({ id: editDept._id, name });
        toast.success("Department updated");
      } else {
        await createDepartment({ directorateId: addDeptFor, name });
        toast.success("Department created");
      }
      setAddDeptFor(null); setEditDept(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const toggleDeptStatus = async (dept: DepartmentRecord) => {
    try {
      await updateDepartment({ id: dept._id, status: dept.status === "active" ? "inactive" : "active" });
      toast.success(dept.status === "active" ? "Department deactivated" : "Department activated");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const confirmMoveDept = async (newDirectorateId: Id<"directorates">) => {
    if (!moveDept) return;
    try {
      await updateDepartment({ id: moveDept._id, directorateId: newDirectorateId });
      toast.success(`${moveDept.name} moved`);
      setMoveDept(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to move department"); }
  };

  const openAddUnit = (departmentId: Id<"departments">) => { setName(""); setEditUnit(null); setAddUnitFor(departmentId); };
  const openEditUnit = (unit: UnitRecord) => { setName(unit.name); setEditUnit(unit); setAddUnitFor(unit.departmentId); };

  const saveUnit = async () => {
    if (!name.trim() || !addUnitFor) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editUnit) {
        await updateUnit({ id: editUnit._id, name });
        toast.success("Unit updated");
      } else {
        await createUnit({ departmentId: addUnitFor, name });
        toast.success("Unit created");
      }
      setAddUnitFor(null); setEditUnit(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const toggleUnitStatus = async (unit: UnitRecord) => {
    try {
      await updateUnit({ id: unit._id, status: unit.status === "active" ? "inactive" : "active" });
      toast.success(unit.status === "active" ? "Unit deactivated" : "Unit activated");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const openAddPosition = (ctx: { unitId?: Id<"units">; departmentId?: Id<"departments">; directorateId?: Id<"directorates"> }) => {
    setName(""); setEditPosition(null); setAddPositionFor(ctx);
  };
  const openEditPosition = (pos: PositionRecord) => {
    setName(pos.title);
    setEditPosition(pos);
    setAddPositionFor({ unitId: pos.unitId, departmentId: pos.departmentId, directorateId: pos.directorateId });
  };

  const savePosition = async () => {
    if (!name.trim() || !addPositionFor) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      if (editPosition) {
        await updatePosition({ id: editPosition._id, title: name });
        toast.success("Position updated");
      } else {
        await createPosition({ title: name, ...addPositionFor });
        toast.success("Position created");
      }
      setAddPositionFor(null); setEditPosition(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const togglePositionStatus = async (pos: PositionRecord) => {
    try {
      await updatePosition({ id: pos._id, status: pos.status === "active" ? "inactive" : "active" });
      toast.success(pos.status === "active" ? "Position deactivated" : "Position activated");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const deptsFor = (directorateId: Id<"directorates">) => (departments ?? []).filter((d) => d.directorateId === directorateId);
  const unitsFor = (departmentId: Id<"departments">) => (units ?? []).filter((u) => u.departmentId === departmentId);
  const positionsForUnit = (unitId: Id<"units">) => (positions ?? []).filter((p) => p.unitId === unitId);
  const positionsForDeptDirect = (departmentId: Id<"departments">) => (positions ?? []).filter((p) => p.departmentId === departmentId && !p.unitId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Organisation Structure</h2>
          <p className="text-xs text-gray-500 mt-0.5">Directorates, departments, units, and positions are fully configurable. The current structure is initial data, not hard-coded logic.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {directorates && directorates.length === 0 && (
            <Button onClick={handleSeed} disabled={seeding} className="bg-amber-500 hover:bg-amber-600 text-white gap-2 cursor-pointer">
              <Sparkles size={14} /> {seeding ? "Seeding…" : "Seed Initial Organogram"}
            </Button>
          )}
          {directorates && directorates.length > 0 && units && units.length === 0 && (
            <Button onClick={handleSeedUnits} disabled={seedingUnits} className="bg-amber-500 hover:bg-amber-600 text-white gap-2 cursor-pointer">
              <Layers size={14} /> {seedingUnits ? "Seeding…" : "Seed Starter Units & Positions"}
            </Button>
          )}
          <Button onClick={openAddDirectorate} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer">
            <Plus size={14} /> Add Directorate
          </Button>
        </div>
      </div>

      {directorates === undefined ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : directorates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
          No directorates configured. Seed the initial Geodata organogram or create your own.
        </div>
      ) : (
        <div className="space-y-2.5">
          {directorates.map((d) => {
            const isOpen = expandedDirectorates.has(d._id);
            const depts = deptsFor(d._id);
            return (
              <div key={d._id} className={cn("bg-white rounded-2xl border shadow-sm overflow-hidden", d.status === "inactive" ? "opacity-60 border-gray-100" : "border-gray-100")}>
                <button onClick={() => toggleSet(expandedDirectorates, setExpandedDirectorates, d._id)} className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                      <Building2 size={15} className="text-[var(--brand)]" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="font-semibold text-sm text-gray-900 truncate">{d.name}</div>
                      <div className="text-[10px] text-gray-400">{depts.length} department{depts.length !== 1 ? "s" : ""}{d.code ? ` · ${d.code}` : ""}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={d.status === "active"} onCheckedChange={() => toggleDirectorateStatus(d)} onClick={(e) => e.stopPropagation()} className="cursor-pointer" />
                    <button onClick={(e) => { e.stopPropagation(); openEditDirectorate(d); }} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-[var(--brand)] flex items-center justify-center transition-colors cursor-pointer">
                      <Pencil size={12} />
                    </button>
                    <ChevronDown size={16} className={cn("text-gray-400 transition-transform", isOpen && "rotate-180")} />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="border-t border-gray-50 p-4 space-y-2 bg-gray-50/50">
                        {depts.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-2">No departments yet</p>
                        ) : depts.map((dept) => {
                          const deptOpen = expandedDepartments.has(dept._id);
                          const deptUnits = unitsFor(dept._id);
                          const deptDirectPositions = positionsForDeptDirect(dept._id);
                          return (
                            <div key={dept._id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2.5">
                                <button onClick={() => toggleSet(expandedDepartments, setExpandedDepartments, dept._id)} className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer text-left">
                                  <ChevronDown size={12} className={cn("text-gray-300 shrink-0 transition-transform", deptOpen && "rotate-180")} />
                                  <span className={cn("text-sm text-gray-700 truncate", dept.status === "inactive" && "opacity-50")}>{dept.name}</span>
                                  <span className="text-[10px] text-gray-400 shrink-0">{deptUnits.length} unit{deptUnits.length !== 1 ? "s" : ""}</span>
                                </button>
                                <div className="flex gap-1.5 shrink-0">
                                  <Switch checked={dept.status === "active"} onCheckedChange={() => toggleDeptStatus(dept)} className="cursor-pointer scale-75" />
                                  <button onClick={() => setMoveDept(dept)} className="text-[10px] font-medium text-gray-400 hover:text-[var(--brand)] px-2 py-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer">Move</button>
                                  <button onClick={() => openEditDept(dept)} className="w-6 h-6 rounded-md bg-gray-100 hover:bg-blue-100 hover:text-[var(--brand)] flex items-center justify-center transition-colors cursor-pointer"><Pencil size={11} /></button>
                                </div>
                              </div>
                              <AnimatePresence>
                                {deptOpen && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="border-t border-gray-50 px-3 py-2.5 space-y-2 bg-gray-50/70">
                                      {deptUnits.map((unit) => {
                                        const unitPositions = positionsForUnit(unit._id);
                                        return (
                                          <div key={unit._id} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <Layers size={11} className="text-gray-300 shrink-0" />
                                                <span className={cn("text-xs font-medium text-gray-700 truncate", unit.status === "inactive" && "opacity-50")}>{unit.name}</span>
                                              </div>
                                              <div className="flex gap-1 shrink-0">
                                                <Switch checked={unit.status === "active"} onCheckedChange={() => toggleUnitStatus(unit)} className="cursor-pointer scale-75" />
                                                <button onClick={() => openEditUnit(unit)} className="w-5 h-5 rounded-md bg-gray-100 hover:bg-blue-100 hover:text-[var(--brand)] flex items-center justify-center transition-colors cursor-pointer"><Pencil size={10} /></button>
                                              </div>
                                            </div>
                                            {unitPositions.length > 0 && (
                                              <div className="mt-1.5 space-y-1 pl-4">
                                                {unitPositions.map((p) => (
                                                  <div key={p._id} className="flex items-center justify-between">
                                                    <span className={cn("text-[11px] text-gray-500 flex items-center gap-1", p.status === "inactive" && "opacity-50 line-through")}><Briefcase size={9} className="text-gray-300" />{p.title}</span>
                                                    <button onClick={() => openEditPosition(p)} className="text-[10px] text-gray-400 hover:text-[var(--brand)] cursor-pointer">edit</button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                            <button onClick={() => openAddPosition({ unitId: unit._id })} className="mt-1.5 text-[10px] font-medium text-[var(--brand)] hover:bg-blue-50 rounded-md px-2 py-1 transition-colors cursor-pointer flex items-center gap-1">
                                              <Plus size={9} /> Position
                                            </button>
                                          </div>
                                        );
                                      })}
                                      {deptDirectPositions.length > 0 && (
                                        <div className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                                          <p className="text-[10px] text-gray-400 mb-1">Positions directly under department</p>
                                          {deptDirectPositions.map((p) => (
                                            <div key={p._id} className="flex items-center justify-between">
                                              <span className={cn("text-[11px] text-gray-500 flex items-center gap-1", p.status === "inactive" && "opacity-50 line-through")}><Briefcase size={9} className="text-gray-300" />{p.title}</span>
                                              <button onClick={() => openEditPosition(p)} className="text-[10px] text-gray-400 hover:text-[var(--brand)] cursor-pointer">edit</button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <div className="flex gap-2">
                                        <button onClick={() => openAddUnit(dept._id)} className="flex-1 text-[11px] font-medium text-[var(--brand)] hover:bg-blue-50 rounded-lg py-1.5 transition-colors cursor-pointer flex items-center justify-center gap-1">
                                          <Plus size={11} /> Add Unit
                                        </button>
                                        <button onClick={() => openAddPosition({ departmentId: dept._id })} className="flex-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 rounded-lg py-1.5 transition-colors cursor-pointer flex items-center justify-center gap-1">
                                          <Plus size={11} /> Direct Position
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                        <button onClick={() => openAddDept(d._id)} className="w-full text-xs font-medium text-[var(--brand)] hover:bg-blue-50 rounded-xl py-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                          <Plus size={12} /> Add Department
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Directorate */}
      <Dialog open={addDirectorateOpen} onOpenChange={(o) => { if (!o) { setAddDirectorateOpen(false); setEditDirectorate(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editDirectorate ? "Edit Directorate" : "Add Directorate"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1.5 block">Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Risk & Compliance" /></div>
            <div><Label className="text-xs font-semibold mb-1.5 block">Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. RC" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => { setAddDirectorateOpen(false); setEditDirectorate(null); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={saveDirectorate} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Department */}
      <Dialog open={!!addDeptFor} onOpenChange={(o) => { if (!o) { setAddDeptFor(null); setEditDept(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editDept ? "Edit Department" : "Add Department"}</DialogTitle></DialogHeader>
          <div><Label className="text-xs font-semibold mb-1.5 block">Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Treasury" /></div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => { setAddDeptFor(null); setEditDept(null); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={saveDept} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Unit */}
      <Dialog open={!!addUnitFor} onOpenChange={(o) => { if (!o) { setAddUnitFor(null); setEditUnit(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editUnit ? "Edit Unit" : "Add Unit"}</DialogTitle></DialogHeader>
          <div><Label className="text-xs font-semibold mb-1.5 block">Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Payroll" /></div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => { setAddUnitFor(null); setEditUnit(null); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={saveUnit} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Position */}
      <Dialog open={!!addPositionFor} onOpenChange={(o) => { if (!o) { setAddPositionFor(null); setEditPosition(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editPosition ? "Edit Position" : "Add Position"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1.5 block">Job Title *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior Quantity Surveyor" /></div>
            <p className="text-[11px] text-gray-400">Job title is distinct from system role — assign the system role separately when placing a user in this position.</p>
            {editPosition && (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-600">Active</span>
                <Switch checked={editPosition.status === "active"} onCheckedChange={() => togglePositionStatus(editPosition)} className="cursor-pointer" />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => { setAddPositionFor(null); setEditPosition(null); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
            <Button onClick={savePosition} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{saving ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Department — impact preview */}
      <Dialog open={!!moveDept} onOpenChange={(o) => { if (!o) setMoveDept(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Move Department</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Moving <strong>{moveDept?.name}</strong> to:
            </p>
            {impact === undefined ? <Skeleton className="h-16 w-full" /> : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700">
                  <p className="font-semibold mb-1">Potential Impact</p>
                  <p>{impact.usersAffected} users · {impact.unitsAffected} units · {impact.positionsAffected} positions</p>
                </div>
              </div>
            )}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {(directorates ?? []).filter((d) => d._id !== moveDept?.directorateId).map((d) => (
                <button key={d._id} onClick={() => confirmMoveDept(d._id)} className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-[var(--brand)] transition-colors cursor-pointer">
                  {d.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-100 mt-2">
            <Button onClick={() => setMoveDept(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
