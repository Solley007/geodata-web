import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Building, Wallet, Layers, PackageCheck, FileText, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";

/**
 * Institutional Account Summary — a rollup card for one organisation across
 * every bulk acquisition it has (Institutional / Bulk Acquisition
 * Management enhancement, spec section 23). Reads from
 * bulkAcquisitions.getInstitutionalAccountSummary, which aggregates the
 * EXISTING acquisition rollup fields — never a second ledger.
 */

function fmtCurrency(n: number): string {
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

export default function InstitutionalAccountSummary({ organisationId }: { organisationId: Id<"corporateOrganisations"> }) {
  const summary = useQuery(api.corporateMarketing.bulkAcquisitions.getInstitutionalAccountSummary, { organisationId });

  if (summary === undefined) return <Skeleton className="h-40 w-full" />;

  if (summary.totals.acquisitions === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
          <Building size={15} className="text-[var(--brand)]" />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">Institutional Account Summary</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Bulk Acquisitions", value: String(summary.totals.acquisitions), icon: Layers },
          { label: "Active", value: String(summary.totals.activeAcquisitions), icon: PackageCheck },
          { label: "Fulfilled", value: String(summary.totals.fulfilledAcquisitions), icon: PackageCheck },
          { label: "On Hold / Disputed", value: String(summary.totals.onHoldOrDisputed), icon: AlertTriangle },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-gray-50 p-3 text-center">
            <s.icon size={14} className="text-gray-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        {[
          { label: "Committed Value", value: fmtCurrency(summary.totals.committedValue) },
          { label: "Paid Value", value: fmtCurrency(summary.totals.paidValue) },
          { label: "Allocated Value", value: fmtCurrency(summary.totals.allocatedValue) },
          { label: "Outstanding Value", value: fmtCurrency(summary.totals.outstandingValue) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-[var(--brand)]/5 p-3 text-center">
            <p className="text-sm font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><Wallet size={12} className="text-gray-400" /> {summary.totals.committedQuantity} committed units</div>
        <div className="flex items-center gap-1.5"><Wallet size={12} className="text-gray-400" /> {summary.totals.paidQuantity} paid units</div>
        <div className="flex items-center gap-1.5"><Wallet size={12} className="text-gray-400" /> {summary.totals.allocatedQuantity} allocated units</div>
        <div className="flex items-center gap-1.5"><Wallet size={12} className="text-gray-400" /> {summary.totals.outstandingQuantity} outstanding units</div>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
        <span>{summary.paymentSchedules.total} schedule line(s){summary.paymentSchedules.overdue > 0 ? ` · ${summary.paymentSchedules.overdue} overdue` : ""}</span>
        <span className="flex items-center gap-1"><FileText size={12} className="text-gray-400" /> {summary.documentCount} document(s)</span>
        <span>{summary.transactionsConverted} converted to transaction</span>
      </div>
    </div>
  );
}
