"use client";

import { useState, useMemo } from "react";
import PropertiesHeader from "@/components/properties/PropertiesHeader";
import PropertyGrid from "@/components/properties/PropertyGrid";
import { PROPERTIES, type PropertyType } from "@/lib/properties-list";

export default function PropertiesListClient() {
  const [filter, setFilter] = useState<"All" | PropertyType>("All");

  // Hide typologies explicitly marked Sold Out.
  // (We previously filtered by `available > 0`, but inventory counts aren't
  // tracked reliably yet — so we trust the status field instead.)
  const activeProperties = useMemo(
    () => PROPERTIES.filter((p) => p.status !== "Sold Out"),
    []
  );

  const filtered = useMemo(() => {
    if (filter === "All") return activeProperties;
    return activeProperties.filter((p) => p.type === filter);
  }, [filter, activeProperties]);

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
