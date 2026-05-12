"use client";

import { useState, useMemo } from "react";
import PropertiesHeader from "@/components/properties/PropertiesHeader";
import PropertyGrid from "@/components/properties/PropertyGrid";
import { PROPERTIES, type PropertyType } from "@/lib/properties-list";

export default function PropertiesListClient() {
  const [filter, setFilter] = useState<"All" | PropertyType>("All");

  const filtered = useMemo(() => {
    if (filter === "All") return PROPERTIES;
    return PROPERTIES.filter((p) => p.type === filter);
  }, [filter]);

  return (
    <>
      <PropertiesHeader
        activeFilter={filter}
        onFilterChange={setFilter}
        count={filtered.length}
      />
      <PropertyGrid properties={filtered} />
    </>
  );
}
