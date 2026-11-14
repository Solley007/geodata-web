import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { CheckCircle2, Loader2, Building2 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { PROGRAMME_VISUALS } from "../_lib/programmeMeta.ts";
import { cn } from "@/lib/utils.ts";

const OPPORTUNITY_TYPES = [
  { value: "staff_housing", label: "Staff Housing Scheme" },
  { value: "investment_portfolio", label: "Investment Portfolio" },
  { value: "off_take", label: "Off-Take Agreement" },
  { value: "cooperative", label: "Cooperative Purchase" },
  { value: "institutional", label: "Institutional Acquisition" },
  { value: "other", label: "Other" },
] as const;

const FINANCING_OPTIONS = [
  { value: "outright", label: "Outright Payment" },
  { value: "mortgage", label: "Mortgage" },
  { value: "instalment", label: "Instalment Plan" },
  { value: "undecided", label: "Undecided" },
] as const;

type FormState = {
  organisationName: string;
  orgTypeKey: string;
  contactName: string;
  contactJobTitle: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  city: string;
  beneficiaryCount: string;
  unitsRequired: string;
  propertyType: string;
  preferredLocation: string;
  budgetRange: string;
  financingPreference: string;
  opportunityType: string;
  purpose: string;
  timeline: string;
  isBulkAcquisition: boolean;
  isPartnershipInterest: boolean;
  notes: string;
  consent: boolean;
};

const EMPTY_FORM: FormState = {
  organisationName: "", orgTypeKey: "", contactName: "", contactJobTitle: "", contactEmail: "", contactPhone: "",
  country: "", city: "", beneficiaryCount: "", unitsRequired: "", propertyType: "", preferredLocation: "",
  budgetRange: "", financingPreference: "", opportunityType: "", purpose: "", timeline: "",
  isBulkAcquisition: false, isPartnershipInterest: false, notes: "", consent: false,
};

/**
 * Diaspora "Corporate & Institutional" programme intake — captures the
 * organisation/requirement fields from the governing spec and submits via
 * `diaspora.corporate.submitCorporateEnquiry`, which creates a real
 * corporateOrganisations + corporateOpportunities row in the EXISTING
 * Corporate Marketing & Bulk Sales pipeline. Never a second corporate CRM.
 */
export default function CorporateEnquiryForm({ registrationOpen, campaignCode }: { registrationOpen: boolean; campaignCode: string | null }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const availability = useQuery(api.diaspora.corporate.getCorporateProgrammeAvailability, {});
  const orgTypes = useQuery(api.corporateMarketing.config.listOrgTypes, {});
  const submitEnquiry = useMutation(api.diaspora.corporate.submitCorporateEnquiry);
  const visual = PROGRAMME_VISUALS.corporate;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent) { toast.error("Please confirm you consent to be contacted."); return; }

    setSubmitting(true);
    try {
      await submitEnquiry({
        organisationName: form.organisationName,
        orgTypeKey: form.orgTypeKey || undefined,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        contactJobTitle: form.contactJobTitle || undefined,
        country: form.country,
        city: form.city || undefined,
        beneficiaryCount: form.beneficiaryCount ? Number(form.beneficiaryCount) : undefined,
        unitsRequired: form.unitsRequired ? Number(form.unitsRequired) : undefined,
        propertyType: form.propertyType || undefined,
        preferredLocation: form.preferredLocation || undefined,
        budgetRange: form.budgetRange || undefined,
        financingPreference: form.financingPreference ? (form.financingPreference as (typeof FINANCING_OPTIONS)[number]["value"]) : undefined,
        opportunityType: form.opportunityType ? (form.opportunityType as (typeof OPPORTUNITY_TYPES)[number]["value"]) : undefined,
        purpose: form.purpose || undefined,
        timeline: form.timeline || undefined,
        isBulkAcquisition: form.isBulkAcquisition,
        isPartnershipInterest: form.isPartnershipInterest,
        notes: form.notes || undefined,
        campaignCode: campaignCode ?? undefined,
        consent: form.consent,
      });
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
        <p className="text-gray-500 text-sm">The Corporate &amp; Institutional programme is currently closed to new enquiries. Please check back soon, or contact us directly.</p>
      </div>
    );
  }

  if (availability && !availability.available) {
    return (
      <div id="register" className="max-w-2xl mx-auto text-center py-4">
        <p className="text-gray-500 text-sm">The Corporate &amp; Institutional programme is currently unavailable. Please contact us directly and our team will assist you.</p>
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
        <p className="text-gray-500 text-sm">A member of our Corporate &amp; Institutional team will reach out to you shortly using the contact details you provided.</p>
      </div>
    );
  }

  return (
    <div id="register" className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
          <Building2 size={20} className="text-rose-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Tell Us About Your Organisation</h3>
          <p className="text-sm text-gray-500 mt-1">Staff housing, bulk acquisition, institutional housing, or a development partnership — our Corporate &amp; Institutional team will follow up directly.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Organisation Name</Label>
            <Input required placeholder="Acme Holdings Ltd" value={form.organisationName} onChange={(e) => update("organisationName", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">Organisation Type</Label>
            <Select value={form.orgTypeKey} onValueChange={(v) => update("orgTypeKey", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{(orgTypes ?? []).filter((t) => t.status === "active").map((t) => <SelectItem key={t._id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Contact Name</Label>
            <Input required placeholder="Jane Smith" value={form.contactName} onChange={(e) => update("contactName", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">Job Title</Label>
            <Input placeholder="Head of Facilities" value={form.contactJobTitle} onChange={(e) => update("contactJobTitle", e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Contact Email</Label>
            <Input required type="email" placeholder="jane@example.com" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">Contact Phone</Label>
            <Input required placeholder="+32 470 000 000" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Country</Label>
            <Input required placeholder="e.g. Belgium" value={form.country} onChange={(e) => update("country", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">City (optional)</Label>
            <Input placeholder="e.g. Brussels" value={form.city} onChange={(e) => update("city", e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Number of Beneficiaries (optional)</Label>
            <Input type="number" min={0} placeholder="e.g. 50" value={form.beneficiaryCount} onChange={(e) => update("beneficiaryCount", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">Units Required (optional)</Label>
            <Input type="number" min={0} placeholder="e.g. 50" value={form.unitsRequired} onChange={(e) => update("unitsRequired", e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Property Type</Label>
            <Input placeholder="e.g. 2-bedroom apartments" value={form.propertyType} onChange={(e) => update("propertyType", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">Preferred Location</Label>
            <Input placeholder="e.g. Idu, Abuja" value={form.preferredLocation} onChange={(e) => update("preferredLocation", e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Opportunity Type</Label>
            <Select value={form.opportunityType} onValueChange={(v) => update("opportunityType", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{OPPORTUNITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5">Financing Preference</Label>
            <Select value={form.financingPreference} onValueChange={(v) => update("financingPreference", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select preference" /></SelectTrigger>
              <SelectContent>{FINANCING_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5">Budget Range (optional)</Label>
            <Input placeholder="e.g. ₦500M – ₦1B" value={form.budgetRange} onChange={(e) => update("budgetRange", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5">Timeline (optional)</Label>
            <Input placeholder="e.g. Within 6 months" value={form.timeline} onChange={(e) => update("timeline", e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="mb-1.5">Purpose (optional)</Label>
          <Input placeholder="e.g. Staff accommodation" value={form.purpose} onChange={(e) => update("purpose", e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 text-sm text-gray-600 cursor-pointer">
            <Checkbox checked={form.isBulkAcquisition} onCheckedChange={(v) => update("isBulkAcquisition", v === true)} />
            This is a bulk acquisition requirement
          </label>
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 text-sm text-gray-600 cursor-pointer">
            <Checkbox checked={form.isPartnershipInterest} onCheckedChange={(v) => update("isPartnershipInterest", v === true)} />
            We're also interested in a development partnership
          </label>
        </div>

        <div>
          <Label className="mb-1.5">Anything else you'd like us to know? (optional)</Label>
          <Textarea placeholder="Tell us more about your requirement..." value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </div>

        <div className="flex items-start gap-2.5 pt-1">
          <Checkbox id="corp-consent" checked={form.consent} onCheckedChange={(v) => update("consent", v === true)} className="mt-0.5" />
          <Label htmlFor="corp-consent" className="text-xs text-gray-500 font-normal leading-relaxed">
            I consent to Geodata World Services Limited contacting our organisation about this enquiry using the details provided above.
          </Label>
        </div>

        <Button type="submit" disabled={submitting} size="lg" className="w-full bg-rose-600 hover:bg-rose-700 text-white gap-2">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null} {submitting ? "Submitting..." : "Submit Requirement"}
        </Button>
      </form>
    </div>
  );
}
