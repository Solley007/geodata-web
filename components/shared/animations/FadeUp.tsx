"use client";

import { useLayoutEffect, useRef, ReactNode } from "react";
import { gsap } from "@/lib/gsap";

interface FadeUpProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
  start?: string; // ScrollTrigger start position
  stagger?: number; // If provided, animates direct children with stagger
}

/**
 * FadeUp — drop-in scroll-reveal wrapper
 * --------------------------------------
 * Usage:
 *   <FadeUp>
 *     <h2>This will fade up</h2>
 *   </FadeUp>
 *
 * For staggered children:
 *   <FadeUp stagger={0.1}>
 *     <p>Line one</p>
 *     <p>Line two</p>
 *   </FadeUp>
 */
export default function FadeUp({
  children,
  delay = 0,
  duration = 1,
  y = 30,
  className = "",
  start = "top 80%",
  stagger,
}: FadeUpProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      const target = stagger ? ref.current!.children : ref.current;
      gsap.from(target, {
        y,
        opacity: 0,
        duration,
        delay,
        ease: "power3.out",
        stagger: stagger ?? 0,
        scrollTrigger: { trigger: ref.current, start },
      });
    }, ref);

    return () => ctx.revert();
  }, [delay, duration, y, start, stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
