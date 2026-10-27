"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const STEPS = [
  {
    n: "01",
    title: "See it live",
    body: "Book a live video walkthrough on WhatsApp. We walk the estate, the typology you are interested in, and a finished reference unit where available, in your time zone.",
  },
  {
    n: "02",
    title: "Send someone, or don't",
    body: "A family member or representative is welcome to visit in person on your behalf. If no one can make it, the video tour and documentation are enough to proceed.",
  },
  {
    n: "03",
    title: "Reserve your unit",
    body: "Reserve with a 5% commitment fee and receive your provisional allocation letter. Choose to pay outright or explore MREIF financing.",
  },
  {
    n: "04",
    title: "Follow the build",
    body: "Track construction through our published site updates and progress photos, and message the team on WhatsApp whenever you want a closer look.",
  },
];

export default function DiasporaSteps() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".dsteps-fade", {
        y: 32,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bg-bone-100 dark:bg-navy-900 py-32 md:py-48">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-5 dsteps-fade">
            <p className="eyebrow mb-6">How it works</p>
            <h2 className="text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest">
              Four steps. No flight required.
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:pt-6 dsteps-fade">
            <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
              You deal with Geodata directly, not an agent chain. The same team
              that builds the home answers your questions, handles your
              paperwork and shows you the site.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step) => (
            <div key={step.n} className="dsteps-fade">
              <p className="font-display text-6xl text-accent-dark tracking-tightest leading-none mb-6">
                {step.n}
              </p>
              <h3 className="font-display text-2xl text-navy-950 dark:text-bone mb-4 leading-tight">
                {step.title}
              </h3>
              <p className="text-ink dark:text-bone/75 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
