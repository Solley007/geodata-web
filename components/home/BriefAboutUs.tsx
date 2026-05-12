"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "@/lib/gsap";

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
    <section ref={root} className="relative py-16 md:py-24 overflow-hidden">

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

          {/* Left — cube mark + wordmark */}
          <div className="col-span-12 lg:col-span-4 about-fade">
            <p className="eyebrow text-bone/60 mb-8">About Geodata</p>
            <div className="flex items-center gap-3 mb-10">
              <Image
                src="/geodata-mark.png"
                alt=""
                width={52}
                height={52}
                className="h-13 w-13 shrink-0"
                aria-hidden
              />
              <div>
                <p className="font-brand text-2xl text-bone tracking-tight leading-none">
                  GEODATA<span className="text-gold">.</span>
                </p>
                <p className="text-[11px] uppercase tracking-widest text-bone/55 mt-1">
                  World Services Limited
                </p>
              </div>
            </div>
          </div>

          {/* Right — manifesto headline + mission/vision */}
          <div className="col-span-12 lg:col-span-8">
            <h2 className="about-fade text-display-lg font-display text-bone tracking-tightest leading-[1.05] mb-16">
              We build places{" "}
              <em className="font-light">that hold their value</em>{" "}
              across generations.
            </h2>

            <div className="about-rule h-px w-full bg-bone/25 mb-12 origin-left" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="about-fade">
                <p className="eyebrow text-bone/50 mb-5">Mission</p>
                {/* PLACEHOLDER MISSION — replace with the company's actual mission statement */}
                <p className="text-lg leading-relaxed text-bone/80">
                  To deliver world-class residential, commercial, and
                  infrastructure projects that meet international standards —
                  built honestly, finished considerately, and engineered to
                  last.
                </p>
              </div>

              <div className="about-fade">
                <p className="eyebrow text-bone/50 mb-5">Vision</p>
                {/* PLACEHOLDER VISION — replace with the company's actual vision statement */}
                <p className="text-lg leading-relaxed text-bone/80">
                  To be Nigeria's most trusted real estate developer — known
                  for the quiet quality of our work and the integrity of every
                  transaction.
                </p>
              </div>
            </div>

            <div className="about-fade mt-16 flex items-center gap-6 flex-wrap">
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

