import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  LayoutDashboard, Building2, MapPin, Users, MessageSquare,
  Settings, ChevronRight, Menu, X, Bell, LogOut,
  BarChart3, FileText, Shield, Home, TrendingUp, HardHat, UserCog,
  Mail, Contact, LandPlot, Image as ImageIcon, Handshake, Radio,
  ArrowLeftRight, ShieldCheck, Landmark, CreditCard, Receipt,
  FolderOpen, CheckSquare, ChevronDown, LayoutGrid, UserCircle2, Briefcase, DatabaseBackup, Video, Building, Globe2, Trophy,
  UserRound, UsersRound, SearchCheck,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useEffect } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import NotificationBell from "@/components/notifications/NotificationBell.tsx";

// Restricted-view IAM dashboard profiles (Shareholder, Board, Auditor,
// External/Restricted) render their own scoped dashboard inside /admin via
// the dynamic dashboard engine (ProfileDashboard), even though their coarse
// users.role stays "client" for backward compatibility. Used by both the
// admin guard and the topbar (which must skip admin-only stats for them).
const RESTRICTED_DASHBOARD_PROFILE_KEYS = new Set(["shareholder", "board", "auditor", "external_restricted"]);

// ── Sidebar module access, scoped by the currently assigned IAM system role ─
// The nav groups below are the same for everyone (one component, no per-role
// duplication) — only the *visible items* differ, giving each of the 12
// configurable roles a genuinely different module surface after Add/Edit
// User assigns them. Accounts with no explicit IAM assignment yet keep
// seeing every module (their previous, unchanged behaviour).
const ROLE_MODULE_ACCESS: Record<string, "all" | string[]> = {
  super_administrator: "all",
  system_administrator: "all",
  md_ceo: "all",
  shareholder: ["analytics"],
  board_member: ["tasks", "kyc", "finance", "audit", "analytics"],
  board_committee_member: ["tasks", "kyc", "finance", "audit", "analytics"],
  director: [
    "properties", "estates", "clients", "inquiries", "allocations", "sales",
    "transactions", "kyc", "finance", "payments", "documents", "tasks",
    "construction", "partners", "analytics", "communications", "content", "staff", "teams", "live_inspection", "corporate_marketing", "diaspora", "corporate_directory",
  ],
  manager: [
    "properties", "estates", "clients", "inquiries", "allocations", "sales",
    "transactions", "kyc", "finance", "payments", "documents", "tasks",
    "construction", "communications", "content", "live_inspection", "corporate_marketing", "diaspora", "corporate_directory", "teams",
  ],
  officer: [
    "properties", "clients", "inquiries", "allocations", "sales",
    "transactions", "kyc", "finance", "payments", "documents", "tasks", "communications", "live_inspection", "teams",
  ],
  staff: ["properties", "clients", "inquiries", "tasks", "documents", "communications", "live_inspection", "teams"],
  auditor: ["kyc", "finance", "audit", "tasks", "analytics", "live_inspection"],
  external_restricted: ["tasks"],
};

// ── Nav structure ──────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: string;
  superAdminOnly?: boolean;
  moduleKey?: string; // gates visibility for accounts with an explicit IAM role assignment
  featureKey?: "live_inspection" | "corporate_marketing"; // additionally gated by a feature toggle, hidden entirely while off
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    heading: "Portfolio",
    items: [
      { label: "Properties", href: "/admin/properties", icon: Building2, moduleKey: "properties" },
      { label: "Estates", href: "/admin/estates", icon: MapPin, moduleKey: "estates" },
      { label: "Gallery", href: "/admin/gallery", icon: ImageIcon, moduleKey: "properties" },
    ],
  },
  {
    heading: "Sales & CRM",
    items: [
      { label: "Clients & CRM", href: "/admin/clients", icon: Contact, moduleKey: "clients" },
      { label: "Inquiries", href: "/admin/inquiries", icon: MessageSquare, moduleKey: "inquiries" },
      { label: "Plot Allocation", href: "/admin/allocations", icon: LandPlot, moduleKey: "allocations" },
      { label: "Sales & Pipeline", href: "/admin/sales", icon: TrendingUp, moduleKey: "sales" },
      { label: "Corporate Marketing", href: "/admin/corporate", icon: Building, moduleKey: "corporate_marketing", featureKey: "corporate_marketing" },
      { label: "Diaspora Platform", href: "/admin/diaspora", icon: Globe2, moduleKey: "diaspora" },
      { label: "Geodata World Corporate Directory", href: "/admin/corporate-directory", icon: LayoutGrid, moduleKey: "corporate_directory" },
      { label: "Track Record", href: "/admin/track-record", icon: Trophy, moduleKey: "corporate_directory" },
      { label: "Development Status", href: "/admin/development-status", icon: HardHat, moduleKey: "corporate_directory" },
    ],
  },
  {
    heading: "Buyer Journey",
    items: [
      { label: "Transactions", href: "/admin/transactions", icon: ArrowLeftRight, moduleKey: "transactions" },
      { label: "KYC & Compliance", href: "/admin/kyc", icon: ShieldCheck, moduleKey: "kyc" },
      { label: "Finance & Mortgage", href: "/admin/finance", icon: Landmark, moduleKey: "finance" },
      { label: "Payment Gateway", href: "/admin/payment-gateway", icon: CreditCard, moduleKey: "payments" },
      { label: "Payments & Receipts", href: "/admin/payments", icon: Receipt, moduleKey: "payments" },
      { label: "Documents & Vault", href: "/admin/documents", icon: FolderOpen, moduleKey: "documents" },
      { label: "Live Virtual Inspection", href: "/admin/live-inspections", icon: Video, moduleKey: "live_inspection", featureKey: "live_inspection" },
    ],
  },
  {
    heading: "Operations",
    items: [
      { label: "Tasks & Approvals", href: "/admin/tasks", icon: CheckSquare, moduleKey: "tasks" },
      { label: "Audit Log", href: "/admin/audit", icon: Shield, moduleKey: "audit" },
      { label: "Backup & Recovery", href: "/admin/backup", icon: DatabaseBackup, superAdminOnly: true, moduleKey: "backup" },
      { label: "Construction", href: "/admin/construction", icon: HardHat, moduleKey: "construction" },
    ],
  },
  {
    heading: "Growth",
    items: [
      { label: "Partner Program", href: "/admin/partners", icon: Handshake, badge: "partners", moduleKey: "partners" },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3, moduleKey: "analytics" },
    ],
  },
  {
    heading: "Comms & Content",
    items: [
      { label: "Teams", href: "/admin/teams", icon: UsersRound, moduleKey: "teams" },
      { label: "Email Reminders", href: "/admin/reminders", icon: Mail, moduleKey: "communications" },
      { label: "Communications", href: "/admin/communications", icon: Radio, moduleKey: "communications" },
      { label: "News & Content", href: "/admin/content", icon: FileText, moduleKey: "content" },
      { label: "SEO", href: "/admin/seo", icon: SearchCheck, moduleKey: "content" },
      { label: "Public Documents", href: "/admin/public-documents", icon: FolderOpen, moduleKey: "content" },
    ],
  },
  {
    heading: "Administration",
    items: [
      { label: "Staff Management", href: "/admin/staff", icon: UserCog, moduleKey: "staff" },
      { label: "Users & Roles", href: "/admin/users", icon: Users, moduleKey: "users" },
      { label: "Settings", href: "/admin/settings", icon: Settings, moduleKey: "settings" },
    ],
  },
];

// ── Sidebar ────────────────────────────────────────────────────────────────────

function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pendingPartners = useQuery(api.partners.countPendingApplications, {});
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const isSuperAdmin = currentUser?.role === "super_admin";
  // The caller's explicit IAM role (if any) scopes which modules render.
  // While loading (`undefined`) role-gated items are hidden, not shown, so
  // restricted accounts never see a flash of the full unrestricted menu.
  // `null` (no explicit assignment yet) still shows every module, matching
  // prior/legacy behaviour for accounts outside the IAM role system.
  const myRoleKey = useQuery(api.iam.dashboard.getMyRoleKey, {});
  const moduleAccess = myRoleKey ? ROLE_MODULE_ACCESS[myRoleKey] : undefined;
  const canSeeModule = (moduleKey?: string) => {
    if (!moduleKey) return true; // items with no moduleKey (e.g. Dashboard) always show
    // Still loading — hide role-gated items rather than showing the full,
    // unrestricted menu. Without this, restricted accounts (External/
    // Restricted, Auditor, etc.) briefly saw every admin module until this
    // query resolved a moment after the page-level guard already let them
    // through, which looked like the wrong ("admin") dashboard flashing.
    if (myRoleKey === undefined) return false;
    if (!moduleAccess) return true; // no explicit IAM role assignment → unchanged legacy behaviour
    return moduleAccess === "all" || moduleAccess.includes(moduleKey);
  };
  // Live Virtual Inspection nav is hidden entirely while the feature toggle
  // is off, regardless of role/permission — feature state always wins.
  const liveInspectionStatus = useQuery(api.liveInspections.getFeatureStatus, {});
  const corporateMarketingStatus = useQuery(api.corporateMarketing.feature.getFeatureStatus, {});
  const canSeeFeature = (featureKey?: "live_inspection" | "corporate_marketing") => {
    if (!featureKey) return true;
    if (featureKey === "corporate_marketing") return corporateMarketingStatus?.enabled === true;
    return liveInspectionStatus?.enabled === true;
  };
  // Track which groups are collapsed (default all expanded)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (heading: string) =>
    setCollapsed((c) => ({ ...c, [heading]: !c[heading] }));

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 z-40 bg-[var(--brand)] flex flex-col transition-transform duration-300",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="https://hercules-cdn.com/file_hqjYSAKlVBBRqljHrAkEnfVn" alt="Logo"
              className="w-8 h-8 rounded-md object-contain bg-white p-0.5" />
            <div>
              <div className="text-white font-bold text-xs leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}>GEODATA WORLD</div>
              <div className="text-blue-200 text-[10px]">ERP Admin</div>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1 scrollbar-thin">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => (!item.superAdminOnly || isSuperAdmin) && canSeeModule(item.moduleKey) && canSeeFeature(item.featureKey));
            if (visibleItems.length === 0) return null;
            const isCollapsed = collapsed[group.heading] ?? false;
            return (
              <div key={group.heading}>
                {/* Group heading — clickable to collapse */}
                <button
                  onClick={() => toggleGroup(group.heading)}
                  className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 cursor-pointer group"
                >
                  <span className="text-[9px] font-bold text-blue-300/70 uppercase tracking-widest">
                    {group.heading}
                  </span>
                  <ChevronDown
                    size={11}
                    className={cn(
                      "text-blue-300/50 transition-transform",
                      isCollapsed ? "-rotate-90" : ""
                    )}
                  />
                </button>

                {!isCollapsed && (
                  <div className="space-y-0.5 mb-1">
                    {visibleItems.map((item) => {
                      const badgeCount = item.badge === "partners" ? (pendingPartners ?? 0) : 0;
                      return (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          end={item.exact}
                          onClick={onClose}
                          className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 group/nav",
                            isActive
                              ? "bg-white text-[var(--brand)] font-semibold shadow-sm"
                              : "text-blue-100 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <item.icon size={15} className="shrink-0" />
                          <span className="flex-1 text-[13px]">{item.label}</span>
                          {badgeCount > 0 && (
                            <span className="w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shrink-0">
                              {badgeCount}
                            </span>
                          )}
                          <ChevronRight size={11} className="opacity-0 group-hover/nav:opacity-50 transition-opacity" />
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Back to website */}
        <div className="px-3 py-3 border-t border-white/10 shrink-0">
          <Link to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-blue-200 hover:bg-white/10 hover:text-white transition-colors">
            <Home size={15} />
            <span>Back to Website</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

// ── Top bar ────────────────────────────────────────────────────────────────────

function AdminTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, signout } = useAuth();
  const navigate = useNavigate();
  const currentUser = useQuery(api.users.getCurrentUser);
  // getERPStats requires the coarse admin/manager/agent role and throws for
  // restricted-view IAM profiles (Shareholder, Board, Auditor, External/
  // Restricted). Skip it both while dashboardProfile is still loading
  // (undefined) and once it resolves to a restricted profile — querying
  // eagerly during the loading instant caused a FORBIDDEN throw that
  // crashed the whole page to a blank screen for those accounts.
  const dashboardProfile = useQuery(api.iam.dashboard.getMyDashboardProfile, {});
  const hasRestrictedProfile = !!dashboardProfile && RESTRICTED_DASHBOARD_PROFILE_KEYS.has(dashboardProfile.profileKey);
  const stats = useQuery(api.admin.getERPStats, dashboardProfile === undefined || hasRestrictedProfile ? "skip" : {});

  const alertCount =
    (stats?.pendingKyc ?? 0) +
    (stats?.pendingApprovals ?? 0) +
    (stats?.overdueTasks ?? 0);

  const isSuperAdmin = currentUser?.role === "super_admin";

  const dashboards = [
    { label: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Staff Portal", href: "/staff", icon: UserCog },
    { label: "Buyer / Client Portal", href: "/client", icon: UserCircle2 },
    { label: "Partner Portal", href: "/partner", icon: Briefcase },
  ];

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-800 cursor-pointer">
          <Menu size={20} />
        </button>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
          <Shield size={12} className="text-[var(--brand)]" />
          <span className="text-[var(--brand)] font-medium">Admin Panel</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Dashboard switcher — super admin only */}
        {isSuperAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[var(--brand)] border border-gray-200 hover:border-[var(--brand)]/40 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
                title="Switch dashboard"
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Switch Dashboard</span>
                <ChevronDown size={12} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-gray-400">
                View as
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {dashboards.map((d) => (
                <DropdownMenuItem key={d.href} onClick={() => navigate(d.href)} className="cursor-pointer gap-2">
                  <d.icon size={14} className="text-[var(--brand)]" />
                  <span>{d.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Task/approval alert bell — operational queue depth, not personal messages */}
        <Link to="/admin/tasks" className="relative text-gray-500 hover:text-gray-800 cursor-pointer" title="Pending tasks & approvals">
          <Bell size={18} />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-0.5">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </Link>

        {/* Personal notifications — KYC updates, new leads, support replies, etc. */}
        <NotificationBell />

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center text-white text-xs font-bold">
            {(currentUser?.name ?? user?.profile.name ?? "A").charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-gray-800">{currentUser?.name ?? user?.profile.name ?? "Admin"}</div>
            <div className="text-[10px] text-gray-400 capitalize">{currentUser?.role?.replace("_", " ") ?? "admin"}</div>
          </div>
        </div>

        <Link to="/profile" className="text-gray-400 hover:text-[var(--brand)] transition-colors cursor-pointer" title="My profile">
          <UserRound size={16} />
        </Link>
        <button onClick={() => signout()} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

// ── Guard ──────────────────────────────────────────────────────────────────────
// Restricted-view IAM profiles (Shareholder, Board, Auditor, External/
// Restricted) get their own scoped dashboard inside /admin via the dynamic
// dashboard engine (ProfileDashboard), even though their coarse users.role
// stays "client" for backward compatibility. Without this check, isAdmin
// alone would bounce them straight back out to "/".

function AdminGuard({ children }: { children: React.ReactNode }) {
  const isAdmin = useQuery(api.users.isAdmin);
  const dashboardProfile = useQuery(api.iam.dashboard.getMyDashboardProfile, {});
  const navigate = useNavigate();

  const hasRestrictedProfile = !!dashboardProfile && RESTRICTED_DASHBOARD_PROFILE_KEYS.has(dashboardProfile.profileKey);
  const allowed = isAdmin || hasRestrictedProfile;

  useEffect(() => {
    if (isAdmin === false && dashboardProfile === null) navigate("/");
  }, [isAdmin, dashboardProfile, navigate]);

  if (isAdmin === undefined || dashboardProfile === undefined) return <Skeleton className="h-screen w-full" />;
  if (!allowed) return null;
  return <>{children}</>;
}

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <AuthLoading>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Skeleton className="h-16 w-64 rounded-xl" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="min-h-screen bg-[var(--brand)] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl">
            <img src="https://hercules-cdn.com/file_hqjYSAKlVBBRqljHrAkEnfVn" alt="Logo"
              className="w-16 h-16 mx-auto mb-4 rounded-xl object-contain" />
            <h1 className="text-2xl font-bold text-gray-900 mb-1"
              style={{ fontFamily: "'Playfair Display', serif" }}>Admin Login</h1>
            <p className="text-sm text-gray-500 mb-6">Sign in with your Geodata admin credentials</p>
            <SignInButton className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white rounded-xl h-11 font-semibold" />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <AdminGuard>
          <div className="flex h-screen bg-gray-50 overflow-hidden">
            <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex flex-col flex-1 lg:ml-64 min-w-0 overflow-hidden">
              <AdminTopBar onMenuClick={() => setSidebarOpen(true)} />
              <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                <Outlet />
              </main>
            </div>
          </div>
        </AdminGuard>
      </Authenticated>
    </>
  );
}
