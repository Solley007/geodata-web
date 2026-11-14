import { parseNairaFromText } from "@/convex/fxUtils.ts";
import FxEquivalents from "@/components/fx/fx-equivalents.tsx";
import { cn } from "@/lib/utils.ts";

/**
 * Shows USD/EUR/GBP equivalents for a hero slide whose tag contains a Naira
 * amount (e.g. "Amount: ₦130M"). Slides without an amount render nothing.
 */
export default function HeroFxLine({ tag, className }: { tag: string; className?: string }) {
  const naira = parseNairaFromText(tag);
  if (!naira) return null;
  return (
    <div className={cn("w-fit rounded-full bg-black/30 px-3.5 py-1 backdrop-blur-sm", className)}>
      <FxEquivalents naira={naira} variant="onDark" className="text-[13px] font-medium" />
    </div>
  );
}
