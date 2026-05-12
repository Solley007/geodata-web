"use client";

import { useState, useLayoutEffect, useRef, FormEvent } from "react";
import clsx from "clsx";
import { gsap } from "@/lib/gsap";

type Status = "idle" | "submitting" | "success" | "error";

const INTERESTS = [
  "Specific property",
  "Schedule a visit",
  "MREIF mortgage",
  "Investment opportunity",
  "Sales partnership",
  "Other",
];

export default function ContactForm() {
  const root = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    interest: INTERESTS[0],
    message: "",
  });

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".cf-fade", {
        y: 20,
        opacity: 0,
        duration: 0.7,
        stagger: 0.06,
        ease: "power3.out",
        delay: 0.4,
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      setStatus("success");
      setFormData({
        name: "",
        email: "",
        phone: "",
        interest: INTERESTS[0],
        message: "",
      });
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div ref={root} className="bg-navy-950 text-bone p-10 lg:p-16">
        <p className="eyebrow text-bone/60 mb-6">Message received</p>
        <h2 className="font-display text-display-md tracking-tightest leading-none">
          Thank you. <em className="font-light">We'll be in touch.</em>
        </h2>
        <p className="mt-8 text-bone/80 leading-relaxed max-w-md">
          A member of our sales team will reach out within one business day. For
          urgent enquiries, call us directly at +234 704 762 0492.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-10 text-sm text-bone/60 hover:text-bone underline underline-offset-4 transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div ref={root} className="bg-bone-100 dark:bg-navy-900 p-10 lg:p-16 border border-hairline dark:border-white/10">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Name */}
        <div className="cf-fade">
          <label className="eyebrow text-ink-muted dark:text-bone/60 mb-3 block">Full name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="cf-input"
            placeholder="Your name"
          />
        </div>

        {/* Email + Phone — paired */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="cf-fade">
            <label className="eyebrow text-ink-muted dark:text-bone/60 mb-3 block">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="cf-input"
              placeholder="you@example.com"
            />
          </div>
          <div className="cf-fade">
            <label className="eyebrow text-ink-muted dark:text-bone/60 mb-3 block">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="cf-input"
              placeholder="+234"
            />
          </div>
        </div>

        {/* Interest pills */}
        <div className="cf-fade">
          <label className="eyebrow text-ink-muted dark:text-bone/60 mb-4 block">
            What are you interested in?
          </label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => setFormData({ ...formData, interest })}
                className={clsx(
                  "px-4 py-2 text-xs uppercase tracking-eyebrow font-medium border transition-all duration-300",
                  formData.interest === interest
                    ? "bg-navy-900 text-bone border-navy-900 dark:border-white/20"
                    : "bg-transparent text-navy-900 dark:text-bone/90 border-hairline dark:border-white/10 hover:border-navy-900 dark:border-white/20"
                )}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="cf-fade">
          <label className="eyebrow text-ink-muted dark:text-bone/60 mb-3 block">Message</label>
          <textarea
            required
            rows={5}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="cf-input resize-none"
            placeholder="Tell us a little about what you're looking for..."
          />
        </div>

        {/* Submit */}
        <div className="cf-fade flex items-center justify-between gap-6 flex-wrap">
          <p className="text-xs text-ink-faint dark:text-bone/40">
            We answer every enquiry within 24 hours.
          </p>
          <button
            type="submit"
            disabled={status === "submitting"}
            aria-busy={status === "submitting"}
            className={clsx(
              "inline-flex items-center gap-3 bg-navy-900 px-7 py-4 text-xs uppercase tracking-eyebrow font-medium text-bone transition-all duration-400",
              status === "submitting"
                ? "cursor-wait"
                : "hover:bg-navy-800"
            )}
          >
            {status === "submitting" ? (
              <>
                <span className="cf-dot-loader inline-flex items-center gap-1" aria-hidden>
                  <span className="cf-dot inline-block h-1 w-1 rounded-full bg-bone dark:bg-navy-950" />
                  <span className="cf-dot inline-block h-1 w-1 rounded-full bg-bone dark:bg-navy-950" />
                  <span className="cf-dot inline-block h-1 w-1 rounded-full bg-bone dark:bg-navy-950" />
                </span>
                <span>Sending</span>
                <span className="sr-only">— please wait</span>
              </>
            ) : (
              <>
                <span>Send message</span>
                <span aria-hidden>→</span>
              </>
            )}
          </button>
        </div>

        {status === "error" && (
          <p className="text-sm text-red-700 cf-fade">
            Something went wrong. Please try again or call us directly.
          </p>
        )}
      </form>
    </div>
  );
}
