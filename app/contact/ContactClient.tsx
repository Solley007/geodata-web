"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import ContactForm from "@/components/contact/ContactForm";
import ContactMap from "@/components/contact/ContactMap";
import SectionErrorBoundary from "@/components/shared/SectionErrorBoundary";

export default function ContactClient() {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });
      tl.from(".contact-eyebrow", { y: 16, opacity: 0, duration: 0.8 })
        .from(".contact-title", { y: 30, opacity: 0, duration: 1 }, "-=0.5")
        .from(".contact-letter > *", { y: 16, opacity: 0, duration: 0.8, stagger: 0.08 }, "-=0.6")
        .from(".contact-meta > *", { y: 12, opacity: 0, duration: 0.7, stagger: 0.06 }, "-=0.5");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <>
      <section
        ref={root}
        className="bg-bone dark:bg-navy-950 pt-40 pb-32 md:pt-48 md:pb-40"
      >
      <div className="container-editorial">
        <p className="contact-eyebrow eyebrow mb-6">Begin a conversation</p>

        <div className="grid grid-cols-12 gap-12">
          {/* LEFT — letter and contact details */}
          <div className="col-span-12 lg:col-span-5">
            <h1 className="contact-title text-display-xl font-display text-navy-950 dark:text-bone tracking-tightest">
              Hello.
            </h1>

            <div className="contact-letter mt-12 space-y-6 max-w-md">
              <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
                Whether you're considering a residence, exploring an investment,
                or have a question about our development pipeline — we'd be
                glad to hear from you.
              </p>
              <p className="text-lg leading-relaxed text-ink dark:text-bone/75">
                A member of our team responds personally to every enquiry
                within one business day. For matters needing immediate
                attention, please call us directly.
              </p>
            </div>

            <div className="contact-meta mt-16 space-y-10">
              <div className="border-t border-hairline dark:border-white/10 pt-6">
                <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">Sales pavilion</p>
                <p className="text-ink dark:text-bone/75 leading-relaxed">
                  Plot 93, 94, 95 B10 Cadastral Zone<br />
                  Utako, Dakibiyu 900108<br />
                  Federal Capital Territory, Abuja
                </p>
                <p className="mt-4 text-sm text-ink-muted dark:text-bone/60">
                  Mon–Sat, 9:00 AM – 6:00 PM<br />
                  Sunday by appointment
                </p>
              </div>

              <div className="border-t border-hairline dark:border-white/10 pt-6">
                <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">Direct</p>
                <p className="font-display text-2xl text-navy-950 dark:text-bone">
                  <a href="tel:+2347047620492" className="hover:text-gold-dark transition-colors">
                    +234 704 762 0492
                  </a>
                </p>
                <p className="mt-2 font-display text-2xl text-navy-950 dark:text-bone">
                  <a href="mailto:hello@geodata.com.ng" className="hover:text-gold-dark transition-colors">
                    hello@geodata.com.ng
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — form */}
          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <SectionErrorBoundary sectionName="ContactForm">
              <ContactForm />
            </SectionErrorBoundary>
          </div>
        </div>
      </div>
    </section>

    {/* Office map — full width below the contact section */}
    <ContactMap />
    </>
  );
}
