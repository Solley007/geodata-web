import { useQuery } from "convex/react";
import { format } from "date-fns";
import { CalendarCheck, CalendarClock, EyeOff, MessageCircle } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

const RENEW_WHATSAPP = "https://wa.me/2347047620492";

/** Partner-facing contract status with a renew prompt when expiring or delisted. */
export default function MyContractBanner({ partnerName }: { partnerName: string }) {
  const c = useQuery(api.partnerContracts.getMyContract, {});
  if (!c) return null;

  const end = format(new Date(`${c.endDate}T00:00:00`), "d MMMM yyyy");
  const needsAction = c.delisted || c.status !== "active";
  const renewHref = `${RENEW_WHATSAPP}?text=${encodeURIComponent(`Hello, I'd like to renew the partnership agreement for ${partnerName}.`)}`;

  const { icon: Icon, title, body, tone } = c.delisted
    ? {
        icon: EyeOff,
        title: "Your public listing is paused",
        body: `${c.delistReason ? `${c.delistReason}. ` : ""}Your dashboard, referral link and earned commissions are not affected.`,
        tone: "red",
      }
    : c.status === "expired"
      ? { icon: CalendarClock, title: `Your agreement ended on ${end}`, body: "Renew to keep your logo and profile on our website.", tone: "red" }
      : c.status === "expiring"
        ? {
            icon: CalendarClock,
            title: `Your agreement ends in ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`,
            body: `Ends ${end}. Renew now so your listing continues without a break.`,
            tone: "amber",
          }
        : { icon: CalendarCheck, title: "Partnership agreement active", body: `Runs until ${end}.`, tone: "green" };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4",
        tone === "red" && "border-red-200 bg-red-50 text-red-800",
        tone === "amber" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "green" && "border-green-100 bg-green-50 text-green-800",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs opacity-90">{body}</p>
        </div>
      </div>
      {needsAction && (
        <Button asChild size="sm" className="cursor-pointer gap-1.5 bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]">
          <a href={renewHref} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> Renew partnership</a>
        </Button>
      )}
    </div>
  );
}
