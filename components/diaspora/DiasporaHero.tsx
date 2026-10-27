"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { SOCIAL } from "@/lib/site-content";
import BookViewingButton from "@/components/shared/BookViewingButton";
import CurrencySwitcher from "@/components/shared/CurrencySwitcher";
import Price from "@/components/shared/Price";

const WA_DIASPORA = `${SOCIAL.whatsapp}?text=${encodeURIComponent(
  "Hello, I live abroad and would like to know more about buying a Geodata home."
)}`;

export default function DiasporaHero() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });
      tl.from(".dhero-eyebrow", { y: 16, opacity: 0, duration: 0.8 })
        .from(".dhero-line", { yPercent: 110, duration: 1, stagger: 0.08, ease: "expo.out" }, "-=0.5")
        .from(".dhero-sub", { y: 16, opacity: 0, duration: 0.8, stagger: 0.1 }, "-=0.6");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative bg-navy-950 text-bone pt-40 pb-32 md:pt-48 md:pb-40 overflow-hidden"
    >
      {/* Texture */}
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
        <p className="dhero-eyebrow eyebrow text-bone/60 mb-10">For Nigerians abroad</p>

        <h1 className="text-display-xl font-display tracking-tightest max-w-5xl">
          <span className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
            <span className="dhero-line block">A home in Abuja.</span>
          </span>
          <span className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
            <span className="dhero-line block italic font-light">
              Bought from anywhere.
            </span>
          </span>
        </h1>

        <p className="dhero-sub mt-12 max-w-2xl text-lg text-bone/80 leading-relaxed">
          Buying property at home from London, Houston or Dubai should not
          depend on a cousin's word. Tour the residences live on video, deal
          directly with the developer, and watch your home being built through
          regular construction updates.
        </p>

        <div className="dhero-sub mt-12 flex flex-col sm:flex-row gap-4">
          <BookViewingButton
            calLink="geodata/sbc-viewing"
            className="inline-flex items-center justify-center gap-3 bg-bone text-navy-950 px-7 py-4 text-xs uppercase tracking-eyebrow font-medium hover:bg-accent-soft transition-colors duration-400"
          >
            Book a video walkthrough →
          </BookViewingButton>
          <a
            href={WA_DIASPORA}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 border border-bone/40 text-bone px-7 py-4 text-xs uppercase tracking-eyebrow font-medium hover:bg-bone hover:text-navy-950 transition-colors duration-400"
          >
            WhatsApp us
          </a>
        </div>

        <div className="dhero-sub mt-14 pt-8 border-t border-bone/15 max-w-2xl">
          <p className="eyebrow text-bone/60 mb-4">See prices in your currency</p>
          <p className="font-display text-3xl text-bone mb-6">
            Homes from <Price ngn={130_000_000} label="₦130M" />
          </p>
          <CurrencySwitcher tone="dark" />
        </div>
      </div>
    </section>
  );
}
