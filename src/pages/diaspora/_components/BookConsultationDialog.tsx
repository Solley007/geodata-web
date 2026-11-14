import { useState } from "react";
import { useMutation } from "convex/react";
import { useSearchParams } from "react-router-dom";
import { ConvexError } from "convex/values";
import { CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import type { ProgrammeKey } from "../_lib/programmeMeta.ts";

type ConsultationType = Doc<"diasporaConsultations">["consultationType"];

// Which consultation types make sense for each programme — keeps the picker
// short and relevant instead of showing all seven options everywhere.
const TYPE_OPTIONS_BY_PROGRAMME: Record<ProgrammeKey, Array<{ value: ConsultationType; label: string }>> = {
  own: [{ value: "property", label: "Property Consultation" }, { value: "advisory", label: "General Advisory" }, { value: "virtual_presentation", label: "Virtual Presentation" }],
  invest: [{ value: "investment", label: "Investment Consultation" }, { value: "advisory", label: "General Advisory" }, { value: "virtual_presentation", label: "Virtual Presentation" }],
  partner: [{ value: "development", label: "Development Discussion" }, { value: "partnership", label: "Partnership Discussion" }, { value: "virtual_presentation", label: "Virtual Presentation" }],
  refer: [{ value: "advisory", label: "General Advisory" }, { value: "virtual_presentation", label: "Virtual Presentation" }],
  corporate: [{ value: "corporate", label: "Corporate / Institutional Briefing" }, { value: "virtual_presentation", label: "Virtual Presentation" }],
};

const CONTACT_PREFS = ["Video Call", "Phone Call", "In-Person (when I visit Nigeria)", "Email Only"];

/**
 * "Book a Consultation" CTA available on every programme page. Creates a
 * `diasporaConsultations` row plus its underlying CRM lead in one call
 * (`requestConsultation`) — never a parallel booking flow.
 */
export default function BookConsultationDialog({ programmeKey, disabled }: { programmeKey: ProgrammeKey; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const campaignCode = searchParams.get("ref") ?? undefined;
  const requestConsultation = useMutation(api.diaspora.consultations.requestConsultation);

  const typeOptions = TYPE_OPTIONS_BY_PROGRAMME[programmeKey];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [consultationType, setConsultationType] = useState<ConsultationType>(typeOptions[0].value);
  const [preferredContact, setPreferredContact] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);

  const resetAndClose = () => {
    setOpen(false);
    setSubmitted(false);
    setName(""); setEmail(""); setPhone(""); setCountry(""); setPreferredContact(""); setNotes(""); setConsent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { toast.error("Please confirm you consent to be contacted."); return; }
    setSubmitting(true);
    try {
      await requestConsultation({
        name, email, phone, country,
        programmeKey,
        consultationType,
        preferredContact: preferredContact || undefined,
        notes: notes || undefined,
        campaignCode,
        consent,
      });
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof ConvexError ? (error.data as { message?: string }).message ?? "Something went wrong" : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        size="lg"
        variant="secondary"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="border border-white/30 bg-white/10 text-white hover:bg-white/20 gap-2 shrink-0"
      >
        <CalendarClock size={16} /> Book a Consultation
      </Button>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Book a Consultation</DialogTitle>
          </DialogHeader>

          {submitted ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={22} className="text-[var(--brand)]" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1.5">Consultation requested</h3>
              <p className="text-sm text-gray-500">Our team will reach out shortly to confirm a time.</p>
              <Button className="mt-5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white" onClick={resetAndClose}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-1.5">Consultation Type</Label>
                <Select value={consultationType} onValueChange={(v) => setConsultationType(v as ConsultationType)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{typeOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5">Full Name</Label>
                  <Input required placeholder="John Smith" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5">Phone Number</Label>
                  <Input required placeholder="+32 470 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="mb-1.5">Email Address</Label>
                <Input required type="email" placeholder="example@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5">Country</Label>
                <Input required placeholder="e.g. Belgium" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5">Preferred Contact Method</Label>
                <Select value={preferredContact} onValueChange={setPreferredContact}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select an option" /></SelectTrigger>
                  <SelectContent>{CONTACT_PREFS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5">Anything specific you'd like to discuss? (optional)</Label>
                <Textarea placeholder="Tell us a bit more..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="flex items-start gap-2.5">
                <Checkbox id="consult-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <Label htmlFor="consult-consent" className="text-xs text-gray-500 font-normal leading-relaxed">
                  I consent to Geodata World Services Limited contacting me about this consultation using the details provided above.
                </Label>
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null} {submitting ? "Submitting..." : "Request Consultation"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
