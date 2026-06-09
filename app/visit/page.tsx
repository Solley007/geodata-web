/**
 * Save as: app/visit/page.tsx
 *
 * Send this link in every booking confirmation (add it to the Cal.com
 * confirmation message and your WhatsApp follow-up). Reduces no-shows by
 * building anticipation and removing day-of friction.
 *
 * ONE THING TO EDIT: the MAP_LINK constant below. Replace it with the
 * exact Google Maps pin for the Southern Bridge City site entrance.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Visit — Geodata World Services",
  description:
    "Everything you need for your site visit to Southern Bridge City, Idu, Abuja.",
};

const MAP_LINK = "https://maps.google.com/?q=Southern+Bridge+City+Idu+Abuja"; // TODO: replace with exact pin

const STEPS = [
  {
    title: "Where to meet",
    body: "Southern Bridge City, Plot 7266, Idu Industrial District, Abuja. Use the map link below; the site entrance is signposted. Our team will meet you at the gatehouse.",
  },
  {
    title: "What the visit covers",
    body: "A walk through the estate roads and infrastructure, the typology you are interested in at its current construction stage, a finished reference unit where available, and a sit-down for any questions on pricing, MREIF financing and timelines. Plan for 60 to 90 minutes.",
  },
  {
    title: "What to bring",
    body: "Just yourself and your questions. Comfortable shoes help: this is a live construction site. If you are exploring MREIF financing, knowing your approximate annual income lets us give you precise numbers on the spot.",
  },
  {
    title: "Coming from abroad?",
    body: "If you cannot attend in person, we offer live video walkthroughs on WhatsApp at the same booking link. A family member or representative is also welcome to attend in your place.",
  },
];

export default function VisitPage() {
  return (
    <main className="bg-bone dark:bg-navy-950 min-h-screen">
      <section className="container-editorial pt-40 pb-20 md:pb-28">
        <p className="eyebrow text-navy-900/60 dark:text-bone/60 mb-6">
          Your visit is booked
        </p>
        <h1 className="font-display text-4xl md:text-6xl text-navy-950 dark:text-bone mb-6">
          See you on site.
        </h1>
        <p className="max-w-2xl text-lg text-navy-900/70 dark:text-bone/70 mb-16">
          Here is everything worth knowing before you arrive at Southern Bridge
          City, so the visit is spent on what matters: the home.
        </p>

        <div className="grid grid-cols-12 gap-y-12 lg:gap-12">
          <div className="col-span-12 lg:col-span-8">
            <ol className="space-y-12">
              {STEPS.map((s, i) => (
                <li key={s.title} className="grid grid-cols-12 gap-4">
                  <span className="col-span-12 sm:col-span-1 font-display text-3xl text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="col-span-12 sm:col-span-11">
                    <h2 className="font-display text-2xl text-navy-950 dark:text-bone mb-3">
                      {s.title}
                    </h2>
                    <p className="text-navy-900/70 dark:text-bone/70 leading-relaxed">
                      {s.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-16 flex flex-col sm:flex-row gap-4">
              <a
                href={MAP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 bg-navy-900 text-bone px-7 py-4 text-xs uppercase tracking-eyebrow font-medium hover:bg-navy-800 transition-colors duration-400"
              >
                Open directions →
              </a>
              <a
                href="https://wa.me/2347047620492?text=Hi%2C%20I%20have%20a%20site%20visit%20booked%20and%20have%20a%20quick%20question."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 border border-navy-900 text-navy-900 dark:border-bone dark:text-bone px-7 py-4 text-xs uppercase tracking-eyebrow font-medium hover:bg-navy-900 hover:text-bone dark:hover:bg-bone dark:hover:text-navy-950 transition-colors duration-400"
              >
                WhatsApp us
              </a>
            </div>
          </div>

          <aside className="col-span-12 lg:col-span-4">
            <div className="border border-navy-900/10 dark:border-bone/10 p-8">
              <p className="eyebrow text-navy-900/60 dark:text-bone/60 mb-4">
                Need to reschedule?
              </p>
              <p className="text-sm text-navy-900/70 dark:text-bone/70 leading-relaxed mb-6">
                Life happens. Use your original booking link to pick a new
                time, or message us on WhatsApp. No awkwardness, no penalty.
              </p>
              <p className="text-sm text-navy-900/70 dark:text-bone/70">
                +234 704 762 0492
                <br />
                hello@geodata.com.ng
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
