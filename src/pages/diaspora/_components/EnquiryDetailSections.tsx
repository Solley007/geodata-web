import { useQuery } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import type { ProgrammeKey } from "../_lib/programmeMeta.ts";
import {
  BUDGET_RANGES, PAYMENT_ROUTES, TIMELINES, PARTNER_TYPES, ORGANISATION_NEEDS,
  NEXT_STEPS, FORUM_NEXT_STEP, HEARD_ABOUT, NOT_SURE_HOME, formatShortNaira, toggleValue, type EnquiryDetails,
} from "../_lib/enquiryOptions.ts";

type ChipOption = { value: string; label: string };

/** Pill-style multi or single select used by every detail question. */
function ChipGroup({ options, selected, onToggle, columns = 2 }: {
  options: ReadonlyArray<string | ChipOption>;
  selected: string[];
  onToggle: (value: string) => void;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div className={cn("grid gap-2", columns === 1 && "grid-cols-1", columns === 2 && "grid-cols-1 sm:grid-cols-2", columns === 3 && "grid-cols-1 sm:grid-cols-3")}>
      {options.map((raw) => {
        const opt = typeof raw === "string" ? { value: raw, label: raw } : raw;
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={cn(
              "flex items-center gap-2 p-2.5 rounded-lg border-2 text-left text-xs font-medium transition-colors cursor-pointer",
              isSelected ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)]" : "border-gray-100 hover:border-gray-200 text-gray-700",
            )}
          >
            {isSelected && <CheckCircle2 size={13} className="shrink-0" />} {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600">{children}</p>;
}

type SectionProps = {
  details: EnquiryDetails;
  update: <K extends keyof EnquiryDetails>(key: K, value: EnquiryDetails[K]) => void;
};

// Single-select toggles back to empty when the same chip is tapped again.
const pickOne = (current: string, value: string) => (current === value ? "" : value);

/** Own / Invest — homes are pulled live from Diaspora-visible listings so prices never go stale. */
function OwnInvestSection({ details, update }: SectionProps) {
  const homes = useQuery(api.diaspora.properties.listDiasporaVisibleProperties, { limit: 20 });
  const homeOptions: ChipOption[] = [
    ...(homes ?? []).map((h) => ({ value: h.title.trim(), label: `${h.title.trim()} · ${formatShortNaira(h.price)}` })),
    { value: NOT_SURE_HOME, label: NOT_SURE_HOME },
  ];

  return (
    <div className="space-y-4">
      <SectionTitle>Own / Invest</SectionTitle>
      <div>
        <Label className="mb-2">Homes of interest</Label>
        {homes === undefined ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : (
          <ChipGroup options={homeOptions} selected={details.homesOfInterest} onToggle={(v) => update("homesOfInterest", toggleValue(details.homesOfInterest, v))} />
        )}
      </div>
      <div>
        <Label className="mb-2">Budget range</Label>
        <ChipGroup options={BUDGET_RANGES} selected={[details.budgetRange]} onToggle={(v) => update("budgetRange", pickOne(details.budgetRange, v))} />
      </div>
      <div>
        <Label className="mb-2">Payment route</Label>
        <ChipGroup options={PAYMENT_ROUTES} selected={[details.paymentRoute]} onToggle={(v) => update("paymentRoute", pickOne(details.paymentRoute, v))} />
      </div>
      <div>
        <Label className="mb-2">Timeline</Label>
        <ChipGroup columns={3} options={TIMELINES} selected={[details.timeline]} onToggle={(v) => update("timeline", pickOne(details.timeline, v))} />
      </div>
    </div>
  );
}

function PartnerSection({ details, update }: SectionProps) {
  return (
    <div className="space-y-4">
      <SectionTitle>Partner</SectionTitle>
      <div>
        <Label className="mb-2">I am a…</Label>
        <ChipGroup options={PARTNER_TYPES} selected={details.partnerTypes} onToggle={(v) => update("partnerTypes", toggleValue(details.partnerTypes, v))} />
        {details.partnerTypes.includes("Other") && (
          <Input className="mt-2" placeholder="Please specify" value={details.partnerOther} onChange={(e) => update("partnerOther", e.target.value)} />
        )}
      </div>
      <div>
        <Label className="mb-1.5">Brief description of your proposal</Label>
        <Textarea placeholder="e.g. 20 hectares of titled land available for joint venture" value={details.proposal} onChange={(e) => update("proposal", e.target.value)} />
      </div>
    </div>
  );
}

function OrganisationSection({ details, update }: SectionProps) {
  return (
    <div className="space-y-4">
      <SectionTitle>Organisation</SectionTitle>
      <div>
        <Label className="mb-2">What does your organisation need?</Label>
        <ChipGroup options={ORGANISATION_NEEDS} selected={details.organisationNeeds} onToggle={(v) => update("organisationNeeds", toggleValue(details.organisationNeeds, v))} />
        {details.organisationNeeds.includes("Other") && (
          <Input className="mt-2" placeholder="Please specify" value={details.organisationOther} onChange={(e) => update("organisationOther", e.target.value)} />
        )}
      </div>
      <div>
        <Label className="mb-1.5">Approximate number of staff or units</Label>
        <Input placeholder="e.g. 40" value={details.approxUnits} onChange={(e) => update("approxUnits", e.target.value)} />
      </div>
    </div>
  );
}

/** Programme-specific questions — only the parts that apply to the visitor's selection are shown. */
export function ProgrammeDetailSections({ programmes, ...props }: SectionProps & { programmes: ProgrammeKey[] }) {
  const showOwnInvest = programmes.includes("own") || programmes.includes("invest");
  const showPartner = programmes.includes("partner");
  const showOrganisation = programmes.includes("corporate");
  const showRefer = programmes.includes("refer");
  if (!showOwnInvest && !showPartner && !showOrganisation && !showRefer) return null;

  return (
    <div className="space-y-6 rounded-2xl bg-gray-50 border border-gray-100 p-4 sm:p-5">
      <p className="text-sm font-semibold text-gray-900">A little more detail</p>
      {showOwnInvest && <OwnInvestSection {...props} />}
      {showPartner && <PartnerSection {...props} />}
      {showOrganisation && <OrganisationSection {...props} />}
      {showRefer && (
        <div className="space-y-1.5">
          <SectionTitle>Refer</SectionTitle>
          <p className="text-xs text-gray-500">We'll register you as a referral partner. Verification follows after we meet. Please do not share ID numbers here.</p>
        </div>
      )}
    </div>
  );
}

/** "Next step" + "How did you hear about us?" — shown for every enquiry. */
export function NextStepSection({ details, update }: SectionProps) {
  // Staff can retire the forum option after the event (Diaspora admin → Follow-ups).
  const settings = useQuery(api.diaspora.followUps.getEnquirySettings, {});
  const nextSteps = NEXT_STEPS.filter((s) => s !== FORUM_NEXT_STEP || settings?.forumOptionVisible === true);
  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-2">What would you like us to do next?</Label>
        <ChipGroup options={nextSteps} selected={details.nextSteps} onToggle={(v) => update("nextSteps", toggleValue(details.nextSteps, v))} />
      </div>
      <div>
        <Label className="mb-2">How did you hear about us?</Label>
        <ChipGroup options={HEARD_ABOUT} selected={[details.heardAbout]} onToggle={(v) => update("heardAbout", pickOne(details.heardAbout, v))} />
        {details.heardAbout === "Other" && (
          <Input className="mt-2" placeholder="Please specify" value={details.heardAboutOther} onChange={(e) => update("heardAboutOther", e.target.value)} />
        )}
      </div>
    </div>
  );
}
