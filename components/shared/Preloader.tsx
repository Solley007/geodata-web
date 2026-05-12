"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import clsx from "clsx";

export default function Preloader() {
  const [mounted, setMounted] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer  = setTimeout(() => setExiting(true), 3200);
    const removeTimer = setTimeout(() => setMounted(false), 4000);
    return () => { clearTimeout(exitTimer); clearTimeout(removeTimer); };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={clsx(
        "fixed inset-0 z-[300] flex items-center justify-center",
        "bg-[#FAFAF7]",
        "transition-opacity duration-[800ms] ease-in-out",
        exiting ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Logo — large, centred, lifts in */}
      <div
        className="w-[95vw] max-w-6xl px-4"
        style={{
          animation: "geodata-preload-logo 900ms cubic-bezier(0.33,1,0.68,1) 150ms both",
        }}
      >
        <Image
          src="/geodata-full-logo.png"
          alt="Geodata World Services Limited"
          width={1584}
          height={396}
          priority
          className="w-full h-auto"
        />
      </div>

      {/* Gold progress bar — sweeps over 3.2s */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#E5E0D5]">
        <div
          className="h-full bg-[#C9A961] origin-left"
          style={{
            animation: "geodata-preload-bar 3.2s cubic-bezier(0.4,0,0.2,1) 0ms both",
          }}
        />
      </div>
    </div>
  );
}
