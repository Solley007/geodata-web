"use client";

import { Layer, Source } from "react-map-gl";
import { SITE_IMAGERY } from "@/lib/site-imagery";

/**
 * SiteImageryLayer
 * ----
 * Renders our own drone orthophotos (lib/site-imagery.ts) on top of the
 * Mapbox satellite base, so the site shows its current state. Place inside
 * a react-map-gl <Map>. Renders nothing until an overlay is configured.
 * Markers are HTML elements, so they always stay above these layers.
 */
export default function SiteImageryLayer() {
  return (
    <>
      {SITE_IMAGERY.map((img) =>
        img.type === "image" ? (
          <Source key={img.id} id={`imagery-${img.id}`} type="image" url={img.url} coordinates={img.corners}>
            <Layer id={`imagery-${img.id}-layer`} type="raster" paint={{ "raster-fade-duration": 0 }} />
          </Source>
        ) : (
          <Source key={img.id} id={`imagery-${img.id}`} type="raster" url={`mapbox://${img.tilesetId}`} tileSize={256}>
            <Layer id={`imagery-${img.id}-layer`} type="raster" />
          </Source>
        )
      )}
    </>
  );
}
