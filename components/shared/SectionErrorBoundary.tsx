"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Human-readable section name for logging and the fallback label */
  sectionName?: string;
  /** Override the default branded fallback */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * SectionErrorBoundary
 * ----
 * Wraps an individual section so a crash inside it doesn't take down
 * the whole page. The global app/error.tsx is the broader safety net;
 * this is the localized one for high-failure-risk components.
 *
 * Use it around things that:
 *   - Make external API calls (Mapbox, Resend, etc.)
 *   - Have complex client-side state (calculators, forms)
 *   - Depend on third-party scripts that might be blocked
 *
 * Don't bother for static editorial sections — they have no real failure
 * mode beyond catastrophic React bugs which the app-level error boundary
 * will catch anyway.
 */
export default class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // PLACEHOLDER — wire to your error tracker (Sentry, etc.)
    console.error(
      `[Section Error] ${this.props.sectionName ?? "unknown"}:`,
      error,
      info.componentStack
    );
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="bg-bone-100 dark:bg-navy-900 border-y border-hairline dark:border-white/10 py-16 px-6 text-center">
        <p className="eyebrow text-ink-faint dark:text-bone/40 mb-3">Section unavailable</p>
        <p className="text-ink dark:text-bone/75 leading-relaxed max-w-md mx-auto">
          This part of the page couldn't load right now. The rest of the page
          is still available — you can continue browsing or refresh to try again.
        </p>
        <button
          onClick={this.reset}
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-navy-900 dark:text-bone/90 hover:text-gold-dark transition-colors duration-400 pb-1 border-b border-navy-900 dark:border-white/20 hover:border-gold-dark"
        >
          Retry
          <span aria-hidden>↻</span>
        </button>
      </div>
    );
  }
}
