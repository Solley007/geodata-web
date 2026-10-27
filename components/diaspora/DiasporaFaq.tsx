"use client";

import { useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";
import { COMPANY, SOCIAL } from "@/lib/site-content";
import BookViewingButton from "@/components/shared/BookViewingButton";

// VERIFY before launch: the payment and documentation answers below are
// deliberately general. Confirm accepted payment channels, whether foreign
// currency is accepted, and the exact title documents per development.
const FAQS = [
  {
    q: "Do I need to travel to Nigeria to buy?",
    a: "No. You can tour on a live video call, reserve, and receive your documents without travelling. Many buyers visit once the home is ready for handover.",
  },
  {
    q: "Can a family member act on my behalf?",
    a: "Yes. A family member or representative can attend viewings in your place. For signing documents on your behalf, we will advise on the formal authorisation required.",
  },
  {
    q: "How do I pay from abroad?",
    a: "Payments are made to Geodata's corporate account, never to an individual. Our team will confirm the accepted payment channels and send account details through official company email before you pay.",
  },
  {
    q: "Can I qualify for an MREIF mortgage while living abroad?",
    a: "MREIF is open to Nigerian citizens with verifiable income. How income earned abroad is assessed is decided by the partner bank, so speak to us first and we will tell you what the lender needs.",
  },
  {
    q: "Can I rent the home out while I'm away?",
    a: "Yes. The home is yours to occupy or let. Rental income is permitted, including while repaying an MREIF mortgage.",
  },
  {
    q: "How will I know construction is on track?",
    a: "Progress is published on our updates page, and you can ask the team on WhatsApp for current photos or a live look at your unit at any time.",
  },
];

const WA_DIASPORA = `${SOCIAL.whatsapp}?text=${encodeURIComponent(
  "Hello, I live abroad and have a question about buying a Geodata home."
)}`;

export default function DiasporaFaq() {
  const root = useRef<HTMLElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".dfaq-fade", {
        y: 24,
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
    <section ref={root} className="bg-bone-100 dark:bg-navy-900 py-32 md:py-48">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-5 dfaq-fade">
            <p className="eyebrow mb-6">Frequently asked</p>
            <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest">
              Buying from abroad.
            </h2>

            <div className="mt-12 border border-navy-900/10 dark:border-bone/10 p-8">
              <p className="eyebrow text-ink-muted dark:text-bone/60 mb-4">Talk to the team</p>
              <p className="text-ink dark:text-bone/75 leading-relaxed mb-8">
                We schedule calls around your time zone. {COMPANY.hours} (WAT),
                or leave a WhatsApp message any time.
              </p>
              <div className="flex flex-col gap-3">
                <BookViewingButton
                  calLink="geodata/sbc-viewing"
                  className="inline-flex items-center justify-center gap-3 bg-navy-900 dark:bg-bone dark:text-navy-950 text-bone px-7 py-4 text-xs uppercase tracking-eyebrow font-medium hover:bg-navy-800 dark:hover:bg-accent-soft transition-colors duration-400"
                >
                  Book a video walkthrough
                </BookViewingButton>
                <a
                  href={WA_DIASPORA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 border border-navy-900 text-navy-900 dark:border-bone dark:text-bone px-7 py-4 text-xs uppercase tracking-eyebrow font-medium hover:bg-navy-900 hover:text-bone dark:hover:bg-bone dark:hover:text-navy-950 transition-colors duration-400"
                >
                  WhatsApp us
                </a>
              </div>
              <p className="mt-6 text-sm text-ink-muted dark:text-bone/60">
                {COMPANY.phone}
                <br />
                {COMPANY.email}
              </p>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 lg:col-start-7 dfaq-fade">
            {FAQS.map((faq, i) => (
              <div key={faq.q} className="border-t border-hairline dark:border-white/10 last:border-b">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="w-full flex items-start justify-between gap-6 py-6 text-left"
                >
                  <span className="font-display text-xl text-navy-950 dark:text-bone leading-tight">
                    {faq.q}
                  </span>
                  <span
                    aria-hidden
                    className={clsx(
                      "shrink-0 mt-2 text-2xl text-navy-900 dark:text-bone/90 transition-transform duration-400 ease-editorial",
                      openFaq === i ? "rotate-45" : "rotate-0"
                    )}
                  >
                    +
                  </span>
                </button>
                <div
                  className={clsx(
                    "overflow-hidden transition-all duration-500 ease-editorial",
                    openFaq === i ? "max-h-96 pb-6" : "max-h-0"
                  )}
                >
                  <p className="text-ink dark:text-bone/75 leading-relaxed pr-12">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
