"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  INCOME_BRACKETS,
  BEDROOM_OPTIONS,
  TIMELINE_OPTIONS,
  APPROVAL_OPTIONS,
  MREIF,
  runQuiz,
  formatNaira,
  formatNairaFull,
  type QuizAnswers,
  type IncomeBracketId,
  type BedroomOptionId,
  type TimelineId,
  type ApprovalId,
  type QuizResult,
} from "@/lib/mortgage-quiz";
import { SOCIAL } from "@/lib/site-content";
import BookViewingButton from "@/components/shared/BookViewingButton";

type Step = 1 | 2 | 3 | 4 | "email" | "result";

const STORAGE_KEY = "geodata_quiz_user";

export default function MortgageQuizClient({ inline = false }: { inline?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [income, setIncome] = useState<IncomeBracketId | null>(null);
  const [bedrooms, setBedrooms] = useState<BedroomOptionId | null>(null);
  const [timeline, setTimeline] = useState<TimelineId | null>(null);
  const [approval, setApproval] = useState<ApprovalId | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [depositPct, setDepositPct] = useState<number>(MREIF.defaultDeposit);
  const [hasStoredUser, setHasStoredUser] = useState(false);

  // ── On mount, restore name + email from previous quiz if available ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.name)  setName(data.name);
      if (data?.email) setEmail(data.email);
      if (data?.name && data?.email) setHasStoredUser(true);
    } catch { /* ignore corrupted localStorage */ }
  }, []);

  // Re-run calculation whenever deposit slider moves (on result screen)
  function recalculate(newDepositPct: number) {
    if (!income || !bedrooms || !timeline || !approval) return;
    const answers: QuizAnswers = {
      income, bedrooms, timeline, approval, depositPct: newDepositPct,
    };
    setResult(runQuiz(answers));
  }

  // ── After picking step 4, decide whether to gate email or skip straight to result ──
  function advanceAfterApproval(approvalId: ApprovalId) {
    setApproval(approvalId);

    // If we have a known user + all answers, skip the email gate entirely
    if (hasStoredUser && income && bedrooms && timeline) {
      const answers: QuizAnswers = {
        income, bedrooms, timeline, approval: approvalId, depositPct,
      };
      setResult(runQuiz(answers));
      setStep("result");
      return;
    }

    setStep("email");
  }

  // ── Clear stored identity (used by "Not you?" link on result screen) ──
  function resetUser() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setName("");
    setEmail("");
    setHasStoredUser(false);
    setStep("email");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!income || !bedrooms || !timeline || !approval || !name.trim() || !email.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const answers: QuizAnswers = { income, bedrooms, timeline, approval, depositPct };
      const res = await fetch("/api/mortgage-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...answers, name: name.trim(), email: email.trim() }),
      });
      if (!res.ok) throw new Error("Submission failed");
      // Save credentials for future quizzes
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          name: name.trim(), email: email.trim(),
        }));
        setHasStoredUser(true);
      }
      setResult(runQuiz(answers));
      setStep("result");
    } catch (err) {
      setError("Something went wrong. Please try again or message us on WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  }

  // Progress indicator step number
  const stepNum = step === "email" ? 5 : step === "result" ? 5 : step;
  const totalSteps = 5;

  const Wrapper = inline ? "section" : "main";
  const wrapperClass = inline
    ? "py-20 md:py-28 bg-bone dark:bg-navy-950"
    : "min-h-screen bg-bone dark:bg-navy-950 pt-28 md:pt-32 pb-20";

  return (
    <Wrapper className={wrapperClass} id={inline ? "quiz" : undefined}>
      <div className="container-editorial max-w-3xl mx-auto">

        {/* Progress bar — hidden on result */}
        {step !== "result" && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-widest text-ink-muted dark:text-bone/50">
                Affordability quiz
              </p>
              <p className="text-[11px] uppercase tracking-widest text-ink-muted dark:text-bone/50">
                Step {stepNum} of {totalSteps}
              </p>
            </div>
            <div className="h-px bg-hairline dark:bg-white/10">
              <div
                className="h-full bg-accent-dark dark:bg-accent transition-all duration-500 ease-out"
                style={{ width: `${(stepNum / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ─── STEP 1: Income ────────────────────────────────────────── */}
        {step === 1 && (
          <QuizStep
            title="What's your monthly take-home?"
            subtitle="After tax and statutory deductions — your actual deposit each month."
          >
            <OptionList
              options={INCOME_BRACKETS.map(b => ({ id: b.id, label: b.label }))}
              selected={income}
              onSelect={(id) => { setIncome(id as IncomeBracketId); setStep(2); }}
            />
          </QuizStep>
        )}

        {/* ─── STEP 2: Bedrooms ─────────────────────────────────────── */}
        {step === 2 && (
          <QuizStep
            title="How many bedrooms?"
            subtitle="We have homes from 4 to 6 bedrooms across Southern Bridge."
            onBack={() => setStep(1)}
          >
            <OptionList
              options={BEDROOM_OPTIONS.map(b => ({ id: b.id, label: b.label }))}
              selected={bedrooms}
              onSelect={(id) => { setBedrooms(id as BedroomOptionId); setStep(3); }}
            />
          </QuizStep>
        )}

        {/* ─── STEP 3: Timeline ─────────────────────────────────────── */}
        {step === 3 && (
          <QuizStep
            title="When do you want to move in?"
            subtitle="Helps us point you to ready homes or off-plan opportunities."
            onBack={() => setStep(2)}
          >
            <OptionList
              options={TIMELINE_OPTIONS.map(t => ({ id: t.id, label: t.label, sub: t.sub }))}
              selected={timeline}
              onSelect={(id) => { setTimeline(id as TimelineId); setStep(4); }}
            />
          </QuizStep>
        )}

        {/* ─── STEP 4: Pre-approval ─────────────────────────────────── */}
        {step === 4 && (
          <QuizStep
            title="Bank pre-approval status?"
            subtitle="MREIF mortgages go through Eligible Financial Institutions like Zenith Bank."
            onBack={() => setStep(3)}
          >
            <OptionList
              options={APPROVAL_OPTIONS.map(a => ({ id: a.id, label: a.label, sub: a.sub }))}
              selected={approval}
              onSelect={(id) => advanceAfterApproval(id as ApprovalId)}
            />
          </QuizStep>
        )}

        {/* ─── STEP 5: Email gate ───────────────────────────────────── */}
        {step === "email" && (
          <QuizStep
            title="Almost there."
            subtitle="Enter your details to see your matched residence and full affordability breakdown."
            onBack={() => setStep(4)}
          >
            <form onSubmit={handleSubmit} className="space-y-5 mt-8">
              <div>
                <label htmlFor="name" className="block text-xs uppercase tracking-widest text-ink-muted dark:text-bone/50 mb-2">
                  Full name
                </label>
                <input
                  type="text" id="name" required autoComplete="name"
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent border border-hairline dark:border-white/15 text-navy-950 dark:text-bone focus:border-accent-dark dark:focus:border-accent focus:outline-none transition-colors"
                  placeholder="Jane Adekunle"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs uppercase tracking-widest text-ink-muted dark:text-bone/50 mb-2">
                  Email
                </label>
                <input
                  type="email" id="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent border border-hairline dark:border-white/15 text-navy-950 dark:text-bone focus:border-accent-dark dark:focus:border-accent focus:outline-none transition-colors"
                  placeholder="you@example.com"
                />
              </div>
              <p className="text-xs text-ink-faint dark:text-bone/40 leading-relaxed">
                We'll email your personalised report and never share your details. Unsubscribe anytime.
              </p>
              {error && (
                <p className="text-sm text-accent-dark dark:text-accent">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-navy-900 dark:bg-bone dark:text-navy-950 text-bone px-8 py-4 text-sm font-medium hover:bg-navy-800 dark:hover:bg-bone-100 transition-colors disabled:opacity-50"
              >
                {submitting ? "Calculating…" : "See my matched residence →"}
              </button>
            </form>
          </QuizStep>
        )}

        {/* ─── RESULT ───────────────────────────────────────────────── */}
        {step === "result" && result && (
          <ResultView
            result={result}
            depositPct={depositPct}
            onDepositChange={(p) => { setDepositPct(p); recalculate(p); }}
            name={name}
            approvalId={approval!}
            onResetUser={resetUser}
          />
        )}

      </div>
    </Wrapper>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function QuizStep({
  title, subtitle, onBack, children,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-ink-muted dark:text-bone/50 hover:text-accent-dark dark:hover:text-accent transition-colors"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
      )}
      <h1 className="font-display text-display-md md:text-display-lg text-navy-950 dark:text-bone tracking-tightest leading-[1.1] mb-4">
        {title}
      </h1>
      {subtitle && (
        <p className="text-lg text-ink-muted dark:text-bone/70 leading-relaxed mb-8">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}

function OptionList({
  options, selected, onSelect,
}: {
  options: { id: string; label: string; sub?: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-3 mt-8">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          className={clsx(
            "w-full text-left px-6 py-5 border transition-all duration-300 group",
            selected === opt.id
              ? "border-accent-dark dark:border-accent bg-accent/5 dark:bg-accent/10"
              : "border-hairline dark:border-white/15 hover:border-navy-900 dark:hover:border-bone/40"
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-base md:text-lg font-medium text-navy-950 dark:text-bone">
                {opt.label}
              </p>
              {opt.sub && (
                <p className="text-sm text-ink-muted dark:text-bone/60 mt-1">
                  {opt.sub}
                </p>
              )}
            </div>
            <svg
              viewBox="0 0 24 24" width="18" height="18" fill="none"
              stroke="currentColor" strokeWidth="1.5"
              className="text-ink-faint dark:text-bone/40 group-hover:text-accent-dark dark:group-hover:text-accent transition-colors shrink-0"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}

function ResultView({
  result, depositPct, onDepositChange, name, approvalId, onResetUser,
}: {
  result: QuizResult;
  depositPct: number;
  onDepositChange: (p: number) => void;
  name: string;
  approvalId: ApprovalId;
  onResetUser: () => void;
}) {
  const { primaryMatch, monthlyPaymentForPrimary, monthlyIncome, fallback } = result;
  const firstName = name.split(" ")[0];
  const ratioPct = Math.round(result.affordabilityRatio * 100);
  const isCash = approvalId === "cash";

  const waMessage = primaryMatch
    ? `Hi, I just completed the Geodata affordability quiz. I'm interested in ${primaryMatch.title} (${primaryMatch.priceLabel}). My name is ${name}.`
    : `Hi, I just completed the Geodata affordability quiz. My name is ${name} and I'd like to discuss options.`;
  const waLink = `${SOCIAL.whatsapp}?text=${encodeURIComponent(waMessage)}`;

  return (
    <div>
      {/* ── Headline ─────────────────────────────────────────────────── */}
      <p className="eyebrow text-accent-dark dark:text-accent mb-4">
        {fallback ? "Closest match found" : "Strong fit"}
      </p>
      <h1 className="font-display text-display-md md:text-display-lg text-navy-950 dark:text-bone tracking-tightest leading-[1.05] mb-6">
        {primaryMatch
          ? <>You qualify for <em className="font-light">{primaryMatch.title}.</em></>
          : <>Let's find your fit.</>}
      </h1>

      {primaryMatch && (
        <p className="text-lg text-ink-muted dark:text-bone/70 leading-relaxed mb-12 max-w-2xl">
          {firstName}, based on your inputs and a {Math.round(depositPct * 100)}% deposit, the{" "}
          <strong className="text-navy-950 dark:text-bone font-semibold">{primaryMatch.title}</strong>{" "}
          ({primaryMatch.priceLabel}) sits within your comfort zone
          {!isCash && (
            <>
              {" "}— roughly{" "}
              <strong className="text-navy-950 dark:text-bone font-semibold">
                {formatNaira(monthlyPaymentForPrimary)}/month
              </strong>{" "}
              under MREIF at 9.75% fixed for 20 years
            </>
          )}
          .
        </p>
      )}

      {/* ── The numbers ──────────────────────────────────────────────── */}
      {primaryMatch && (
        <div className="border-t border-b border-hairline dark:border-white/10 py-8 mb-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          <Stat label="Property price" value={primaryMatch.priceLabel} />
          <Stat label="Your deposit" value={formatNaira(primaryMatch.price * depositPct)} sub={`${Math.round(depositPct * 100)}%`} />
          {!isCash ? (
            <>
              <Stat label="Monthly payment" value={formatNaira(monthlyPaymentForPrimary)} />
              <Stat label="% of income" value={`${ratioPct}%`} sub={ratioPct <= 33 ? "Comfortable" : ratioPct <= 40 ? "Within limits" : "Stretched"} />
            </>
          ) : (
            <>
              <Stat label="Loan needed" value="—" sub="Cash buyer" />
              <Stat label="Cash outlay" value={primaryMatch.priceLabel} />
            </>
          )}
        </div>
      )}

      {/* ── Deposit slider ───────────────────────────────────────────── */}
      {!isCash && (
        <div className="mb-12 p-6 bg-bone-100 dark:bg-white/5 border border-hairline dark:border-white/10">
          <div className="flex items-baseline justify-between mb-4">
            <label htmlFor="deposit-slider" className="text-xs uppercase tracking-widest text-ink-muted dark:text-bone/50">
              Adjust deposit
            </label>
            <p className="font-display text-2xl text-accent-dark dark:text-accent">
              {Math.round(depositPct * 100)}%
            </p>
          </div>
          <input
            id="deposit-slider"
            type="range"
            min={MREIF.minDeposit * 100}
            max={MREIF.maxDeposit * 100}
            step={5}
            value={depositPct * 100}
            onChange={(e) => onDepositChange(Number(e.target.value) / 100)}
            className="w-full accent-accent-dark dark:accent-accent"
          />
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-ink-faint dark:text-bone/40 mt-2">
            <span>10% (MREIF min)</span>
            <span>50%</span>
          </div>
        </div>
      )}

      {/* ── Other matches ────────────────────────────────────────────── */}
      {result.matches.length > 1 && (
        <div className="mb-12">
          <p className="eyebrow text-ink-muted dark:text-bone/50 mb-5">Also a fit</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.matches.slice(1).map(m => (
              <Link
                key={m.slug}
                href={`/properties/${m.slug}`}
                className="group flex items-center gap-4 p-4 border border-hairline dark:border-white/10 hover:border-navy-900 dark:hover:border-bone/40 transition-colors"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-bone-100">
                  <Image src={m.image} alt={m.title} fill sizes="64px" className="object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-navy-950 dark:text-bone">{m.title}</p>
                  <p className="text-sm text-ink-muted dark:text-bone/60">{m.priceLabel} · {m.beds} bed · {m.available} available</p>
                </div>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-faint group-hover:text-accent-dark dark:group-hover:text-accent transition-colors">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Next steps ───────────────────────────────────────────────── */}
      <div className="border-t border-hairline dark:border-white/10 pt-10">
        <p className="eyebrow text-ink-muted dark:text-bone/50 mb-5">Next steps</p>
        <div className="flex flex-wrap gap-3">
          <BookViewingButton
            calLink={primaryMatch?.location?.toLowerCase().includes("estate") ? "geodata/sbe-viewing" : "geodata/sbc-viewing"}
            variant="primary"
          >
            Reserve a viewing
          </BookViewingButton>
          {primaryMatch && (
            <Link
              href={`/properties/${primaryMatch.slug}`}
              className="inline-flex items-center gap-2 border border-navy-900 dark:border-bone text-navy-900 dark:text-bone px-6 py-3 text-sm font-medium hover:bg-navy-900 hover:text-bone dark:hover:bg-bone dark:hover:text-navy-950 transition-colors"
            >
              See full residence
            </Link>
          )}
          {!isCash && approvalId === "no" && (
            <Link
              href="/mortgage/application"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent-dark dark:text-accent border-b border-accent-dark dark:border-accent pb-0.5 self-center"
            >
              Start MREIF application →
            </Link>
          )}
        </div>
        <p className="mt-6 text-sm text-ink-faint dark:text-bone/50">
          We've also emailed this report to <strong className="text-navy-950 dark:text-bone">{name}</strong> for your records.{" "}
          <button
            onClick={onResetUser}
            className="underline hover:text-accent-dark dark:hover:text-accent transition-colors"
          >
            Not you?
          </button>
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-ink-muted dark:text-bone/50 mb-2">{label}</p>
      <p className="font-display text-xl md:text-2xl text-navy-950 dark:text-bone tracking-tight leading-none">{value}</p>
      {sub && <p className="text-[11px] uppercase tracking-widest text-ink-faint dark:text-bone/40 mt-1">{sub}</p>}
    </div>
  );
}
