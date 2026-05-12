"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import type { Property } from "@/lib/property-data";

interface Props {
  property: Property;
}

export default function PropertyEnquire({ property }: Props) {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".enquire-fade", {
        y: 30,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      id="enquire"
      className="bg-navy-950 text-bone py-32 md:py-48 relative overflow-hidden"
    >
      {/* Texture overlay for atmospheric depth */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(250,250,247,0.6) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="container-editorial relative">
        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-7">
            <p className="enquire-fade eyebrow text-bone/60 mb-6">
              Begin a conversation
            </p>
            <h2 className="enquire-fade text-display-lg font-display tracking-tightest leading-none">
              Visit {property.title} <em className="font-light">in person.</em>
            </h2>
            <p className="enquire-fade mt-10 text-lg text-bone/80 leading-relaxed max-w-xl">
              Our sales pavilion is open daily on-site at Southern Bridge City.
              We'll walk you through the show home, talk through MREIF
              eligibility, and share the full reservation process.
            </p>

            <div className="enquire-fade mt-12 flex flex-wrap items-center gap-4">
              <a
                href="/contact"
                className="inline-flex items-center gap-3 bg-bone dark:bg-navy-950 px-7 py-4 text-sm font-medium text-navy-950 dark:text-bone hover:bg-gold-soft transition-colors duration-400"
              >
                Schedule a visit <span aria-hidden>→</span>
              </a>
              <a
                href="tel:+2347047620492"
                className="inline-flex items-center gap-3 px-7 py-4 text-sm font-medium text-bone border-b border-bone hover:text-gold-soft hover:border-gold-soft transition-colors duration-400"
              >
                +234 704 762 0492
              </a>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 lg:col-start-9 lg:pt-6">
            <p className="enquire-fade eyebrow text-bone/60 mb-6">Sales pavilion</p>
            <p className="enquire-fade text-bone/80 leading-relaxed">
              {property.locationContext.address}
            </p>
            <p className="enquire-fade mt-6 text-bone/80 leading-relaxed">
              Mon–Sat, 9:00 AM – 6:00 PM<br />
              Sunday by appointment only
            </p>
            <p className="enquire-fade mt-6 text-sm text-bone/60">
              <a href="mailto:hello@geodata.com.ng" className="hover:text-bone transition-colors">
                hello@geodata.com.ng
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
