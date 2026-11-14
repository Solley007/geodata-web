import { cn } from "@/lib/utils.ts";
import type { ContractStatus } from "@/convex/partnerContractUtils.ts";

const STYLES: Record<ContractStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-green-100 text-green-800" },
  expiring: { label: "Expiring soon", cls: "bg-amber-100 text-amber-800" },
  expired: { label: "Expired", cls: "bg-red-100 text-red-700" },
};

export default function ContractStatusBadge({ status, daysLeft }: { status: ContractStatus; daysLeft: number }) {
  const s = STYLES[status];
  const suffix = status === "expiring" ? ` · ${daysLeft}d left` : status === "expired" ? ` · ${-daysLeft}d ago` : "";
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", s.cls)}>{s.label}{suffix}</span>;
}
