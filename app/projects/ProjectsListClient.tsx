"use client";

import { useState, useMemo } from "react";
import ProjectsHeader from "@/components/projects/ProjectsHeader";
import ProjectsGrid from "@/components/projects/ProjectsGrid";
import { PROJECTS, type ProjectCategory } from "@/lib/projects-data";

export default function ProjectsListClient() {
  const [filter, setFilter] = useState<"All" | ProjectCategory>("All");

  const filtered = useMemo(() => {
    if (filter === "All") return PROJECTS;
    return PROJECTS.filter((p) => p.category === filter);
  }, [filter]);

  // Sort: Ongoing first (most relevant), then by completion year descending
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // Ongoing always first
      if (a.status === "Ongoing" && b.status !== "Ongoing") return -1;
      if (a.status !== "Ongoing" && b.status === "Ongoing") return 1;
      // Within same status, newest first
      const aYear = a.completionYear ?? a.year;
      const bYear = b.completionYear ?? b.year;
      return bYear - aYear;
    });
  }, [filtered]);

  return (
    <>
      <ProjectsHeader
        activeCategory={filter}
        onCategoryChange={setFilter}
        count={sorted.length}
      />
      <ProjectsGrid projects={sorted} />
    </>
  );
}
