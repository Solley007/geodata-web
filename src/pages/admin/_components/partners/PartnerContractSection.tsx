import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarClock, CalendarPlus, EyeOff, FileText, History, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import ContractForm from "./ContractForm.tsx";
import ContractStatusBadge from "./ContractStatusBadge.tsx";
import { DelistDialog, ExtendContractDialog } from "./ContractDialogs.tsx";
import { errorMessage, formatDay } from "../../_lib/contract-format.ts";

const EVENT_LABELS: Record<string, string> = {
  created: "Contract added",
  updated: "Contract edited",
  extended: "Contract extended",
  delisted: "Delisted",
  relisted: "Relisted",
  auto_delisted: "Automatically delisted",
};

/** Contract, listing state and history inside the admin partner drawer. */
export default function PartnerContractSection({ partnerId }: { partnerId: Id<"partners"> }) {
  const data = useQuery(api.partnerContracts.getForPartner, { partnerId });
  const relist = useMutation(api.partnerContracts.relistPartner);
  const [editing, setEditing] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [delistOpen, setDelistOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (data === undefined) return <Skeleton className="h-40 w-full rounded-xl" />;
  const c = data.contract;

  const handleRelist = async () => {
    try {
      await relist({ partnerId, notifyPartner: true });
      toast.success("Partner relisted. Their logo is visible again.");
    } catch (err) {
      toast.error(errorMessage(err, "Could not relist."));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <CalendarClock size={13} /> Contract &amp; listing
        </p>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="cursor-pointer gap-1.5 text-xs">
            <Pencil size={13} /> {c ? "Edit" : "Add contract"}
          </Button>
        )}
      </div>

      {data.delisted && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>
            <strong>{data.delistSource === "auto" ? "Automatically delisted" : "Delisted"}</strong>
            {data.delistReason ? ` — ${data.delistReason}` : ""}
            {data.delistedAt ? ` · ${format(new Date(data.delistedAt), "d MMM yyyy")}` : ""}
          </span>
          <Button size="sm" variant="ghost" onClick={() => void handleRelist()} className="h-7 cursor-pointer gap-1 text-xs text-red-700 hover:bg-red-100">
            <RotateCcw size={12} /> Relist
          </Button>
        </div>
      )}

      {editing ? (
        <ContractForm
          partnerId={partnerId}
          initial={c ? { ...c, notes: c.notes, agreementFileName: c.agreementFileName } : null}
          onDone={() => setEditing(false)}
        />
      ) : c ? (
        <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-800">
              {formatDay(c.startDate)} → <strong>{formatDay(c.endDate)}</strong>
            </p>
            <ContractStatusBadge status={c.status} daysLeft={c.daysLeft} />
          </div>
          <p className="text-xs text-gray-500">
            {c.autoDelist
              ? `Listing is removed automatically on ${formatDay(c.delistOn)}${c.graceDays ? ` (${c.graceDays}-day grace period)` : ""} unless extended.`
              : "Automatic removal is off — the listing stays until you delist it."}
          </p>
          {c.notes && <p className="text-xs text-gray-600">{c.notes}</p>}
          {c.agreementUrl && (
            <a href={c.agreementUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[var(--brand)] hover:underline cursor-pointer">
              <FileText size={13} /> {c.agreementFileName ?? "Signed agreement"}
            </a>
          )}
          <div className="flex flex-wrap gap-2 border-t border-gray-50 pt-3">
            <Button size="sm" onClick={() => setExtendOpen(true)} className="cursor-pointer gap-1.5 bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]">
              <CalendarPlus size={14} /> Extend contract
            </Button>
            {data.hasProfile && !data.delisted && (
              <Button size="sm" variant="ghost" onClick={() => setDelistOpen(true)} className="cursor-pointer gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700">
                <EyeOff size={14} /> Delist
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-xs text-gray-500">
          No contract on file. Add one to track the end date, send renewal reminders and remove the listing automatically when it ends.
          {data.hasProfile && !data.delisted && (
            <div className="pt-3">
              <Button size="sm" variant="ghost" onClick={() => setDelistOpen(true)} className="cursor-pointer gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700">
                <EyeOff size={14} /> Delist
              </Button>
            </div>
          )}
        </div>
      )}

      {data.events.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowHistory((s) => !s)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 cursor-pointer">
            <History size={12} /> {showHistory ? "Hide" : "Show"} history ({data.events.length})
          </button>
          {showHistory && (
            <ol className="mt-2 space-y-2 border-l border-gray-200 pl-4">
              {data.events.map((e) => (
                <li key={e._id} className="text-xs">
                  <p className="font-medium text-gray-800">
                    {EVENT_LABELS[e.type] ?? e.type}
                    {e.fromEndDate && e.toEndDate ? `: ${formatDay(e.fromEndDate)} → ${formatDay(e.toEndDate)}` : e.toEndDate ? ` (ends ${formatDay(e.toEndDate)})` : ""}
                  </p>
                  {e.reason && <p className="text-gray-600">{e.reason}</p>}
                  <p className="text-gray-400">{e.by} · {format(new Date(e.at), "d MMM yyyy, HH:mm")}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {c && <ExtendContractDialog key={c.endDate} partnerId={partnerId} currentEndDate={c.endDate} open={extendOpen} onOpenChange={setExtendOpen} />}
      <DelistDialog partnerId={partnerId} open={delistOpen} onOpenChange={setDelistOpen} />
    </div>
  );
}
