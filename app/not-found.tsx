import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="bg-bone dark:bg-navy-950 min-h-[100svh] flex items-center justify-center pt-20 pb-32">
      <div className="container-editorial text-center max-w-2xl">
        <Image
          src="/geodata-full-logo.png"
          alt="Geodata World Services Limited"
          width={220}
          height={55}
          className="mx-auto mb-10"
        />

        <p className="eyebrow text-ink-faint dark:text-bone/40 mb-8">Error 404</p>

        <h1 className="text-display-xl font-display text-navy-950 dark:text-bone tracking-tightest mb-12">
          The page you're <em className="font-light">looking for</em> isn't here.
        </h1>

        <p className="text-lg text-ink dark:text-bone/75 leading-relaxed mb-16">
          It may have moved, or perhaps the link was mistyped. From here, you
          can return home, browse our current residences, or speak with our
          team directly.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-3 bg-navy-900 px-7 py-4 text-sm font-medium text-bone hover:bg-navy-800 transition-colors duration-400"
          >
            Return home
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/properties"
            className="inline-flex items-center gap-3 px-7 py-4 text-sm font-medium text-navy-900 dark:text-bone/90 border-b border-navy-900 dark:border-white/20 hover:text-gold-dark hover:border-gold-dark transition-colors duration-400"
          >
            Browse residences
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-3 px-7 py-4 text-sm font-medium text-navy-900 dark:text-bone/90 border-b border-navy-900 dark:border-white/20 hover:text-gold-dark hover:border-gold-dark transition-colors duration-400"
          >
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
