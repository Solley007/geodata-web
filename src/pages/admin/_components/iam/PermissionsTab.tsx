import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Lock, Sparkles, Info, Video, Building } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

const ACTIONS = ["VIEW", "CREATE", "EDIT", "SUBMIT", "REVIEW", "APPROVE", "REJECT", "ASSIGN", "SIGN", "EXPORT", "DELETE", "ADMIN", "AUDIT", "COMMENT"];

export default function PermissionsTab() {
  const roles = useQuery(api.iam.roles.listRoles);
  const permissions = useQuery(api.iam.permissions.listPermissions, {});
  const liveInspectionPermissions = useQuery(api.iam.permissions.listPermissions, { module: "live_inspection" });
  const tourPermissions = useQuery(api.iam.permissions.listPermissions, { module: "property_tour" });
  const corporateMarketingPermissions = useQuery(api.iam.permissions.listPermissions, { module: "corporate_marketing" });
  const diasporaPermissions = useQuery(api.iam.permissions.listPermissions, { module: "diaspora" });
  const seedPermissions = useMutation(api.iam.permissions.seedInitialPermissions);
  const seedLiveInspectionPermissions = useMutation(api.liveInspections.seedLiveInspectionPermissions);
  const seedTourPermissions = useMutation(api.propertyTours.seedTourPermissions);
  const seedCorporateMarketingPermissions = useMutation(api.corporateMarketing.feature.seedPermissions);
  const seedDiasporaPermissions = useMutation(api.diaspora.feature.seedPermissions);
  const grant = useMutation(api.iam.permissions.grantPermissionToRole);
  const revoke = useMutation(api.iam.permissions.revokePermissionFromRole);

  const [seeding, setSeeding] = useState(false);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("");
  const rolePermissions = useQuery(
    api.iam.permissions.listRolePermissions,
    selectedRoleKey ? { roleKey: selectedRoleKey } : "skip"
  );
  const grantedKeys = useMemo(() => new Set((rolePermissions ?? []).map((rp) => rp.permissionKey)), [rolePermissions]);

  const modules = useMemo(() => {
    const set = new Set((permissions ?? []).map((p) => p.module));
    return Array.from(set).sort();
  }, [permissions]);

  const activeRoles = (roles ?? []).filter((r) => r.status === "active");

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const [res, liveRes, tourRes, corpRes, diasporaRes] = await Promise.all([
        seedPermissions({}), seedLiveInspectionPermissions({}), seedTourPermissions({}), seedCorporateMarketingPermissions({}), seedDiasporaPermissions({}),
      ]);
      const total = res.inserted + liveRes.inserted + tourRes.inserted + corpRes.inserted + diasporaRes.inserted;
      toast.success(total > 0 ? `Seeded ${total} permissions` : "Permissions already seeded");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to seed permissions"); }
    finally { setSeeding(false); }
  };

  const toggle = async (permissionKey: string, granted: boolean) => {
    if (!selectedRoleKey) return;
    try {
      if (granted) await revoke({ roleKey: selectedRoleKey, permissionKey });
      else await grant({ roleKey: selectedRoleKey, permissionKey });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to update permission"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Permission Matrix</h2>
          <p className="text-xs text-gray-500 mt-0.5">Granular, module-aware permissions granted per role. Explicit restrictions always override inherited grants.</p>
        </div>
        {((permissions && permissions.length === 0) || (liveInspectionPermissions && liveInspectionPermissions.length === 0) || (tourPermissions && tourPermissions.length === 0) || (corporateMarketingPermissions && corporateMarketingPermissions.length === 0) || (diasporaPermissions && diasporaPermissions.length === 0)) && (
          <Button onClick={handleSeed} disabled={seeding} className="bg-amber-500 hover:bg-amber-600 text-white gap-2 cursor-pointer shrink-0">
            <Sparkles size={14} /> {seeding ? "Seeding…" : "Seed Permission Catalogue"}
          </Button>
        )}
      </div>

      {permissions === undefined || roles === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : permissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
          Seed the permission catalogue to begin configuring role access.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">Configuring role:</span>
            <Select value={selectedRoleKey} onValueChange={setSelectedRoleKey}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Select a role…" /></SelectTrigger>
              <SelectContent>
                {activeRoles.map((r) => <SelectItem key={r.key} value={r.key}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {!selectedRoleKey ? (
            <div className="bg-gray-50 rounded-2xl p-10 text-center text-sm text-gray-400">Select a role above to view and edit its permissions.</div>
          ) : rolePermissions === undefined ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50">Module</th>
                      {ACTIONS.map((a) => (
                        <th key={a} className="px-2 py-2.5 font-semibold text-gray-400 text-center whitespace-nowrap">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {modules.map((module) => (
                      <tr key={module} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-medium text-gray-700 capitalize sticky left-0 bg-white">{module}</td>
                        {ACTIONS.map((action) => {
                          const perm = (permissions ?? []).find((p) => p.module === module && p.action === action);
                          if (!perm) return <td key={action} className="px-2 py-2 text-center text-gray-200">—</td>;
                          const granted = grantedKeys.has(perm.key);
                          return (
                            <td key={action} className="px-2 py-2 text-center">
                              <button
                                onClick={() => toggle(perm.key, granted)}
                                title={perm.label}
                                className={cn(
                                  "w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-colors cursor-pointer",
                                  granted
                                    ? perm.sensitive ? "bg-amber-500 text-white" : "bg-[var(--brand)] text-white"
                                    : "bg-gray-100 text-transparent hover:bg-gray-200"
                                )}
                              >
                                {perm.sensitive && granted ? <Lock size={10} /> : granted ? "✓" : ""}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">
        <Info size={13} className="shrink-0 mt-0.5" />
        <span>
          <Badge className="text-[9px] bg-amber-500 text-white border-0 mr-1"><Lock size={9} className="mr-0.5" />amber</Badge>
          marks sensitive permissions (Approve, Sign, Admin, Delete) — these never grant automatically through role inheritance and should be reviewed carefully before granting.
        </span>
      </div>

      {/* ── Live Virtual Inspection permissions — separate action vocabulary,
          rendered as its own list rather than forced into the generic
          module x ACTIONS grid above. ── */}
      {liveInspectionPermissions !== undefined && liveInspectionPermissions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Video size={15} className="text-[var(--brand)]" />
            <h3 className="font-bold text-gray-900 text-sm">Live Virtual Inspection Permissions</h3>
          </div>
          <p className="text-xs text-gray-500">
            Never granted automatically. Grant only to roles that should create, schedule, join, or manage live inspections
            {selectedRoleKey ? "" : " — select a role above first"}.
          </p>
          {!selectedRoleKey ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center text-xs text-gray-400">Select a role above to configure its Live Inspection permissions.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {liveInspectionPermissions.map((perm) => {
                const granted = grantedKeys.has(perm.key);
                return (
                  <button
                    key={perm.key}
                    onClick={() => toggle(perm.key, granted)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors cursor-pointer",
                      granted
                        ? perm.sensitive ? "border-amber-200 bg-amber-50 text-amber-800" : "border-[var(--brand)]/30 bg-[var(--brand)]/5 text-[var(--brand)]"
                        : "border-gray-100 text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <span>{perm.label}</span>
                    {granted ? (perm.sensitive ? <Lock size={12} /> : <span>✓</span>) : <span className="text-gray-300">Off</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Corporate Marketing & Bulk Sales permissions — same standalone
          pattern as Live Inspection above. Strategic/external partners
          never receive these automatically. ── */}
      {corporateMarketingPermissions !== undefined && corporateMarketingPermissions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building size={15} className="text-[var(--brand)]" />
            <h3 className="font-bold text-gray-900 text-sm">Corporate Marketing &amp; Bulk Sales Permissions</h3>
          </div>
          <p className="text-xs text-gray-500">
            Never granted automatically. Grant only to roles that should manage corporate organisations, opportunities, letters, EOIs, proposals, negotiation, or closing
            {selectedRoleKey ? "" : " — select a role above first"}.
          </p>
          {!selectedRoleKey ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center text-xs text-gray-400">Select a role above to configure its Corporate Marketing permissions.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {corporateMarketingPermissions.map((perm) => {
                const granted = grantedKeys.has(perm.key);
                return (
                  <button
                    key={perm.key}
                    onClick={() => toggle(perm.key, granted)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors cursor-pointer",
                      granted
                        ? perm.sensitive ? "border-amber-200 bg-amber-50 text-amber-800" : "border-[var(--brand)]/30 bg-[var(--brand)]/5 text-[var(--brand)]"
                        : "border-gray-100 text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <span>{perm.label}</span>
                    {granted ? (perm.sensitive ? <Lock size={12} /> : <span>✓</span>) : <span className="text-gray-300">Off</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
