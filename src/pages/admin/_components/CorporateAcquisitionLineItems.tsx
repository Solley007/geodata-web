import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";
import { Plus, Link2, Pencil, Trash2, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";

/**
 * Line items, quantity control & bulk pricing history for a Bulk Acquisition
 * (Institutional / Bulk Acquisition Management enhancement, milestone 74).
 * Line items live in the EXISTING corporateOpportunityLineItems table — this
 * view only shows the ones linked to one bulk acquisition via
 * bulkAcquisitionId, and lets officers link existing unlinked line items or
 * create new ones directly under the acquisition. No second line-item table.
 */

type AcquisitionLineItem = Doc<"corporateOpportunityLineItems"> & { propertyTitle?: string; estateName?: string };

function effectivePrice(li: Doc<"corporateOpportunityLineItems">): number {
  return li.approvedPrice ?? li.negotiatedPrice ?? li.proposedPrice ?? li.bulkPrice ?? li.unitPrice ?? li.standardPrice ?? 0;
}

function fulfilmentPercent(li: Doc<"corporateOpportunityLineItems">): number {
  if (li.quantityRequired <= 0) return 0;
  return Math.min(100, Math.round((li.quantityAllocated / li.quantityRequired) * 100));
}

export function AcquisitionLineItemsSection({
  acquisitionId,
  opportunityId,
}: {
  acquisitionId: Id<"corporateBulkAcquisitions">;
  opportunityId: Id<"corporateOpportunities">;
}) {
  const lineItems = useQuery(api.corporateMarketing.lineItems.listLineItemsForAcquisition, { acquisitionId });
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AcquisitionLineItem | null>(null);
  const [pricingItem, setPricingItem] = useState<AcquisitionLineItem | null>(null);

  const unlinkFromAcquisition = useMutation(api.corporateMarketing.lineItems.unlinkLineItemFromAcquisition);

  const handleUnlink = async (id: Id<"corporateOpportunityLineItems">) => {
    try {
      await unlinkFromAcquisition({ lineItemId: id });
      toast.success("Line item unlinked from this acquisition");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unlink line item");
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
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => setLinkOpen(true)} className="gap-2 cursor-pointer">
          <Link2 size={13} /> Link Existing Line Item
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
          <PackagePlus size={13} /> New Line Item
        </Button>
      </div>

      {lineItems === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : lineItems.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><PackagePlus /></EmptyMedia>
            <EmptyTitle>No line items linked yet</EmptyTitle>
            <EmptyDescription>Add each property type/quantity/price combination this acquisition covers, or link one already recorded on the opportunity.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer">
              <Plus size={13} /> New Line Item
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { label: "Required", value: totals.required },
              { label: "Committed", value: totals.committed },
              { label: "Paid", value: totals.paid },
              { label: "Allocated", value: totals.allocated },
            ].map((t) => (
              <div key={t.label} className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-[11px] text-gray-400">{t.label}</p>
                <p className="font-semibold text-gray-900">{t.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            {lineItems.map((li) => (
              <div key={li._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{li.propertyTitle ?? li.propertyType ?? "Untitled line item"}</p>
                    {li.estateName && <p className="text-xs text-gray-400 mt-0.5">{li.estateName}</p>}
                    {li.description && <p className="text-xs text-gray-500 mt-1">{li.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setPricingItem(li)} className="cursor-pointer text-xs h-7">
                      <Pencil size={12} className="mr-1" /> Quantities &amp; Pricing
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleUnlink(li._id)} className="cursor-pointer text-xs h-7 text-red-500 hover:text-red-600">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mt-3 text-xs">
                  {[
                    { label: "Required", value: li.quantityRequired },
                    { label: "EOI", value: li.quantityEoi },
                    { label: "Proposed", value: li.quantityProposed },
                    { label: "Negotiated", value: li.quantityNegotiated },
                    { label: "Committed", value: li.quantityCommitted },
                    { label: "Paid", value: li.quantityPaid },
                    { label: "Allocated", value: li.quantityAllocated },
                  ].map((q) => (
                    <div key={q.label} className="text-center bg-gray-50 rounded-lg py-1.5">
                      <p className="text-gray-400">{q.label}</p>
                      <p className="font-semibold text-gray-800">{q.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>Fulfilment progress</span>
                      <span>{fulfilmentPercent(li)}%</span>
                    </div>
                    <Progress value={fulfilmentPercent(li)} />
                  </div>
                  <Badge className="text-[10px] border-0 bg-blue-50 text-blue-700 shrink-0">
                    Unit price: ₦{effectivePrice(li).toLocaleString()}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400 flex-wrap">
                  {li.standardPrice !== undefined && <span>Standard: ₦{li.standardPrice.toLocaleString()}</span>}
                  {li.bulkPrice !== undefined && <span>Bulk: ₦{li.bulkPrice.toLocaleString()}</span>}
                  {li.proposedPrice !== undefined && <span>Proposed: ₦{li.proposedPrice.toLocaleString()}</span>}
                  {li.negotiatedPrice !== undefined && <span>Negotiated: ₦{li.negotiatedPrice.toLocaleString()}</span>}
                  {li.approvedPrice !== undefined && <span>Approved: ₦{li.approvedPrice.toLocaleString()}</span>}
                  {li.discountPercent !== undefined && <span>Discount: {li.discountPercent}%</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CreateAcquisitionLineItemDialog open={createOpen} onOpenChange={setCreateOpen} opportunityId={opportunityId} acquisitionId={acquisitionId} />
      <LinkExistingLineItemDialog open={linkOpen} onOpenChange={setLinkOpen} opportunityId={opportunityId} acquisitionId={acquisitionId} />
      <QuantitiesAndPricingDialog item={pricingItem} onOpenChange={(open) => !open && setPricingItem(null)} />
    </div>
  );
}

function CreateAcquisitionLineItemDialog({
  open,
  onOpenChange,
  opportunityId,
  acquisitionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: Id<"corporateOpportunities">;
  acquisitionId: Id<"corporateBulkAcquisitions">;
}) {
  const createLineItem = useMutation(api.corporateMarketing.lineItems.createLineItem);
  const [form, setForm] = useState({ propertyType: "", description: "", quantityRequired: "1", standardPrice: "", bulkPrice: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantityRequired = parseInt(form.quantityRequired, 10);
    if (!form.propertyType.trim()) { toast.error("Enter a property type"); return; }
    if (!Number.isFinite(quantityRequired) || quantityRequired <= 0) { toast.error("Quantity required must be greater than zero"); return; }
    setSaving(true);
    try {
      await createLineItem({
        opportunityId,
        bulkAcquisitionId: acquisitionId,
        propertyType: form.propertyType.trim(),
        description: form.description || undefined,
        quantityRequired,
        standardPrice: form.standardPrice ? parseFloat(form.standardPrice) : undefined,
        bulkPrice: form.bulkPrice ? parseFloat(form.bulkPrice) : undefined,
        unitPrice: form.bulkPrice ? parseFloat(form.bulkPrice) : form.standardPrice ? parseFloat(form.standardPrice) : undefined,
      });
      toast.success("Line item added to acquisition");
      setForm({ propertyType: "", description: "", quantityRequired: "1", standardPrice: "", bulkPrice: "" });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add line item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Line Item</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Property Type *</Label>
            <Input value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} placeholder="3-Bedroom Terrace" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Quantity Required *</Label>
            <Input type="number" min={1} value={form.quantityRequired} onChange={(e) => setForm({ ...form, quantityRequired: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Standard Price (₦)</Label>
              <Input type="number" min={0} value={form.standardPrice} onChange={(e) => setForm({ ...form, standardPrice: e.target.value })} placeholder="30000000" />
            </div>
            <div className="space-y-1.5">
              <Label>Bulk Price (₦)</Label>
              <Input type="number" min={0} value={form.bulkPrice} onChange={(e) => setForm({ ...form, bulkPrice: e.target.value })} placeholder="25000000" />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Adding…" : "Add Line Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LinkExistingLineItemDialog({
  open,
  onOpenChange,
  opportunityId,
  acquisitionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: Id<"corporateOpportunities">;
  acquisitionId: Id<"corporateBulkAcquisitions">;
}) {
  const unlinked = useQuery(api.corporateMarketing.lineItems.listUnlinkedLineItems, open ? { opportunityId } : "skip");
  const linkLineItem = useMutation(api.corporateMarketing.lineItems.linkLineItemToAcquisition);
  const [linking, setLinking] = useState<Id<"corporateOpportunityLineItems"> | null>(null);

  const handleLink = async (lineItemId: Id<"corporateOpportunityLineItems">) => {
    setLinking(lineItemId);
    try {
      await linkLineItem({ lineItemId, acquisitionId });
      toast.success("Line item linked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link line item");
    } finally {
      setLinking(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Link Existing Line Item</DialogTitle></DialogHeader>
        {unlinked === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : unlinked.length === 0 ? (
          <p className="text-sm text-gray-500">Every line item on this opportunity is already linked to a bulk acquisition.</p>
        ) : (
          <div className="space-y-2">
            {unlinked.map((li) => (
              <div key={li._id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{li.propertyType ?? "Untitled line item"}</p>
                  <p className="text-xs text-gray-400">Required: {li.quantityRequired}</p>
                </div>
                <Button size="sm" onClick={() => handleLink(li._id)} disabled={linking === li._id} className="cursor-pointer shrink-0">
                  {linking === li._id ? "Linking…" : "Link"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function QuantitiesAndPricingDialog({
  item,
  onOpenChange,
}: {
  item: AcquisitionLineItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const updateLineItem = useMutation(api.corporateMarketing.lineItems.updateLineItem);
  const emptyForm = {
    quantityEoi: "0", quantityProposed: "0", quantityNegotiated: "0", quantityCommitted: "0", quantityPaid: "0", quantityAllocated: "0",
    standardPrice: "", bulkPrice: "", proposedPrice: "", negotiatedPrice: "", approvedPrice: "", discountPercent: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [lastId, setLastId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (item && item._id !== lastId) {
    setLastId(item._id);
    setForm({
      quantityEoi: String(item.quantityEoi), quantityProposed: String(item.quantityProposed), quantityNegotiated: String(item.quantityNegotiated),
      quantityCommitted: String(item.quantityCommitted), quantityPaid: String(item.quantityPaid), quantityAllocated: String(item.quantityAllocated),
      standardPrice: item.standardPrice !== undefined ? String(item.standardPrice) : "",
      bulkPrice: item.bulkPrice !== undefined ? String(item.bulkPrice) : "",
      proposedPrice: item.proposedPrice !== undefined ? String(item.proposedPrice) : "",
      negotiatedPrice: item.negotiatedPrice !== undefined ? String(item.negotiatedPrice) : "",
      approvedPrice: item.approvedPrice !== undefined ? String(item.approvedPrice) : "",
      discountPercent: item.discountPercent !== undefined ? String(item.discountPercent) : "",
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    try {
      await updateLineItem({
        id: item._id,
        quantityEoi: parseInt(form.quantityEoi, 10) || 0,
        quantityProposed: parseInt(form.quantityProposed, 10) || 0,
        quantityNegotiated: parseInt(form.quantityNegotiated, 10) || 0,
        quantityCommitted: parseInt(form.quantityCommitted, 10) || 0,
        quantityPaid: parseInt(form.quantityPaid, 10) || 0,
        quantityAllocated: parseInt(form.quantityAllocated, 10) || 0,
        standardPrice: form.standardPrice ? parseFloat(form.standardPrice) : undefined,
        bulkPrice: form.bulkPrice ? parseFloat(form.bulkPrice) : undefined,
        proposedPrice: form.proposedPrice ? parseFloat(form.proposedPrice) : undefined,
        negotiatedPrice: form.negotiatedPrice ? parseFloat(form.negotiatedPrice) : undefined,
        approvedPrice: form.approvedPrice ? parseFloat(form.approvedPrice) : undefined,
        discountPercent: form.discountPercent ? parseFloat(form.discountPercent) : undefined,
      });
      toast.success("Line item updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update line item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Quantities &amp; Pricing — {item?.propertyType ?? "Line Item"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-gray-400">Required quantity: {item?.quantityRequired}. Each stage below is validated against the one before it — committed can't exceed negotiated, paid can't exceed committed, allocated can't exceed paid.</p>
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

          <div className="border-t border-gray-100 pt-3 space-y-1">
            <p className="text-xs font-medium text-gray-500">Pricing history (each stage kept, never overwritten)</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "standardPrice" as const, label: "Standard Price" },
              { key: "bulkPrice" as const, label: "Bulk Price" },
              { key: "proposedPrice" as const, label: "Proposed Price" },
              { key: "negotiatedPrice" as const, label: "Negotiated Price" },
              { key: "approvedPrice" as const, label: "Approved Price" },
            ].map((p) => (
              <div key={p.key} className="space-y-1.5">
                <Label className="text-xs">{p.label} (₦)</Label>
                <Input type="number" min={0} value={form[p.key]} onChange={(e) => setForm({ ...form, [p.key]: e.target.value })} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs">Discount %</Label>
              <Input type="number" min={0} max={100} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full cursor-pointer">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
