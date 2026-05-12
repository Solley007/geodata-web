"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import SectionErrorBoundary from "@/components/shared/SectionErrorBoundary";

// ─── OFFICE COORDINATES ────────────────────────────────────────────────────
// To get the exact coordinates:
//   1. Open Google Maps and find "Plot 93, Cadastral Zone B10, Dakibiyu, Abuja"
//   2. Right-click the exact location → copy the two numbers shown
//   3. Paste below (first number = lat, second = lng)
const OFFICE = {
  lat: 9.047605395407187,
  lng: 7.4136454589349094,
  address: "Plot 93, Cadastral Zone B10\nDakibiyu, FCT Abuja",
  label: "Geodata World Services",
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function MapInner() {
  const mapRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    mapRef.current.getMap().easeTo({
      center: [OFFICE.lng, OFFICE.lat],
      zoom: 15,
      duration: 1800,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
    });
  }, [loaded]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bone-100 dark:bg-navy-900">
        <p className="text-sm text-ink-muted dark:text-bone/60">
          Add <code className="font-mono text-xs bg-navy-100 dark:bg-navy-800 px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> to .env.local to activate the map.
        </p>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: OFFICE.lng, latitude: OFFICE.lat, zoom: 12 }}
      mapboxAccessToken={MAPBOX_TOKEN}
      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
      onLoad={() => setLoaded(true)}
      attributionControl={false}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {/* Office marker */}
      <Marker longitude={OFFICE.lng} latitude={OFFICE.lat} anchor="center">
        <div className="relative flex items-center justify-center">
          <span className="absolute h-10 w-10 rounded-full bg-gold/30 animate-ping" />
          <span className="relative flex h-4 w-4 rounded-full bg-gold border-2 border-bone shadow-lg" />
        </div>
      </Marker>
    </Map>
  );
}

export default function ContactMap() {
  return (
    <section className="bg-bone dark:bg-navy-950">
      {/* Section header */}
      <div className="container-editorial py-16 border-t border-hairline dark:border-white/10">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">Find us</p>
            <h2 className="font-display text-display-md text-navy-950 dark:text-bone tracking-tightest">
              Our office.
            </h2>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${OFFICE.lat},${OFFICE.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone/90 hover:text-gold-dark dark:hover:text-gold transition-colors duration-400 pb-1 border-b border-navy-900 dark:border-bone/40 hover:border-gold-dark dark:hover:border-gold"
          >
            Get directions
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </a>
        </div>
      </div>

      {/* Map — full viewport width, 480px tall */}
      <div className="relative w-full h-[480px] md:h-[560px]">
        <SectionErrorBoundary sectionName="Office Map">
          <MapInner />
        </SectionErrorBoundary>

        {/* Address card overlay — bottom left */}
        <div className="absolute bottom-6 left-6 z-10 bg-bone/97 dark:bg-navy-950/97 backdrop-blur-sm border border-hairline dark:border-white/10 px-6 py-5 max-w-xs shadow-lg">
          <p className="eyebrow text-ink-faint dark:text-bone/40 mb-2">{OFFICE.label}</p>
          <p className="text-sm text-navy-950 dark:text-bone leading-relaxed whitespace-pre-line">
            {OFFICE.address}
          </p>
          <p className="mt-3 text-xs text-ink-muted dark:text-bone/60">
            Mon–Sat · 9:00 AM – 6:00 PM
          </p>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-16 bg-bone dark:bg-navy-950" />
    </section>
  );
}
