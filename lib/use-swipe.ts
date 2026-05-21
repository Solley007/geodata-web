"use client";

import { useRef } from "react";

interface SwipeHandlers {
  onSwipeLeft?:  () => void;
  onSwipeRight?: () => void;
}

const SWIPE_THRESHOLD = 50;
const MAX_VERTICAL    = 80;

/**
 * Touch-swipe hook for mobile gallery navigation.
 * Returns onTouchStart/onTouchEnd handlers to spread onto a container.
 * A horizontal swipe past the threshold fires the matching callback.
 * Vertical drags above MAX_VERTICAL are ignored so page scrolling still works.
 */
export function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  const startX = useRef(0);
  const startY = useRef(0);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const t  = e.changedTouches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      if (Math.abs(dy) > MAX_VERTICAL)    return;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (dx < 0) onSwipeLeft?.();
      else        onSwipeRight?.();
    },
  };
}
