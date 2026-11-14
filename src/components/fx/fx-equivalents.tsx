import { format } from "date-fns";
import { Info } from "lucide-react";
import { useFxRates } from "@/hooks/use-fx-rates.ts";
import { cn } from "@/lib/utils.ts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

type Variant = "inline" | "chips" | "onDark";

type Props = {
  naira: number | null | undefined;
  variant?: Variant;
  className?: string;
  /** Show the small "approximate rate" info icon. */
  showNote?: boolean;
};

/**
 * Approximate USD / EUR / GBP equivalents of a Naira price.
 * Renders nothing while loading, when disabled by admin, or without rates.
 */
export default function FxEquivalents({ naira, variant = "inline", className, showNote = false }: Props) {
  const { convert, updatedAt } = useFxRates();
  const items = convert(naira);
  if (items.length === 0) return null;

  const note = `Approximate${updatedAt ? ` · rates updated ${format(new Date(updatedAt), "d MMM yyyy, h:mma")}` : ""}. Prices are set and payable in Naira.`;

  const noteIcon = showNote && (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label="About these conversions" className="inline-flex cursor-pointer opacity-70 hover:opacity-100">
          <Info size={12} />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-60 text-xs">{note}</TooltipContent>
    </Tooltip>
  );

  if (variant === "chips") {
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex flex-wrap items-center gap-1.5">
          {items.map((i) => (
            <span key={i.currency} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-700 tabular-nums">
              ≈ {i.label}
            </span>
          ))}
          {noteIcon}
        </div>
        {showNote && <p className="text-[11px] text-gray-400">{note}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tabular-nums",
        variant === "onDark" ? "text-white/85" : "text-gray-500",
        className,
      )}
    >
      <span aria-hidden>≈</span>
      {items.map((i, idx) => (
        <span key={i.currency} className="whitespace-nowrap">
          {idx > 0 && <span className="pr-2 opacity-40">·</span>}
          {i.label}
        </span>
      ))}
      {noteIcon}
    </div>
  );
}
