import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, MapPin, Wallet, Clock, Users, Video, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";
import type { ProgrammeKey } from "../_lib/programmeMeta.ts";
import { PROGRAMME_VISUALS } from "../_lib/programmeMeta.ts";
import { BUDGET_RANGES as BUDGET_OPTIONS, TIMELINES as TIMELINE_OPTIONS, CONTACT_PREFS } from "../_lib/enquiryOptions.ts";

/**
 * Guided Opportunity Finder (spec section 19) — a short multi-step
 * questionnaire. Capturing answers only, no backend persistence yet: the
 * answers are handed to the registration flow (milestone-85) via
 * `onComplete`, which will pre-fill the enquiry form there.
 */

export type FinderAnswers = {
  country: string;
  city: string;
  customerType: string;
  objectives: ProgrammeKey[];
  preferredLocation: string;
  opportunityType: string;
  budgetRange: string;
  timeline: string;
  consultationPreference: string;
};

const EMPTY_ANSWERS: FinderAnswers = {
  country: "", city: "", customerType: "", objectives: [],
  preferredLocation: "", opportunityType: "", budgetRange: "", timeline: "", consultationPreference: "",
};

const CUSTOMER_TYPES = ["Diaspora Nigerian", "International Investor", "Returning Resident", "Corporate / Institutional Representative", "Other"];
const LOCATIONS = ["Abuja (FCT)", "Lagos", "Port Harcourt", "Other / Not Sure Yet"];
const OPPORTUNITY_TYPES = ["Residential Home", "Land / Plots", "Commercial Property", "Bulk / Institutional Units", "Development Partnership", "Not Sure Yet"];
// Shared with the registration form so pre-filled answers always match its options.
const BUDGET_RANGES = BUDGET_OPTIONS;
const TIMELINES = TIMELINE_OPTIONS;
const CONSULTATION_PREFS = CONTACT_PREFS;

const OBJECTIVE_OPTIONS: Array<{ key: ProgrammeKey; label: string }> = [
  { key: "own", label: "Own a home" },
  { key: "invest", label: "Invest" },
  { key: "partner", label: "Develop / Partner" },
  { key: "refer", label: "Refer clients" },
  { key: "corporate", label: "Corporate / Institutional" },
];

const STEPS = ["Location", "About You", "Objectives", "Preferences", "Consultation"] as const;

export default function OpportunityFinder({ onComplete }: { onComplete: (answers: FinderAnswers) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<FinderAnswers>(EMPTY_ANSWERS);
  const navigate = useNavigate();

  const update = <K extends keyof FinderAnswers>(key: K, value: FinderAnswers[K]) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const toggleObjective = (key: ProgrammeKey) => {
    setAnswers((prev) => ({
      ...prev,
      objectives: prev.objectives.includes(key) ? prev.objectives.filter((k) => k !== key) : [...prev.objectives, key],
    }));
  };

  const canProceed = (() => {
    switch (step) {
      case 0: return answers.country.trim().length > 0;
      case 1: return answers.customerType.length > 0;
      case 2: return answers.objectives.length > 0;
      case 3: return answers.opportunityType.length > 0 && answers.budgetRange.length > 0 && answers.timeline.length > 0;
      case 4: return answers.consultationPreference.length > 0;
      default: return true;
    }
  })();

  const handleNext = () => {
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    onComplete(answers);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-[var(--brand)]" : "bg-gray-100")} />
            <span className={cn("text-[10px] mt-1.5 block", i === step ? "text-[var(--brand)] font-semibold" : "text-gray-400")}>{label}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="min-h-[260px]"
        >
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-[var(--brand)] mb-1"><MapPin size={18} /><h3 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>Where are you writing to us from?</h3></div>
              <div>
                <Label className="mb-1.5">Country</Label>
                <Input placeholder="e.g. Belgium" value={answers.country} onChange={(e) => update("country", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5">City (optional)</Label>
                <Input placeholder="e.g. Brussels" value={answers.city} onChange={(e) => update("city", e.target.value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-[var(--brand)] mb-1"><Users size={18} /><h3 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>Tell us a bit about you</h3></div>
              <div>
                <Label className="mb-1.5">Which best describes you?</Label>
                <Select value={answers.customerType} onValueChange={(v) => update("customerType", v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select an option" /></SelectTrigger>
                  <SelectContent>{CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>What would you like to do in Nigeria?</h3>
              <p className="text-xs text-gray-400">Select all that apply.</p>
              <div className="grid grid-cols-2 gap-3">
                {OBJECTIVE_OPTIONS.map((opt) => {
                  const visual = PROGRAMME_VISUALS[opt.key];
                  const selected = answers.objectives.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleObjective(opt.key)}
                      className={cn(
                        "flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-colors cursor-pointer",
                        selected ? "border-[var(--brand)] bg-[var(--brand)]/5" : "border-gray-100 hover:border-gray-200",
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0", visual.gradient)}>
                        <visual.icon size={15} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                      {selected && <CheckCircle2 size={14} className="text-[var(--brand)] ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-[var(--brand)] mb-1"><Wallet size={18} /><h3 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>Your preferences</h3></div>
              <div>
                <Label className="mb-1.5">Preferred Nigerian location</Label>
                <Select value={answers.preferredLocation} onValueChange={(v) => update("preferredLocation", v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select a location" /></SelectTrigger>
                  <SelectContent>{LOCATIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Property / opportunity type</Label>
                <Select value={answers.opportunityType} onValueChange={(v) => update("opportunityType", v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select a type" /></SelectTrigger>
                  <SelectContent>{OPPORTUNITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5">Budget range</Label>
                  <Select value={answers.budgetRange} onValueChange={(v) => update("budgetRange", v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{BUDGET_RANGES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5">Timeline</Label>
                  <Select value={answers.timeline} onValueChange={(v) => update("timeline", v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{TIMELINES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-[var(--brand)] mb-1"><Video size={18} /><h3 className="font-bold text-gray-900 text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>How would you like to be contacted?</h3></div>
              <div className="grid grid-cols-1 gap-2.5">
                {CONSULTATION_PREFS.map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => update("consultationPreference", pref)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border-2 text-left text-sm font-medium transition-colors cursor-pointer",
                      answers.consultationPreference === pref ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]" : "border-gray-100 hover:border-gray-200 text-gray-700",
                    )}
                  >
                    <Clock size={14} className="shrink-0" /> {pref}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
        <Button
          variant="secondary"
          className="border border-gray-200 gap-1.5"
          onClick={() => (step === 0 ? navigate("/diaspora") : setStep(step - 1))}
        >
          <ArrowLeft size={14} /> {step === 0 ? "Back" : "Previous"}
        </Button>
        <Button disabled={!canProceed} onClick={handleNext} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-1.5">
          {step === STEPS.length - 1 ? "Continue to Register" : "Next"} <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
