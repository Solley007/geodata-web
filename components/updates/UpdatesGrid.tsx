"use client";

import { useState, useMemo } from "react";
import UpdateCard from "./UpdateCard";
import { PROJECTS } from "@/lib/projects-data";
import type { SiteUpdate } from "@/lib/site-updates-types";

export default function UpdatesGrid({ updates }: { updates: SiteUpdate[] }) {
  const [filter, setFilter] = useState<string>("all");

  // Only show project filter options that have at least one update
  const projectsWithUpdates = useMemo(() => {
    const slugs = new Set(updates.map((u) => u.projectSlug));
    return PROJECTS.filter((p) => slugs.has(p.slug));
  }, [updates]);

  const visible = useMemo(() => {
    if (filter === "all") return updates;
    return updates.filter((u) => u.projectSlug === filter);
  }, [updates, filter]);

  if (updates.length === 0) {
    return (
      <div className="bg-bone-100 dark:bg-navy-900 border border-dashed border-hairline dark:border-white/10 p-16 text-center">
        <p className="text-ink-muted dark:text-bone/60">No updates published yet. Check back soon.</p>
      </div>
    );
  }

  return (
    <>
      {/* Project filter */}
      {projectsWithUpdates.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-12">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors ${
              filter === "all"
                ? "bg-navy-900 text-bone border-navy-900"
                : "bg-transparent text-ink-muted dark:text-bone/60 border-hairline dark:border-white/15 hover:border-navy-900 dark:hover:border-bone/40"
            }`}
          >
            All projects ({updates.length})
          </button>
          {projectsWithUpdates.map((p) => {
            const count = updates.filter((u) => u.projectSlug === p.slug).length;
            return (
              <button
                key={p.slug}
                onClick={() => setFilter(p.slug)}
                className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors ${
                  filter === p.slug
                    ? "bg-navy-900 text-bone border-navy-900"
                    : "bg-transparent text-ink-muted dark:text-bone/60 border-hairline dark:border-white/15 hover:border-navy-900 dark:hover:border-bone/40"
                }`}
              >
                {p.title} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
        {visible.map((u) => (
          <UpdateCard key={u.id} update={u} />
        ))}
      </div>
    </>
  );
}
