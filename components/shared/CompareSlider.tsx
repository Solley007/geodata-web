/**
 * CompareSlider — drag-to-compare two photos of the same angle.
 *
 * The single most visceral "this developer actually builds" widget.
 * Use the SAME camera angle from two different months.
 *
 *   <CompareSlider
 *     before={{ src: "/updates/block-c-march.jpg", label: "MARCH 2026" }}
 *     after={{  src: "/updates/block-c-may.jpg",   label: "MAY 2026" }}
 *     alt="Block C construction progress"
 *   />
 *
 * Touch + mouse + keyboard accessible. No dependencies.
 */
"use client";

import React, { useCallback, useRef, useState } from "react";

interface Side {
  src: string;
  label: string;
}

interface Props {
  before: Side;
  after: Side;
  alt: string;
  className?: string;
}

export default function CompareSlider({ before, after, alt, className = "" }: Props) {
  const [pos, setPos] = useState(50); // percentage of "after" revealed
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) updateFromClientX(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
    if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video overflow-hidden select-none touch-none bg-navy-950 ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* AFTER (base layer) */}
      <img
        src={after.src}
        alt={`${alt} (${after.label})`}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {/* BEFORE (clipped overlay) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${pos}%` }}
        aria-hidden
      >
        <img
          src={before.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            width: containerRef.current ? containerRef.current.offsetWidth : "100%",
            maxWidth: "none",
          }}
          draggable={false}
        />
      </div>

      {/* Divider + handle */}
      <div
        className="absolute top-0 bottom-0 z-10"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
      >
        <div className="h-full w-0.5 bg-bone/90" />
        <button
          type="button"
          aria-label="Drag to compare before and after"
          onKeyDown={onKeyDown}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-bone text-navy-950 shadow-lg inline-flex items-center justify-center touch-manipulation focus:outline-none focus:ring-2 focus:ring-bone"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
          </svg>
        </button>
      </div>

      {/* Labels */}
      <span className="absolute top-4 left-4 z-10 bg-navy-950/80 text-bone text-[10px] uppercase tracking-eyebrow px-3 py-1.5">
        {before.label}
      </span>
      <span className="absolute top-4 right-4 z-10 bg-accent text-white text-[10px] uppercase tracking-eyebrow px-3 py-1.5">
        {after.label}
      </span>
    </div>
  );
}
