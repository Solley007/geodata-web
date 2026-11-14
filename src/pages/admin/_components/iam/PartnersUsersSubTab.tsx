import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link } from "react-router-dom";
import { Handshake, Search, ExternalLink, Mail, Phone, Copy } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-600",
};

/**
 * Read-only "Partners" audience view inside Users & Roles — surfaces
 * referral-partner accounts (people whose account is linked to a `partners`
 * record) alongside Staff and Clients, without duplicating the full
 * commission/application management tools that already live on the
 * dedicated Partners page.
 */
export default function PartnersUsersSubTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 350);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected" | "suspended">("all");

  const {
    rows: partners,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading,
    nextPage,
    prevPage,
    reset,
  } = useCursorPagination(
    api.partners.listPartnersPaginated,
    { status: filterStatus, search: debouncedSearch || undefined },
    15,
  );

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterStatus]);

  const allPartners = useQuery(api.partners.listPartners, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Partners</h2>
          <p className="text-sm text-gray-500 mt-0.5">Referral partner accounts and their linked commission profiles</p>
        </div>
        <Button asChild className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer">
          <Link to="/admin/partners">
            <ExternalLink size={15} /> Manage Partners
          </Link>
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        This is a read-only summary of referral partner accounts. Approve applications, adjust commission rates, and manage payouts from the full{" "}
        <Link to="/admin/partners" className="font-semibold underline">Partners page</Link>. Some partners here are internal staff also acting as a referral partner — look for the &quot;Staff&quot; tag.
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {allPartners && (
        <p className="text-xs text-gray-400">
          Showing <strong className="text-gray-700">{partners?.length ?? 0}</strong> of <strong className="text-gray-700">{allPartners.length}</strong> partners
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : partners?.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
            <Handshake size={28} className="text-gray-200" />
            No partners found matching your filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Partner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Referral Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {partners?.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[var(--brand)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {p.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate flex items-center gap-1.5">
                            {p.fullName}
                            {p.isStaff && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Staff</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs text-gray-500"><Mail size={10} className="text-gray-300 shrink-0" />{p.email}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-400"><Phone size={10} className="text-gray-300 shrink-0" />{p.phone}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { navigator.clipboard.writeText(p.referralCode); toast.success("Referral code copied"); }}
                        className="inline-flex items-center gap-1.5 font-mono text-xs bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                        title="Copy referral code"
                      >
                        {p.referralCode} <Copy size={10} className="text-gray-400" />
                      </button>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge className={cn("text-xs border-0 capitalize", STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-600")}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-600">
                      {p.commissionRate}% · ₦{p.totalCommissionEarned.toLocaleString()} earned
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && partners && partners.length > 0 && (
          <TablePager pageIndex={pageIndex} hasNextPage={hasNextPage} hasPrevPage={hasPrevPage} onNext={nextPage} onPrev={prevPage} />
        )}
      </div>
    </div>
  );
}
