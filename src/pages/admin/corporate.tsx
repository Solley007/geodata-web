import { useState } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.js";
import { useDebounce } from "@/hooks/use-debounce.ts";
import {
  Building2, Building, ShieldAlert, Plus, Search, Star, ShieldCheck, Wallet,
  Scale, UserCog2, Crown, Pencil, Trash2, ArrowLeft, Settings2, Phone, Mail,
  Briefcase, PackagePlus, Layers, ChevronRight, XCircle,
  FileText, Send, PackageCheck, ClipboardCheck, Upload, CheckCircle2, Clock, X, PenLine,
  ListChecks, History, CalendarClock, Video, MapPin, MessageSquare, FileSignature,
  BarChart3, Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import CampaignsAndAnalytics from "./_components/CorporateCampaignsAnalytics.tsx";
import { BulkAcquisitionsSection, BulkAcquisitionDetail, AcquisitionStatusManager } from "./_components/CorporateBulkAcquisitions.tsx";
import InstitutionalAccountSummary from "./_components/InstitutionalAccountSummary.tsx";

type OrgDoc = Doc<"corporateOrganisations">;
type ContactDoc = Doc<"corporateContacts">;
type LineItemDoc = Doc<"corporateOpportunityLineItems">;
type LetterDoc = Doc<"corporatePartnershipLetters">;

const LETTER_STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  in_review: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  sent: "bg-indigo-100 text-indigo-700",
  delivered: "bg-teal-100 text-teal-700",
  acknowledged: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const STATUS_COLOR: Record<string, string> = {
  prospect: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  dormant: "bg-gray-100 text-gray-500",
  disengaged: "bg-red-100 text-red-600",
};
const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-100 text-red-600",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-500",
};

/**
 * Corporate Marketing & Bulk Sales — extends the existing Clients & CRM,
 * Sales & Pipelines, Documents & Vault, Tasks & Approvals, Payments,
 * Allocations, Transactions and IAM/RBAC modules. Never a second CRM or
 * sales system. Gated by the "feature_corporate_marketing_sales" toggle
 * (Settings tab) and by the granular `corporate_marketing.*` IAM
 * permissions — both re-checked server-side on every query/mutation.
 */
export default function AdminCorporateMarketing() {
  const feature = useQuery(api.corporateMarketing.feature.getFeatureStatus, {});
  const access = useQuery(api.corporateMarketing.feature.getMyAccess, {});
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"corporateOrganisations"> | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<Id<"corporateOpportunities"> | null>(null);
  const [selectedAcquisitionId, setSelectedAcquisitionId] = useState<Id<"corporateBulkAcquisitions"> | null>(null);
  const [showOrgTypes, setShowOrgTypes] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAcquisitionStatuses, setShowAcquisitionStatuses] = useState(false);

  if (feature === undefined || access === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!feature.enabled) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
          <EmptyTitle>Corporate Marketing & Bulk Sales is currently off</EmptyTitle>
          <EmptyDescription>
            An administrator can turn this on from Settings. Existing records, if any, are preserved and will reappear once re-enabled.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!access.canView) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia>
          <EmptyTitle>You don't have access to this module</EmptyTitle>
          <EmptyDescription>
            Ask an administrator to grant you the "View Corporate Marketing & Bulk Sales" permission under Users &amp; Roles.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (showOrgTypes) {
    return <OrgTypesManager onBack={() => setShowOrgTypes(false)} />;
  }

  if (showAcquisitionStatuses) {
    return <AcquisitionStatusManager onBack={() => setShowAcquisitionStatuses(false)} />;
  }

  if (showAnalytics) {
    return <CampaignsAndAnalytics onBack={() => setShowAnalytics(false)} />;
  }

  if (selectedAcquisitionId) {
    return <BulkAcquisitionDetail acquisitionId={selectedAcquisitionId} onBack={() => setSelectedAcquisitionId(null)} />;
  }

  if (selectedOpportunityId) {
    return (
      <OpportunityDetail
        opportunityId={selectedOpportunityId}
        onBack={() => setSelectedOpportunityId(null)}
        onSelectAcquisition={setSelectedAcquisitionId}
      />
    );
  }

  if (selectedOrgId) {
    return (
      <OrganisationDetail
        organisationId={selectedOrgId}
        onBack={() => setSelectedOrgId(null)}
        onSelectOpportunity={setSelectedOpportunityId}
      />
    );
  }

  return (
    <OrganisationsList
      onSelect={setSelectedOrgId}
      onManageOrgTypes={() => setShowOrgTypes(true)}
      onShowAnalytics={() => setShowAnalytics(true)}
      onManageAcquisitionStatuses={() => setShowAcquisitionStatuses(true)}
    />
  );
}

// ─── Organisations list ──────────────────────────────────────────────────
function OrganisationsList({
  onSelect,
  onManageOrgTypes,
  onShowAnalytics,
  onManageAcquisitionStatuses,
}: {
  onSelect: (id: Id<"corporateOrganisations">) => void;
  onManageOrgTypes: () => void;
  onShowAnalytics: () => void;
  onManageAcquisitionStatuses: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [createOpen, setCreateOpen] = useState(false);

  const orgs = useQuery(api.corporateMarketing.organisations.listOrganisations, {
    status: statusFilter === "all" ? undefined : (statusFilter as OrgDoc["status"]),
    search: debouncedSearch || undefined,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Corporate Marketing &amp; Bulk Sales
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Institutional and corporate organisations for bulk property acquisition.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button variant="secondary" onClick={onShowAnalytics} className="gap-2 cursor-pointer">
            <BarChart3 size={14} /> Campaigns &amp; Analytics
          </Button>
          <Button variant="secondary" onClick={onManageAcquisitionStatuses} className="gap-2 cursor-pointer">
            <Settings2 size={14} /> Acquisition Statuses
          </Button>
          <Button variant="secondary" onClick={onManageOrgTypes} className="gap-2 cursor-pointer">
            <Settings2 size={14} /> Organisation Types
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
            <Plus size={14} /> New Organisation
          </Button>
        </div>
      </div>


      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search organisations…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="dormant">Dormant</SelectItem>
            <SelectItem value="disengaged">Disengaged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {orgs === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : orgs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
            <EmptyTitle>No corporate organisations yet</EmptyTitle>
            <EmptyDescription>
              Add government agencies, banks, cooperatives, NGOs, and other institutions here to begin bulk acquisition relationships.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
              <Plus size={14} /> New Organisation
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-3">
          {orgs.map((org) => (
            <button
              key={org._id}
              onClick={() => onSelect(org._id)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-[var(--brand)]/30 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-[var(--brand)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{org.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{org.orgRef}{org.industry ? ` · ${org.industry}` : ""}</p>
                    {(org.relationshipOwnerName || org.assignedOfficerName) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {org.relationshipOwnerName ? `Owner: ${org.relationshipOwnerName}` : ""}
                        {org.relationshipOwnerName && org.assignedOfficerName ? " · " : ""}
                        {org.assignedOfficerName ? `Officer: ${org.assignedOfficerName}` : ""}
                      </p>
                    )}
                    {org.diasporaCampaignName && (
                      <Badge className="text-[10px] border-0 bg-violet-100 text-violet-700 gap-1 mt-1.5"><Megaphone size={10} /> {org.diasporaCampaignName}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge className={cn("text-[10px] border-0 capitalize", STATUS_COLOR[org.status])}>{org.status}</Badge>
                  <Badge className={cn("text-[10px] border-0 capitalize", PRIORITY_COLOR[org.priority])}>{org.priority} priority</Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateOrganisationDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={onSelect} />
    </div>
  );
}

// ─── Create organisation dialog ──────────────────────────────────────────
function CreateOrganisationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: Id<"corporateOrganisations">) => void;
}) {
  const orgTypes = useQuery(api.corporateMarketing.config.listOrgTypes, open ? {} : "skip");
  const campaigns = useQuery(api.corporateMarketing.campaigns.listCampaignOptions, open ? {} : "skip");
  const createOrganisation = useMutation(api.corporateMarketing.organisations.createOrganisation);
  const [form, setForm] = useState({
    name: "", orgTypeKey: "", industry: "", officialEmail: "", phone: "",
    website: "", address: "", city: "", state: "", country: "", priority: "medium", notes: "", campaignId: "none",
  });
  const [saving, setSaving] = useState(false);

  const activeTypes = (orgTypes ?? []).filter((t) => t.status === "active");

  const reset = () => setForm({ name: "", orgTypeKey: "", industry: "", officialEmail: "", phone: "", website: "", address: "", city: "", state: "", country: "", priority: "medium", notes: "", campaignId: "none" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Organisation name is required"); return; }
    setSaving(true);
    try {
      const id = await createOrganisation({
        name: form.name.trim(),
        orgTypeKey: form.orgTypeKey || undefined,
        industry: form.industry || undefined,
        officialEmail: form.officialEmail || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        priority: form.priority as "low" | "medium" | "high",
        notes: form.notes || undefined,
        campaignId: form.campaignId !== "none" ? (form.campaignId as Id<"corporateCampaigns">) : undefined,
      });
      toast.success("Organisation created");
      reset();
      onOpenChange(false);
      onCreated(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create organisation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Corporate Organisation</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Organisation Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Federal Ministry of Housing" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Organisation Type</Label>
              <Select value={form.orgTypeKey} onValueChange={(v) => setForm({ ...form, orgTypeKey: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {activeTypes.map((t) => <SelectItem key={t._id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Industry / Sector</Label>
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Public Sector" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Official Email</Label>
              <Input type="email" value={form.officialEmail} onChange={(e) => setForm({ ...form, officialEmail: e.target.value })} placeholder="contact@example.gov.ng" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Nigeria" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Marketing Campaign (optional)</Label>
            <Select value={form.campaignId} onValueChange={(v) => setForm({ ...form, campaignId: v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(campaigns ?? []).map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Creating…" : "Create Organisation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Organisation detail (contacts + opportunities) ──────────────────────
function OrganisationDetail({
  organisationId,
  onBack,
  onSelectOpportunity,
}: {
  organisationId: Id<"corporateOrganisations">;
  onBack: () => void;
  onSelectOpportunity: (id: Id<"corporateOpportunities">) => void;
}) {
  const org = useQuery(api.corporateMarketing.organisations.getOrganisation, { id: organisationId });
  const contacts = useQuery(api.corporateMarketing.contacts.listContacts, { organisationId });
  const opportunities = useQuery(api.corporateMarketing.opportunities.listOpportunities, { organisationId });
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactDoc | null>(null);
  const [createOpportunityOpen, setCreateOpportunityOpen] = useState(false);

  if (org === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2 cursor-pointer text-gray-500">
        <ArrowLeft size={14} /> Back to organisations
      </Button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-[var(--brand)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{org.name}</h1>
              <p className="text-xs text-gray-400 mt-0.5">{org.orgRef}{org.orgTypeKey ? ` · ${org.orgTypeKey}` : ""}</p>
              {org.diasporaCampaignName && (
                <Badge className="text-[10px] border-0 bg-violet-100 text-violet-700 gap-1 mt-1.5"><Megaphone size={10} /> {org.diasporaCampaignName}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1.5">
            <Badge className={cn("text-[10px] border-0 capitalize", STATUS_COLOR[org.status])}>{org.status}</Badge>
            <Badge className={cn("text-[10px] border-0 capitalize", PRIORITY_COLOR[org.priority])}>{org.priority} priority</Badge>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
          {org.officialEmail && <div className="flex items-center gap-2 text-gray-600"><Mail size={13} className="text-gray-400" /> {org.officialEmail}</div>}
          {org.phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={13} className="text-gray-400" /> {org.phone}</div>}
          {org.relationshipOwnerName && <div className="text-gray-600">Relationship Owner: <span className="font-medium">{org.relationshipOwnerName}</span></div>}
          {org.assignedOfficerName && <div className="text-gray-600">Assigned Officer: <span className="font-medium">{org.assignedOfficerName}</span></div>}
        </div>
        {org.notes && <p className="text-sm text-gray-500 mt-3 border-t border-gray-50 pt-3">{org.notes}</p>}
      </div>

      <InstitutionalAccountSummary organisationId={organisationId} />

      <Tabs defaultValue="opportunities">
        <TabsList>
          <TabsTrigger value="opportunities" className="cursor-pointer gap-1.5"><Briefcase size={13} /> Opportunities ({opportunities?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="contacts" className="cursor-pointer gap-1.5"><UserCog2 size={13} /> Contacts ({contacts?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="space-y-3 mt-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setCreateOpportunityOpen(true)} className="gap-2 cursor-pointer">
              <Plus size={13} /> New Opportunity
            </Button>
          </div>
          {opportunities === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : opportunities.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Briefcase /></EmptyMedia>
                <EmptyTitle>No opportunities yet</EmptyTitle>
                <EmptyDescription>Start a bulk acquisition pursuit for this organisation — add property-type line items once created.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={() => setCreateOpportunityOpen(true)} className="gap-2 cursor-pointer">
                  <Plus size={13} /> New Opportunity
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid gap-2">
              {opportunities.map((opp) => (
                <button
                  key={opp._id}
                  onClick={() => onSelectOpportunity(opp._id)}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-[var(--brand)]/30 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{opp.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{opp.opportunityRef}{opp.opportunityType ? ` · ${opp.opportunityType}` : ""}</p>
                    {opp.diasporaCampaignName && (
                      <Badge className="text-[10px] border-0 bg-violet-100 text-violet-700 gap-1 mt-1.5"><Megaphone size={10} /> {opp.diasporaCampaignName}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={cn("text-[10px] border-0 capitalize", PRIORITY_COLOR[opp.priority])}>{opp.priority}</Badge>
                    <Badge className="text-[10px] border-0 bg-[var(--brand)]/10 text-[var(--brand)]">{opp.stageLabel}</Badge>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-3 mt-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingContact(null); setContactDialogOpen(true); }} className="gap-2 cursor-pointer">
              <Plus size={13} /> Add Contact
            </Button>
          </div>

          {contacts === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : contacts.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><UserCog2 /></EmptyMedia>
                <EmptyTitle>No contacts yet</EmptyTitle>
                <EmptyDescription>Add the people at this organisation you deal with — decision makers, procurement, finance, legal, HR, or executives.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-2">
              {contacts.map((c) => <ContactCard key={c._id} contact={c} onEdit={() => { setEditingContact(c); setContactDialogOpen(true); }} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        organisationId={organisationId}
        contact={editingContact}
      />

      <CreateOpportunityDialog
        open={createOpportunityOpen}
        onOpenChange={setCreateOpportunityOpen}
        organisationId={organisationId}
        onCreated={onSelectOpportunity}
      />
    </div>
  );
}

const ROLE_BADGES: Array<{ key: keyof ContactDoc; label: string; icon: React.ElementType }> = [
  { key: "isDecisionMaker", label: "Decision Maker", icon: Crown },
  { key: "isProcurementContact", label: "Procurement", icon: ShieldCheck },
  { key: "isFinanceContact", label: "Finance", icon: Wallet },
  { key: "isLegalContact", label: "Legal", icon: Scale },
  { key: "isHrContact", label: "HR", icon: UserCog2 },
  { key: "isExecutiveContact", label: "Executive", icon: Star },
];

function ContactCard({ contact, onEdit }: { contact: ContactDoc; onEdit: () => void }) {
  const deleteContact = useMutation(api.corporateMarketing.contacts.deleteContact);

  const handleDelete = async () => {
    try {
      await deleteContact({ id: contact._id });
      toast.success("Contact removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove contact");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{contact.name}</p>
            {contact.isPrimary && <Badge className="text-[10px] border-0 bg-[var(--brand)]/10 text-[var(--brand)]">Primary</Badge>}
            {!contact.isAuthorised && <Badge className="text-[10px] border-0 bg-gray-100 text-gray-400">Not Authorised</Badge>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {contact.jobTitle ?? "—"}{contact.department ? ` · ${contact.department}` : ""}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            {contact.email && <span className="flex items-center gap-1"><Mail size={11} /> {contact.email}</span>}
            {contact.phone && <span className="flex items-center gap-1"><Phone size={11} /> {contact.phone}</span>}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {ROLE_BADGES.filter((r) => contact[r.key]).map((r) => (
              <Badge key={r.key} className="text-[9px] border-0 bg-gray-100 text-gray-600 gap-1">
                <r.icon size={9} /> {r.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={onEdit} className="cursor-pointer h-8 w-8"><Pencil size={13} /></Button>
          <Button size="icon" variant="ghost" onClick={handleDelete} className="cursor-pointer h-8 w-8 text-red-500 hover:text-red-600"><Trash2 size={13} /></Button>
        </div>
      </div>
    </div>
  );
}

function ContactDialog({
  open,
  onOpenChange,
  organisationId,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationId: Id<"corporateOrganisations">;
  contact: ContactDoc | null;
}) {
  const createContact = useMutation(api.corporateMarketing.contacts.createContact);
  const updateContact = useMutation(api.corporateMarketing.contacts.updateContact);

  const emptyForm = {
    name: "", jobTitle: "", department: "", email: "", phone: "",
    isPrimary: false, isAuthorised: false, isDecisionMaker: false, isProcurementContact: false,
    isFinanceContact: false, isLegalContact: false, isHrContact: false, isExecutiveContact: false, notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Sync form when opening for edit vs create.
  const formKey = contact?._id ?? "new";
  const [lastKey, setLastKey] = useState(formKey);
  if (formKey !== lastKey) {
    setLastKey(formKey);
    setForm(contact ? {
      name: contact.name, jobTitle: contact.jobTitle ?? "", department: contact.department ?? "",
      email: contact.email ?? "", phone: contact.phone ?? "", isPrimary: contact.isPrimary, isAuthorised: contact.isAuthorised,
      isDecisionMaker: contact.isDecisionMaker, isProcurementContact: contact.isProcurementContact,
      isFinanceContact: contact.isFinanceContact, isLegalContact: contact.isLegalContact,
      isHrContact: contact.isHrContact, isExecutiveContact: contact.isExecutiveContact, notes: contact.notes ?? "",
    } : emptyForm);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Contact name is required"); return; }
    setSaving(true);
    try {
      if (contact) {
        await updateContact({ id: contact._id, ...form, email: form.email || undefined, phone: form.phone || undefined, jobTitle: form.jobTitle || undefined, department: form.department || undefined, notes: form.notes || undefined });
        toast.success("Contact updated");
      } else {
        await createContact({ organisationId, ...form, email: form.email || undefined, phone: form.phone || undefined, jobTitle: form.jobTitle || undefined, department: form.department || undefined, notes: form.notes || undefined });
        toast.success("Contact added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{contact ? "Edit Contact" : "Add Contact"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="Director of Procurement" />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234…" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "isPrimary" as const, label: "Primary Contact" },
                { key: "isAuthorised" as const, label: "Authorised" },
                { key: "isDecisionMaker" as const, label: "Decision Maker" },
                { key: "isProcurementContact" as const, label: "Procurement" },
                { key: "isFinanceContact" as const, label: "Finance" },
                { key: "isLegalContact" as const, label: "Legal" },
                { key: "isHrContact" as const, label: "HR" },
                { key: "isExecutiveContact" as const, label: "Executive" },
              ].map((r) => (
                <label key={r.key} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <Checkbox checked={form[r.key]} onCheckedChange={(v) => setForm({ ...form, [r.key]: v === true })} />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Saving…" : contact ? "Save Changes" : "Add Contact"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Organisation types manager ──────────────────────────────────────────
function OrgTypesManager({ onBack }: { onBack: () => void }) {
  const orgTypes = useQuery(api.corporateMarketing.config.listOrgTypes, {});
  const seedOrgTypes = useMutation(api.corporateMarketing.config.seedDefaultOrgTypes);
  const createOrgType = useMutation(api.corporateMarketing.config.createOrgType);
  const updateOrgType = useMutation(api.corporateMarketing.config.updateOrgType);
  const [newName, setNewName] = useState("");
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedOrgTypes({});
      toast.success(res.inserted > 0 ? `Seeded ${res.inserted} organisation types` : "Already seeded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed");
    } finally {
      setSeeding(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createOrgType({ name: newName.trim() });
      setNewName("");
      toast.success("Organisation type added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add type");
    }
  };

  const toggleStatus = async (id: Id<"corporateOrgTypes">, status: "active" | "inactive") => {
    try {
      await updateOrgType({ id, status: status === "active" ? "inactive" : "active" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2 cursor-pointer text-gray-500">
        <ArrowLeft size={14} /> Back to organisations
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Organisation Types</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configurable classification used when adding new corporate organisations.</p>
        </div>
        {orgTypes !== undefined && orgTypes.length === 0 && (
          <Button onClick={handleSeed} disabled={seeding} variant="secondary" className="cursor-pointer shrink-0">
            {seeding ? "Seeding…" : "Seed Defaults"}
          </Button>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add a new organisation type…" className="flex-1" />
        <Button type="submit" className="gap-2 cursor-pointer"><Plus size={14} /> Add</Button>
      </form>

      {orgTypes === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : orgTypes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Settings2 /></EmptyMedia>
            <EmptyTitle>No organisation types configured</EmptyTitle>
            <EmptyDescription>Seed the defaults above or add your own custom types.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {orgTypes.map((t) => (
            <div key={t._id} className="flex items-center justify-between px-4 py-3">
              <span className={cn("text-sm", t.status === "inactive" && "text-gray-400 line-through")}>{t.name}</span>
              <Button size="sm" variant="ghost" onClick={() => toggleStatus(t._id, t.status)} className="cursor-pointer text-xs">
                {t.status === "active" ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create opportunity dialog ───────────────────────────────────────────
const OPPORTUNITY_TYPES = [
  { value: "staff_housing", label: "Staff Housing Scheme" },
  { value: "investment_portfolio", label: "Investment Portfolio" },
  { value: "off_take", label: "Off-Take Agreement" },
  { value: "cooperative", label: "Cooperative Purchase" },
  { value: "institutional", label: "Institutional Acquisition" },
  { value: "other", label: "Other" },
];

function CreateOpportunityDialog({
  open,
  onOpenChange,
  organisationId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationId: Id<"corporateOrganisations">;
  onCreated: (id: Id<"corporateOpportunities">) => void;
}) {
  const createOpportunity = useMutation(api.corporateMarketing.opportunities.createOpportunity);
  const campaigns = useQuery(api.corporateMarketing.campaigns.listCampaignOptions, open ? {} : "skip");
  const [form, setForm] = useState({ name: "", opportunityType: "", priority: "medium", preferredLocation: "", intendedUse: "", requirementNotes: "", campaignId: "none" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Opportunity name is required"); return; }
    setSaving(true);
    try {
      const id = await createOpportunity({
        organisationId,
        name: form.name.trim(),
        opportunityType: form.opportunityType || undefined,
        priority: form.priority as "low" | "medium" | "high",
        preferredLocation: form.preferredLocation || undefined,
        intendedUse: form.intendedUse || undefined,
        requirementNotes: form.requirementNotes || undefined,
        campaignId: form.campaignId !== "none" ? (form.campaignId as Id<"corporateCampaigns">) : undefined,
      });
      toast.success("Opportunity created");
      setForm({ name: "", opportunityType: "", priority: "medium", preferredLocation: "", intendedUse: "", requirementNotes: "", campaignId: "none" });
      onOpenChange(false);
      onCreated(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create opportunity");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Corporate Opportunity</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Opportunity Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="200-Unit Staff Housing Scheme" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Opportunity Type</Label>
              <Select value={form.opportunityType} onValueChange={(v) => setForm({ ...form, opportunityType: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Preferred Location</Label>
            <Input value={form.preferredLocation} onChange={(e) => setForm({ ...form, preferredLocation: e.target.value })} placeholder="Lekki, Lagos" />
          </div>
          <div className="space-y-1.5">
            <Label>Intended Use</Label>
            <Input value={form.intendedUse} onChange={(e) => setForm({ ...form, intendedUse: e.target.value })} placeholder="Staff accommodation" />
          </div>
          <div className="space-y-1.5">
            <Label>Marketing Campaign (optional)</Label>
            <Select value={form.campaignId} onValueChange={(v) => setForm({ ...form, campaignId: v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(campaigns ?? []).map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Requirement Notes</Label>
            <Textarea value={form.requirementNotes} onChange={(e) => setForm({ ...form, requirementNotes: e.target.value })} rows={3} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Creating…" : "Create Opportunity"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Opportunity detail (line items + stage) ─────────────────────────────
function OpportunityDetail({ opportunityId, onBack, onSelectAcquisition }: { opportunityId: Id<"corporateOpportunities">; onBack: () => void; onSelectAcquisition: (id: Id<"corporateBulkAcquisitions">) => void }) {
  const opp = useQuery(api.corporateMarketing.opportunities.getOpportunity, { id: opportunityId });
  const lineItems = useQuery(api.corporateMarketing.lineItems.listLineItems, { opportunityId });
  const stages = useQuery(api.corporateMarketing.config.listStages, {});
  const moveStage = useMutation(api.corporateMarketing.opportunities.moveOpportunityStage);
  const [lineItemDialogOpen, setLineItemDialogOpen] = useState(false);
  const [editingLineItem, setEditingLineItem] = useState<LineItemDoc | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [pendingStageKey, setPendingStageKey] = useState<string | null>(null);

  if (opp === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const activeStages = (stages ?? []).filter((s) => s.status === "active").sort((a, b) => a.order - b.order);

  const handleStageChange = async (stageKey: string) => {
    const stage = activeStages.find((s) => s.key === stageKey);
    if (stage?.isClosedLost) {
      setPendingStageKey(stageKey);
      setCloseDialogOpen(true);
      return;
    }
    try {
      await moveStage({ id: opportunityId, stageKey });
      toast.success(`Moved to "${stage?.label ?? stageKey}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move stage");
    }
  };

  const totals = (lineItems ?? []).reduce(
    (acc, li) => ({
      required: acc.required + li.quantityRequired,
      committed: acc.committed + li.quantityCommitted,
      paid: acc.paid + li.quantityPaid,
      allocated: acc.allocated + li.quantityAllocated,
    }),
    { required: 0, committed: 0, paid: 0, allocated: 0 },
  );

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2 cursor-pointer text-gray-500">
        <ArrowLeft size={14} /> Back to {opp.organisationName}
      </Button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center shrink-0">
              <Briefcase size={20} className="text-[var(--brand)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{opp.name}</h1>
              <p className="text-xs text-gray-400 mt-0.5">{opp.opportunityRef} · {opp.organisationName}{opp.opportunityType ? ` · ${opp.opportunityType}` : ""}</p>
              {opp.diasporaCampaignName && (
                <Badge className="text-[10px] border-0 bg-violet-100 text-violet-700 gap-1 mt-1.5"><Megaphone size={10} /> {opp.diasporaCampaignName}</Badge>
              )}
            </div>
          </div>
          <Badge className={cn("text-[10px] border-0 capitalize", PRIORITY_COLOR[opp.priority])}>{opp.priority} priority</Badge>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label className="text-xs text-gray-500">Pipeline Stage</Label>
          <Select value={opp.stageKey} onValueChange={handleStageChange}>
            <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              {activeStages.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
          {opp.preferredLocation && <div className="text-gray-600">Preferred Location: <span className="font-medium">{opp.preferredLocation}</span></div>}
          {opp.intendedUse && <div className="text-gray-600">Intended Use: <span className="font-medium">{opp.intendedUse}</span></div>}
          {opp.relationshipOwnerName && <div className="text-gray-600">Relationship Owner: <span className="font-medium">{opp.relationshipOwnerName}</span></div>}
          {opp.assignedOfficerName && <div className="text-gray-600">Assigned Officer: <span className="font-medium">{opp.assignedOfficerName}</span></div>}
        </div>
        {opp.requirementNotes && <p className="text-sm text-gray-500 mt-3 border-t border-gray-50 pt-3">{opp.requirementNotes}</p>}
        {opp.isNurture && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            <Layers size={13} /> Moved to Nurture / Future Opportunity {opp.nurtureDate ? `on ${new Date(opp.nurtureDate).toLocaleDateString()}` : ""}
          </div>
        )}
        {opp.lostReason && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
            <XCircle size={13} /> Lost reason: {opp.lostReason}
          </div>
        )}
      </div>

      {lineItems !== undefined && lineItems.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Required", value: totals.required },
            { label: "Committed", value: totals.committed },
            { label: "Paid", value: totals.paid },
            { label: "Allocated", value: totals.allocated },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="lineItems">
        <TabsList>
          <TabsTrigger value="lineItems" className="cursor-pointer gap-1.5"><Layers size={13} /> Line Items ({lineItems?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="letters" className="cursor-pointer gap-1.5"><FileText size={13} /> Partnership Letters</TabsTrigger>
          <TabsTrigger value="esignatures" className="cursor-pointer gap-1.5"><PenLine size={13} /> E-Signatures</TabsTrigger>
          <TabsTrigger value="eois" className="cursor-pointer gap-1.5"><ClipboardCheck size={13} /> EOIs</TabsTrigger>
          <TabsTrigger value="proposals" className="cursor-pointer gap-1.5"><FileSignature size={13} /> Proposals</TabsTrigger>
          <TabsTrigger value="negotiations" className="cursor-pointer gap-1.5"><Scale size={13} /> Negotiation</TabsTrigger>
          <TabsTrigger value="conversion" className="cursor-pointer gap-1.5"><Wallet size={13} /> Commitment &amp; Conversion</TabsTrigger>
          <TabsTrigger value="bulkAcquisitions" className="cursor-pointer gap-1.5"><Building size={13} /> Bulk Acquisitions</TabsTrigger>
          <TabsTrigger value="followups" className="cursor-pointer gap-1.5"><ListChecks size={13} /> Follow-Ups</TabsTrigger>
          <TabsTrigger value="activity" className="cursor-pointer gap-1.5"><History size={13} /> Meetings &amp; Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="lineItems" className="space-y-3 mt-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingLineItem(null); setLineItemDialogOpen(true); }} className="gap-2 cursor-pointer">
              <PackagePlus size={13} /> Add Line Item
            </Button>
          </div>

          {lineItems === undefined ? (
            <Skeleton className="h-24 w-full" />
          ) : lineItems.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Layers /></EmptyMedia>
                <EmptyTitle>No line items yet</EmptyTitle>
                <EmptyDescription>Add one line item per property type this organisation needs — track EOI, proposed, negotiated, committed, paid and allocated quantities.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={() => { setEditingLineItem(null); setLineItemDialogOpen(true); }} className="gap-2 cursor-pointer">
                  <PackagePlus size={13} /> Add Line Item
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid gap-2">
              {lineItems.map((li) => (
                <LineItemCard key={li._id} lineItem={li} onEdit={() => { setEditingLineItem(li); setLineItemDialogOpen(true); }} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="letters" className="mt-3">
          <LettersSection organisationId={opp.organisationId} opportunityId={opportunityId} />
        </TabsContent>

        <TabsContent value="esignatures" className="mt-3">
          <EsignatureSection organisationId={opp.organisationId} opportunityId={opportunityId} />
        </TabsContent>

        <TabsContent value="eois" className="mt-3">
          <EoiSection opportunityId={opportunityId} organisationId={opp.organisationId} />
        </TabsContent>

        <TabsContent value="proposals" className="mt-3">
          <ProposalsSection opportunityId={opportunityId} organisationName={opp.organisationName} />
        </TabsContent>

        <TabsContent value="negotiations" className="mt-3">
          <NegotiationsSection opportunityId={opportunityId} lineItems={lineItems ?? []} organisationName={opp.organisationName} />
        </TabsContent>

        <TabsContent value="conversion" className="mt-3">
          <ConversionSection opportunityId={opportunityId} lineItems={lineItems ?? []} organisationName={opp.organisationName} />
        </TabsContent>

        <TabsContent value="bulkAcquisitions" className="mt-3">
          <BulkAcquisitionsSection opportunityId={opportunityId} onSelect={onSelectAcquisition} />
        </TabsContent>

        <TabsContent value="followups" className="mt-3">
          <FollowUpsSection organisationId={opp.organisationId} opportunityId={opportunityId} />
        </TabsContent>

        <TabsContent value="activity" className="mt-3">
          <ActivitySection organisationId={opp.organisationId} opportunityId={opportunityId} />
        </TabsContent>
      </Tabs>

      <LineItemDialog
        open={lineItemDialogOpen}
        onOpenChange={setLineItemDialogOpen}
        opportunityId={opportunityId}
        lineItem={editingLineItem}
      />

      <CloseLostDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        onConfirm={async (lostReason, competitorNote) => {
          if (!pendingStageKey) return;
          try {
            await moveStage({ id: opportunityId, stageKey: pendingStageKey, lostReason, competitorNote });
            toast.success("Marked as Closed Lost");
            setCloseDialogOpen(false);
            setPendingStageKey(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update stage");
          }
        }}
      />
    </div>
  );
}

function CloseLostDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (lostReason: string, competitorNote: string) => void;
}) {
  const [lostReason, setLostReason] = useState("");
  const [competitorNote, setCompetitorNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Mark as Closed Lost</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            This opportunity will be preserved and can always be moved to Nurture / Future Opportunity later — it will never be deleted.
          </p>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} rows={2} placeholder="Budget constraints, chose a competitor, timing…" />
          </div>
          <div className="space-y-1.5">
            <Label>Competitor Note (optional)</Label>
            <Input value={competitorNote} onChange={(e) => setCompetitorNote(e.target.value)} placeholder="Went with…" />
          </div>
          <Button onClick={() => onConfirm(lostReason, competitorNote)} className="w-full cursor-pointer" variant="destructive">
            Confirm Closed Lost
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LineItemCard({ lineItem, onEdit }: { lineItem: LineItemDoc & { propertyTitle?: string; estateName?: string }; onEdit: () => void }) {
  const deleteLineItem = useMutation(api.corporateMarketing.lineItems.deleteLineItem);

  const handleDelete = async () => {
    try {
      await deleteLineItem({ id: lineItem._id });
      toast.success("Line item removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove line item");
    }
  };

  const label = lineItem.propertyTitle ?? lineItem.estateName ?? lineItem.propertyType ?? "Property Type";
  const allocationBadge: Record<string, string> = {
    not_started: "bg-gray-100 text-gray-500",
    partial: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{label}</p>
            <Badge className={cn("text-[10px] border-0 capitalize", allocationBadge[lineItem.allocationStatus])}>{lineItem.allocationStatus.replace("_", " ")}</Badge>
          </div>
          {lineItem.description && <p className="text-xs text-gray-400 mt-0.5">{lineItem.description}</p>}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-2.5 text-xs">
            {[
              { label: "Required", value: lineItem.quantityRequired },
              { label: "EOI", value: lineItem.quantityEoi },
              { label: "Proposed", value: lineItem.quantityProposed },
              { label: "Negotiated", value: lineItem.quantityNegotiated },
              { label: "Committed", value: lineItem.quantityCommitted },
              { label: "Paid", value: lineItem.quantityPaid },
              { label: "Allocated", value: lineItem.quantityAllocated },
            ].map((q) => (
              <div key={q.label} className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                <p className="font-bold text-gray-900">{q.value}</p>
                <p className="text-gray-400 text-[10px]">{q.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={onEdit} className="cursor-pointer h-8 w-8"><Pencil size={13} /></Button>
          <Button size="icon" variant="ghost" onClick={handleDelete} className="cursor-pointer h-8 w-8 text-red-500 hover:text-red-600"><Trash2 size={13} /></Button>
        </div>
      </div>
    </div>
  );
}

function LineItemDialog({
  open,
  onOpenChange,
  opportunityId,
  lineItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: Id<"corporateOpportunities">;
  lineItem: LineItemDoc | null;
}) {
  const createLineItem = useMutation(api.corporateMarketing.lineItems.createLineItem);
  const updateLineItem = useMutation(api.corporateMarketing.lineItems.updateLineItem);

  const emptyForm = {
    propertyType: "", description: "", quantityRequired: "1", quantityEoi: "0", quantityProposed: "0",
    quantityNegotiated: "0", quantityCommitted: "0", quantityPaid: "0", quantityAllocated: "0",
    unitPrice: "", notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const formKey = lineItem?._id ?? "new";
  const [lastKey, setLastKey] = useState(formKey);
  if (formKey !== lastKey) {
    setLastKey(formKey);
    setForm(lineItem ? {
      propertyType: lineItem.propertyType ?? "", description: lineItem.description ?? "",
      quantityRequired: String(lineItem.quantityRequired), quantityEoi: String(lineItem.quantityEoi),
      quantityProposed: String(lineItem.quantityProposed), quantityNegotiated: String(lineItem.quantityNegotiated),
      quantityCommitted: String(lineItem.quantityCommitted), quantityPaid: String(lineItem.quantityPaid),
      quantityAllocated: String(lineItem.quantityAllocated), unitPrice: lineItem.unitPrice !== undefined ? String(lineItem.unitPrice) : "",
      notes: lineItem.notes ?? "",
    } : emptyForm);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantityRequired = parseInt(form.quantityRequired, 10);
    if (!lineItem && (!Number.isFinite(quantityRequired) || quantityRequired <= 0)) {
      toast.error("Quantity required must be greater than zero");
      return;
    }
    if (!lineItem && !form.propertyType.trim()) {
      toast.error("Enter a property type for this line item");
      return;
    }
    setSaving(true);
    try {
      if (lineItem) {
        await updateLineItem({
          id: lineItem._id,
          propertyType: form.propertyType || undefined,
          description: form.description || undefined,
          quantityRequired: parseInt(form.quantityRequired, 10),
          quantityEoi: parseInt(form.quantityEoi, 10),
          quantityProposed: parseInt(form.quantityProposed, 10),
          quantityNegotiated: parseInt(form.quantityNegotiated, 10),
          quantityCommitted: parseInt(form.quantityCommitted, 10),
          quantityPaid: parseInt(form.quantityPaid, 10),
          quantityAllocated: parseInt(form.quantityAllocated, 10),
          unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
          notes: form.notes || undefined,
        });
        toast.success("Line item updated");
      } else {
        await createLineItem({
          opportunityId,
          propertyType: form.propertyType.trim(),
          description: form.description || undefined,
          quantityRequired,
          unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
          notes: form.notes || undefined,
        });
        toast.success("Line item added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save line item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{lineItem ? "Edit Line Item" : "Add Line Item"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Property Type *</Label>
            <Input value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} placeholder="3-Bedroom Terrace" disabled={!!lineItem} />
            {lineItem && <p className="text-xs text-gray-400">Property type cannot be changed after creation.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Quantity Required *</Label>
            <Input type="number" min={1} value={form.quantityRequired} onChange={(e) => setForm({ ...form, quantityRequired: e.target.value })} disabled={!!lineItem} />
          </div>

          {lineItem && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "quantityEoi" as const, label: "EOI" },
                { key: "quantityProposed" as const, label: "Proposed" },
                { key: "quantityNegotiated" as const, label: "Negotiated" },
                { key: "quantityCommitted" as const, label: "Committed" },
                { key: "quantityPaid" as const, label: "Paid" },
                { key: "quantityAllocated" as const, label: "Allocated" },
              ].map((q) => (
                <div key={q.key} className="space-y-1.5">
                  <Label className="text-xs">{q.label}</Label>
                  <Input type="number" min={0} value={form[q.key]} onChange={(e) => setForm({ ...form, [q.key]: e.target.value })} />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Unit Price (₦)</Label>
            <Input type="number" min={0} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder="25000000" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Saving…" : lineItem ? "Save Changes" : "Add Line Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Partnership letters ──────────────────────────────────────────────────
function LettersSection({
  organisationId,
  opportunityId,
}: {
  organisationId: Id<"corporateOrganisations">;
  opportunityId: Id<"corporateOpportunities">;
}) {
  const letters = useQuery(api.corporateMarketing.letters.listLetters, { opportunityId });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLetterId, setSelectedLetterId] = useState<Id<"corporatePartnershipLetters"> | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
          <FileText size={13} /> New Partnership Letter
        </Button>
      </div>

      {letters === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : letters.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileText /></EmptyMedia>
            <EmptyTitle>No partnership letters yet</EmptyTitle>
            <EmptyDescription>Draft a letter, route it for approval, then send, deliver and record acknowledgement — all tracked here, separate from e-signature.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
              <FileText size={13} /> New Partnership Letter
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-2">
          {letters.map((letter) => (
            <button
              key={letter._id}
              onClick={() => setSelectedLetterId(letter._id)}
              className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-[var(--brand)]/30 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{letter.subject}</p>
                <p className="text-xs text-gray-400 mt-0.5">{letter.letterRef}{letter.followUpDate ? ` · Follow up ${new Date(letter.followUpDate).toLocaleDateString()}` : ""}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={cn("text-[10px] border-0 capitalize", LETTER_STATUS_COLOR[letter.status])}>{letter.status.replace("_", " ")}</Badge>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateLetterDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organisationId={organisationId}
        opportunityId={opportunityId}
        onCreated={setSelectedLetterId}
      />

      {selectedLetterId && (
        <LetterDetailDialog
          letterId={selectedLetterId}
          open={!!selectedLetterId}
          onOpenChange={(open) => { if (!open) setSelectedLetterId(null); }}
        />
      )}
    </div>
  );
}

function CreateLetterDialog({
  open,
  onOpenChange,
  organisationId,
  opportunityId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationId: Id<"corporateOrganisations">;
  opportunityId: Id<"corporateOpportunities">;
  onCreated: (id: Id<"corporatePartnershipLetters">) => void;
}) {
  const createLetter = useMutation(api.corporateMarketing.letters.createLetter);
  const contacts = useQuery(api.corporateMarketing.contacts.listContacts, open ? { organisationId } : "skip");
  const [subject, setSubject] = useState("");
  const [contactId, setContactId] = useState<string>("none");
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setSubject(""); setContactId("none"); setFollowUpDate(""); setNotes(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    setSaving(true);
    try {
      const id = await createLetter({
        organisationId,
        opportunityId,
        contactId: contactId !== "none" ? (contactId as Id<"corporateContacts">) : undefined,
        subject: subject.trim(),
        followUpDate: followUpDate || undefined,
        notes: notes || undefined,
      });
      toast.success("Partnership letter drafted");
      reset();
      onOpenChange(false);
      onCreated(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to draft letter");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Partnership Letter</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Proposed Staff Housing Partnership" />
          </div>
          <div className="space-y-1.5">
            <Label>Addressed To (optional)</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a contact" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific contact</SelectItem>
                {(contacts ?? []).map((c) => <SelectItem key={c._id} value={c._id}>{c.name}{c.jobTitle ? ` — ${c.jobTitle}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Follow-Up Date</Label>
            <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Creating…" : "Draft Letter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LetterDetailDialog({
  letterId,
  open,
  onOpenChange,
}: {
  letterId: Id<"corporatePartnershipLetters">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const letter = useQuery(api.corporateMarketing.letters.getLetter, { id: letterId });
  const deliveries = useQuery(api.corporateMarketing.deliveries.listDeliveries, open ? { letterId } : "skip");
  const acknowledgements = useQuery(api.corporateMarketing.acknowledgements.listAcknowledgements, open ? { letterId } : "skip");

  const generateUploadUrl = useMutation(api.corporateMarketing.letters.generateUploadUrl);
  const createVaultDocument = useMutation(api.docvault.createDocument);
  const updateLetter = useMutation(api.corporateMarketing.letters.updateLetter);
  const submitForApproval = useMutation(api.corporateMarketing.letters.submitLetterForApproval);
  const decideApproval = useMutation(api.corporateMarketing.letters.decideLetterApproval);
  const sendLetter = useMutation(api.corporateMarketing.letters.sendLetter);
  const cancelLetter = useMutation(api.corporateMarketing.letters.cancelLetter);
  const convex = useConvex();

  const [uploading, setUploading] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [ackDialogOpen, setAckDialogOpen] = useState(false);

  if (letter === undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl"><Skeleton className="h-64 w-full" /></DialogContent>
      </Dialog>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      const fileUrl = await convex.query(api.cms.getFileUrl, { storageId });
      const docId = await createVaultDocument({
        title: letter.subject,
        docType: "partnership_letter",
        fileUrl: fileUrl ?? "",
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        isConfidential: false,
      });
      await updateLetter({ id: letter._id, vaultDocumentId: docId });
      toast.success("Letter document attached");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to attach document");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    try {
      await submitForApproval({ id: letter._id });
      toast.success("Submitted for approval");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit for approval");
    }
  };

  const handleDecision = async (decision: "approved" | "rejected") => {
    try {
      await decideApproval({ id: letter._id, decision });
      toast.success(decision === "approved" ? "Letter approved" : "Letter rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record decision");
    }
  };

  const handleSend = async () => {
    try {
      await sendLetter({ id: letter._id });
      toast.success("Letter marked as sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send letter");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelLetter({ id: letter._id });
      toast.success("Letter cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel letter");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {letter.subject}
            <Badge className={cn("text-[10px] border-0 capitalize", LETTER_STATUS_COLOR[letter.status])}>{letter.status.replace("_", " ")}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="text-sm text-gray-500 space-y-1">
            <p>{letter.letterRef} · {letter.organisationName}{letter.contactName ? ` · Addressed to ${letter.contactName}` : ""}</p>
            {letter.preparedByName && <p>Prepared by {letter.preparedByName}</p>}
            {letter.approvedByName && <p>Approved by {letter.approvedByName}{letter.approvedAt ? ` on ${new Date(letter.approvedAt).toLocaleDateString()}` : ""}</p>}
            {letter.sentAt && <p>Sent on {new Date(letter.sentAt).toLocaleDateString()}</p>}
          </div>

          {/* Document */}
          <div className="rounded-xl border border-gray-100 p-3.5 space-y-2">
            <Label className="text-xs text-gray-500">Letter Document</Label>
            {letter.vaultDocument ? (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <FileText size={14} className="text-[var(--brand)]" /> {letter.vaultDocument.fileName}
                <Badge className="text-[10px] border-0 bg-green-100 text-green-700">Attached</Badge>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No document attached yet.</p>
            )}
            {(letter.status === "draft" || letter.status === "in_review") && (
              <div>
                <input type="file" id={`letter-doc-${letter._id}`} className="hidden" onChange={handleFileChange} disabled={uploading} />
                <Button
                  type="button" size="sm" variant="secondary" disabled={uploading} className="gap-1.5 cursor-pointer"
                  onClick={() => document.getElementById(`letter-doc-${letter._id}`)?.click()}
                >
                  <Upload size={13} /> {uploading ? "Uploading…" : letter.vaultDocument ? "Replace Document" : "Attach Document"}
                </Button>
              </div>
            )}
          </div>

          {/* Workflow actions */}
          <div className="flex flex-wrap gap-2">
            {letter.status === "draft" && (
              <>
                <Button size="sm" onClick={handleSubmit} className="gap-1.5 cursor-pointer"><ClipboardCheck size={13} /> Submit for Approval</Button>
                <Button size="sm" variant="secondary" onClick={handleCancel} className="gap-1.5 cursor-pointer text-red-600"><X size={13} /> Cancel</Button>
              </>
            )}
            {letter.status === "in_review" && (
              <>
                <Button size="sm" onClick={() => handleDecision("approved")} className="gap-1.5 cursor-pointer"><CheckCircle2 size={13} /> Approve</Button>
                <Button size="sm" variant="secondary" onClick={() => handleDecision("rejected")} className="gap-1.5 cursor-pointer text-red-600"><X size={13} /> Reject</Button>
              </>
            )}
            {letter.status === "approved" && (
              <>
                <Button size="sm" onClick={handleSend} className="gap-1.5 cursor-pointer"><Send size={13} /> Send Letter</Button>
                <Button size="sm" variant="secondary" onClick={handleCancel} className="gap-1.5 cursor-pointer text-red-600"><X size={13} /> Cancel</Button>
              </>
            )}
            {(letter.status === "sent" || letter.status === "delivered") && (
              <Button size="sm" onClick={() => setDeliveryDialogOpen(true)} className="gap-1.5 cursor-pointer"><PackageCheck size={13} /> Record Delivery</Button>
            )}
            {(letter.status === "sent" || letter.status === "delivered" || letter.status === "acknowledged") && (
              <Button size="sm" variant="secondary" onClick={() => setAckDialogOpen(true)} className="gap-1.5 cursor-pointer"><ClipboardCheck size={13} /> Record Acknowledgement</Button>
            )}
          </div>

          {/* Delivery history */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Delivery History ({deliveries?.length ?? 0})</Label>
            {deliveries === undefined ? (
              <Skeleton className="h-12 w-full" />
            ) : deliveries.length === 0 ? (
              <p className="text-xs text-gray-400">No delivery recorded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {deliveries.map((d) => (
                  <div key={d._id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                    <span className="capitalize">{d.deliveryMethod.replace("_", " ")}{d.receivedBy ? ` — received by ${d.receivedBy}` : ""}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">{new Date(d.deliveryDate).toLocaleDateString()}</span>
                      <Badge className={cn("text-[10px] border-0 capitalize", d.status === "delivered" ? "bg-green-100 text-green-700" : d.status === "failed" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700")}>{d.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acknowledgement history — explicitly separate from e-signature */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Acknowledgement History ({acknowledgements?.length ?? 0})</Label>
            <p className="text-[11px] text-gray-400 -mt-1">Confirms receipt only. Binding signatures are handled separately via E-Signature Requests.</p>
            {acknowledgements === undefined ? (
              <Skeleton className="h-12 w-full" />
            ) : acknowledgements.length === 0 ? (
              <p className="text-xs text-gray-400">No acknowledgement recorded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {acknowledgements.map((a) => (
                  <div key={a._id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                    <span className="capitalize">{a.ackType}{a.receivedByName ? ` — ${a.receivedByName}` : ""}</span>
                    <span className="text-gray-400">{new Date(a.dateReceived).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {letter.notes && <p className="text-sm text-gray-500 border-t border-gray-50 pt-3">{letter.notes}</p>}
        </div>
      </DialogContent>

      <DeliveryDialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen} letterId={letter._id} />
      <AcknowledgementDialog open={ackDialogOpen} onOpenChange={setAckDialogOpen} letterId={letter._id} />
    </Dialog>
  );
}

function DeliveryDialog({ open, onOpenChange, letterId }: { open: boolean; onOpenChange: (open: boolean) => void; letterId: Id<"corporatePartnershipLetters"> }) {
  const recordDelivery = useMutation(api.corporateMarketing.deliveries.recordDelivery);
  const [deliveryMethod, setDeliveryMethod] = useState<"hand_delivery" | "courier" | "email" | "other">("hand_delivery");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [recipientDesignation, setRecipientDesignation] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"pending" | "delivered" | "failed">("delivered");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await recordDelivery({
        letterId, deliveryMethod, deliveredBy: deliveredBy || undefined, receivedBy: receivedBy || undefined,
        recipientDesignation: recipientDesignation || undefined, deliveryDate: new Date(deliveryDate).toISOString(),
        status, notes: notes || undefined,
      });
      toast.success("Delivery recorded");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record delivery");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record Delivery</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Delivery Method</Label>
            <Select value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as typeof deliveryMethod)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hand_delivery">Hand Delivery</SelectItem>
                <SelectItem value="courier">Courier</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Delivered By</Label>
              <Input value={deliveredBy} onChange={(e) => setDeliveredBy(e.target.value)} placeholder="Courier / Staff name" />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Date</Label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Received By</Label>
              <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Front desk officer" />
            </div>
            <div className="space-y-1.5">
              <Label>Recipient Designation</Label>
              <Input value={recipientDesignation} onChange={(e) => setRecipientDesignation(e.target.value)} placeholder="HR Manager" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">{saving ? "Saving…" : "Record Delivery"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AcknowledgementDialog({ open, onOpenChange, letterId }: { open: boolean; onOpenChange: (open: boolean) => void; letterId: Id<"corporatePartnershipLetters"> }) {
  const recordAcknowledgement = useMutation(api.corporateMarketing.acknowledgements.recordAcknowledgement);
  const [ackType, setAckType] = useState<"physical" | "electronic">("physical");
  const [dateReceived, setDateReceived] = useState(() => new Date().toISOString().slice(0, 10));
  const [receivedByName, setReceivedByName] = useState("");
  const [receivedByDesignation, setReceivedByDesignation] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [communicationReference, setCommunicationReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await recordAcknowledgement({
        letterId, ackType, dateReceived: new Date(dateReceived).toISOString(),
        receivedByName: receivedByName || undefined, receivedByDesignation: receivedByDesignation || undefined,
        senderEmail: senderEmail || undefined, recipientEmail: recipientEmail || undefined,
        communicationReference: communicationReference || undefined, notes: notes || undefined,
      });
      toast.success("Acknowledgement recorded");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record acknowledgement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record Acknowledgement</DialogTitle></DialogHeader>
        <p className="text-xs text-gray-400 -mt-2">This confirms the letter was received — it is separate from e-signature.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Acknowledgement Type</Label>
            <Select value={ackType} onValueChange={(v) => setAckType(v as typeof ackType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="electronic">Electronic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date Received</Label>
              <Input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Received By</Label>
              <Input value={receivedByName} onChange={(e) => setReceivedByName(e.target.value)} placeholder="Name" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Designation</Label>
            <Input value={receivedByDesignation} onChange={(e) => setReceivedByDesignation(e.target.value)} placeholder="Procurement Officer" />
          </div>
          {ackType === "electronic" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sender Email</Label>
                <Input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="them@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Recipient Email</Label>
                <Input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="us@geodataworld.com" />
              </div>
            </div>
          )}
          {ackType === "electronic" && (
            <div className="space-y-1.5">
              <Label>Communication Reference</Label>
              <Input value={communicationReference} onChange={(e) => setCommunicationReference(e.target.value)} placeholder="Email thread ref / message ID" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">{saving ? "Saving…" : "Record Acknowledgement"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── E-signature requests ─────────────────────────────────────────────────
const ESIG_STATUS_COLOR: Record<string, string> = {
  not_required: "bg-gray-100 text-gray-500",
  pending: "bg-gray-100 text-gray-500",
  sent: "bg-indigo-100 text-indigo-700",
  viewed: "bg-blue-100 text-blue-700",
  partially_signed: "bg-amber-100 text-amber-700",
  fully_signed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-600",
  expired: "bg-red-100 text-red-600",
  cancelled: "bg-red-100 text-red-600",
};

function EsignatureSection({
  organisationId,
  opportunityId,
}: {
  organisationId: Id<"corporateOrganisations">;
  opportunityId: Id<"corporateOpportunities">;
}) {
  const requests = useQuery(api.corporateMarketing.esignature.listEsignatureRequests, { opportunityId });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"corporateEsignatureRequests"> | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Binding signatures on corporate documents — tracked separately from letter acknowledgement.</p>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
          <PenLine size={13} /> New E-Signature Request
        </Button>
      </div>

      {requests === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : requests.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><PenLine /></EmptyMedia>
            <EmptyTitle>No e-signature requests yet</EmptyTitle>
            <EmptyDescription>Request binding signatures on a corporate document, track each signatory, and attach the final fully-signed copy once complete.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
              <PenLine size={13} /> New E-Signature Request
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-2">
          {requests.map((r) => (
            <button
              key={r._id}
              onClick={() => setSelectedId(r._id)}
              className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-[var(--brand)]/30 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{r.vaultDocumentName ?? "Untitled document"}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.signedCount}/{r.totalSignatories} signed</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={cn("text-[10px] border-0 capitalize", ESIG_STATUS_COLOR[r.status])}>{r.status.replace("_", " ")}</Badge>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateEsignatureDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organisationId={organisationId}
        opportunityId={opportunityId}
        onCreated={setSelectedId}
      />

      {selectedId && (
        <EsignatureDetailDialog
          id={selectedId}
          open={!!selectedId}
          onOpenChange={(open) => { if (!open) setSelectedId(null); }}
        />
      )}
    </div>
  );
}

type SignatoryForm = { name: string; email: string; role: string };

function CreateEsignatureDialog({
  open,
  onOpenChange,
  organisationId,
  opportunityId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationId: Id<"corporateOrganisations">;
  opportunityId: Id<"corporateOpportunities">;
  onCreated: (id: Id<"corporateEsignatureRequests">) => void;
}) {
  const createRequest = useMutation(api.corporateMarketing.esignature.createEsignatureRequest);
  const generateUploadUrl = useMutation(api.corporateMarketing.esignature.generateUploadUrl);
  const createVaultDocument = useMutation(api.docvault.createDocument);
  const convex = useConvex();

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [signatories, setSignatories] = useState<SignatoryForm[]>([{ name: "", email: "", role: "" }]);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setTitle(""); setFile(null); setSignatories([{ name: "", email: "", role: "" }]); setExpiresAt(""); };

  const updateSignatory = (idx: number, patch: Partial<SignatoryForm>) => {
    setSignatories((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Document title is required"); return; }
    if (!file) { toast.error("Attach the document to be signed"); return; }
    const validSignatories = signatories.filter((s) => s.name.trim() && s.email.trim());
    if (validSignatories.length === 0) { toast.error("Add at least one signatory with a name and email"); return; }

    setSaving(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      const fileUrl = await convex.query(api.cms.getFileUrl, { storageId });
      const vaultDocumentId = await createVaultDocument({
        title: title.trim(),
        docType: "esignature_document",
        fileUrl: fileUrl ?? "",
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        isConfidential: false,
      });

      const id = await createRequest({
        organisationId,
        opportunityId,
        vaultDocumentId,
        signatories: validSignatories.map((s, i) => ({ name: s.name.trim(), email: s.email.trim(), role: s.role.trim() || undefined, signingOrder: i + 1 })),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      toast.success("E-signature request created");
      reset();
      onOpenChange(false);
      onCreated(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create e-signature request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New E-Signature Request</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Document Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bulk Acquisition Agreement" />
          </div>
          <div className="space-y-1.5">
            <Label>Document to Sign *</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Signatories *</Label>
              <Button
                type="button" size="sm" variant="secondary" className="gap-1.5 cursor-pointer h-7 text-xs"
                onClick={() => setSignatories((prev) => [...prev, { name: "", email: "", role: "" }])}
              >
                <Plus size={12} /> Add Signatory
              </Button>
            </div>
            {signatories.map((s, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <Input value={s.name} onChange={(e) => updateSignatory(idx, { name: e.target.value })} placeholder="Full name" />
                <Input type="email" value={s.email} onChange={(e) => updateSignatory(idx, { email: e.target.value })} placeholder="Email" />
                <Input value={s.role} onChange={(e) => updateSignatory(idx, { role: e.target.value })} placeholder="Role (optional)" />
                {signatories.length > 1 && (
                  <Button
                    type="button" size="icon" variant="secondary" className="cursor-pointer h-9 w-9 text-red-600"
                    onClick={() => setSignatories((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Expires On (optional)</Label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Creating…" : "Create Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EsignatureDetailDialog({
  id,
  open,
  onOpenChange,
}: {
  id: Id<"corporateEsignatureRequests">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const request = useQuery(api.corporateMarketing.esignature.getEsignatureRequest, { id });
  const sendRequest = useMutation(api.corporateMarketing.esignature.sendEsignatureRequest);
  const markViewed = useMutation(api.corporateMarketing.esignature.markEsignatureViewed);
  const recordSignature = useMutation(api.corporateMarketing.esignature.recordSignature);
  const declineRequest = useMutation(api.corporateMarketing.esignature.declineEsignatureRequest);
  const cancelRequest = useMutation(api.corporateMarketing.esignature.cancelEsignatureRequest);
  const generateUploadUrl = useMutation(api.corporateMarketing.esignature.generateUploadUrl);
  const createVaultDocument = useMutation(api.docvault.createDocument);
  const attachFinal = useMutation(api.corporateMarketing.esignature.attachFinalSignedDocument);
  const convex = useConvex();

  const [signatureRefByEmail, setSignatureRefByEmail] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  if (request === undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl"><Skeleton className="h-64 w-full" /></DialogContent>
      </Dialog>
    );
  }

  const handleSend = async () => {
    try {
      await sendRequest({ id });
      toast.success("Request sent to signatories");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send request");
    }
  };

  const handleMarkViewed = async () => {
    try {
      await markViewed({ id });
      toast.success("Marked as viewed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update request");
    }
  };

  const handleSign = async (email: string) => {
    try {
      await recordSignature({ id, email, signatureRef: signatureRefByEmail[email] || undefined });
      toast.success("Signature recorded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record signature");
    }
  };

  const handleDecline = async () => {
    try {
      await declineRequest({ id });
      toast.success("Request declined");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline request");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelRequest({ id });
      toast.success("Request cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel request");
    }
  };

  const handleFinalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      const fileUrl = await convex.query(api.cms.getFileUrl, { storageId });
      const docId = await createVaultDocument({
        title: `${request.vaultDocument?.title ?? "Document"} — Fully Signed`,
        docType: "esignature_final_document",
        fileUrl: fileUrl ?? "",
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        isConfidential: false,
      });
      await attachFinal({ id, finalSignedVaultDocumentId: docId });
      toast.success("Final signed document attached");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to attach final document");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {request.vaultDocument?.title ?? "E-Signature Request"}
            <Badge className={cn("text-[10px] border-0 capitalize", ESIG_STATUS_COLOR[request.status])}>{request.status.replace("_", " ")}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="text-sm text-gray-500 space-y-1">
            <p>{request.organisationName}{request.requestedByName ? ` · Requested by ${request.requestedByName}` : ""}</p>
            {request.vaultDocument && <p className="flex items-center gap-1.5"><FileText size={13} className="text-[var(--brand)]" /> {request.vaultDocument.fileName}</p>}
            {request.expiresAt && <p>Expires on {new Date(request.expiresAt).toLocaleDateString()}</p>}
          </div>

          <p className="text-[11px] text-gray-400 -mt-2">Binding signatures only — separate from letter acknowledgement, which just confirms receipt.</p>

          <div className="flex flex-wrap gap-2">
            {request.status === "pending" && (
              <>
                <Button size="sm" onClick={handleSend} className="gap-1.5 cursor-pointer"><Send size={13} /> Send to Signatories</Button>
                <Button size="sm" variant="secondary" onClick={handleCancel} className="gap-1.5 cursor-pointer text-red-600"><X size={13} /> Cancel</Button>
              </>
            )}
            {request.status === "sent" && (
              <>
                <Button size="sm" variant="secondary" onClick={handleMarkViewed} className="gap-1.5 cursor-pointer"><Clock size={13} /> Mark as Viewed</Button>
                <Button size="sm" variant="secondary" onClick={handleDecline} className="gap-1.5 cursor-pointer text-red-600"><X size={13} /> Decline</Button>
                <Button size="sm" variant="secondary" onClick={handleCancel} className="gap-1.5 cursor-pointer text-red-600"><X size={13} /> Cancel</Button>
              </>
            )}
            {(request.status === "viewed" || request.status === "partially_signed") && (
              <>
                <Button size="sm" variant="secondary" onClick={handleDecline} className="gap-1.5 cursor-pointer text-red-600"><X size={13} /> Decline</Button>
                <Button size="sm" variant="secondary" onClick={handleCancel} className="gap-1.5 cursor-pointer text-red-600"><X size={13} /> Cancel</Button>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Signatories</Label>
            <div className="space-y-2">
              {request.signatories.map((s) => (
                <div key={s.email} className="rounded-xl border border-gray-100 p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{s.name}{s.role ? ` — ${s.role}` : ""}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </div>
                  {s.signedAt ? (
                    <Badge className="text-[10px] border-0 bg-green-100 text-green-700 gap-1"><CheckCircle2 size={11} /> Signed {new Date(s.signedAt).toLocaleDateString()}</Badge>
                  ) : ["sent", "viewed", "partially_signed"].includes(request.status) ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        className="h-8 text-xs w-36" placeholder="Signature ref (optional)"
                        value={signatureRefByEmail[s.email] ?? ""}
                        onChange={(e) => setSignatureRefByEmail((prev) => ({ ...prev, [s.email]: e.target.value }))}
                      />
                      <Button size="sm" onClick={() => handleSign(s.email)} className="gap-1.5 cursor-pointer h-8"><PenLine size={12} /> Sign</Button>
                    </div>
                  ) : (
                    <Badge className="text-[10px] border-0 bg-gray-100 text-gray-500">Not signed</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 p-3.5 space-y-2">
            <Label className="text-xs text-gray-500">Final Fully-Signed Document</Label>
            {request.finalSignedVaultDocument ? (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <FileText size={14} className="text-[var(--brand)]" /> {request.finalSignedVaultDocument.fileName}
                <Badge className="text-[10px] border-0 bg-green-100 text-green-700">Attached</Badge>
              </div>
            ) : request.status === "fully_signed" ? (
              <div>
                <input type="file" id={`esig-final-${request._id}`} className="hidden" onChange={handleFinalFileChange} disabled={uploading} />
                <Button
                  type="button" size="sm" variant="secondary" disabled={uploading} className="gap-1.5 cursor-pointer"
                  onClick={() => document.getElementById(`esig-final-${request._id}`)?.click()}
                >
                  <Upload size={13} /> {uploading ? "Uploading…" : "Attach Final Signed Document"}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Available once all signatories have signed.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Follow-ups (existing tasks, tagged for corporate marketing) ──────────
const TASK_STATUS_COLOR: Record<string, string> = {
  todo: "bg-gray-100 text-gray-500",
  in_progress: "bg-indigo-100 text-indigo-700",
  blocked: "bg-red-100 text-red-600",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const TASK_PRIORITY_COLOR: Record<string, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-600",
};

function FollowUpsSection({
  organisationId,
  opportunityId,
}: {
  organisationId: Id<"corporateOrganisations">;
  opportunityId: Id<"corporateOpportunities">;
}) {
  const followUps = useQuery(api.corporateMarketing.followups.listFollowUps, { opportunityId });
  const updateStatus = useMutation(api.corporateMarketing.followups.updateFollowUpStatus);
  const [createOpen, setCreateOpen] = useState(false);

  const handleStatusChange = async (id: Id<"tasks">, status: "todo" | "in_progress" | "blocked" | "done" | "cancelled") => {
    try {
      await updateStatus({ id, status });
      toast.success("Follow-up updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update follow-up");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
          <ListChecks size={13} /> New Follow-Up
        </Button>
      </div>

      {followUps === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : followUps.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ListChecks /></EmptyMedia>
            <EmptyTitle>No follow-ups scheduled</EmptyTitle>
            <EmptyDescription>Create a next-action task so nothing falls through the cracks. These use the same Tasks system as the rest of the app.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
              <ListChecks size={13} /> New Follow-Up
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-2">
          {followUps.map((t) => (
            <div key={t._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{t.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : "No due date"}
                  {t.assigneeName ? ` · ${t.assigneeName}` : ""}
                </p>
                {t.notes && <p className="text-xs text-gray-500 mt-1">{t.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={cn("text-[10px] border-0 capitalize", TASK_PRIORITY_COLOR[t.priority])}>{t.priority}</Badge>
                <Select value={t.status} onValueChange={(v) => handleStatusChange(t._id, v as "todo" | "in_progress" | "blocked" | "done" | "cancelled")}>
                  <SelectTrigger className={cn("h-7 text-[11px] w-32 border-0 capitalize", TASK_STATUS_COLOR[t.status])}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateFollowUpDialog open={createOpen} onOpenChange={setCreateOpen} organisationId={organisationId} opportunityId={opportunityId} />
    </div>
  );
}

function CreateFollowUpDialog({
  open,
  onOpenChange,
  organisationId,
  opportunityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationId: Id<"corporateOrganisations">;
  opportunityId: Id<"corporateOpportunities">;
}) {
  const createFollowUp = useMutation(api.corporateMarketing.followups.createFollowUp);
  const staff = useQuery(api.users.listAll, open ? {} : "skip");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [assignedTo, setAssignedTo] = useState<string>("none");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setTitle(""); setDescription(""); setPriority("medium"); setAssignedTo("none"); setDueDate(""); setNotes(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      await createFollowUp({
        organisationId,
        opportunityId,
        title: title.trim(),
        description: description || undefined,
        priority,
        assignedTo: assignedTo !== "none" ? (assignedTo as Id<"users">) : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: notes || undefined,
      });
      toast.success("Follow-up created");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create follow-up");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Follow-Up</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call procurement lead about proposal" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assign To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {(staff ?? []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Creating…" : "Create Follow-Up"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Meetings & activity timeline ──────────────────────────────────────────
const ACTIVITY_ICON: Record<string, typeof MessageSquare> = {
  call: Phone,
  email: Mail,
  meeting: Video,
  presentation: FileText,
  letter: FileText,
  follow_up: ListChecks,
  eoi: ClipboardCheck,
  proposal: FileText,
  negotiation: Scale,
  inspection: Search,
  other: MessageSquare,
};

function ActivitySection({
  organisationId,
  opportunityId,
}: {
  organisationId: Id<"corporateOrganisations">;
  opportunityId: Id<"corporateOpportunities">;
}) {
  const meetings = useQuery(api.corporateMarketing.meetings.listMeetings, { opportunityId });
  const activities = useQuery(api.corporateMarketing.activities.listActivities, { opportunityId });
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<Id<"corporateMeetings"> | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><CalendarClock size={14} /> Meetings &amp; Presentations</h4>
          <Button size="sm" onClick={() => setMeetingDialogOpen(true)} className="gap-2 cursor-pointer">
            <Plus size={13} /> Schedule Meeting
          </Button>
        </div>

        {meetings === undefined ? (
          <Skeleton className="h-20 w-full" />
        ) : meetings.length === 0 ? (
          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-4">No meetings scheduled yet.</p>
        ) : (
          <div className="grid gap-2">
            {meetings.map((m) => (
              <button
                key={m._id}
                onClick={() => setSelectedMeetingId(m._id)}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 text-left hover:border-[var(--brand)]/30 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  {m.isVirtual ? <Video size={15} className="text-[var(--brand)] shrink-0" /> : <MapPin size={15} className="text-[var(--brand)] shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{new Date(m.meetingDate).toLocaleString()}</p>
                    <p className="text-xs text-gray-400 truncate">{m.location ?? (m.isVirtual ? "Virtual" : "Location TBC")}{m.agenda ? ` · ${m.agenda}` : ""}</p>
                  </div>
                </div>
                {m.outcome ? (
                  <Badge className="text-[10px] border-0 bg-green-100 text-green-700 shrink-0">Outcome recorded</Badge>
                ) : (
                  <Badge className="text-[10px] border-0 bg-gray-100 text-gray-500 shrink-0">Pending</Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><History size={14} /> Activity Timeline</h4>
          <Button size="sm" variant="secondary" onClick={() => setLogDialogOpen(true)} className="gap-2 cursor-pointer">
            <Plus size={13} /> Log Activity
          </Button>
        </div>

        {activities === undefined ? (
          <Skeleton className="h-20 w-full" />
        ) : activities.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><History /></EmptyMedia>
              <EmptyTitle>No activity logged yet</EmptyTitle>
              <EmptyDescription>Calls, emails, meetings and other touchpoints will appear here as a single timeline.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={() => setLogDialogOpen(true)} className="gap-2 cursor-pointer">
                <Plus size={13} /> Log Activity
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => {
              const Icon = ACTIVITY_ICON[a.activityType] ?? MessageSquare;
              return (
                <div key={a._id} className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--brand)]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={14} className="text-[var(--brand)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 capitalize">{a.activityType.replace("_", " ")}{a.subject ? ` — ${a.subject}` : ""}</p>
                      <span className="text-xs text-gray-400">{new Date(a.occurredAt).toLocaleString()}</span>
                    </div>
                    {a.notes && <p className="text-xs text-gray-500 mt-0.5">{a.notes}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.performedByName ? `By ${a.performedByName}` : ""}
                      {a.contactName ? `${a.performedByName ? " · " : ""}With ${a.contactName}` : ""}
                      {a.nextActionDate ? `${a.performedByName || a.contactName ? " · " : ""}Next action ${new Date(a.nextActionDate).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateMeetingDialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen} organisationId={organisationId} opportunityId={opportunityId} />
      <LogActivityDialog open={logDialogOpen} onOpenChange={setLogDialogOpen} organisationId={organisationId} opportunityId={opportunityId} />
      {selectedMeetingId && (
        <MeetingDetailDialog
          id={selectedMeetingId}
          open={!!selectedMeetingId}
          onOpenChange={(open) => { if (!open) setSelectedMeetingId(null); }}
        />
      )}
    </div>
  );
}

function CreateMeetingDialog({
  open,
  onOpenChange,
  organisationId,
  opportunityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationId: Id<"corporateOrganisations">;
  opportunityId: Id<"corporateOpportunities">;
}) {
  const createMeeting = useMutation(api.corporateMarketing.meetings.createMeeting);
  const staff = useQuery(api.users.listAll, open ? {} : "skip");

  const [meetingDate, setMeetingDate] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [location, setLocation] = useState("");
  const [participants, setParticipants] = useState("");
  const [agenda, setAgenda] = useState("");
  const [responsibleOfficer, setResponsibleOfficer] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  const reset = () => { setMeetingDate(""); setIsVirtual(false); setLocation(""); setParticipants(""); setAgenda(""); setResponsibleOfficer("none"); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingDate) { toast.error("Meeting date and time is required"); return; }
    setSaving(true);
    try {
      await createMeeting({
        organisationId,
        opportunityId,
        meetingDate: new Date(meetingDate).toISOString(),
        isVirtual,
        location: location || undefined,
        participants: participants || undefined,
        agenda: agenda || undefined,
        responsibleOfficer: responsibleOfficer !== "none" ? (responsibleOfficer as Id<"users">) : undefined,
      });
      toast.success("Meeting scheduled");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule meeting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Date &amp; Time *</Label>
            <Input type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isVirtual} onCheckedChange={(v) => setIsVirtual(!!v)} id="isVirtual" />
            <Label htmlFor="isVirtual" className="cursor-pointer">Virtual meeting</Label>
          </div>
          <div className="space-y-1.5">
            <Label>{isVirtual ? "Meeting Link" : "Location"}</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={isVirtual ? "https://…" : "Client's head office, Lagos"} />
          </div>
          <div className="space-y-1.5">
            <Label>Participants</Label>
            <Input value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Names of attendees" />
          </div>
          <div className="space-y-1.5">
            <Label>Agenda</Label>
            <Textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Responsible Officer</Label>
            <Select value={responsibleOfficer} onValueChange={setResponsibleOfficer}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Assign to yourself" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Me</SelectItem>
                {(staff ?? []).map((u) => <SelectItem key={u._id} value={u._id}>{u.name ?? u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Scheduling…" : "Schedule Meeting"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MeetingDetailDialog({
  id,
  open,
  onOpenChange,
}: {
  id: Id<"corporateMeetings">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const meeting = useQuery(api.corporateMarketing.meetings.getMeeting, open ? { id } : "skip");
  const recordOutcome = useMutation(api.corporateMarketing.meetings.recordMeetingOutcome);
  const updateMeeting = useMutation(api.corporateMarketing.meetings.updateMeeting);
  const generateUploadUrl = useMutation(api.corporateMarketing.meetings.generateUploadUrl);
  const createVaultDocument = useMutation(api.docvault.createDocument);
  const convex = useConvex();

  const [outcome, setOutcome] = useState("");
  const [decisions, setDecisions] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [uploading, setUploading] = useState(false);

  if (meeting === undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg"><Skeleton className="h-48 w-full" /></DialogContent>
      </Dialog>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      const fileUrl = await convex.query(api.cms.getFileUrl, { storageId });
      const docId = await createVaultDocument({
        title: `Presentation — ${new Date(meeting.meetingDate).toLocaleDateString()}`,
        docType: "corporate_presentation",
        fileUrl: fileUrl ?? "",
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        isConfidential: false,
      });
      await updateMeeting({ id: meeting._id, presentationVaultDocumentId: docId });
      toast.success("Presentation attached");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to attach presentation");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRecordOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome.trim()) { toast.error("Describe the outcome"); return; }
    try {
      await recordOutcome({
        id: meeting._id,
        outcome: outcome.trim(),
        decisions: decisions || undefined,
        nextActionDate: nextActionDate ? new Date(nextActionDate).toISOString() : undefined,
      });
      toast.success("Outcome recorded");
      setOutcome(""); setDecisions(""); setNextActionDate("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record outcome");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{new Date(meeting.meetingDate).toLocaleString()}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-gray-500 space-y-1">
            <p>{meeting.location ?? (meeting.isVirtual ? "Virtual meeting" : "Location TBC")}</p>
            {meeting.participants && <p>Participants: {meeting.participants}</p>}
            {meeting.agenda && <p>Agenda: {meeting.agenda}</p>}
          </div>

          <div className="rounded-xl border border-gray-100 p-3.5 space-y-2">
            <Label className="text-xs text-gray-500">Presentation Deck</Label>
            <div>
              <input type="file" id={`meeting-doc-${meeting._id}`} className="hidden" onChange={handleFileChange} disabled={uploading} />
              <Button
                type="button" size="sm" variant="secondary" disabled={uploading} className="gap-1.5 cursor-pointer"
                onClick={() => document.getElementById(`meeting-doc-${meeting._id}`)?.click()}
              >
                <Upload size={13} /> {uploading ? "Uploading…" : "Attach Presentation"}
              </Button>
            </div>
          </div>

          {meeting.outcome && (
            <div className="rounded-xl bg-green-50 p-3.5 space-y-1">
              <p className="text-xs font-medium text-green-700">Outcome</p>
              <p className="text-sm text-gray-700">{meeting.outcome}</p>
              {meeting.decisions && <p className="text-xs text-gray-500">Decisions: {meeting.decisions}</p>}
              {meeting.nextActionDate && <p className="text-xs text-gray-500">Next action: {new Date(meeting.nextActionDate).toLocaleDateString()}</p>}
            </div>
          )}

          <form onSubmit={handleRecordOutcome} className="space-y-3 border-t border-gray-50 pt-3.5">
            <Label className="text-xs text-gray-500">{meeting.outcome ? "Update Outcome" : "Record Outcome"}</Label>
            <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={2} placeholder="What happened in this meeting?" />
            <Textarea value={decisions} onChange={(e) => setDecisions(e.target.value)} rows={2} placeholder="Decisions reached (optional)" />
            <Input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
            <Button type="submit" size="sm" className="w-full cursor-pointer">Save Outcome</Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LogActivityDialog({
  open,
  onOpenChange,
  organisationId,
  opportunityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationId: Id<"corporateOrganisations">;
  opportunityId: Id<"corporateOpportunities">;
}) {
  const logActivity = useMutation(api.corporateMarketing.activities.logActivity);
  const contacts = useQuery(api.corporateMarketing.contacts.listContacts, open ? { organisationId } : "skip");

  const [activityType, setActivityType] = useState<"call" | "email" | "presentation" | "follow_up" | "inspection" | "other">("call");
  const [contactId, setContactId] = useState<string>("none");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setActivityType("call"); setContactId("none"); setSubject(""); setNotes(""); setNextActionDate(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await logActivity({
        organisationId,
        opportunityId,
        contactId: contactId !== "none" ? (contactId as Id<"corporateContacts">) : undefined,
        activityType,
        subject: subject || undefined,
        notes: notes || undefined,
        nextActionDate: nextActionDate ? new Date(nextActionDate).toISOString() : undefined,
      });
      toast.success("Activity logged");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log activity");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={activityType} onValueChange={(v) => setActivityType(v as typeof activityType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="presentation">Presentation</SelectItem>
                <SelectItem value="follow_up">Follow-Up</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Contact (optional)</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a contact" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific contact</SelectItem>
                {(contacts ?? []).map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Next Action Date (optional)</Label>
            <Input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Logging…" : "Log Activity"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Expressions of Interest ───────────────────────────────────────────────
const EOI_STATUS_COLOR: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700",
  received: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-600",
};

function EoiSection({
  opportunityId,
  organisationId,
}: {
  opportunityId: Id<"corporateOpportunities">;
  organisationId: Id<"corporateOrganisations">;
}) {
  const eois = useQuery(api.corporateMarketing.eois.listEois, { opportunityId });
  const recordReceived = useMutation(api.corporateMarketing.eois.recordEoiReceived);
  const markExpired = useMutation(api.corporateMarketing.eois.markEoiExpired);
  const generateUploadUrl = useMutation(api.corporateMarketing.eois.generateUploadUrl);
  const createVaultDocument = useMutation(api.docvault.createDocument);
  const convex = useConvex();
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadingId, setUploadingId] = useState<Id<"corporateEois"> | null>(null);

  const handleReceived = async (id: Id<"corporateEois">) => {
    try {
      await recordReceived({ id });
      toast.success("EOI marked as received");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update EOI");
    }
  };

  const handleExpired = async (id: Id<"corporateEois">) => {
    try {
      await markExpired({ id });
      toast.success("EOI marked as expired");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update EOI");
    }
  };

  const handleFileChange = async (id: Id<"corporateEois">, file: File) => {
    setUploadingId(id);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      const fileUrl = await convex.query(api.cms.getFileUrl, { storageId });
      const docId = await createVaultDocument({
        title: `Expression of Interest`,
        docType: "corporate_eoi",
        fileUrl: fileUrl ?? "",
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        isConfidential: false,
      });
      await recordReceived({ id, vaultDocumentId: docId });
      toast.success("EOI document attached and marked received");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to attach EOI document");
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
          <ClipboardCheck size={13} /> Request EOI
        </Button>
      </div>

      {eois === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : eois.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ClipboardCheck /></EmptyMedia>
            <EmptyTitle>No Expressions of Interest yet</EmptyTitle>
            <EmptyDescription>Request a formal EOI from this prospect before moving to a full proposal.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
              <ClipboardCheck size={13} /> Request EOI
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-2">
          {eois.map((e) => (
            <div key={e._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{e.eoiRef}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {e.requestedDate ? `Requested ${new Date(e.requestedDate).toLocaleDateString()}` : ""}
                    {e.deadline ? ` · Deadline ${new Date(e.deadline).toLocaleDateString()}` : ""}
                    {e.contactName ? ` · ${e.contactName}` : ""}
                  </p>
                </div>
                <Badge className={cn("text-[10px] border-0 capitalize", EOI_STATUS_COLOR[e.status])}>{e.status}</Badge>
              </div>
              {e.requirements && <p className="text-xs text-gray-500">{e.requirements}</p>}
              {e.estimatedValue !== undefined && <p className="text-xs text-gray-500">Estimated value: ₦{e.estimatedValue.toLocaleString()}</p>}

              {e.status === "requested" && (
                <div className="flex items-center gap-2 border-t border-gray-50 pt-2.5 flex-wrap">
                  <input
                    type="file" id={`eoi-doc-${e._id}`} className="hidden"
                    onChange={(ev) => { const f = ev.target.files?.[0]; if (f) void handleFileChange(e._id, f); ev.target.value = ""; }}
                    disabled={uploadingId === e._id}
                  />
                  <Button
                    size="sm" variant="secondary" disabled={uploadingId === e._id} className="gap-1.5 cursor-pointer"
                    onClick={() => document.getElementById(`eoi-doc-${e._id}`)?.click()}
                  >
                    <Upload size={13} /> {uploadingId === e._id ? "Uploading…" : "Attach & Mark Received"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleReceived(e._id)} className="gap-1.5 cursor-pointer">
                    <CheckCircle2 size={13} /> Mark Received
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleExpired(e._id)} className="gap-1.5 cursor-pointer text-red-600">
                    <X size={13} /> Mark Expired
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateEoiDialog open={createOpen} onOpenChange={setCreateOpen} opportunityId={opportunityId} organisationId={organisationId} />
    </div>
  );
}

function CreateEoiDialog({
  open,
  onOpenChange,
  opportunityId,
  organisationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: Id<"corporateOpportunities">;
  organisationId: Id<"corporateOrganisations">;
}) {
  const requestEoi = useMutation(api.corporateMarketing.eois.requestEoi);
  const contacts = useQuery(api.corporateMarketing.contacts.listContacts, open ? { organisationId } : "skip");

  const [contactId, setContactId] = useState<string>("none");
  const [deadline, setDeadline] = useState("");
  const [requirements, setRequirements] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setContactId("none"); setDeadline(""); setRequirements(""); setEstimatedValue(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await requestEoi({
        opportunityId,
        contactId: contactId !== "none" ? (contactId as Id<"corporateContacts">) : undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        requirements: requirements || undefined,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
      });
      toast.success("EOI requested");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request EOI");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Request Expression of Interest</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Contact (optional)</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a contact" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific contact</SelectItem>
                {(contacts ?? []).map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Requirements</Label>
            <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} placeholder="What the organisation needs to state in their EOI" />
          </div>
          <div className="space-y-1.5">
            <Label>Estimated Value (₦)</Label>
            <Input type="number" min={0} value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Requesting…" : "Request EOI"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Proposals ──────────────────────────────────────────────────────────────
const PROPOSAL_STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  under_review: "bg-indigo-100 text-indigo-700",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  submitted: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  negotiation: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-600",
  expired: "bg-red-100 text-red-600",
  withdrawn: "bg-gray-100 text-gray-500",
};

function ProposalsSection({
  opportunityId,
  organisationName,
}: {
  opportunityId: Id<"corporateOpportunities">;
  organisationName: string;
}) {
  const proposals = useQuery(api.corporateMarketing.proposals.listProposals, { opportunityId });
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Id<"corporateProposals"> | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
          <FileSignature size={13} /> New Proposal
        </Button>
      </div>

      {proposals === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : proposals.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileSignature /></EmptyMedia>
            <EmptyTitle>No proposals yet</EmptyTitle>
            <EmptyDescription>Draft a commercial proposal, route it for internal approval, then submit it to the organisation.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
              <FileSignature size={13} /> New Proposal
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-2">
          {proposals.map((p) => (
            <button
              key={p._id}
              onClick={() => setSelected(p._id)}
              className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-[var(--brand)]/30 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{p.proposalRef}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.validityPeriodDays ? `Valid ${p.validityPeriodDays} days` : ""}
                  {p.submittedAt ? ` · Submitted ${new Date(p.submittedAt).toLocaleDateString()}` : ""}
                </p>
              </div>
              <Badge className={cn("text-[10px] border-0 capitalize shrink-0", PROPOSAL_STATUS_COLOR[p.status])}>{p.status.replace("_", " ")}</Badge>
            </button>
          ))}
        </div>
      )}

      <CreateProposalDialog open={createOpen} onOpenChange={setCreateOpen} opportunityId={opportunityId} />
      {selected && (
        <ProposalDetailDialog id={selected} organisationName={organisationName} open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }} />
      )}
    </div>
  );
}

function CreateProposalDialog({
  open,
  onOpenChange,
  opportunityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: Id<"corporateOpportunities">;
}) {
  const createProposal = useMutation(api.corporateMarketing.proposals.createProposal);
  const [validityPeriodDays, setValidityPeriodDays] = useState("");
  const [terms, setTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setValidityPeriodDays(""); setTerms(""); setNotes(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProposal({
        opportunityId,
        validityPeriodDays: validityPeriodDays ? Number(validityPeriodDays) : undefined,
        terms: terms || undefined,
        notes: notes || undefined,
      });
      toast.success("Proposal drafted");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to draft proposal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Draft Proposal</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Validity Period (days)</Label>
            <Input type="number" min={1} value={validityPeriodDays} onChange={(e) => setValidityPeriodDays(e.target.value)} placeholder="30" />
          </div>
          <div className="space-y-1.5">
            <Label>Terms Summary</Label>
            <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} placeholder="Headline commercial terms being proposed" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Drafting…" : "Draft Proposal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProposalDetailDialog({
  id,
  organisationName,
  open,
  onOpenChange,
}: {
  id: Id<"corporateProposals">;
  organisationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const proposal = useQuery(api.corporateMarketing.proposals.getProposal, open ? { id } : "skip");
  const updateProposal = useMutation(api.corporateMarketing.proposals.updateProposal);
  const submitForApproval = useMutation(api.corporateMarketing.proposals.submitProposalForApproval);
  const decideApproval = useMutation(api.corporateMarketing.proposals.decideProposalApproval);
  const submitToClient = useMutation(api.corporateMarketing.proposals.submitProposalToClient);
  const recordResponse = useMutation(api.corporateMarketing.proposals.recordProposalResponse);
  const generateUploadUrl = useMutation(api.corporateMarketing.proposals.generateUploadUrl);
  const createVaultDocument = useMutation(api.docvault.createDocument);
  const convex = useConvex();

  const [decisionNote, setDecisionNote] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  if (proposal === undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg"><Skeleton className="h-48 w-full" /></DialogContent>
      </Dialog>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      const fileUrl = await convex.query(api.cms.getFileUrl, { storageId });
      const docId = await createVaultDocument({
        title: `Proposal — ${proposal.proposalRef}`,
        docType: "corporate_proposal",
        fileUrl: fileUrl ?? "",
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        isConfidential: true,
      });
      await updateProposal({ id: proposal._id, vaultDocumentId: docId });
      toast.success("Proposal document attached");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to attach document");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const runAction = async (fn: () => Promise<unknown>, successMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{proposal.proposalRef}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{organisationName}</span>
            <Badge className={cn("text-[10px] border-0 capitalize", PROPOSAL_STATUS_COLOR[proposal.status])}>{proposal.status.replace("_", " ")}</Badge>
          </div>
          {proposal.terms && <p className="text-sm text-gray-600">{proposal.terms}</p>}
          {proposal.validityPeriodDays && <p className="text-xs text-gray-400">Valid for {proposal.validityPeriodDays} days</p>}
          {proposal.approvalDecisionNote && <p className="text-xs text-gray-400">Approval note: {proposal.approvalDecisionNote}</p>}

          <div className="rounded-xl border border-gray-100 p-3.5 space-y-2">
            <Label className="text-xs text-gray-500">Proposal Document</Label>
            {proposal.vaultDocument ? (
              <a href={proposal.vaultDocument.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-[var(--brand)] underline">{proposal.vaultDocument.fileName}</a>
            ) : (
              <p className="text-xs text-gray-400">No document attached yet</p>
            )}
            {(proposal.status === "draft" || proposal.status === "under_review") && (
              <div>
                <input type="file" id={`proposal-doc-${proposal._id}`} className="hidden" onChange={handleFileChange} disabled={uploading} />
                <Button
                  type="button" size="sm" variant="secondary" disabled={uploading} className="gap-1.5 cursor-pointer"
                  onClick={() => document.getElementById(`proposal-doc-${proposal._id}`)?.click()}
                >
                  <Upload size={13} /> {uploading ? "Uploading…" : proposal.vaultDocument ? "Replace Document" : "Attach Document"}
                </Button>
              </div>
            )}
          </div>

          {proposal.status === "draft" && (
            <Button
              size="sm" disabled={busy || !proposal.vaultDocumentId} className="w-full gap-1.5 cursor-pointer"
              onClick={() => runAction(() => submitForApproval({ id: proposal._id }), "Submitted for approval")}
            >
              <Send size={13} /> Submit for Internal Approval
            </Button>
          )}

          {proposal.status === "pending_approval" && (
            <div className="space-y-2 rounded-xl bg-amber-50 p-3.5">
              <p className="text-xs font-medium text-amber-700">Awaiting commercial approval</p>
              <Textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} rows={2} placeholder="Decision note (optional)" />
              <div className="flex gap-2">
                <Button size="sm" disabled={busy} className="flex-1 gap-1.5 cursor-pointer" onClick={() => runAction(() => decideApproval({ id: proposal._id, decision: "approved", decisionNote: decisionNote || undefined }), "Proposal approved")}>
                  <CheckCircle2 size={13} /> Approve
                </Button>
                <Button size="sm" variant="secondary" disabled={busy} className="flex-1 gap-1.5 cursor-pointer text-red-600" onClick={() => runAction(() => decideApproval({ id: proposal._id, decision: "rejected", decisionNote: decisionNote || undefined }), "Proposal rejected")}>
                  <X size={13} /> Reject
                </Button>
              </div>
            </div>
          )}

          {proposal.status === "approved" && (
            <Button size="sm" disabled={busy} className="w-full gap-1.5 cursor-pointer" onClick={() => runAction(() => submitToClient({ id: proposal._id }), "Proposal submitted to client")}>
              <Send size={13} /> Submit to {organisationName}
            </Button>
          )}

          {(proposal.status === "submitted" || proposal.status === "negotiation") && (
            <div className="space-y-2 rounded-xl bg-purple-50 p-3.5">
              <p className="text-xs font-medium text-purple-700">Record client response</p>
              <Textarea value={responseNote} onChange={(e) => setResponseNote(e.target.value)} rows={2} placeholder="Notes (optional)" />
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" disabled={busy} className="gap-1.5 cursor-pointer" onClick={() => runAction(() => recordResponse({ id: proposal._id, status: "accepted", notes: responseNote || undefined }), "Marked accepted")}>Accepted</Button>
                <Button size="sm" variant="secondary" disabled={busy} className="gap-1.5 cursor-pointer" onClick={() => runAction(() => recordResponse({ id: proposal._id, status: "negotiation", notes: responseNote || undefined }), "Moved to negotiation")}>Entering Negotiation</Button>
                <Button size="sm" variant="secondary" disabled={busy} className="gap-1.5 cursor-pointer text-red-600" onClick={() => runAction(() => recordResponse({ id: proposal._id, status: "rejected", notes: responseNote || undefined }), "Marked rejected")}>Rejected</Button>
                <Button size="sm" variant="secondary" disabled={busy} className="gap-1.5 cursor-pointer" onClick={() => runAction(() => recordResponse({ id: proposal._id, status: "withdrawn", notes: responseNote || undefined }), "Marked withdrawn")}>Withdrawn</Button>
              </div>
            </div>
          )}

          {(proposal.status === "accepted" || proposal.status === "rejected" || proposal.status === "expired" || proposal.status === "withdrawn") && (
            <p className="text-xs text-gray-400">This proposal is finalised. Use the Negotiation tab if further terms need to be structured.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Negotiation ────────────────────────────────────────────────────────────
const NEGOTIATION_APPROVAL_COLOR: Record<string, string> = {
  not_required: "bg-gray-100 text-gray-500",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

function NegotiationsSection({
  opportunityId,
  lineItems,
  organisationName,
}: {
  opportunityId: Id<"corporateOpportunities">;
  lineItems: LineItemDoc[];
  organisationName: string;
}) {
  const negotiations = useQuery(api.corporateMarketing.negotiations.listNegotiations, { opportunityId });
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Id<"corporateNegotiations"> | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
          <Scale size={13} /> Open Negotiation
        </Button>
      </div>

      {negotiations === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : negotiations.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Scale /></EmptyMedia>
            <EmptyTitle>No negotiations yet</EmptyTitle>
            <EmptyDescription>Structure quantity, price and payment terms for a line item — or the whole opportunity — as negotiations progress.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
              <Scale size={13} /> Open Negotiation
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-2">
          {negotiations.map((n) => (
            <button
              key={n._id}
              onClick={() => setSelected(n._id)}
              className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-[var(--brand)]/30 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{n.negotiationRef}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {n.lineItemLabel}
                  {n.negotiatedQuantity !== undefined ? ` · Qty ${n.negotiatedQuantity}` : n.proposedQuantity !== undefined ? ` · Proposed qty ${n.proposedQuantity}` : ""}
                  {n.negotiatedPrice !== undefined ? ` · ₦${n.negotiatedPrice.toLocaleString()}` : ""}
                </p>
              </div>
              <Badge className={cn("text-[10px] border-0 capitalize shrink-0", NEGOTIATION_APPROVAL_COLOR[n.approvalStatus])}>{n.approvalStatus.replace("_", " ")}</Badge>
            </button>
          ))}
        </div>
      )}

      <CreateNegotiationDialog open={createOpen} onOpenChange={setCreateOpen} opportunityId={opportunityId} lineItems={lineItems} />
      {selected && (
        <NegotiationDetailDialog id={selected} organisationName={organisationName} open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }} />
      )}
    </div>
  );
}

function CreateNegotiationDialog({
  open,
  onOpenChange,
  opportunityId,
  lineItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: Id<"corporateOpportunities">;
  lineItems: LineItemDoc[];
}) {
  const createNegotiation = useMutation(api.corporateMarketing.negotiations.createNegotiation);
  const [lineItemId, setLineItemId] = useState<string>("none");
  const [startingQuantity, setStartingQuantity] = useState("");
  const [proposedQuantity, setProposedQuantity] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [discountRequested, setDiscountRequested] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [allocationTerms, setAllocationTerms] = useState("");
  const [negotiationNotes, setNegotiationNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setLineItemId("none"); setStartingQuantity(""); setProposedQuantity(""); setStartingPrice("");
    setProposedPrice(""); setDiscountRequested(""); setPaymentTerms(""); setAllocationTerms(""); setNegotiationNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createNegotiation({
        opportunityId,
        lineItemId: lineItemId !== "none" ? (lineItemId as Id<"corporateOpportunityLineItems">) : undefined,
        startingQuantity: startingQuantity ? Number(startingQuantity) : undefined,
        proposedQuantity: proposedQuantity ? Number(proposedQuantity) : undefined,
        startingPrice: startingPrice ? Number(startingPrice) : undefined,
        proposedPrice: proposedPrice ? Number(proposedPrice) : undefined,
        discountRequested: discountRequested ? Number(discountRequested) : undefined,
        paymentTerms: paymentTerms || undefined,
        allocationTerms: allocationTerms || undefined,
        negotiationNotes: negotiationNotes || undefined,
      });
      toast.success("Negotiation opened");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open negotiation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Open Negotiation</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Line Item</Label>
            <Select value={lineItemId} onValueChange={setLineItemId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Whole opportunity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Whole opportunity</SelectItem>
                {lineItems.map((li) => <SelectItem key={li._id} value={li._id}>{li.propertyType ?? "Line item"} (required {li.quantityRequired})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Starting Quantity</Label>
              <Input type="number" min={0} value={startingQuantity} onChange={(e) => setStartingQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Proposed Quantity</Label>
              <Input type="number" min={0} value={proposedQuantity} onChange={(e) => setProposedQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Starting Price (₦)</Label>
              <Input type="number" min={0} value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Proposed Price (₦)</Label>
              <Input type="number" min={0} value={proposedPrice} onChange={(e) => setProposedPrice(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Discount Requested (%)</Label>
            <Input type="number" min={0} max={100} value={discountRequested} onChange={(e) => setDiscountRequested(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Terms</Label>
            <Textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Allocation Terms</Label>
            <Textarea value={allocationTerms} onChange={(e) => setAllocationTerms(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Negotiation Notes</Label>
            <Textarea value={negotiationNotes} onChange={(e) => setNegotiationNotes(e.target.value)} rows={2} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Opening…" : "Open Negotiation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NegotiationDetailDialog({
  id,
  organisationName,
  open,
  onOpenChange,
}: {
  id: Id<"corporateNegotiations">;
  organisationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const negotiation = useQuery(api.corporateMarketing.negotiations.getNegotiation, open ? { id } : "skip");
  const updateTerms = useMutation(api.corporateMarketing.negotiations.updateNegotiationTerms);
  const requestApproval = useMutation(api.corporateMarketing.negotiations.requestNegotiationApproval);
  const decideApproval = useMutation(api.corporateMarketing.negotiations.decideNegotiationApproval);
  const finalizeNegotiation = useMutation(api.corporateMarketing.negotiations.finalizeNegotiation);

  const [proposedQuantity, setProposedQuantity] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [discountRequested, setDiscountRequested] = useState("");
  const [negotiationNotes, setNegotiationNotes] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [negotiatedQuantity, setNegotiatedQuantity] = useState("");
  const [negotiatedPrice, setNegotiatedPrice] = useState("");
  const [busy, setBusy] = useState(false);

  if (negotiation === undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg"><Skeleton className="h-48 w-full" /></DialogContent>
      </Dialog>
    );
  }

  const isFinalised = negotiation.negotiatedQuantity !== undefined || negotiation.negotiatedPrice !== undefined;

  const runAction = async (fn: () => Promise<unknown>, successMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction(() => updateTerms({
      id: negotiation._id,
      proposedQuantity: proposedQuantity ? Number(proposedQuantity) : undefined,
      proposedPrice: proposedPrice ? Number(proposedPrice) : undefined,
      discountRequested: discountRequested ? Number(discountRequested) : undefined,
      negotiationNotes: negotiationNotes || undefined,
    }), "Terms updated");
    setProposedQuantity(""); setProposedPrice(""); setDiscountRequested(""); setNegotiationNotes("");
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction(() => finalizeNegotiation({
      id: negotiation._id,
      negotiatedQuantity: negotiatedQuantity ? Number(negotiatedQuantity) : undefined,
      negotiatedPrice: negotiatedPrice ? Number(negotiatedPrice) : undefined,
    }), "Negotiation finalised");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{negotiation.negotiationRef}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{organisationName} · {negotiation.lineItemLabel}</span>
            <Badge className={cn("text-[10px] border-0 capitalize", NEGOTIATION_APPROVAL_COLOR[negotiation.approvalStatus])}>{negotiation.approvalStatus.replace("_", " ")}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
            {negotiation.startingQuantity !== undefined && <div>Starting qty: <span className="font-medium">{negotiation.startingQuantity}</span></div>}
            {negotiation.proposedQuantity !== undefined && <div>Proposed qty: <span className="font-medium">{negotiation.proposedQuantity}</span></div>}
            {negotiation.startingPrice !== undefined && <div>Starting price: <span className="font-medium">₦{negotiation.startingPrice.toLocaleString()}</span></div>}
            {negotiation.proposedPrice !== undefined && <div>Proposed price: <span className="font-medium">₦{negotiation.proposedPrice.toLocaleString()}</span></div>}
            {negotiation.discountRequested !== undefined && <div>Discount requested: <span className="font-medium">{negotiation.discountRequested}%</span></div>}
            {negotiation.discountApproved !== undefined && <div>Discount approved: <span className="font-medium">{negotiation.discountApproved}%</span></div>}
          </div>
          {negotiation.paymentTerms && <p className="text-xs text-gray-500">Payment terms: {negotiation.paymentTerms}</p>}
          {negotiation.allocationTerms && <p className="text-xs text-gray-500">Allocation terms: {negotiation.allocationTerms}</p>}
          {negotiation.negotiationNotes && <p className="text-xs text-gray-500">{negotiation.negotiationNotes}</p>}
          {negotiation.approvalDecisionNote && <p className="text-xs text-gray-500">Approval note: {negotiation.approvalDecisionNote}</p>}

          {isFinalised ? (
            <div className="rounded-xl bg-green-50 p-3.5 space-y-1">
              <p className="text-xs font-medium text-green-700">Finalised</p>
              {negotiation.negotiatedQuantity !== undefined && <p className="text-sm text-gray-700">Negotiated quantity: {negotiation.negotiatedQuantity}</p>}
              {negotiation.negotiatedPrice !== undefined && <p className="text-sm text-gray-700">Negotiated price: ₦{negotiation.negotiatedPrice.toLocaleString()}</p>}
            </div>
          ) : (
            <>
              {negotiation.approvalStatus === "not_required" && (
                <form onSubmit={handleUpdateTerms} className="space-y-3 border-t border-gray-50 pt-3.5">
                  <Label className="text-xs text-gray-500">Update Terms</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" min={0} placeholder="Proposed qty" value={proposedQuantity} onChange={(e) => setProposedQuantity(e.target.value)} />
                    <Input type="number" min={0} placeholder="Proposed price (₦)" value={proposedPrice} onChange={(e) => setProposedPrice(e.target.value)} />
                  </div>
                  <Input type="number" min={0} max={100} placeholder="Discount requested (%)" value={discountRequested} onChange={(e) => setDiscountRequested(e.target.value)} />
                  <Textarea rows={2} placeholder="Negotiation notes" value={negotiationNotes} onChange={(e) => setNegotiationNotes(e.target.value)} />
                  <Button type="submit" size="sm" disabled={busy} className="w-full cursor-pointer">Update Terms</Button>
                </form>
              )}

              {negotiation.approvalStatus === "not_required" && (
                <Button size="sm" variant="secondary" disabled={busy} className="w-full gap-1.5 cursor-pointer" onClick={() => runAction(() => requestApproval({ id: negotiation._id }), "Submitted for approval")}>
                  <Send size={13} /> Request Commercial Approval
                </Button>
              )}

              {negotiation.approvalStatus === "pending" && (
                <div className="space-y-2 rounded-xl bg-amber-50 p-3.5">
                  <p className="text-xs font-medium text-amber-700">Awaiting commercial approval</p>
                  <Textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} rows={2} placeholder="Decision note (optional)" />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy} className="flex-1 gap-1.5 cursor-pointer" onClick={() => runAction(() => decideApproval({ id: negotiation._id, decision: "approved", decisionNote: decisionNote || undefined, discountApproved: negotiation.discountRequested }), "Negotiation approved")}>
                      <CheckCircle2 size={13} /> Approve
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busy} className="flex-1 gap-1.5 cursor-pointer text-red-600" onClick={() => runAction(() => decideApproval({ id: negotiation._id, decision: "rejected", decisionNote: decisionNote || undefined }), "Negotiation rejected")}>
                      <X size={13} /> Reject
                    </Button>
                  </div>
                </div>
              )}

              {(negotiation.approvalStatus === "not_required" || negotiation.approvalStatus === "approved") && (
                <form onSubmit={handleFinalize} className="space-y-3 border-t border-gray-50 pt-3.5">
                  <Label className="text-xs text-gray-500">Finalise Negotiated Terms</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" min={0} placeholder={`Qty (default ${negotiation.proposedQuantity ?? "—"})`} value={negotiatedQuantity} onChange={(e) => setNegotiatedQuantity(e.target.value)} />
                    <Input type="number" min={0} placeholder={`Price (default ${negotiation.proposedPrice ?? "—"})`} value={negotiatedPrice} onChange={(e) => setNegotiatedPrice(e.target.value)} />
                  </div>
                  <Button type="submit" size="sm" disabled={busy} className="w-full gap-1.5 cursor-pointer">
                    <CheckCircle2 size={13} /> Finalise Negotiation
                  </Button>
                </form>
              )}

              {negotiation.approvalStatus === "rejected" && (
                <p className="text-xs text-red-600">This negotiation was rejected and cannot be finalised. Open a new negotiation with revised terms.</p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Commitment → Payment → Allocation → Transaction conversion. Bridges into
// the EXISTING Payments (geoPayments), Plot Allocation (allocations) and
// Transactions systems — never a second ledger, allocation engine, or
// transaction table. See convex/corporateMarketing/commitments.ts.
// ══════════════════════════════════════════════════════════════════════════

function ConversionSection({
  opportunityId,
  lineItems,
  organisationName,
}: {
  opportunityId: Id<"corporateOpportunities">;
  lineItems: LineItemDoc[];
  organisationName: string;
}) {
  const summary = useQuery(api.corporateMarketing.commitments.getConversionSummary, { opportunityId });
  const [commitDialogLineItem, setCommitDialogLineItem] = useState<LineItemDoc | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [allocationDialogLineItem, setAllocationDialogLineItem] = useState<LineItemDoc | null>(null);
  const convertToTransaction = useMutation(api.corporateMarketing.commitments.convertToTransaction);
  const [converting, setConverting] = useState(false);

  if (summary === undefined) {
    return <Skeleton className="h-40 w-full" />;
  }

  const handleConvert = async () => {
    setConverting(true);
    try {
      const result = await convertToTransaction({ opportunityId });
      toast.success(`Converted to transaction ${result.transactionRef}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to convert to transaction");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-4">
      {summary.transactionId ? (
        <div className="bg-green-50 rounded-2xl border border-green-100 p-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Converted to transaction {summary.transactionRef}</p>
            <p className="text-xs text-green-700/80 mt-0.5 capitalize">Status: {summary.transactionStatus?.replace(/_/g, " ")} — continue tracking KYC, finance, agreement and completion from the Transactions module.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-900">Convert to Transaction</p>
            <p className="text-xs text-gray-400 mt-0.5">Once at least one line item has a recorded commitment, convert this opportunity into a transaction to continue through KYC, finance, agreement and completion.</p>
          </div>
          <Button size="sm" disabled={!summary.canConvert || converting} onClick={handleConvert} className="gap-2 cursor-pointer shrink-0">
            <PackageCheck size={13} /> {converting ? "Converting…" : "Convert to Transaction"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Committed", value: summary.totals.committed },
          { label: "Paid (units)", value: summary.totals.paid },
          { label: "Allocated", value: summary.totals.allocated },
          { label: "Total Received", value: `₦${summary.totalPaidAmount.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Line Item Commitments</p>
          <Button size="sm" variant="secondary" onClick={() => setPaymentDialogOpen(true)} className="gap-2 cursor-pointer">
            <Wallet size={13} /> Record Payment
          </Button>
        </div>
        {lineItems.length === 0 ? (
          <p className="text-xs text-gray-400">Add line items first, then record commitments here.</p>
        ) : (
          <div className="grid gap-2">
            {lineItems.map((li) => (
              <div key={li._id} className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-gray-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{li.propertyType ?? "Line item"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Required {li.quantityRequired} · Committed {li.quantityCommitted} · Paid {li.quantityPaid} · Allocated {li.quantityAllocated}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="secondary" className="cursor-pointer" onClick={() => setCommitDialogLineItem(li)}>Set Commitment</Button>
                  <Button size="sm" variant="secondary" className="cursor-pointer" disabled={li.quantityAllocated >= li.quantityCommitted} onClick={() => setAllocationDialogLineItem(li)}>Allocate Plot</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {summary.payments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900">Recorded Payments</p>
          {summary.payments.map((bp) => (
            <div key={bp._id} className="flex items-center justify-between gap-3 text-sm rounded-xl bg-gray-50 px-3 py-2">
              <span className="text-gray-600">{bp.payment?.paymentRef ?? "—"} {bp.payment?.description ? `· ${bp.payment.description}` : ""}</span>
              <span className="font-medium text-gray-900">₦{(bp.payment?.amountDisplay ?? 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {summary.allocations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900">Recorded Allocations</p>
          {summary.allocations.map((ba) => (
            <div key={ba._id} className="flex items-center justify-between gap-3 text-sm rounded-xl bg-gray-50 px-3 py-2">
              <span className="text-gray-600">{ba.allocation?.allocationNumber ?? "—"}</span>
              <span className="font-medium text-gray-900">₦{(ba.allocation?.purchasePrice ?? 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <CommitmentDialog
        lineItem={commitDialogLineItem}
        open={!!commitDialogLineItem}
        onOpenChange={(open) => { if (!open) setCommitDialogLineItem(null); }}
      />
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        opportunityId={opportunityId}
        lineItems={lineItems}
        organisationName={organisationName}
      />
      <AllocatePlotDialog
        lineItem={allocationDialogLineItem}
        open={!!allocationDialogLineItem}
        onOpenChange={(open) => { if (!open) setAllocationDialogLineItem(null); }}
      />
    </div>
  );
}

function CommitmentDialog({
  lineItem,
  open,
  onOpenChange,
}: {
  lineItem: LineItemDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const recordCommitment = useMutation(api.corporateMarketing.commitments.recordCommitment);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const key = lineItem?._id ?? "none";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setQuantity(lineItem ? String(lineItem.quantityCommitted) : "");
    setNotes("");
  }

  if (!lineItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Enter a valid committed quantity");
      return;
    }
    setSaving(true);
    try {
      await recordCommitment({ lineItemId: lineItem._id, quantityCommitted: qty, notes: notes || undefined });
      toast.success("Commitment recorded");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record commitment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Set Commitment — {lineItem.propertyType ?? "Line Item"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Committed Quantity (of {lineItem.quantityRequired} required)</Label>
            <Input type="number" min={0} max={lineItem.quantityRequired} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Saving…" : "Record Commitment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  opportunityId,
  lineItems,
  organisationName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: Id<"corporateOpportunities">;
  lineItems: LineItemDoc[];
  organisationName: string;
}) {
  const recordBulkPayment = useMutation(api.corporateMarketing.commitments.recordBulkPayment);
  const [lineItemId, setLineItemId] = useState<string>("none");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [txnType, setTxnType] = useState<"deposit" | "instalment" | "full_payment">("deposit");
  const [quantityCovered, setQuantityCovered] = useState("");
  const [gatewayRef, setGatewayRef] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setLineItemId("none"); setAmountDisplay(""); setTxnType("deposit"); setQuantityCovered(""); setGatewayRef(""); setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(amountDisplay);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const result = await recordBulkPayment({
        opportunityId,
        lineItemId: lineItemId !== "none" ? (lineItemId as Id<"corporateOpportunityLineItems">) : undefined,
        amountDisplay: amount,
        currency: "NGN",
        txnType,
        quantityCovered: quantityCovered ? Number(quantityCovered) : undefined,
        gatewayRef: gatewayRef || undefined,
        description: description || undefined,
      });
      toast.success(`Payment ${result.paymentRef} recorded`);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Record Bulk Payment — {organisationName}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Line Item (optional)</Label>
            <Select value={lineItemId} onValueChange={setLineItemId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Whole opportunity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Whole opportunity</SelectItem>
                {lineItems.map((li) => <SelectItem key={li._id} value={li._id}>{li.propertyType ?? "Line item"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₦)</Label>
              <Input type="number" min={0} value={amountDisplay} onChange={(e) => setAmountDisplay(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Type</Label>
              <Select value={txnType} onValueChange={(v) => setTxnType(v as typeof txnType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="instalment">Instalment</SelectItem>
                  <SelectItem value="full_payment">Full Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {lineItemId !== "none" && (
            <div className="space-y-1.5">
              <Label>Units Covered by this Payment (optional)</Label>
              <Input type="number" min={0} value={quantityCovered} onChange={(e) => setQuantityCovered(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Bank/Gateway Reference (optional)</Label>
            <Input value={gatewayRef} onChange={(e) => setGatewayRef(e.target.value)} placeholder="e.g. bank transfer reference" />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Recording…" : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AllocatePlotDialog({
  lineItem,
  open,
  onOpenChange,
}: {
  lineItem: LineItemDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const estates = useQuery(api.admin.listEstates, open ? {} : "skip");
  const recordBulkAllocation = useMutation(api.corporateMarketing.commitments.recordBulkAllocation);
  const [estateId, setEstateId] = useState<string>("");
  const [plotId, setPlotId] = useState<string>("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [paymentType, setPaymentType] = useState<"outright" | "installment">("outright");
  const [allocatedDate, setAllocatedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const plots = useQuery(
    api.allocations.listPlots,
    open && estateId ? { estateId: estateId as Id<"estates">, status: "available" } : "skip",
  );

  const key = lineItem?._id ?? "none";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setEstateId(""); setPlotId(""); setPurchasePrice(lineItem?.negotiatedPrice !== undefined ? String(lineItem.negotiatedPrice) : lineItem?.unitPrice !== undefined ? String(lineItem.unitPrice) : "");
    setPaymentType("outright");
    setAllocatedDate(new Date().toISOString().split("T")[0]);
  }

  if (!lineItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(purchasePrice);
    if (!estateId || !plotId) {
      toast.error("Select an estate and plot");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid purchase price");
      return;
    }
    setSaving(true);
    try {
      await recordBulkAllocation({
        lineItemId: lineItem._id,
        plotId: plotId as Id<"plots">,
        estateId: estateId as Id<"estates">,
        allocatedDate,
        purchasePrice: price,
        paymentType,
      });
      toast.success("Plot allocated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to allocate plot");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Allocate Plot — {lineItem.propertyType ?? "Line Item"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Estate</Label>
            <Select value={estateId} onValueChange={(v) => { setEstateId(v); setPlotId(""); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select estate" /></SelectTrigger>
              <SelectContent>
                {(estates ?? []).map((e) => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Available Plot</Label>
            <Select value={plotId} onValueChange={setPlotId} disabled={!estateId}>
              <SelectTrigger className="w-full"><SelectValue placeholder={estateId ? "Select plot" : "Select an estate first"} /></SelectTrigger>
              <SelectContent>
                {(plots ?? []).map((p) => <SelectItem key={p._id} value={p._id}>Plot {p.plotNumber} ({p.size})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Purchase Price (₦)</Label>
              <Input type="number" min={0} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Type</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as typeof paymentType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outright">Outright</SelectItem>
                  <SelectItem value="installment">Installment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Allocation Date</Label>
            <Input type="date" value={allocatedDate} onChange={(e) => setAllocatedDate(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Allocating…" : "Allocate Plot"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


