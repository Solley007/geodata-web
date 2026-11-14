import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

type TablePagerProps = {
  pageIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
  className?: string;
};

/** Numbered-page style Prev/Next control for cursor-based Convex pagination. */
export default function TablePager({
  pageIndex,
  hasNextPage,
  hasPrevPage,
  onNext,
  onPrev,
  isLoading,
  className,
}: TablePagerProps) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 ${className ?? ""}`}>
      <span className="text-xs text-gray-500">Page {pageIndex + 1}</span>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 px-2.5 text-xs gap-1"
          disabled={!hasPrevPage || isLoading}
          onClick={onPrev}
        >
          <ChevronLeft size={14} /> Prev
        </Button>
        <span className="h-8 min-w-8 px-2 flex items-center justify-center rounded-md bg-[var(--brand)] text-white text-xs font-semibold">
          {pageIndex + 1}
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 px-2.5 text-xs gap-1"
          disabled={!hasNextPage || isLoading}
          onClick={onNext}
        >
          Next <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
