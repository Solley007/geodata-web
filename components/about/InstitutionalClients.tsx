"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import { INSTITUTIONAL_WORK } from "@/lib/about-data";

// Map institutional client name -> corresponding project page slug.
// CBN and FIRS have dedicated project pages; the third entry (Ministries
// & Universities) covers multiple smaller projects so links to portfolio.
const CLIENT_PROJECT_LINKS: Record<string, string> = {
  "Central Bank of Nigeria": "/projects/cbn-maitama-portfolio",
  "Federal Inland Revenue Service": "/projects/firs-office-programme",
  "Federal Ministries & Universities": "/projects?category=Institutional",
};

/**
 * InstitutionalClients
 * ----
 * The receipts. CBN and FIRS hire Geodata. That is the single most
 * trust-conferring fact in the entire document, and it deserves a section
 * that lets the reader feel the weight.
 *
 * Dark background sets it apart from the rest of the page — used here
 * because the content is institutional, formal, and important.
 */
export default function InstitutionalClients() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".ic-fade", {
        y: 28,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="bg-navy-950 text-bone py-32 md:py-48 relative overflow-hidden"
    >
      {/* Subtle texture for atmospheric depth */}
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
        <div className="grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-7">
            <p className="ic-fade eyebrow text-bone/60 mb-6">Institutional clients</p>
            <h2 className="ic-fade text-display-lg font-display tracking-tightest">
              Trusted by the <em className="font-light">institutions</em> that don't choose lightly.
            </h2>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9 lg:pt-6">
            <p className="ic-fade text-lg leading-relaxed text-bone/80">
              Selected federal agencies and institutions that have engaged
              Geodata for renovation, construction, and infrastructure
              delivery work.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-12">
          {/* Tabs — left column on desktop, top on mobile */}
          <div className="col-span-12 lg:col-span-4">
            <div className="ic-fade flex lg:flex-col gap-2 lg:gap-1 overflow-x-auto lg:overflow-visible -mx-6 px-6 lg:mx-0 lg:px-0">
              {INSTITUTIONAL_WORK.map((client, i) => (
                <button
                  key={client.client}
                  onClick={() => setActive(i)}
                  className={clsx(
                    "shrink-0 lg:w-full text-left py-5 px-4 lg:px-0 lg:border-l-2 transition-all duration-400 ease-editorial",
                    active === i
                      ? "lg:border-gold lg:pl-6 bg-bone/5 lg:bg-transparent"
                      : "lg:border-bone/10 lg:pl-6 hover:lg:border-bone/40"
                  )}
                >
                  <p
                    className={clsx(
                      "font-display text-xl lg:text-2xl leading-tight transition-colors duration-300",
                      active === i ? "text-bone" : "text-bone/60"
                    )}
                  >
                    {client.client}
                  </p>
                  <p
                    className={clsx(
                      "mt-2 text-xs uppercase tracking-eyebrow transition-colors duration-300",
                      active === i ? "text-gold" : "text-bone/40"
                    )}
                  >
                    {client.projects.length}{" "}
                    {client.projects.length === 1 ? "project" : "projects"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Active client detail */}
          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <div key={active} className="ic-detail">
              <p className="eyebrow text-bone/60 mb-4">
                {INSTITUTIONAL_WORK[active].client}
              </p>
              <p className="text-xl leading-relaxed text-bone/85 mb-12">
                {INSTITUTIONAL_WORK[active].context}
              </p>

              <ul className="space-y-1">
                {INSTITUTIONAL_WORK[active].projects.map((project, i) => (
                  <li
                    key={i}
                    className="flex items-baseline gap-6 py-4 border-t border-bone/10"
                  >
                    <span className="font-display text-sm text-gold tabular-nums shrink-0">
                      {project.year}
                    </span>
                    <span className="text-bone/85 leading-relaxed">
                      {project.description}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Link to detail page if one exists for this client */}
              {CLIENT_PROJECT_LINKS[INSTITUTIONAL_WORK[active].client] && (
                <Link
                  href={CLIENT_PROJECT_LINKS[INSTITUTIONAL_WORK[active].client]}
                  className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-gold hover:text-bone transition-colors duration-400 pb-1 border-b border-gold hover:border-bone"
                >
                  View project page
                  <span aria-hidden>→</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Re-trigger the fade on tab change */}
      <style jsx>{`
        .ic-detail {
          animation: ic-in 0.5s var(--ease-editorial) both;
        }
        @keyframes ic-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
