import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { addMonths, todayLagos } from "@/convex/partnerContractUtils.ts";
import { errorMessage, formatDay } from "../../_lib/contract-format.ts";

type DialogProps = { partnerId: Id<"partners">; open: boolean; onOpenChange: (o: boolean) => void };

export function ExtendContractDialog({ partnerId, currentEndDate, open, onOpenChange }: DialogProps & { currentEndDate: string }) {
  // Extend from the later of today or the current end so there's no gap
  const base = currentEndDate > todayLagos() ? currentEndDate : todayLagos();
  const [newEnd, setNewEnd] = useState(addMonths(base, 12));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const extend = useMutation(api.partnerContracts.extendContract);

  const submit = async () => {
    setBusy(true);
    try {
      await extend({ partnerId, newEndDate: newEnd, note: note || undefined });
      toast.success(`Contract extended to ${formatDay(newEnd)}.`);
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, "Could not extend the contract."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend contract</DialogTitle>
          <DialogDescription>
            Currently ends {formatDay(currentEndDate)}. The listing stays live, and if it was removed because the contract expired, it comes back straight away.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="x-end">New end date</Label>
            <Input id="x-end" type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            <div className="flex gap-1.5 pt-1">
              {[3, 6, 12, 24].map((m) => (
                <button key={m} type="button" onClick={() => setNewEnd(addMonths(base, m))} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-200 cursor-pointer">
                  +{m} months
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="x-note">Note (optional)</Label>
            <Textarea id="x-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Renewal fee received" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
          <Button disabled={busy} onClick={() => void submit()} className="cursor-pointer bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]">
            {busy ? "Extending…" : "Extend contract"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DelistDialog({ partnerId, open, onOpenChange }: DialogProps) {
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const delist = useMutation(api.partnerContracts.delistPartner);

  const submit = async () => {
    if (!reason.trim()) { toast.error("Please give a reason."); return; }
    setBusy(true);
    try {
      await delist({ partnerId, reason, notifyPartner: notify });
      toast.success("Partner delisted. Their logo and profile are now hidden.");
      setReason("");
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, "Could not delist this partner."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delist partner</DialogTitle>
          <DialogDescription>
            Hides their logo and profile everywhere on the website. Their partner dashboard, referral link and earned commissions keep working. Use Suspend instead to block the account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="d-reason">Reason</Label>
            <Textarea id="d-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Listing fee outstanding" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <Checkbox checked={notify} onCheckedChange={(c) => setNotify(c === true)} className="cursor-pointer" />
            Email the partner
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
          <Button variant="destructive" disabled={busy} onClick={() => void submit()} className="cursor-pointer">
            {busy ? "Delisting…" : "Delist partner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
