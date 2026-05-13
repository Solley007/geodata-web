"use client";

import { useState } from "react";
import Link from "next/link";
import { PROPERTY_NAV } from "@/lib/site-content";

export default function MortgageApplicationPage() {
  const [form, setForm] = useState({
    name:           "",
    email:          "",
    phone:          "",
    employment:     "",
    incomeRange:    "",
    propertyOfInterest: "",
    additionalInfo: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handle = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/mortgage-application", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Submission failed");
      }
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message ?? "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <main className="bg-bone dark:bg-navy-950 min-h-screen flex items-center">
        <div className="container-editorial py-24 max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gold/15 text-gold border border-gold/30 mb-8">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 className="text-display-md font-display tracking-tightest leading-tight mb-6 text-navy-950 dark:text-bone">
            We've received your details.
          </h1>
          <p className="text-lg leading-relaxed text-ink-muted dark:text-bone/70 mb-10">
            A member of our team will reach out within one business day to walk you through the next steps — KYC documentation, bank pre-approval through Zenith Bank, and property reservation.
          </p>
          <Link href="/properties" className="inline-flex items-center gap-3 bg-navy-900 dark:bg-bone dark:text-navy-950 text-bone px-7 py-4 text-sm font-medium hover:bg-navy-800 transition-colors">
            Browse available residences <span aria-hidden>→</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-bone dark:bg-navy-950 text-navy-950 dark:text-bone">

      {/* Hero */}
      <section className="pt-32 md:pt-40 pb-12 border-b border-hairline dark:border-white/10">
        <div className="container-editorial max-w-4xl">
          <p className="eyebrow text-ink-muted dark:text-bone/50 mb-6">MREIF Mortgage</p>
          <h1 className="text-display-lg font-display tracking-tightest leading-none mb-6">
            Begin your <em className="font-light">MREIF</em> application.
          </h1>
          <p className="text-lg text-ink-muted dark:text-bone/70 leading-relaxed max-w-2xl">
            Tell us a little about yourself and the property you're considering. We'll review your pre-qualification and connect you with the right team at Zenith Bank to begin your formal mortgage application.
          </p>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 md:py-20 bg-bone-100 dark:bg-white/[0.02] border-b border-hairline dark:border-white/10">
        <div className="container-editorial max-w-4xl">
          <p className="eyebrow text-ink-muted dark:text-bone/50 mb-8">How it works</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <Step n={1} title="Express interest" body="Submit the form below with your contact details, employment, and the property you're considering." />
            <Step n={2} title="Pre-qualification" body="Our team reviews your details and contacts you within one business day to confirm next steps." />
            <Step n={3} title="Bank application" body="We connect you to a dedicated officer at Zenith Bank to begin your formal MREIF mortgage application." />
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-20 md:py-24">
        <div className="container-editorial max-w-3xl">

          <h2 className="text-display-md font-display tracking-tightest leading-none mb-3">
            Your details.
          </h2>
          <p className="text-ink-muted dark:text-bone/60 mb-12">
            All fields marked <span className="text-gold">*</span> are required. Your information is handled in confidence.
          </p>

          <form onSubmit={submit} className="space-y-8">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Full name *" name="name">
                <input required value={form.name} onChange={handle("name")} className="form-input" placeholder="e.g. Adaeze Okeke" />
              </Field>
              <Field label="Phone number *" name="phone">
                <input required type="tel" value={form.phone} onChange={handle("phone")} className="form-input" placeholder="+234 800 000 0000" />
              </Field>
            </div>

            <Field label="Email address *" name="email">
              <input required type="email" value={form.email} onChange={handle("email")} className="form-input" placeholder="you@example.com" />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Employment status *" name="employment">
                <select required value={form.employment} onChange={handle("employment")} className="form-input">
                  <option value="">Select…</option>
                  <option value="Salaried (Public sector)">Salaried — Public sector</option>
                  <option value="Salaried (Private sector)">Salaried — Private sector</option>
                  <option value="Self-employed">Self-employed</option>
                  <option value="Business owner">Business owner</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Monthly income (₦) *" name="incomeRange">
                <select required value={form.incomeRange} onChange={handle("incomeRange")} className="form-input">
                  <option value="">Select range…</option>
                  <option value="500k - 1M">₦500,000 – ₦1,000,000</option>
                  <option value="1M - 2M">₦1,000,000 – ₦2,000,000</option>
                  <option value="2M - 5M">₦2,000,000 – ₦5,000,000</option>
                  <option value="5M+">₦5,000,000+</option>
                </select>
              </Field>
            </div>

            <Field label="Property of interest *" name="propertyOfInterest">
              <select required value={form.propertyOfInterest} onChange={handle("propertyOfInterest")} className="form-input">
                <option value="">Select a residence…</option>
                {PROPERTY_NAV.map((p) => (
                  <option key={p.slug} value={p.label}>{p.label} — {p.price}</option>
                ))}
                <option value="Not sure yet">I'm not sure yet — open to options</option>
              </select>
            </Field>

            <Field label="Anything else we should know?" name="additionalInfo">
              <textarea
                value={form.additionalInfo}
                onChange={handle("additionalInfo")}
                rows={4}
                className="form-input resize-none"
                placeholder="Preferred contact time, questions about MREIF, existing pre-approval status, etc."
              />
            </Field>

            {status === "error" && (
              <div className="border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 px-5 py-4 text-sm">
                {errorMessage || "Something went wrong. Please try again or contact us directly."}
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex items-center gap-3 bg-navy-900 dark:bg-bone dark:text-navy-950 text-bone px-8 py-4 text-sm font-medium hover:bg-navy-800 transition-colors disabled:opacity-50"
              >
                {status === "submitting" ? "Submitting…" : "Submit application"}
                <span aria-hidden>→</span>
              </button>
              <p className="mt-4 text-xs text-ink-faint dark:text-bone/40">
                You'll hear from us within one business day. By submitting, you consent to be contacted about this enquiry.
              </p>
            </div>

          </form>

        </div>
      </section>

      <style jsx global>{`
        .form-input {
          width: 100%;
          background: transparent;
          border: 1px solid #E5E0D5;
          padding: 0.875rem 1rem;
          font-size: 0.9rem;
          color: inherit;
          outline: none;
          transition: border-color .2s;
        }
        .form-input:focus { border-color: #C9A961; }
        .dark .form-input { border-color: rgba(255,255,255,0.15); }
        .form-input::placeholder { color: #94A0B0; }
      `}</style>
    </main>
  );
}

function Field({ label, name, children }: { label: string; name: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="block text-[11px] uppercase tracking-widest text-ink-muted dark:text-bone/50 mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div>
      <div className="font-display text-3xl text-gold mb-3">{String(n).padStart(2, "0")}</div>
      <h3 className="font-display text-xl tracking-tight mb-2">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-muted dark:text-bone/60">{body}</p>
    </div>
  );
}
