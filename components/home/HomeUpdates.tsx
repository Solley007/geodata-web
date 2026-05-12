import Link from "next/link";
import UpdateCard from "@/components/updates/UpdateCard";
import { readSiteUpdates, sortByDate } from "@/lib/site-updates";

/**
 * HomeUpdates — shows the 3 most recent site updates on the homepage.
 * Renders nothing if no updates have been published yet (graceful fallback).
 */
export default function HomeUpdates() {
  const all     = sortByDate(readSiteUpdates());
  const recent  = all.slice(0, 3);

  if (recent.length === 0) return null;

  return (
    <section className="bg-bone dark:bg-navy-950 py-16 md:py-24 border-t border-hairline dark:border-white/10">
      <div className="container-editorial">

        <div className="flex items-end justify-between flex-wrap gap-6 mb-12 md:mb-16">
          <div>
            <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">From the sites</p>
            <h2 className="text-display-md md:text-display-lg font-display text-navy-950 dark:text-bone tracking-tightest leading-[1.05]">
              What's happening{" "}
              <em className="font-light">on the ground.</em>
            </h2>
          </div>
          <Link
            href="/updates"
            className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone hover:text-gold-dark dark:hover:text-gold transition-colors pb-1 border-b border-navy-900 dark:border-bone/40 hover:border-gold-dark dark:hover:border-gold"
          >
            View all updates
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {recent.map((u) => <UpdateCard key={u.id} update={u} />)}
        </div>

      </div>
    </section>
  );
}
