import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Search, Home, TrendingUp, Star, Eye, Wallet, X,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

// ── Config ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  reserved: "bg-yellow-100 text-yellow-700",
  under_construction: "bg-purple-100 text-purple-700",
};

const TXN_STATUS_COLOR: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
  on_hold: "bg-orange-100 text-orange-600",
};

const COMMISSION_STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
};

type Tab = "properties" | "sales" | "commission";

// ── My Properties ────────────────────────────────────────────────────────

function MyPropertiesTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [status, setStatus] = useState("all");

  const stats = useQuery(api.staffPortal.propertiesAndSales.getMyPropertyStats, {});
  const updateStatus = useMutation(api.staffPortal.propertiesAndSales.updateMyPropertyStatus);

  const {
    rows: properties,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.staffPortal.propertiesAndSales.listMyPropertiesPaginated,
    { status: status !== "all" ? status : undefined, search: debouncedSearch || undefined },
    12,
  );

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status]);

  const handleStatusChange = async (id: Id<"properties">, newStatus: string) => {
    try {
      await updateStatus({ id, status: newStatus });
      toast.success("Status updated");
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
  };

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",     value: stats.total,     color: "#6366f1" },
            { label: "Available", value: stats.available, color: "#10b981" },
            { label: "Reserved",  value: stats.reserved,  color: "#f59e0b" },
            { label: "Sold",      value: stats.sold,      color: "#3b82f6" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] text-gray-400">{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-8" placeholder="Search my properties…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="under_construction">Under Construction</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : properties.length === 0 ? (
          <div className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Home /></EmptyMedia>
                <EmptyTitle>No properties assigned</EmptyTitle>
                <EmptyDescription>Properties assigned to you will appear here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {properties.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.featuredImage} alt={p.title} className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100" />
                        <div>
                          <div className="font-medium text-gray-900 text-sm flex items-center gap-1">
                            {p.title}
                            {p.featured && <Star size={11} className="text-yellow-400 fill-yellow-400" />}
                          </div>
                          <div className="text-xs text-gray-400">{p.location}, {p.state}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-600 capitalize">{p.propertyType}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₦{(p.price / 1_000_000).toFixed(1)}M</td>
                    <td className="px-4 py-3">
                      <Select value={p.status} onValueChange={(v) => handleStatusChange(p._id, v)}>
                        <SelectTrigger className="h-7 w-32 text-xs border-0 p-0 shadow-none bg-transparent">
                          <Badge className={cn("text-xs border-0 capitalize cursor-pointer", STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-600")}>
                            {p.status.replace("_", " ")}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="reserved">Reserved</SelectItem>
                          <SelectItem value="sold">Sold</SelectItem>
                          <SelectItem value="under_construction">Under Construction</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs flex items-center gap-1">
                      <Eye size={12} className="inline mr-1" />{p.views}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && properties.length > 0 && (
          <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
        )}
      </div>
    </div>
  );
}

// ── My Sales ─────────────────────────────────────────────────────────────

function MySaleDetailPanel({ saleId, onClose }: { saleId: Id<"transactions">; onClose: () => void }) {
  const sale = useQuery(api.staffPortal.propertiesAndSales.getMySale, { id: saleId });

  if (sale === undefined) return <div className="p-4"><Skeleton className="h-48 w-full" /></div>;
  if (!sale) return <div className="p-4 text-sm text-gray-400">Sale not found</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 shrink-0">
        <h3 className="font-bold text-gray-800 text-sm">Transaction Detail</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="font-mono text-xs text-gray-400">{sale.transactionRef}</p>
          <p className="font-bold text-gray-900">{sale.client?.fullName ?? "Unknown Client"}</p>
          <Badge className={cn("text-[10px] border-0 mt-1 capitalize", TXN_STATUS_COLOR[sale.status] ?? "bg-indigo-100 text-indigo-700")}>
            {sale.status.replace(/_/g, " ")}
          </Badge>
        </div>
        {(sale.property || sale.estate) && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Property</p>
            <p className="text-sm font-medium text-gray-800">{sale.property?.title ?? sale.estate?.name}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Purchase Price</p>
            <p className="text-sm font-bold text-gray-900">{sale.purchasePrice ? `₦${sale.purchasePrice.toLocaleString()}` : "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Amount Paid</p>
            <p className="text-sm font-bold text-green-700">{sale.amountPaid ? `₦${sale.amountPaid.toLocaleString()}` : "₦0"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Outstanding</p>
            <p className="text-sm font-bold text-orange-600">{sale.outstandingBalance ? `₦${sale.outstandingBalance.toLocaleString()}` : "₦0"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Finance Method</p>
            <p className="text-sm font-medium text-gray-800 capitalize">{sale.financeMethod?.replace(/_/g, " ") ?? "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ["KYC", sale.kycStatus], ["Finance", sale.financeStatus],
            ["Payment", sale.paymentStatus], ["Agreement", sale.agreementStatus],
          ].map(([label, val]) => (
            <div key={label} className="bg-gray-50 rounded-lg px-2.5 py-2">
              <p className="text-[10px] text-gray-400">{label}</p>
              <p className="font-medium text-gray-700 capitalize">{val.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
        {sale.events.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">History</p>
            <div className="space-y-2">
              {sale.events.slice().reverse().map((e) => (
                <div key={e._id} className="bg-gray-50 rounded-xl p-2.5">
                  <p className="text-xs font-medium text-gray-800 capitalize">{e.toStatus.replace(/_/g, " ")}</p>
                  {e.note && <p className="text-xs text-gray-500 mt-0.5">{e.note}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MySalesTab() {
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Id<"transactions"> | null>(null);

  const stats = useQuery(api.staffPortal.propertiesAndSales.getMySalesStats, {});
  const {
    rows: sales,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(api.staffPortal.propertiesAndSales.listMySalesPaginated, { status: status !== "all" ? status : undefined }, 12);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",       value: stats.total,     color: "#6366f1" },
            { label: "Active",      value: stats.active,    color: "#f59e0b" },
            { label: "Completed",   value: stats.completed, color: "#10b981" },
            { label: "Total Value", value: `₦${(stats.totalValue / 1_000_000).toFixed(1)}M`, color: "#3b82f6" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] text-gray-400">{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-48 h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="on_hold">On Hold</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-4">
        <div className={cn("flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden",
          selected && "hidden md:block md:w-[55%] md:flex-none")}>
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : sales.length === 0 ? (
            <div className="py-10">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><TrendingUp /></EmptyMedia>
                  <EmptyTitle>No sales assigned</EmptyTitle>
                  <EmptyDescription>Transactions assigned to you will appear here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sales.map((s) => (
                <div key={s._id}
                  onClick={() => setSelected(selected === s._id ? null : s._id)}
                  className={cn("p-4 cursor-pointer hover:bg-blue-50/30 transition-colors", selected === s._id && "bg-blue-50")}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900 truncate">{s.clientName}</span>
                    <Badge className={cn("text-[10px] border-0 capitalize shrink-0", TXN_STATUS_COLOR[s.status] ?? "bg-indigo-100 text-indigo-700")}>
                      {s.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400 truncate">{s.propertyTitle ?? s.transactionRef}</span>
                    {s.purchasePrice !== undefined && (
                      <span className="text-xs font-semibold text-[var(--brand)] shrink-0">₦{(s.purchasePrice / 1_000_000).toFixed(1)}M</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && sales.length > 0 && (
            <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
          )}
        </div>

        {selected && (
          <div className="w-full md:w-[44%] flex-none bg-white rounded-2xl border border-gray-100 shadow-sm">
            <MySaleDetailPanel saleId={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── My Commission ────────────────────────────────────────────────────────

function MyCommissionTab() {
  const [status, setStatus] = useState("all");
  const stats = useQuery(api.staffPortal.propertiesAndSales.getMyCommissionStats, {});
  const {
    rows: commissions,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(api.staffPortal.propertiesAndSales.listMyCommissionsPaginated, { status: status !== "all" ? status : undefined }, 12);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Earned",   value: `₦${(stats.totalValue / 1_000_000).toFixed(1)}M`,   color: "#6366f1" },
            { label: "Paid Out",       value: `₦${(stats.paidValue / 1_000_000).toFixed(1)}M`,     color: "#10b981" },
            { label: "Pending",        value: `₦${(stats.pendingValue / 1_000_000).toFixed(1)}M`,  color: "#f59e0b" },
            { label: "Entries",        value: stats.total,                                          color: "#3b82f6" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] text-gray-400">{label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
        </SelectContent>
      </Select>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : commissions.length === 0 ? (
          <div className="py-10">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Wallet /></EmptyMedia>
                <EmptyTitle>No commission records</EmptyTitle>
                <EmptyDescription>Commission earned on your sales will appear here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Sale Amount</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Rate</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Commission</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {commissions.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">₦{c.saleAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{c.commissionRate}%</td>
                    <td className="px-4 py-3 font-semibold text-[var(--brand)]">₦{c.commissionAmount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs border-0 capitalize", COMMISSION_STATUS_COLOR[c.status] ?? "bg-gray-100 text-gray-600")}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-400">{c.transactionDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && commissions.length > 0 && (
          <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
        )}
      </div>
    </div>
  );
}

// ── Page Root ──────────────────────────────────────────────────────────────

export default function StaffMyPropertiesSales() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(location.pathname.endsWith("/sales") ? "sales" : "properties");

  useEffect(() => {
    setTab(location.pathname.endsWith("/sales") ? "sales" : "properties");
  }, [location.pathname]);

  const changeTab = (t: Tab) => {
    setTab(t);
    if (t !== "commission") {
      navigate(t === "sales" ? "/staff/sales" : "/staff/properties", { replace: true });
    }
  };

  return (
    <div className="space-y-5 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>My Properties & Sales</h1>
        <p className="text-sm text-gray-500 mt-0.5">Only properties and sales assigned to you</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1.5 w-fit overflow-x-auto">
        {([
          { key: "properties" as Tab, label: "My Properties", icon: Home },
          { key: "sales" as Tab, label: "My Sales", icon: TrendingUp },
          { key: "commission" as Tab, label: "My Commission", icon: Wallet },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => changeTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all whitespace-nowrap",
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "properties" && <MyPropertiesTab />}
      {tab === "sales" && <MySalesTab />}
      {tab === "commission" && <MyCommissionTab />}
    </div>
  );
}
