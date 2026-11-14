import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { FileSignature } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import ContractStatusBadge from "./ContractStatusBadge.tsx";
import { formatDay } from "../../_lib/contract-format.ts";

type Filter = "all" | "expiring" | "expired";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "expiring", label: "Expiring in 30 days" },
  { id: "expired", label: "Expired" },
  { id: "all", label: "All contracts" },
];

/** Admin overview of partner contracts. Click a row to open that partner. */
export default function ContractsPanel({ onOpenPartner }: { onOpenPartner: (partnerId: string) => void }) {
  const [filter, setFilter] = useState<Filter>("expiring");
  const rows = useQuery(api.partnerContracts.listContracts, { filter });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer",
              filter === f.id ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows === undefined ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileSignature /></EmptyMedia>
            <EmptyTitle>{filter === "expiring" ? "Nothing expiring in the next 30 days" : filter === "expired" ? "No expired contracts" : "No contracts yet"}</EmptyTitle>
            <EmptyDescription>Add a contract from a partner's profile (Partners tab → open a partner → Contract &amp; listing).</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-100 bg-white">
          {rows.map((r) => (
            <button
              key={r._id}
              type="button"
              onClick={() => onOpenPartner(r.partnerId)}
              className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">{r.partnerName}</p>
                <p className="text-xs text-gray-500">
                  {formatDay(r.startDate)} → {formatDay(r.endDate)}
                  {r.autoDelist ? ` · auto-removal ${formatDay(r.delistOn)}` : " · auto-removal off"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {r.delisted ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">Delisted</span>
                ) : r.listed ? (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-[var(--brand)]">Listed</span>
                ) : null}
                <ContractStatusBadge status={r.status} daysLeft={r.daysLeft} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
