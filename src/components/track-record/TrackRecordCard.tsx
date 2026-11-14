import { Link } from "react-router-dom";
import { MapPin, Calendar, ImageIcon, ArrowRight, Play } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { CATEGORY_LABEL, CATEGORY_STYLE, getFacts, type TrackProject } from "./track-record-utils.ts";

export default function TrackRecordCard({ project }: { project: TrackProject }) {
  const facts = getFacts(project);
  return (
    <Link
      to={`/track-record/${project.slug}`}
      className="group flex flex-col bg-card text-card-foreground border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-[var(--brand)]/40 transition-all cursor-pointer"
    >
      <div className="relative h-48 bg-muted overflow-hidden">
        {project.coverResolvedUrl ? (
          <img src={project.coverResolvedUrl} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <ImageIcon size={40} />
          </div>
        )}
        <span className={cn("absolute top-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full", CATEGORY_STYLE[project.category])}>
          {project.projectType || CATEGORY_LABEL[project.category]}
        </span>
        {project.videoItems.length > 0 && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/70 text-white">
            <Play size={11} className="fill-current" /> Video
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg line-clamp-1 mb-1.5">{project.name}</h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1.5 min-w-0"><MapPin size={13} className="shrink-0" /><span className="truncate">{project.location}</span></span>
          <span className="flex items-center gap-1.5 shrink-0"><Calendar size={13} />{project.yearCompleted}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.shortDescription}</p>
        {facts.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-4">
            {facts.map((f) => (
              <span key={f.label}><span className="font-bold">{f.value}</span> <span className="text-muted-foreground">{f.label}</span></span>
            ))}
          </div>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand)] group-hover:gap-2.5 transition-all">
          View project <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}
