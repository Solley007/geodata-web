"use client";

// In Next.js App Router, error.tsx must be a client component.
// This catches uncaught exceptions in any route segment.

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // PLACEHOLDER — wire to your error tracker (Sentry, LogRocket, etc.)
    // For now, log to console so you see it during development
    console.error("Unhandled error:", error);
  }, [error]);

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

        <p className="eyebrow text-ink-faint dark:text-bone/40 mb-8">Something went wrong</p>

        <h1 className="text-display-xl font-display text-navy-950 dark:text-bone tracking-tightest mb-12">
          We hit an <em className="font-light">unexpected snag.</em>
        </h1>

        <p className="text-lg text-ink dark:text-bone/75 leading-relaxed mb-16">
          Apologies for the inconvenience. You can try refreshing this page,
          or return home and try again. Our team has been notified.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-3 bg-navy-900 px-7 py-4 text-sm font-medium text-bone hover:bg-navy-800 transition-colors duration-400"
          >
            Try again
            <span aria-hidden>↻</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-3 px-7 py-4 text-sm font-medium text-navy-900 dark:text-bone/90 border-b border-navy-900 dark:border-white/20 hover:text-gold-dark hover:border-gold-dark transition-colors duration-400"
          >
            Return home
          </Link>
        </div>

        {error.digest && (
          <p className="mt-16 text-xs text-ink-faint dark:text-bone/40">
            Error reference: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </div>
    </section>
  );
}
