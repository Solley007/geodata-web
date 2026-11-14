import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  LayoutDashboard, Menu, X, LogOut, Home, CheckSquare, Contact,
  MessageSquare, Building2, ArrowLeftRight, CalendarCheck, ShieldAlert, Trophy, UserRound, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import NotificationBell from "@/components/notifications/NotificationBell.tsx";

// ── Nav ────────────────────────────────────────────────────────────────────
// Deliberately a small, fixed set — this portal is scoped to "my work"
// only, unlike the full modular /admin sidebar. New "My ..." sections land
// here as their own milestones (tasks, clients, properties/sales,
// attendance/leave, performance) — this shell just needs to host them.
type NavItem = { label: string; href: string; icon: React.ElementType; exact?: boolean };

const STAFF_NAV: NavItem[] = [
  { label: "Overview", href: "/staff", icon: LayoutDashboard, exact: true },
  { label: "My Profile", href: "/staff/profile", icon: UserRound },
  { label: "Employment Letter", href: "/staff/employment-letter", icon: FileText },
  { label: "My Tasks", href: "/staff/tasks", icon: CheckSquare },
  { label: "My Clients", href: "/staff/clients", icon: Contact },
  { label: "My Inquiries", href: "/staff/inquiries", icon: MessageSquare },
  { label: "My Properties", href: "/staff/properties", icon: Building2 },
  { label: "My Sales", href: "/staff/sales", icon: ArrowLeftRight },
  { label: "Attendance & Leave", href: "/staff/attendance", icon: CalendarCheck },
  { label: "Performance", href: "/staff/performance", icon: Trophy },
];

// ── Sidebar (desktop) ──────────────────────────────────────────────────────

function StaffSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 z-40 bg-[var(--brand)] flex flex-col transition-transform duration-300",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="https://hercules-cdn.com/file_hqjYSAKlVBBRqljHrAkEnfVn" alt="Logo"
              className="w-8 h-8 rounded-md object-contain bg-white p-0.5" />
            <div>
              <div className="text-white font-bold text-xs leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}>GEODATA WORLD</div>
              <div className="text-blue-200 text-[10px]">Staff Portal</div>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5 scrollbar-thin">
          {STAFF_NAV.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.exact}
              onClick={onClose}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150",
                isActive
                  ? "bg-white text-[var(--brand)] font-semibold shadow-sm"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon size={16} className="shrink-0" />
              <span className="text-[13px]">{item.label}</span>
            </NavLink>
          ))}
        </nav>

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

// ── Bottom nav (mobile) ────────────────────────────────────────────────────

function StaffBottomNav() {
  const mobileItems = STAFF_NAV.slice(0, 5);
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex lg:hidden">
      {mobileItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.exact}
          className={({ isActive }) => cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
            isActive ? "text-[var(--brand)]" : "text-gray-400"
          )}
        >
          <item.icon size={17} />
          <span className="truncate px-0.5">{item.label.replace("My ", "")}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// ── Top bar with profile header ────────────────────────────────────────────

function StaffTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, signout } = useAuth();
  const profile = useQuery(api.iam.staffPortal.getMyStaffPortalProfile, {});

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-800 cursor-pointer shrink-0">
          <Menu size={20} />
        </button>
        {profile === undefined ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">
              {profile?.jobTitle ?? profile?.roleName ?? "Staff Member"}
            </div>
            <div className="text-[11px] text-gray-400 truncate">
              {[profile?.departmentName, profile?.unitName].filter(Boolean).join(" · ") || "No department assigned"}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <NotificationBell />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center text-white text-xs font-bold">
            {(profile?.name ?? user?.profile.name ?? "S").charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-gray-800">{profile?.name ?? user?.profile.name ?? "Staff"}</div>
            <div className="text-[10px] text-gray-400">{profile?.roleName ?? "Staff"}</div>
          </div>
        </div>
        <button onClick={() => signout()} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

// ── Guard ──────────────────────────────────────────────────────────────────
// Access to /staff requires an explicit Officer/Staff (or Manager) IAM role
// assignment — resolved server-side by getMyStaffPortalProfile so this can
// never be spoofed from the client. Everyone else is redirected to the
// website home, matching the "coming soon"-style guard pattern used
// elsewhere for pages a role shouldn't reach.
function StaffGuard({ children }: { children: React.ReactNode }) {
  const profile = useQuery(api.iam.staffPortal.getMyStaffPortalProfile, {});

  if (profile === undefined) return <Skeleton className="h-screen w-full" />;

  if (profile === null || !profile.allowed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-xl border border-gray-100">
          <ShieldAlert size={40} className="mx-auto mb-4 text-amber-500" />
          <h1 className="text-lg font-bold text-gray-900 mb-1.5" style={{ fontFamily: "'Playfair Display', serif" }}>
            Staff Access Only
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            The Staff Portal is only available to accounts with an assigned Officer, Staff, or Manager role. Contact your administrator if you believe this is a mistake.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)] hover:underline">
            <Home size={15} /> Back to Website
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ── Layout ─────────────────────────────────────────────────────────────────

export default function StaffLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

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
              style={{ fontFamily: "'Playfair Display', serif" }}>Staff Portal</h1>
            <p className="text-sm text-gray-500 mb-6">Sign in with your Geodata staff account</p>
            <SignInButton className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white rounded-xl h-11 font-semibold" />
            <button onClick={() => navigate("/")} className="mt-4 text-xs text-gray-400 hover:text-gray-600 cursor-pointer">
              Back to Website
            </button>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <StaffGuard>
          <div className="flex h-screen bg-gray-50 overflow-hidden">
            <StaffSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex flex-col flex-1 lg:ml-64 min-w-0 overflow-hidden">
              <StaffTopBar onMenuClick={() => setSidebarOpen(true)} />
              <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
                <Outlet />
              </main>
              <StaffBottomNav />
            </div>
          </div>
        </StaffGuard>
      </Authenticated>
    </>
  );
}
