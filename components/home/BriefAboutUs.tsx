"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { ABOUT } from "@/lib/site-content";

export default function BriefAboutUs() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".about-fade", {
        y: 28,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
      gsap.from(".about-rule", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative py-8 md:py-10 overflow-hidden">

      {/* Background photo */}
      <Image
        src="/workers-geodata.jpg"
        alt="Geodata team reviewing construction drawings on site"
        fill
        sizes="100vw"
        className="object-cover object-center"
        priority={false}
      />

      {/* Dark overlay — navy tint keeps brand palette, 70% gives legible text */}
      <div className="absolute inset-0 bg-navy-950/70" />

      {/* Content */}
      <div className="relative z-10 container-editorial">
        <div className="grid grid-cols-12 gap-12">

          {/* Left — full logo */}
          <div className="col-span-12 lg:col-span-4 about-fade">
            <p className="eyebrow !text-white mb-5">About Geodata</p>
            {/* Crops the 4000×4000 PNG to its 2396×907 lockup (bbox starts at 665,1743). */}
            <div
              role="img"
              aria-label="Geodata World Services Limited"
              className="block w-full max-w-[300px] aspect-[2396/907] bg-no-repeat mb-6"
              style={{
                backgroundImage: "url(/geodata-full-logo-white.png)",
                backgroundSize: "166.94% auto",
                backgroundPosition: "41.46% 56.36%",
              }}
            />
          </div>

          {/* Right — manifesto headline + mission/vision */}
          <div className="col-span-12 lg:col-span-8">
            <h2 className="about-fade text-display-lg font-display text-bone tracking-tightest leading-[1.05] mb-10">
              {ABOUT.manifesto}
            </h2>

            <div className="about-rule h-px w-full bg-bone/25 mb-8 origin-left" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="about-fade">
                <p className="eyebrow !text-white mb-5">Mission</p>
                <p className="text-lg leading-relaxed text-bone/80">{ABOUT.mission}</p>
              </div>

              <div className="about-fade">
                <p className="eyebrow !text-white mb-5">Vision</p>
                <p className="text-lg leading-relaxed text-bone/80">{ABOUT.vision}</p>
              </div>
            </div>

            <div className="about-fade mt-10 flex items-center gap-6 flex-wrap">
              <Link
                href="/about"
                className="inline-flex items-center gap-3 bg-bone px-7 py-4 text-sm font-medium text-navy-950 hover:bg-gold-soft transition-colors duration-400"
              >
                More about Geodata
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 text-sm font-medium text-bone hover:text-gold-soft transition-colors duration-400 pb-1 border-b border-bone/40 hover:border-gold-soft"
              >
                See the body of work
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

