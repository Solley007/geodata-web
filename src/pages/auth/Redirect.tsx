import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";

const ADMIN_ROLES = new Set(["super_admin", "admin", "manager", "agent"]);

// Dashboard profiles that get their own restricted view inside /admin (via
// the dynamic dashboard engine — see convex/iam/dashboard.ts) even though
// their coarse users.role is "client" for backward compatibility. Without
// this check these accounts would otherwise fall through to /client.
const DASHBOARD_PROFILE_ADMIN_KEYS = new Set([
  "shareholder", "board", "auditor", "external_restricted",
]);

export default function AuthRedirect() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  // Only run the queries once Convex confirms the session is authenticated
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  // Approved partners (external or staff-enrolled) go to the Partner Portal
  // instead of the client/buyer dashboard, even though their account role
  // defaults to "client".
  const partnerProfile = useQuery(
    api.partners.getMyPartnerProfile,
    isAuthenticated ? {} : "skip",
  );
  // Accounts with an explicit Officer/Staff IAM role land in the lighter,
  // self-scoped Staff Portal instead of the full /admin ERP. Managers keep
  // going to /admin (they may still need full module access), and everyone
  // without this explicit role assignment is unaffected.
  const staffPortalProfile = useQuery(
    api.iam.staffPortal.getMyStaffPortalProfile,
    isAuthenticated ? {} : "skip",
  );
  // Accounts with an explicit IAM role that maps to a restricted dashboard
  // profile (Shareholder, Board, Auditor, External/Restricted) also need to
  // land in /admin so the dynamic dashboard engine can render their scoped
  // view, even though their coarse role is "client".
  const dashboardProfile = useQuery(
    api.iam.dashboard.getMyDashboardProfile,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    // Still waiting for auth to settle
    if (isAuthLoading) return;

    // Auth confirmed but user/partner records not yet fetched
    if (isAuthenticated && (currentUser === undefined || partnerProfile === undefined || staffPortalProfile === undefined || dashboardProfile === undefined)) return;

    // If not authenticated at all, send home
    if (!isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }

    const role = currentUser?.role;

    if (staffPortalProfile?.autoRedirect) {
      navigate("/staff", { replace: true });
    } else if (role && ADMIN_ROLES.has(role)) {
      navigate("/admin", { replace: true });
    } else if (dashboardProfile && DASHBOARD_PROFILE_ADMIN_KEYS.has(dashboardProfile.profileKey)) {
      // Restricted-view IAM profiles get their own dashboard inside /admin
      navigate("/admin", { replace: true });
    } else if (partnerProfile && (partnerProfile as { status?: string }).status === "approved") {
      // Approved partners land in the Partner Portal
      navigate("/partner", { replace: true });
    } else {
      // Everyone else (regular clients/buyers) go to their portal
      navigate("/client", { replace: true });
    }
  }, [isAuthLoading, isAuthenticated, currentUser, partnerProfile, staffPortalProfile, dashboardProfile, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-svh gap-4">
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">Redirecting you...</p>
    </div>
  );
}
