"use client";

import { useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";

const REQUIREMENTS = [
  "Nigerian citizen or permanent resident",
  "Aged 21–60 at application; loan must conclude before age 65",
  "Verifiable income (employment, business, or rental income)",
  "Minimum 10% equity contribution of property value",
  "Clean credit history with Credit Bureau Nigeria",
  "Valid means of identification — international passport, driver's licence, or NIN",
];

const FAQS = [
  {
    q: "Is the 9.75% rate really fixed for the full 20 years?",
    a: "Yes. Unlike commercial bank mortgages where rates float with monetary policy, MREIF rates are locked at origination for the entire tenor. This is the programme's defining feature.",
  },
  {
    q: "Can I prepay or settle the loan early?",
    a: "Yes, with no prepayment penalties. You can pay down principal at any time, which reduces the total interest paid over the loan's lifetime.",
  },
  {
    q: "What happens if I lose my job mid-tenor?",
    a: "Standard mortgage protection applies. Geodata can connect you with optional payment protection insurance (PPI) at application stage, which covers up to 12 months of repayments in case of involuntary unemployment.",
  },
  {
    q: "Can I rent out the property while paying the mortgage?",
    a: "Yes. The property is yours from disbursement; rental income is permitted and can in fact be used to supplement repayments.",
  },
  {
    q: "Does MREIF require a co-signer?",
    a: "Not by default. A co-signer (typically a spouse) may be added to strengthen the application or combine incomes for higher loan eligibility.",
  },
  {
    q: "What's the minimum income to qualify?",
    a: "MREIF doesn't publish a hard minimum, but as a guide, monthly repayments should not exceed 33% of net income. Use the calculator above to estimate your figure, then work backwards.",
  },
];

export default function MortgageEligibilityFaq() {
  const root = useRef<HTMLElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".meli-fade", {
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
    <section ref={root} className="bg-bone dark:bg-navy-950 py-32 md:py-48">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-5 meli-fade">
            <p className="eyebrow mb-6">Eligibility</p>
            <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest">
              Who qualifies.
            </h2>
            <ul className="mt-12 space-y-1">
              {REQUIREMENTS.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-4 border-t border-hairline dark:border-white/10 py-4"
                >
                  <span className="text-gold-dark mt-1.5">+</span>
                  <span className="text-ink dark:text-bone/75 leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-12 lg:col-span-6 lg:col-start-7 meli-fade">
            <p className="eyebrow mb-6">Frequently asked</p>
            <h2 className="text-display-md font-display text-navy-950 dark:text-bone tracking-tightest">
              The rest.
            </h2>

            <div className="mt-12">
              {FAQS.map((faq, i) => (
                <div key={i} className="border-t border-hairline dark:border-white/10 last:border-b">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-start justify-between gap-6 py-6 text-left"
                  >
                    <span className="font-display text-xl text-navy-950 dark:text-bone leading-tight">
                      {faq.q}
                    </span>
                    <span
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
      </div>
    </section>
  );
}
