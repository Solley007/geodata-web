import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Building2, MessageSquare, LogOut, ChevronRight, Home, Receipt,
  ShieldCheck, Landmark, CreditCard, FileText, ArrowLeftRight,
  CheckCircle2, Clock, AlertTriangle, XCircle, Circle, ArrowRight,
  Phone, Mail, MapPin, Star, Banknote, HelpCircle, Send, X,
  User, ChevronLeft, BarChart3, Menu, LayoutDashboard, Video, Calendar,
  BookOpen, Download,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { cn } from "@/lib/utils.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import LiveInspectionSessionRoom from "@/components/live-inspection/LiveInspectionSessionRoom.tsx";
import NotificationBell from "@/components/notifications/NotificationBell.tsx";

// ── Status helpers ─────────────────────────────────────────────────────────────

const KYC_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  not_started:       { label: "Not Started",        color: "text-gray-500",  bg: "bg-gray-100",   icon: Circle        },
  pending_customer:  { label: "Action Required",    color: "text-orange-600",bg: "bg-orange-50",  icon: AlertTriangle },
  submitted:         { label: "Submitted",          color: "text-blue-600",  bg: "bg-blue-50",    icon: Clock         },
  under_review:      { label: "Under Review",       color: "text-blue-700",  bg: "bg-blue-50",    icon: Clock         },
  more_info_required:{ label: "More Info Needed",   color: "text-orange-600",bg: "bg-orange-50",  icon: AlertTriangle },
  approved:          { label: "Verified",           color: "text-green-700", bg: "bg-green-50",   icon: CheckCircle2  },
  rejected:          { label: "Rejected",           color: "text-red-700",   bg: "bg-red-50",     icon: XCircle       },
};

const TXN_STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  enquiry:    { label: "Enquiry",      color: "text-gray-500",   dot: "bg-gray-400"   },
  reserved:   { label: "Reserved",     color: "text-blue-700",   dot: "bg-blue-500"   },
  under_offer:{ label: "Under Offer",  color: "text-indigo-700", dot: "bg-indigo-500" },
  exchange:   { label: "Exchange",     color: "text-purple-700", dot: "bg-purple-500" },
  completion: { label: "Completed",    color: "text-green-700",  dot: "bg-green-500"  },
  cancelled:  { label: "Cancelled",    color: "text-red-600",    dot: "bg-red-400"    },
  on_hold:    { label: "On Hold",      color: "text-orange-600", dot: "bg-orange-400" },
};

const PAY_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  initiated:   { label: "Initiated",   color: "text-gray-600",   bg: "bg-gray-100"   },
  pending:     { label: "Pending",     color: "text-blue-600",   bg: "bg-blue-100"   },
  processing:  { label: "Processing",  color: "text-orange-600", bg: "bg-orange-100" },
  successful:  { label: "Successful",  color: "text-green-700",  bg: "bg-green-100"  },
  failed:      { label: "Failed",      color: "text-red-700",    bg: "bg-red-100"    },
  reversed:    { label: "Reversed",    color: "text-purple-700", bg: "bg-purple-100" },
  abandoned:   { label: "Abandoned",   color: "text-gray-400",   bg: "bg-gray-100"   },
};

const FINANCE_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  not_started:              { label: "Not Started",    color: "text-gray-500",   bg: "bg-gray-100"   },
  draft:                    { label: "Draft",          color: "text-gray-600",   bg: "bg-gray-100"   },
  application_submitted:    { label: "Submitted",      color: "text-blue-700",   bg: "bg-blue-100"   },
  under_review:             { label: "Under Review",   color: "text-blue-700",   bg: "bg-blue-100"   },
  more_info_required:       { label: "More Info Needed",color:"text-orange-600", bg: "bg-orange-100" },
  conditional_approval:     { label: "Conditional",    color: "text-indigo-700", bg: "bg-indigo-100" },
  approved:                 { label: "Approved",       color: "text-green-700",  bg: "bg-green-100"  },
  rejected:                 { label: "Rejected",       color: "text-red-700",    bg: "bg-red-100"    },
};

function StatusPill({ status, cfg }: { status: string; cfg: Record<string, { label: string; color: string; bg: string }> }) {
  const c = cfg[status] ?? { label: status, color: "text-gray-500", bg: "bg-gray-100" };
  return (
    <span className={cn("inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full", c.bg, c.color)}>
      {c.label}
    </span>
  );
}

// ── Nav config ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: "dashboard",     label: "Overview",          icon: BarChart3       },
  { key: "requests",      label: "My Requests",       icon: Send            },
  { key: "transactions",  label: "My Transactions",   icon: ArrowLeftRight  },
  { key: "kyc",           label: "KYC / Identity",    icon: ShieldCheck     },
  { key: "finance",       label: "Finance",           icon: Landmark        },
  { key: "payments",      label: "Payments",          icon: CreditCard      },
  { key: "inspections",   label: "Live Inspections",  icon: Video           },
  { key: "support",       label: "Support",           icon: HelpCircle      },
] as const;

type NavKey = typeof NAV_ITEMS[number]["key"];

// ── Sidebar (vertical) ─────────────────────────────────────────────────────────

function PortalSidebar({
  active, setActive, open, onClose, isSuperAdmin,
}: { active: NavKey; setActive: (k: NavKey) => void; open: boolean; onClose: () => void; isSuperAdmin: boolean }) {
  const liveInspectionStatus = useQuery(api.liveInspections.getFeatureStatus, {});
  const visibleNavItems = NAV_ITEMS.filter((n) => n.key !== "inspections" || liveInspectionStatus?.enabled === true);
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
            <img src="https://hercules-cdn.com/file_hqjYSAKlVBBRqljHrAkEnfVn" alt="Geodata"
              className="w-8 h-8 rounded-md object-contain bg-white p-0.5" />
            <div>
              <div className="text-white font-bold text-xs leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}>GEODATA WORLD</div>
              <div className="text-blue-200 text-[10px] tracking-widest uppercase">Buyer Portal</div>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5 scrollbar-thin">
          {visibleNavItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActive(key); onClose(); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer",
                active === key
                  ? "bg-white text-[var(--brand)] font-semibold shadow-sm"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={15} className="shrink-0" />
              <span className="flex-1 text-left text-[13px]">{label}</span>
              {active === key && <ChevronRight size={12} className="opacity-60" />}
            </button>
          ))}
        </nav>

        {/* Back to admin / website */}
        <div className="px-3 py-3 border-t border-white/10 shrink-0 space-y-0.5">
          {isSuperAdmin && (
            <Link to="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-white/10 text-white hover:bg-white/20 transition-colors font-medium">
              <LayoutDashboard size={15} />
              <span>Back to Admin Dashboard</span>
            </Link>
          )}
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

function PortalTopBar({ activeLabel, onMenuClick, isSuperAdmin }: { activeLabel: string; onMenuClick: () => void; isSuperAdmin: boolean }) {
  const { signout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-800 cursor-pointer">
          <Menu size={20} />
        </button>
        <span className="font-semibold text-gray-800 text-sm">{activeLabel}</span>
      </div>

      <div className="flex items-center gap-4">
        {isSuperAdmin && (
          <Link to="/admin"
            className="hidden sm:flex items-center gap-1.5 text-[var(--brand)] hover:underline text-xs font-semibold transition-colors">
            <LayoutDashboard size={14} /> Back to Admin Dashboard
          </Link>
        )}
        <NotificationBell />
        <Link to="/profile" className="flex items-center gap-1.5 text-gray-400 hover:text-[var(--brand)] text-xs font-medium transition-colors cursor-pointer">
          <UserRound size={14} /> My Profile
        </Link>
        <button onClick={async () => { await signout(); navigate("/"); }}
          className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 text-xs font-medium transition-colors cursor-pointer">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </header>
  );
}

// ── Overview / Dashboard ───────────────────────────────────────────────────────

function OverviewSection({ setActive }: { setActive: (k: NavKey) => void }) {
  const summary = useQuery(api.buyer.getDashboardSummary, {});

  if (summary === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const kycCfg = KYC_STATUS_CFG[summary.kycStatus] ?? KYC_STATUS_CFG.not_started;
  const KycIcon = kycCfg.icon;

  const stats = [
    { label: "Transactions",   value: summary.transactionCount,   icon: ArrowLeftRight, color: "#3b82f6", action: "transactions" as NavKey },
    { label: "Active",         value: summary.activeTransactions, icon: Building2,      color: "#10b981", action: "transactions" as NavKey },
    { label: "Total Paid",     value: `₦${summary.totalPaid.toLocaleString()}`, icon: Banknote, color: "#059669", action: "payments" as NavKey },
    { label: "Outstanding",    value: `₦${summary.outstandingBalance.toLocaleString()}`, icon: CreditCard, color: "#ef4444", action: "payments" as NavKey },
    { label: "KYC Status",     value: kycCfg.label,               icon: ShieldCheck,    color: "#8b5cf6", action: "kyc" as NavKey },
    { label: "Finance",        value: (FINANCE_STATUS_CFG[summary.financeStatus]?.label ?? "None"), icon: Landmark, color: "#f59e0b", action: "finance" as NavKey },
    { label: "Receipts",       value: summary.receiptCount,       icon: Receipt,        color: "#14b8a6", action: "payments" as NavKey },
    { label: "Inquiries",      value: summary.inquiryCount,       icon: MessageSquare,  color: "#6366f1", action: "support" as NavKey },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      {summary.client ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[var(--brand)] to-blue-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 opacity-10 rounded-full bg-white -translate-y-12 translate-x-12" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold border-2 border-white/30 shrink-0">
              {summary.client.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-widest">Welcome back</p>
              <h2 className="text-2xl font-bold leading-tight">{summary.client.fullName.split(" ")[0]}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", kycCfg.bg, kycCfg.color)}>
                  <KycIcon size={9} className="inline mr-0.5" /> KYC: {kycCfg.label}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-semibold text-amber-800 text-sm">No client profile linked</p>
          <p className="text-xs text-amber-700 mt-1">
            Your account is not yet linked to a client profile. Please contact us at{" "}
            <a href="mailto:info@geodataworld.com" className="underline">info@geodataworld.com</a> to complete setup.
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.button key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setActive(s.action)}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-left hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{s.label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.color + "15" }}>
                <s.icon size={14} style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900 truncate">{s.value}</p>
          </motion.button>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4 text-sm">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "My Requests",             desc: "Track your Buy Outright/Mortgage requests", icon: Send, action: "requests" as NavKey, color: "#0ea5e9" },
            { label: "View My Transactions",    desc: "Track your property purchases",     icon: ArrowLeftRight, action: "transactions" as NavKey, color: "#3b82f6" },
            { label: "KYC Verification",        desc: "Submit identity documents",         icon: ShieldCheck,    action: "kyc" as NavKey,          color: "#8b5cf6" },
            { label: "Finance Application",     desc: "Check mortgage or payment plan",    icon: Landmark,       action: "finance" as NavKey,       color: "#f59e0b" },
            { label: "Payments & Receipts",     desc: "View payment history and receipts", icon: Receipt,        action: "payments" as NavKey,      color: "#10b981" },
          ].map(({ label, desc, icon: Icon, action, color }) => (
            <button key={label} onClick={() => setActive(action)}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer text-left">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "15" }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 ml-auto shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Transactions section ───────────────────────────────────────────────────────

type TxnRow = NonNullable<ReturnType<typeof useQuery<typeof api.buyer.getMyTransactions>>>[number];

function TransactionCard({ txn }: { txn: TxnRow }) {
  const [expanded, setExpanded] = useState(false);
  const detail = useQuery(
    api.buyer.getMyTransactionDetail,
    expanded ? { transactionId: txn._id } : "skip"
  );

  const statusCfg = TXN_STATUS_CFG[txn.status] ?? { label: txn.status, color: "text-gray-500", dot: "bg-gray-400" };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-start gap-4 p-5">
        {txn.propertyImage ? (
          <img src={txn.propertyImage} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Building2 size={22} className="text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">{txn.propertyTitle}</p>
              {txn.propertyLocation && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {txn.propertyLocation}
                </p>
              )}
            </div>
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap", statusCfg.color)}>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusCfg.dot)} />
              {statusCfg.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
            <span className="font-mono font-semibold text-[var(--brand)]">{txn.transactionRef}</span>
            {txn.purchasePrice && <span className="font-semibold text-gray-800">₦{txn.purchasePrice.toLocaleString()}</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {txn.kycStatus && txn.kycStatus !== "not_started" && (
              <StatusPill status={txn.kycStatus} cfg={KYC_STATUS_CFG} />
            )}
            {txn.paymentStatus && (
              <StatusPill status={txn.paymentStatus} cfg={PAY_STATUS_CFG} />
            )}
          </div>
        </div>
      </div>

      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 border-t border-gray-50 text-xs text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer">
        <span>{expanded ? "Hide details" : "Show payment history & timeline"}</span>
        <ChevronRight size={13} className={cn("transition-transform", expanded && "rotate-90")} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-50">
            {detail === undefined ? (
              <div className="p-4"><Skeleton className="h-24 w-full" /></div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Payments */}
                {detail.payments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payments</p>
                    <div className="space-y-2">
                      {detail.payments.map((p) => {
                        const pcfg = PAY_STATUS_CFG[p.status] ?? { label: p.status, color: "text-gray-500", bg: "bg-gray-100" };
                        return (
                          <div key={p._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                            <div>
                              <span className="font-mono text-xs font-semibold text-gray-700">{p.paymentRef}</span>
                              <span className="text-xs text-gray-400 ml-2">{p.txnType.replace("_", " ")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-800">₦{p.amountDisplay.toLocaleString()}</span>
                              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", pcfg.bg, pcfg.color)}>{pcfg.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Receipts */}
                {detail.receipts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Receipts</p>
                    <div className="space-y-2">
                      {detail.receipts.map((r) => (
                        <div key={r._id} className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Receipt size={13} className="text-green-600" />
                            <span className="font-mono text-xs font-semibold text-green-700">{r.receiptRef}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-green-800">₦{r.amountDisplay.toLocaleString()}</span>
                            {r.pdfUrl && (
                              <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline">Download PDF</a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {detail.events.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Timeline</p>
                    <div className="space-y-2">
                      {detail.events.slice(0, 5).map((ev) => (
                        <div key={ev._id} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-700">{ev.note ?? `Status → ${ev.toStatus}`}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{format(parseISO(ev.timestamp), "dd MMM yyyy HH:mm")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── My Requests (Buy Outright / Buy With Mortgage submissions) ────────────────

const REQUEST_STAGE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  new:        { label: "Awaiting Review",  color: "text-blue-700",   bg: "bg-blue-100"   },
  contacted:  { label: "Agent Reached Out", color: "text-indigo-700", bg: "bg-indigo-100" },
  qualified:  { label: "In Progress",      color: "text-amber-700",  bg: "bg-amber-100"  },
  proposal:   { label: "In Progress",      color: "text-amber-700",  bg: "bg-amber-100"  },
  negotiation:{ label: "In Progress",      color: "text-amber-700",  bg: "bg-amber-100"  },
  won:        { label: "Approved — Purchase Started", color: "text-green-700", bg: "bg-green-100" },
  lost:       { label: "Closed",           color: "text-gray-500",   bg: "bg-gray-100"   },
};

function RequestsSection({ setActive }: { setActive: (k: NavKey) => void }) {
  const requests = useQuery(api.buyer.getMyRequests, {});

  if (requests === undefined) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-6 text-center">
        <Send size={40} className="text-gray-200 mb-3" />
        <p className="font-semibold text-gray-700">No purchase requests yet</p>
        <p className="text-sm text-gray-400 mt-1 max-w-xs">
          When you click "Buy Outright" or "Buy With Mortgage" on a property, your request will appear here.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link to="/properties">Browse Properties</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-gray-900">My Requests ({requests.length})</h2>
      {requests.map((r) => {
        const cfg = REQUEST_STAGE_CFG[r.stage] ?? { label: r.stage, color: "text-gray-500", bg: "bg-gray-100" };
        return (
          <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{r.propertyTitle}</p>
                {r.propertyLocation && <p className="text-xs text-gray-400 mt-0.5">{r.propertyLocation}</p>}
              </div>
              <StatusPill status={r.stage} cfg={REQUEST_STAGE_CFG} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-full font-medium">
                {r.financePreference === "mortgage" ? "Buy With Mortgage" : "Buy Outright"}
              </span>
              {typeof r.budget === "number" && (
                <span className="inline-flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-full font-medium">
                  Budget: ₦{r.budget.toLocaleString()}
                </span>
              )}
              <span className="text-gray-400">Submitted {format(new Date(r._creationTime), "dd MMM yyyy")}</span>
            </div>
            {r.stage === "won" && r.transactionId && (
              <Button size="sm" className="mt-4 w-full sm:w-auto" onClick={() => setActive("transactions")}>
                View Transaction <ArrowRight size={14} className="ml-1" />
              </Button>
            )}
            {cfg.label === "Awaiting Review" && (
              <p className="text-xs text-gray-400 mt-3">Our team will reach out to you shortly to guide you through the process.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TransactionsSection() {
  const transactions = useQuery(api.buyer.getMyTransactions, {});

  if (transactions === undefined) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 px-6 text-center">
        <Building2 size={40} className="text-gray-200 mb-3" />
        <p className="font-semibold text-gray-700">No transactions yet</p>
        <p className="text-sm text-gray-400 mt-1 max-w-xs">
          Your property purchases will appear here. Contact us to get started.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link to="/properties">Browse Properties</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-gray-900">My Transactions ({transactions.length})</h2>
      {transactions.map((t) => (
        <TransactionCard key={t._id} txn={t} />
      ))}
    </div>
  );
}

// ── KYC Section ───────────────────────────────────────────────────────────────

function KycSection() {
  const data = useQuery(api.buyer.getMyKyc, {});

  if (data === undefined) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  const notStarted = !data;

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-gray-900">KYC & Identity Verification</h2>

      {notStarted ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <ShieldCheck size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">KYC not submitted</p>
          <p className="text-sm text-gray-400 mt-1">
            Your KYC submission has not been started yet. Please contact your assigned agent or our support team to begin the verification process.
          </p>
          <div className="mt-4 bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
            <strong>How it works:</strong> Your agent will create a KYC submission on your behalf. You will then be able to see the status and any documents requested here.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">Submission</p>
                <p className="font-mono font-bold text-[var(--brand)] mt-0.5">{data.submission.submissionRef}</p>
              </div>
              <StatusPill status={data.submission.status} cfg={KYC_STATUS_CFG} />
            </div>

            {data.submission.reviewNotes && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 text-sm text-orange-700">
                <p className="font-semibold mb-0.5">Note from reviewer:</p>
                {data.submission.reviewNotes}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Type", value: data.submission.kycType?.replace("_", " ") ?? "—" },
                { label: "Legal Name", value: data.submission.legalName ?? "—" },
                { label: "Risk Level", value: data.submission.riskLevel ?? "—" },
                { label: "Submitted", value: data.submission.submittedAt ? format(parseISO(data.submission.submittedAt), "dd MMM yyyy") : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5 capitalize">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          {data.documents.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3 text-sm">Submitted Documents</h3>
              <div className="space-y-2">
                {data.documents.map((doc) => (
                  <div key={doc._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gray-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-700 capitalize">{doc.docType.replace("_", " ")}</p>
                        <p className="text-[10px] text-gray-400">{doc.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                        doc.status === "verified" ? "bg-green-100 text-green-700" :
                        doc.status === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                      )}>
                        {doc.status}
                      </span>
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline">View</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {data.events.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3 text-sm">Activity Timeline</h3>
              <div className="space-y-3">
                {data.events.map((ev) => (
                  <div key={ev._id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-gray-700 capitalize">Status → {ev.toStatus.replace("_", " ")}</p>
                      {ev.note && <p className="text-xs text-gray-500 mt-0.5 italic">{ev.note}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">{format(parseISO(ev.timestamp), "dd MMM yyyy HH:mm")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Finance Section ───────────────────────────────────────────────────────────

function FinanceSection() {
  const data = useQuery(api.buyer.getMyFinance, {});

  if (data === undefined) return <Skeleton className="h-64 rounded-2xl" />;

  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="font-bold text-gray-900">Finance & Mortgage</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <Landmark size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">No finance application</p>
          <p className="text-sm text-gray-400 mt-1">Your finance or mortgage application will appear here once submitted.</p>
          <div className="mt-4 bg-blue-50 rounded-xl p-4 text-sm text-blue-700 text-left">
            <strong>Available options:</strong>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              {["Outright Purchase", "Mortgage", "Installment Plan", "Rent-to-Own", "NHF Loan", "Government Scheme"].map((o) => (
                <li key={o} className="text-xs">{o}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const { application, mortgage, events } = data;
  const finCfg = FINANCE_STATUS_CFG[application.status] ?? { label: application.status, color: "text-gray-500", bg: "bg-gray-100" };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-gray-900">Finance & Mortgage</h2>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Application</p>
            <p className="font-mono font-bold text-[var(--brand)] mt-0.5">{application.applicationRef}</p>
          </div>
          <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full", finCfg.bg, finCfg.color)}>
            {finCfg.label}
          </span>
        </div>

        {application.reviewNotes && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 text-sm text-orange-700">
            <p className="font-semibold mb-0.5">Reviewer note:</p>
            {application.reviewNotes}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: "Finance Method", value: application.financeMethod?.replace("_", " ") ?? "—" },
            { label: "Amount Requested", value: application.amountRequested ? `₦${application.amountRequested.toLocaleString()}` : "—" },
            { label: "Purchase Price", value: application.purchasePrice ? `₦${application.purchasePrice.toLocaleString()}` : "—" },
            { label: "Initial Deposit", value: application.initialDeposit ? `₦${application.initialDeposit.toLocaleString()}` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-xs font-semibold text-gray-800 mt-0.5 capitalize">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {mortgage && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3 text-sm">Mortgage Details</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Lender", value: mortgage.lenderName ?? "—" },
              { label: "Loan Amount", value: mortgage.loanAmount ? `₦${mortgage.loanAmount.toLocaleString()}` : "—" },
              { label: "Tenure", value: mortgage.tenureMonths ? `${mortgage.tenureMonths} months` : "—" },
              { label: "Interest Rate", value: mortgage.interestRate ? `${mortgage.interestRate}% p.a.` : "—" },
              { label: "Monthly Repayment", value: mortgage.monthlyRepayment ? `₦${mortgage.monthlyRepayment.toLocaleString()}` : "—" },
              { label: "LTV", value: mortgage.ltv ? `${mortgage.ltv}%` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          {mortgage.offerLetterUrl && (
            <a href={mortgage.offerLetterUrl} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
              <FileText size={13} /> View Offer Letter
            </a>
          )}
        </div>
      )}

      {events.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3 text-sm">Activity Timeline</h3>
          <div className="space-y-3">
            {events.map((ev) => (
              <div key={ev._id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-700">Status: {ev.toStatus?.replace("_", " ")}</p>
                  {ev.note && <p className="text-xs text-gray-500 mt-0.5 italic">{ev.note}</p>}
                  <p className="text-[10px] text-gray-400 mt-0.5">{format(parseISO(ev.timestamp), "dd MMM yyyy HH:mm")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Payments Section ──────────────────────────────────────────────────────────

function PaymentsSection() {
  const [tab, setTab] = useState<"payments" | "receipts">("payments");
  const data = useQuery(api.buyer.getMyPayments, {});

  if (data === undefined) return <Skeleton className="h-64 rounded-2xl" />;

  const { payments, receipts } = data;
  const totalPaid = payments.filter((p) => p.status === "successful").reduce((s, p) => s + p.amountDisplay, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Payments & Receipts</h2>
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2">
          <p className="text-[10px] text-green-600 uppercase tracking-wider">Total Paid</p>
          <p className="text-base font-bold text-green-700">₦{totalPaid.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex gap-1">
        {(["payments", "receipts"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors capitalize",
              tab === t ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
            )}>
            {t === "payments" ? `Payments (${payments.length})` : `Receipts (${receipts.length})`}
          </button>
        ))}
      </div>

      {tab === "payments" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {payments.length === 0 ? (
            <div className="py-14 text-center">
              <CreditCard size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium text-sm">No payments yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {payments.map((p) => {
                const pcfg = PAY_STATUS_CFG[p.status] ?? { label: p.status, color: "text-gray-500", bg: "bg-gray-100" };
                return (
                  <div key={p._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-mono text-xs font-semibold text-gray-700">{p.paymentRef}</p>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">{p.txnType.replace("_", " ")} · {p.gatewayKey}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">₦{p.amountDisplay.toLocaleString()}</p>
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", pcfg.bg, pcfg.color)}>{pcfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "receipts" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {receipts.length === 0 ? (
            <div className="py-14 text-center">
              <Receipt size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium text-sm">No receipts yet</p>
              <p className="text-xs text-gray-400 mt-1">Receipts are issued once your payment is confirmed.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {receipts.map((r) => (
                <div key={r._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-mono text-xs font-semibold text-green-700">{r.receiptRef}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.paidAt ? format(parseISO(r.paidAt), "dd MMM yyyy") : "—"} · {r.txnType.replace("_", " ")}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-800">₦{r.amountDisplay.toLocaleString()}</p>
                      {r.emailedAt && <p className="text-[10px] text-blue-500">✉ Emailed</p>}
                    </div>
                    {r.pdfUrl ? (
                      <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 font-medium transition-colors">
                        PDF
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">No PDF</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Support Section ───────────────────────────────────────────────────────────

function SupportDialog({ onClose }: { onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const createTicket = useMutation(api.buyer.createTicket);

  const handleSubmit = async () => {
    if (!subject || !message) { toast.error("Subject and message are required"); return; }
    setLoading(true);
    try {
      await createTicket({ subject, message, priority });
      toast.success("Support ticket submitted");
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Support Request</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Subject <span className="text-red-500">*</span></Label>
            <Input className="mt-1" placeholder="Brief description of your issue" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High — urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Message <span className="text-red-500">*</span></Label>
            <Textarea className="mt-1" rows={4} placeholder="Describe your issue in detail…" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Submitting…" : "Submit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Live Inspections section ─────────────────────────────────────────────
const CLIENT_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-gray-500", bg: "bg-gray-100" },
  requested: { label: "Requested", color: "text-amber-700", bg: "bg-amber-50" },
  scheduled: { label: "Scheduled", color: "text-blue-700", bg: "bg-blue-50" },
  confirmed: { label: "Confirmed", color: "text-indigo-700", bg: "bg-indigo-50" },
  live: { label: "Live Now", color: "text-white", bg: "bg-red-500" },
  completed: { label: "Completed", color: "text-green-700", bg: "bg-green-100" },
  cancelled: { label: "Cancelled", color: "text-gray-400", bg: "bg-gray-50" },
  no_show: { label: "No Show", color: "text-orange-700", bg: "bg-orange-50" },
  rescheduled: { label: "Rescheduled", color: "text-purple-700", bg: "bg-purple-50" },
};

function RequestInspectionDialog({ onClose }: { onClose: () => void }) {
  const properties = useQuery(api.properties.listAll, {});
  const requestInspection = useMutation(api.liveInspections.requestFromClient);
  const [inspectionType, setInspectionType] = useState<"property" | "construction">("property");
  const [propertyId, setPropertyId] = useState("");
  const [preferredAt, setPreferredAt] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!propertyId) { toast.error("Please select a property"); return; }
    setLoading(true);
    try {
      const { inspectionRef } = await requestInspection({
        inspectionType,
        propertyId: propertyId as Id<"properties">,
        preferredAt: preferredAt ? new Date(preferredAt).toISOString() : undefined,
        note: note.trim() || undefined,
      });
      toast.success(`Request submitted — ${inspectionRef}. Our team will reach out to confirm a time.`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Request a Live Inspection</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Inspection Type</Label>
            <Select value={inspectionType} onValueChange={(v) => setInspectionType(v as typeof inspectionType)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="property">Live Property Inspection</SelectItem>
                <SelectItem value="construction">Live Construction Inspection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Property <span className="text-red-500">*</span></Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a property…" /></SelectTrigger>
              <SelectContent>
                {properties === undefined ? (
                  <SelectItem value="none" disabled>Loading…</SelectItem>
                ) : properties.length === 0 ? (
                  <SelectItem value="none" disabled>No properties available</SelectItem>
                ) : properties.map((p) => (
                  <SelectItem key={p._id} value={p._id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Preferred Date &amp; Time (optional)</Label>
            <Input type="datetime-local" className="mt-1" value={preferredAt} onChange={(e) => setPreferredAt(e.target.value)} />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea className="mt-1" rows={3} placeholder="Anything you'd like our officer to know…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Submitting…" : "Submit Request"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InspectionsSection() {
  const inspections = useQuery(api.liveInspections.listForCurrentClient, {});
  const [sessionId, setSessionId] = useState<Id<"liveInspections"> | null>(null);
  const [showRequest, setShowRequest] = useState(false);

  if (sessionId) {
    return <LiveInspectionSessionRoom inspectionId={sessionId} onExit={() => setSessionId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Live Virtual Inspections</h2>
        <Button size="sm" onClick={() => setShowRequest(true)} className="gap-1.5 cursor-pointer">
          <Video size={14} /> Request Inspection
        </Button>
      </div>
      {inspections === undefined ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : inspections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <Video size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No live inspections scheduled yet.</p>
          <p className="text-xs text-gray-400 mt-1">Request one above, or ask your assigned officer to schedule it for you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inspections.map((insp) => {
            const cfg = CLIENT_STATUS_CFG[insp.status] ?? CLIENT_STATUS_CFG.draft;
            return (
              <div key={insp._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Video size={18} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-900 truncate">{insp.propertyTitle ?? insp.estateName ?? insp.inspectionRef}</p>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", cfg.bg, cfg.color)}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Calendar size={11} /> {insp.scheduledAt ? format(parseISO(insp.scheduledAt), "MMM d, yyyy · h:mm a") : "Not yet scheduled"}
                  </p>
                </div>
                {insp.status === "live" ? (
                  <Button size="sm" onClick={() => setSessionId(insp._id)} className="bg-red-500 hover:bg-red-600 text-white gap-1.5 cursor-pointer shrink-0">
                    <Video size={13} /> Join
                  </Button>
                ) : (
                  <span className="text-xs text-gray-400 shrink-0">{cfg.label === "Completed" ? "Completed" : "Not started"}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {showRequest && <RequestInspectionDialog onClose={() => setShowRequest(false)} />}
    </div>
  );
}

function SupportSection() {
  const tickets = useQuery(api.buyer.getMyTickets, {});
  const [showDialog, setShowDialog] = useState(false);
  const generateGuidePdf = useAction(api.guides.generateLiveInspectionGuidePdf);
  const [downloadingGuide, setDownloadingGuide] = useState(false);

  const handleDownloadGuide = async () => {
    setDownloadingGuide(true);
    try {
      const { pdf, filename } = await generateGuidePdf({ audience: "client" });
      const link = document.createElement("a");
      link.href = pdf;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Guide downloaded");
    } catch {
      toast.error("Failed to generate the guide. Please try again.");
    } finally {
      setDownloadingGuide(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Support</h2>
        <Button size="sm" className="gap-1.5" onClick={() => setShowDialog(true)}>
          <Send size={13} /> New Request
        </Button>
      </div>

      {/* GEODATA LIVE INSPECT guide */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[var(--brand)] flex items-center justify-center shrink-0">
            <BookOpen size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-sm">GEODATA LIVE INSPECT{"\u2122"} Guide</h3>
            <p className="text-xs text-gray-500 mt-0.5">Learn how to take a 360{"\u00b0"} tour and request a live virtual inspection.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleDownloadGuide} disabled={downloadingGuide} className="gap-1.5 cursor-pointer shrink-0">
            {downloadingGuide ? <Spinner className="h-3.5 w-3.5" /> : <Download size={13} />}
            {downloadingGuide ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Contact info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-3 text-sm">Contact Us</h3>
        <div className="space-y-3">
          {[
            { icon: Phone, label: "Phone", value: "+234 814 234 5678", href: "tel:+2348142345678" },
            { icon: Mail, label: "Email", value: "info@geodataworld.com", href: "mailto:info@geodataworld.com" },
            { icon: MapPin, label: "Address", value: "GEODATA WORLD HQ, Lagos, Nigeria", href: undefined },
          ].map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <Icon size={14} className="text-[var(--brand)] shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                {href ? (
                  <a href={href} className="text-sm font-medium text-gray-700 hover:text-[var(--brand)] hover:underline">{value}</a>
                ) : (
                  <p className="text-sm font-medium text-gray-700">{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tickets */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-bold text-gray-800 text-sm">My Support Tickets ({tickets?.length ?? 0})</h3>
        </div>
        {tickets === undefined ? (
          <div className="p-4"><Skeleton className="h-16 w-full" /></div>
        ) : tickets.length === 0 ? (
          <div className="py-10 text-center">
            <HelpCircle size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No support tickets yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tickets.map((t) => (
              <div key={t._id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-800 text-sm">{t.subject}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      t.priority === "high" ? "bg-red-100 text-red-700" :
                      t.priority === "medium" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600"
                    )}>{t.priority}</span>
                    <span className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      t.status === "resolved" ? "bg-green-100 text-green-700" :
                      t.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                    )}>{t.status.replace("_", " ")}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{t.message}</p>
                {t.response && (
                  <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                    <strong>Response:</strong> {t.response}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showDialog && <SupportDialog onClose={() => setShowDialog(false)} />}
    </div>
  );
}

// ── Inner portal (authenticated) ──────────────────────────────────────────────

function BuyerPortalInner() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as NavKey | null);
  const validTabs: NavKey[] = ["dashboard", "requests", "transactions", "kyc", "finance", "payments", "inspections", "support"];
  const [active, setActive] = useState<NavKey>(initialTab && validTabs.includes(initialTab) ? initialTab : "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const isSuperAdmin = currentUser?.role === "super_admin";

  const sectionMap: Record<NavKey, React.ReactNode> = {
    dashboard:    <OverviewSection setActive={setActive} />,
    requests:     <RequestsSection setActive={setActive} />,
    transactions: <TransactionsSection />,
    kyc:          <KycSection />,
    finance:      <FinanceSection />,
    payments:     <PaymentsSection />,
    inspections:  <InspectionsSection />,
    support:      <SupportSection />,
  };

  const activeLabel = NAV_ITEMS.find((n) => n.key === active)?.label ?? "Overview";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <PortalSidebar active={active} setActive={setActive} open={sidebarOpen} onClose={() => setSidebarOpen(false)} isSuperAdmin={isSuperAdmin} />
      <div className="flex flex-col flex-1 lg:ml-64 min-w-0 overflow-hidden">
        <PortalTopBar activeLabel={activeLabel} onMenuClick={() => setSidebarOpen(true)} isSuperAdmin={isSuperAdmin} />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}>
                {sectionMap[active]}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function BuyerPortal() {
  return (
    <>
      <AuthLoading>
        <div className="flex flex-col items-center justify-center h-svh gap-4">
          <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="min-h-screen bg-gradient-to-br from-blue-950 to-blue-800 flex flex-col items-center justify-center gap-6 px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
            <img src="https://hercules-cdn.com/file_hqjYSAKlVBBRqljHrAkEnfVn" alt="Geodata" className="h-14 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Buyer Portal</h1>
            <p className="text-gray-500 text-sm mb-6">
              Sign in to track your transactions, check KYC status, view payments, and manage your property purchase.
            </p>
            <SignInButton signInText="Sign In to Buyer Portal"
              className="w-full bg-[var(--brand)] hover:bg-blue-700 text-white h-11 text-sm rounded-xl" />
            <Link to="/" className="mt-4 block text-sm text-gray-400 hover:text-[var(--brand)] transition-colors">
              ← Back to Home
            </Link>
          </motion.div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <BuyerPortalInner />
      </Authenticated>
    </>
  );
}
