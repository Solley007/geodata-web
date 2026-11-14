import { useState } from "react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  nameLabel: string;
  submitLabel: string;
  onSubmit: (name: string, description: string) => Promise<void>;
};

// Shared small form for creating a team or a channel
export default function NameDialog({ open, onOpenChange, title, nameLabel, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error("Please enter a name");
    setBusy(true);
    try {
      await onSubmit(name, description);
      setName(""); setDescription(""); onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="nd-name">{nameLabel}</Label><Input id="nd-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="nd-desc">Description (optional)</Label><Textarea id="nd-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <Button onClick={submit} disabled={busy} className="w-full cursor-pointer">{submitLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
