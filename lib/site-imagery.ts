// ---------------------------------------------------------------------------
// Drone imagery overlays, drawn on top of Mapbox's satellite view so our
// maps show the site as it is now rather than Mapbox's older capture.
// Used by components/shared/SiteImageryLayer.tsx (site plan + property maps).
// ---------------------------------------------------------------------------
//
// HOW TO ADD OR REFRESH AN ORTHOPHOTO
//
// The image must be a top-down orthophoto (orthomosaic) from a mapping
// flight, not an angled drone photo, or it won't line up with the plots.
//
// Option A, small sites (simplest). Export from your photogrammetry software
// (DroneDeploy, Pix4D, WebODM, Agisoft...) as a GeoTIFF, then with GDAL:
//
//   # 1. Reproject to plain lat/lng and cap the size for the web
//   gdalwarp -t_srs EPSG:4326 -ts 4096 0 -r lanczos ortho.tif ortho-4326.tif
//   # 2. Convert to a web image (WebP keeps it small)
//   gdal_translate -of WEBP -co QUALITY=82 ortho-4326.tif sbc-ortho-2026-10.webp
//   # 3. Read the corner coordinates for `corners` below
//   gdalinfo ortho-4326.tif     → Upper Left / Upper Right / Lower Right / Lower Left
//
//   Put the .webp in /public/imagery/ and fill in an "image" entry below.
//   Use a new file name for each flight so browsers don't show a cached copy.
//
// Option B, large or very detailed surveys. Upload the GeoTIFF in Mapbox
// Studio → Tilesets → New tileset, then fill in a "tileset" entry with the
// tileset ID it gives you (looks like "geodata.abc123xy").
// ---------------------------------------------------------------------------

/** [longitude, latitude] */
type LngLat = [number, number];

export type SiteImagery =
  | {
      type:       "image";
      id:         string;
      url:        string;                       // path in /public, e.g. "/imagery/sbc-ortho-2026-10.webp"
      /** Clockwise from top-left: upper-left, upper-right, lower-right, lower-left */
      corners:    [LngLat, LngLat, LngLat, LngLat];
      capturedAt: string;                       // YYYY-MM-DD, shown on the map
    }
  | {
      type:       "tileset";
      id:         string;
      tilesetId:  string;                       // e.g. "geodata.abc123xy"
      capturedAt: string;
    };

export const SITE_IMAGERY: SiteImagery[] = [
  // ── Southern Bridge City, add the latest orthophoto here ───────────────
  // {
  //   type:       "image",
  //   id:         "sbc",
  //   url:        "/imagery/sbc-ortho-2026-10.webp",
  //   corners:    [
  //     [7.3620, 9.0300],   // upper-left  (lng, lat)
  //     [7.3740, 9.0300],   // upper-right
  //     [7.3740, 9.0180],   // lower-right
  //     [7.3620, 9.0180],   // lower-left
  //   ],
  //   capturedAt: "2026-10-01",
  // },
];

/** Most recent capture date across overlays, for the map caption */
export function latestCaptureDate(): string | null {
  const dates = SITE_IMAGERY.map((i) => i.capturedAt).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}
