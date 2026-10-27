"use client";

import { useMemo } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl";
import clsx from "clsx";
import "mapbox-gl/dist/mapbox-gl.css";
import SiteImageryLayer from "@/components/shared/SiteImageryLayer";
import { latestCaptureDate } from "@/lib/site-imagery";
import { formatUpdateDate } from "@/lib/site-updates-types";
import type { AvailabilitySummary } from "@/lib/availability-types";

export interface SitePlanMapPlot {
  slug:    string;
  title:   string;
  plotNo:  string;
  coords:  { lat: number; lng: number };
  summary: AvailabilitySummary;
}

interface Props {
  plots:    SitePlanMapPlot[];
  selected: string;
  onSelect: (slug: string) => void;
}

/**
 * SitePlanMap
 * ----
 * Satellite view of Southern Bridge City with one marker per typology
 * plot. Each marker shows how many units are still available. Uses the
 * same satellite style and scroll behaviour as PropertyMap.
 */
export default function SitePlanMap({ plots, selected, onSelect }: Props) {
  const token  = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const captured = latestCaptureDate();

  // Open framed on every plot. Set as the initial view rather than fitting
  // on load, because image overlays can hold back the map's load event.
  const bounds = useMemo((): [[number, number], [number, number]] => {
    const lngs = plots.map((p) => p.coords.lng);
    const lats = plots.map((p) => p.coords.lat);
    return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
  }, [plots]);

  if (!token) return null;

  return (
    <div className="relative h-full min-h-[360px] bg-navy-100 overflow-hidden">
      <Map
        mapboxAccessToken={token}
        initialViewState={{ bounds, fitBoundsOptions: { padding: 70, maxZoom: 17 } }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        scrollZoom={false}
        dragRotate={false}
        touchPitch={false}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Our latest drone orthophoto, over Mapbox's older imagery */}
        <SiteImageryLayer />

        {plots.map((p) => {
          const active   = p.slug === selected;
          const noData   = p.summary.total === 0;
          const soldOut  = !noData && p.summary.available === 0;
          return (
            <Marker
              key={p.slug}
              longitude={p.coords.lng}
              latitude={p.coords.lat}
              anchor="bottom"
              style={{ zIndex: active ? 2 : 1 }}
              onClick={(e) => { e.originalEvent.stopPropagation(); onSelect(p.slug); }}
            >
              <button
                type="button"
                aria-label={`${p.title}, plot ${p.plotNo}`}
                aria-pressed={active}
                className={clsx(
                  "flex flex-col items-center transition-transform duration-300",
                  active ? "scale-110" : "hover:scale-105"
                )}
              >
                {/* Plots sit close together, so only the selected pin shows
                    its full label; the rest show a count, name on hover */}
                <span
                  title={p.title}
                  className={clsx(
                    "group/pin flex items-center gap-2 text-[11px] font-medium shadow-lg whitespace-nowrap",
                    active ? "px-3 py-1.5" : "px-2 py-1",
                    active
                      ? "bg-accent text-bone"
                      : soldOut || noData
                        ? "bg-bone/90 text-ink-muted"
                        : "bg-navy-950 text-bone"
                  )}
                >
                  <span className={clsx(!active && "hidden group-hover/pin:inline")}>{p.title}</span>
                  <span className={clsx(active && "opacity-75")}>
                    {noData ? "?" : soldOut ? "Sold out" : active ? `${p.summary.available} left` : p.summary.available}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={clsx(
                    "h-2.5 w-2.5 rotate-45 -mt-1.5",
                    active ? "bg-accent" : soldOut || noData ? "bg-bone/90" : "bg-navy-950"
                  )}
                />
              </button>
            </Marker>
          );
        })}

        <NavigationControl position="top-right" showCompass={false} showZoom visualizePitch={false} />
      </Map>

      <div className="absolute bottom-2 right-2 bg-bone/80 backdrop-blur-sm px-2 py-1 text-[9px] uppercase tracking-eyebrow text-ink-faint">
        {captured ? `Drone survey ${formatUpdateDate(captured)} · ` : ""}© Mapbox · OSM
      </div>
    </div>
  );
}
