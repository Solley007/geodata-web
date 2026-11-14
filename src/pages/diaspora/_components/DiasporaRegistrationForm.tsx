import { useState } from "react";
import { useMutation } from "convex/react";
import { useSearchParams } from "react-router-dom";
import { ConvexError } from "convex/values";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { PROGRAMME_VISUALS, type ProgrammeKey } from "../_lib/programmeMeta.ts";
import { CONTACT_PREFS, EMPTY_DETAILS, type EnquiryDetails } from "../_lib/enquiryOptions.ts";
import type { FinderAnswers } from "./OpportunityFinder.tsx";
import { ProgrammeDetailSections, NextStepSection } from "./EnquiryDetailSections.tsx";
import { cn } from "@/lib/utils.ts";

const PROGRAMME_OPTIONS: Array<{ key: ProgrammeKey; label: string }> = [
  { key: "own", label: "I want to Own" },
  { key: "invest", label: "I want to Invest" },
  { key: "partner", label: "I want to Partner" },
  { key: "refer", label: "I want to Refer" },
  { key: "corporate", label: "I represent an organisation" },
];

const CUSTOMER_TYPES = ["Diaspora Nigerian", "International Investor", "Returning Resident", "Corporate / Institutional Representative", "Other"];

type FormState = {
  name: string;
  organisation: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  customerSegment: string;
  programmeInterest: ProgrammeKey[];
  preferredLocation: string;
  opportunityType: string;
  preferredContact: string;
  notes: string;
  consent: boolean;
  details: EnquiryDetails;
};

/**
 * Reads sessionStorage answers left by the Opportunity Finder so a visitor
 * who already answered those questions never has to repeat themselves.
 * Best-effort only — a missing/invalid entry silently yields an empty prefill.
 */
function readFinderAnswers(): Partial<FinderAnswers> {
  try {
    const raw = sessionStorage.getItem("diaspora_finder_answers");
    return raw ? (JSON.parse(raw) as Partial<FinderAnswers>) : {};
  } catch {
    return {};
  }
}

function buildInitialState(programmeKey: ProgrammeKey): FormState {
  const finder = readFinderAnswers();
  return {
    name: "", organisation: "", email: "", phone: "",
    country: finder.country ?? "",
    city: finder.city ?? "",
    customerSegment: finder.customerType ?? "",
    programmeInterest: finder.objectives && finder.objectives.length > 0 ? finder.objectives : [programmeKey],
    preferredLocation: finder.preferredLocation ?? "",
    opportunityType: finder.opportunityType ?? "",
    preferredContact: finder.consultationPreference ?? "",
    notes: "",
    consent: false,
    details: { ...EMPTY_DETAILS, budgetRange: finder.budgetRange ?? "", timeline: finder.timeline ?? "" },
  };
}

// "Other" chips carry a free-text value — merge it into the saved answer so
// staff see what the visitor actually typed.
function withOther(values: string[], other: string): string[] {
  const text = other.trim();
  return values.map((v) => (v === "Other" && text ? `Other: ${text}` : v));
}

/**
 * Registration / enquiry form embedded on every programme page (anchor
 * `#register`). Mirrors the printed "How would you like to work with us?"
 * lead form: programme-specific questions only appear for what the visitor
 * ticked. Pre-filled from the Opportunity Finder and attributes to a
 * campaign via `?ref=CODE` in the URL.
 */
export default function DiasporaRegistrationForm({ programmeKey, registrationOpen }: { programmeKey: ProgrammeKey; registrationOpen: boolean }) {
  const [searchParams] = useSearchParams();
  const campaignCode = searchParams.get("ref") ?? undefined;
  const [form, setForm] = useState<FormState>(() => buildInitialState(programmeKey));
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submitEnquiry = useMutation(api.diaspora.leads.submitDiasporaEnquiry);
  const visual = PROGRAMME_VISUALS[programmeKey];

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateDetail = <K extends keyof EnquiryDetails>(key: K, value: EnquiryDetails[K]) =>
    setForm((prev) => ({ ...prev, details: { ...prev.details, [key]: value } }));

  const toggleProgramme = (key: ProgrammeKey) => {
    setForm((prev) => ({
      ...prev,
      programmeInterest: prev.programmeInterest.includes(key) ? prev.programmeInterest.filter((k) => k !== key) : [...prev.programmeInterest, key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent) { toast.error("Please confirm you consent to be contacted."); return; }
    if (form.programmeInterest.length === 0) { toast.error("Select at least one option under \"I want to…\"."); return; }

    const d = form.details;
    const has = (k: ProgrammeKey) => form.programmeInterest.includes(k);
    const ownOrInvest = has("own") || has("invest");
    const heardAbout = d.heardAbout === "Other" && d.heardAboutOther.trim() ? `Other: ${d.heardAboutOther.trim()}` : d.heardAbout;

    setSubmitting(true);
    try {
      await submitEnquiry({
        name: form.name,
        email: form.email,
        phone: form.phone,
        country: form.country,
        city: form.city || undefined,
        organisation: form.organisation.trim() || undefined,
        customerSegment: form.customerSegment || undefined,
        programmeInterest: form.programmeInterest,
        preferredLocation: form.preferredLocation || undefined,
        opportunityType: form.opportunityType || undefined,
        // Only send answers for sections the visitor can currently see — a
        // section hidden by unticking its programme shouldn't leak stale data.
        homesOfInterest: ownOrInvest && d.homesOfInterest.length > 0 ? d.homesOfInterest : undefined,
        budgetRange: ownOrInvest ? d.budgetRange || undefined : undefined,
        paymentRoute: ownOrInvest ? d.paymentRoute || undefined : undefined,
        timeline: ownOrInvest ? d.timeline || undefined : undefined,
        partnerTypes: has("partner") && d.partnerTypes.length > 0 ? withOther(d.partnerTypes, d.partnerOther) : undefined,
        proposal: has("partner") ? d.proposal.trim() || undefined : undefined,
        organisationNeeds: has("corporate") && d.organisationNeeds.length > 0 ? withOther(d.organisationNeeds, d.organisationOther) : undefined,
        approxUnits: has("corporate") ? d.approxUnits.trim() || undefined : undefined,
        nextSteps: d.nextSteps.length > 0 ? d.nextSteps : undefined,
        heardAbout: heardAbout || undefined,
        preferredContact: form.preferredContact || undefined,
        notes: form.notes || undefined,
        campaignCode,
        consent: form.consent,
      });
      sessionStorage.removeItem("diaspora_finder_answers");
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof ConvexError ? (error.data as { message?: string }).message ?? "Something went wrong" : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!registrationOpen) {
    return (
      <div id="register" className="max-w-2xl mx-auto text-center py-4">
        <p className="text-gray-500 text-sm">Registration for this programme is currently closed. Please check back soon, or contact us directly.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div id="register" className="max-w-xl mx-auto text-center py-10">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br mx-auto mb-5", visual.gradient)}>
          <CheckCircle2 size={26} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Thank you — we've received your enquiry</h3>
        <p className="text-gray-500 text-sm">A member of our team will reach out to you shortly using the contact details you provided.</p>
      </div>
    );
  }

  return (
    <div id="register" className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
      <h3 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>How would you like to work with us?</h3>
      <p className="text-sm text-gray-500 mb-6">Tell us a little about yourself and our team will be in touch.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Full Name</Label>
            <Input required placeholder="John Smith" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">Organisation (if any)</Label>
            <Input placeholder="Acme Holdings Ltd" value={form.organisation} onChange={(e) => update("organisation", e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Email Address</Label>
            <Input required type="email" placeholder="example@gmail.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">Phone / WhatsApp (with country code)</Label>
            <Input required placeholder="+32 470 000 000" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Country of residence</Label>
            <Input required placeholder="e.g. Belgium" value={form.country} onChange={(e) => update("country", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">City (optional)</Label>
            <Input placeholder="e.g. Brussels" value={form.city} onChange={(e) => update("city", e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Which best describes you?</Label>
            <Select value={form.customerSegment} onValueChange={(v) => update("customerSegment", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select an option" /></SelectTrigger>
              <SelectContent>{CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5">Preferred contact</Label>
            <Select value={form.preferredContact} onValueChange={(v) => update("preferredContact", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select an option" /></SelectTrigger>
              <SelectContent>{CONTACT_PREFS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="mb-2">I want to… (tick one or more)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROGRAMME_OPTIONS.map((opt) => {
              const selected = form.programmeInterest.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleProgramme(opt.key)}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border-2 text-left text-xs font-medium transition-colors cursor-pointer",
                    selected ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]" : "border-gray-100 hover:border-gray-200 text-gray-700",
                  )}
                >
                  {selected && <CheckCircle2 size={13} className="shrink-0" />} {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <ProgrammeDetailSections programmes={form.programmeInterest} details={form.details} update={updateDetail} />

        <NextStepSection details={form.details} update={updateDetail} />

        <div>
          <Label className="mb-1.5">Anything else you'd like us to know? (optional)</Label>
          <Textarea placeholder="Not sure yet? Tell us a little about your situation and we'll point you to the right pathway." value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </div>

        <div className="flex items-start gap-2.5 pt-1">
          <Checkbox id="consent" checked={form.consent} onCheckedChange={(v) => update("consent", v === true)} className="mt-0.5" />
          <Label htmlFor="consent" className="text-xs text-gray-500 font-normal leading-relaxed">
            I agree that Geodata World Services Limited may contact me about Southern Bridge City and related opportunities using the details above.
          </Label>
        </div>

        <Button type="submit" disabled={submitting} size="lg" className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null} {submitting ? "Submitting..." : "Submit Enquiry"}
        </Button>
        <p className="text-[11px] text-gray-400 text-center">Your details are used only to respond to your enquiry. Prices, title, payment routes and delivery remain subject to the applicable transaction documents.</p>
      </form>
    </div>
  );
}
