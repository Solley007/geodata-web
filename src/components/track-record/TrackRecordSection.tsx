import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import TrackRecordCard from "./TrackRecordCard.tsx";
import { CATEGORY_LABEL, FILTER_THRESHOLD, PREVIEW_COUNT, type TrackCategory } from "./track-record-utils.ts";

type Props = {
  /** Which category to show by default. Omit to show everything. */
  category?: TrackCategory;
  /** Landing-page mode: first few cards plus a "View all" link. */
  preview?: boolean;
  heading?: string;
  eyebrow?: string;
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer",
        active ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-card text-muted-foreground border-border hover:border-[var(--brand)]/50",
      )}
    >
      {children}
    </button>
  );
}

// Shared Track Record grid. Renders nothing when the admin switch is off or
// there are no projects yet, so landing pages never show an empty section.
export default function TrackRecordSection({ category, preview = false, heading = "Our Track Record", eyebrow = "Delivered Projects" }: Props) {
  const projects = useQuery(api.trackRecord.listPublic);
  const [cat, setCat] = useState<TrackCategory | "all">(category ?? "all");
  const [year, setYear] = useState<number | "all">("all");
  const [place, setPlace] = useState<string>("all");

  // Filters appear automatically once there are enough projects overall
  const showFilters = (projects?.length ?? 0) >= FILTER_THRESHOLD;
  const activeCat = showFilters ? cat : (category ?? "all");

  const years = useMemo(() => Array.from(new Set((projects ?? []).map((p) => p.yearCompleted))).sort((a, b) => b - a), [projects]);
  const places = useMemo(() => Array.from(new Set((projects ?? []).map((p) => p.state || p.location))).sort(), [projects]);

  if (projects === undefined) {
    return (
      <section className="py-20"><div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}
      </div></section>
    );
  }

  const filtered = projects.filter((p) =>
    (activeCat === "all" || p.category === activeCat) &&
    (!showFilters || year === "all" || p.yearCompleted === year) &&
    (!showFilters || place === "all" || (p.state || p.location) === place),
  );
  if (projects.length === 0 || (filtered.length === 0 && !showFilters)) return null;

  const shown = preview ? filtered.slice(0, PREVIEW_COUNT) : filtered;

  return (
    <section id="track-record" className="py-20 lg:py-24 bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-3">{eyebrow}</span>
            <h2 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>{heading}</h2>
          </div>
          {preview && filtered.length > PREVIEW_COUNT && (
            <Link to="/track-record" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-[var(--brand)] transition-colors shrink-0">
              View all completed projects <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {showFilters && (
          <div className="space-y-3 mb-8">
            <div className="flex flex-wrap gap-2">
              <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
              {(Object.keys(CATEGORY_LABEL) as TrackCategory[]).map((c) => (
                <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip active={year === "all"} onClick={() => setYear("all")}>Any year</Chip>
              {years.map((y) => <Chip key={y} active={year === y} onClick={() => setYear(y)}>{y}</Chip>)}
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip active={place === "all"} onClick={() => setPlace("all")}>Any location</Chip>
              {places.map((l) => <Chip key={l} active={place === l} onClick={() => setPlace(l)}>{l}</Chip>)}
            </div>
            <p className="text-xs text-muted-foreground">{filtered.length} project{filtered.length === 1 ? "" : "s"}</p>
          </div>
        )}

        {shown.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No projects match these filters.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shown.map((p) => <TrackRecordCard key={p._id} project={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}
