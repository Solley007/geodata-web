import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { addMonths, todayLagos } from "@/convex/partnerContractUtils.ts";
import { errorMessage } from "../../_lib/contract-format.ts";

export type ContractFormInitial = {
  startDate: string;
  endDate: string;
  graceDays: number;
  autoDelist: boolean;
  notes: string | null;
  agreementFileName: string | null;
} | null;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Create or edit a partner's agreement (dates, grace period, auto-delist, signed file). */
export default function ContractForm({
  partnerId,
  initial,
  onDone,
}: {
  partnerId: Id<"partners">;
  initial: ContractFormInitial;
  onDone: () => void;
}) {
  const today = todayLagos();
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  const [endDate, setEndDate] = useState(initial?.endDate ?? addMonths(today, 12));
  const [graceDays, setGraceDays] = useState(String(initial?.graceDays ?? 7));
  const [autoDelist, setAutoDelist] = useState(initial?.autoDelist ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const save = useMutation(api.partnerContracts.saveContract);
  const getUploadUrl = useMutation(api.partnerContracts.generateAgreementUploadUrl);

  const uploadFile = async (f: File): Promise<Id<"_storage">> => {
    const url = await getUploadUrl({});
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": f.type || "application/octet-stream" }, body: f });
    if (!res.ok) throw new Error("Upload failed");
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    return storageId;
  };

  const handleSave = async () => {
    const grace = Number(graceDays);
    if (!Number.isInteger(grace) || grace < 0) {
      toast.error("Grace period must be a whole number of days.");
      return;
    }
    setSaving(true);
    try {
      const agreementStorageId = file ? await uploadFile(file) : undefined;
      await save({
        partnerId,
        startDate,
        endDate,
        graceDays: grace,
        autoDelist,
        notes: notes || undefined,
        agreementStorageId,
        agreementFileName: file?.name,
      });
      toast.success(initial ? "Contract updated." : "Contract added.");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the contract."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-gray-100 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="c-start">Start date</Label>
          <Input id="c-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-end">End date</Label>
          <Input id="c-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <div className="flex gap-1.5 pt-1">
            {[6, 12, 24].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setEndDate(addMonths(startDate, m))}
                className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-200 cursor-pointer"
              >
                {m} months
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <Switch checked={autoDelist} onCheckedChange={setAutoDelist} className="cursor-pointer" />
          Remove listing automatically when the contract ends
        </label>
        {autoDelist && (
          <div className="flex items-center gap-2">
            <Label htmlFor="c-grace" className="text-xs text-gray-500">Grace period</Label>
            <Input id="c-grace" type="number" min={0} max={90} value={graceDays} onChange={(e) => setGraceDays(e.target.value)} className="h-8 w-20" />
            <span className="text-xs text-gray-500">days</span>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Signed agreement</Label>
        <label className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
          {file || initial?.agreementFileName ? <FileText size={16} className="text-[var(--brand)]" /> : <Upload size={16} />}
          <span className="truncate">{file?.name ?? initial?.agreementFileName ?? "Upload PDF or image (max 10MB)"}</span>
          <input
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && f.size > MAX_FILE_BYTES) { toast.error("File must be 10MB or smaller."); return; }
              setFile(f ?? null);
            }}
          />
        </label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="c-notes">Notes</Label>
        <Textarea id="c-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Annual listing fee paid on signing" />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone} className="cursor-pointer">Cancel</Button>
        <Button size="sm" disabled={saving} onClick={() => void handleSave()} className="cursor-pointer bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]">
          {saving ? "Saving…" : initial ? "Save changes" : "Add contract"}
        </Button>
      </div>
    </div>
  );
}
