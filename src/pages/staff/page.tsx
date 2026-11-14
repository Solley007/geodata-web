import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { format } from "date-fns";
import { Briefcase, Building2, Users2 } from "lucide-react";

// ── Staff Portal — Overview ─────────────────────────────────────────────────
// The profile header (name, job title, department/unit, manager) lives here
// as the landing page of the portal. "My Tasks", "My Clients", etc. are
// separate sections/milestones — this page stays a simple welcome + org
// placement summary.
export default function StaffOverview() {
  const profile = useQuery(api.iam.staffPortal.getMyStaffPortalProfile, {});

  if (profile === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
          Welcome, {profile?.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), "EEEE, d MMMM yyyy")} · Your personal workspace</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Your Placement</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Briefcase size={16} className="text-[var(--brand)]" />
            </div>
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Role</div>
              <div className="text-sm text-gray-800 font-medium">{profile?.roleName ?? "—"}</div>
              {profile?.jobTitle && <div className="text-xs text-gray-400 mt-0.5">{profile.jobTitle}</div>}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Department</div>
              <div className="text-sm text-gray-800 font-medium">{profile?.departmentName ?? "Not assigned"}</div>
              {profile?.unitName && <div className="text-xs text-gray-400 mt-0.5">{profile.unitName}</div>}
              {profile?.directorateName && <div className="text-xs text-gray-400 mt-0.5">{profile.directorateName}</div>}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Users2 size={16} className="text-amber-600" />
            </div>
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">Reports To</div>
              <div className="text-sm text-gray-800 font-medium">{profile?.managerName ?? "Not set"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--brand)]/5 border border-[var(--brand)]/15 rounded-2xl p-5">
        <p className="text-xs text-gray-500 leading-relaxed">
          This is your personal workspace — you'll only ever see your own assigned tasks, clients, properties, and sales here.
          More sections (My Tasks, My Clients, My Properties, My Sales, Attendance &amp; Leave) are rolling out next.
        </p>
      </div>
    </div>
  );
}
