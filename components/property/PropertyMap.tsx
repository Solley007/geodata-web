"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, NavigationControl, MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  latitude: number;
  longitude: number;
  label?: string;
}

/**
 * PropertyMap
 * ----
 * Editorial-styled Mapbox view for property location sections.
 *
 * Design notes:
 *  - Uses Mapbox's "Light" style as a base — minimal, monochrome, won't fight
 *    the brand. Could swap to a fully custom style later (Mapbox Studio).
 *  - Custom marker: navy ring with gold dot, pulsing softly. Matches the
 *    hairline aesthetic used throughout the site.
 *  - Scroll-zoom disabled to avoid hijacking page scroll. Users can still
 *    pan, click, and use the navigation control. This is the standard
 *    pattern for embedded property maps.
 *  - Smooth flyTo on mount adds character without being disruptive.
 *
 * Token loaded from NEXT_PUBLIC_MAPBOX_TOKEN env var.
 * If missing, renders a friendly placeholder rather than a broken map.
 */
export default function PropertyMap({ latitude, longitude, label }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Smooth flyTo when the map loads — subtle entrance, not flashy
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current.getMap();
    map.easeTo({
      center: [longitude, latitude],
      zoom: 15,
      duration: 2000,
      easing: (t: number) => 1 - Math.pow(1 - t, 4), // ease-out quart
    });
  }, [loaded, latitude, longitude]);

  // Graceful fallback if the token isn't configured
  if (!token) {
    return (
      <div className="relative aspect-[16/9] bg-navy-100 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,37,71,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,37,71,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-center px-8">
          <div>
            <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">Map unavailable</p>
            <p className="text-sm text-ink-muted dark:text-bone/60 max-w-sm">
              Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local to enable the
              interactive map.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/9] bg-navy-100 overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{
          longitude,
          latitude,
          zoom: 10, // start zoomed out, then easeTo zooms in on load
        }}
        // Satellite Streets — shows real aerial imagery + road labels.
        // Best choice for development sites in areas with low OSM vector coverage
        // like Idu, where vector styles render mostly blank.
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        // Disable scroll-zoom so the map doesn't hijack page scroll.
        // Users can still pan, drag, and use the +/- controls.
        scrollZoom={false}
        // Disable pitch/rotate to keep the look flat and editorial.
        // (Tilted 3D maps feel like Google Earth, not editorial.)
        dragRotate={false}
        touchPitch={false}
        // Disable the attribution control's default position — we add our own
        attributionControl={false}
        onLoad={() => setLoaded(true)}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Custom marker — pulsing navy ring + gold dot */}
        <Marker longitude={longitude} latitude={latitude} anchor="center">
          <div className="relative flex items-center justify-center">
            {/* Outer pulse */}
            <div className="absolute h-12 w-12 rounded-full bg-gold/20 animate-pulse-slow" />
            {/* Middle ring */}
            <div className="absolute h-6 w-6 rounded-full bg-bone dark:bg-navy-950 border-2 border-navy-900 dark:border-white/20" />
            {/* Inner dot */}
            <div className="relative h-2.5 w-2.5 rounded-full bg-gold-dark" />
          </div>
        </Marker>

        {/* Navigation control — only zoom, top-right, minimal */}
        <NavigationControl
          position="top-right"
          showCompass={false}
          showZoom={true}
          visualizePitch={false}
        />
      </Map>

      {/* Custom attribution overlay — bottom-right, minimal */}
      <div className="absolute bottom-2 right-2 bg-bone/80 backdrop-blur-sm px-2 py-1 text-[9px] uppercase tracking-eyebrow text-ink-faint dark:text-bone/40">
        © Mapbox · OSM
      </div>

      {/* Optional address label — bottom-left */}
      {label && (
        <div className="absolute bottom-4 left-4 bg-bone/95 backdrop-blur-sm px-4 py-3 max-w-xs">
          <p className="eyebrow text-ink-faint dark:text-bone/40 mb-1">Location</p>
          <p className="text-sm text-navy-950 dark:text-bone leading-snug">{label}</p>
        </div>
      )}
    </div>
  );
}
