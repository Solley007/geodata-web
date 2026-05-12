import type { Metadata } from "next";
import { readSiteUpdates, sortByDate } from "@/lib/site-updates";
import UpdatesGrid from "@/components/updates/UpdatesGrid";

export const metadata: Metadata = {
  title: "Updates — Geodata World Services",
  description: "Latest photos and videos from active Geodata construction sites across Nigeria.",
};

export const revalidate = 60; // refresh every minute

export default function UpdatesPage() {
  const updates = sortByDate(readSiteUpdates());

  return (
    <main className="bg-bone dark:bg-navy-950 min-h-screen pt-40 pb-32 md:pt-48">
      <div className="container-editorial">

        <header className="mb-16 md:mb-20">
          <p className="eyebrow text-ink-faint dark:text-bone/40 mb-5">From the sites</p>
          <h1 className="text-display-lg md:text-display-xl font-display text-navy-950 dark:text-bone tracking-tightest leading-[1.05]">
            Updates.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink dark:text-bone/75 leading-relaxed">
            Photos and videos from active Geodata construction sites, published as work progresses.
          </p>
        </header>

        <UpdatesGrid updates={updates} />
      </div>
    </main>
  );
}
