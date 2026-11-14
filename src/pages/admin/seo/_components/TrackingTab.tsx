import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { SEO_TRACKING_KEY, parseTracking, validateTracking, type SeoTracking } from "@/lib/seo-settings.ts";

const FIELDS: { key: keyof SeoTracking; label: string; placeholder: string; hint: string }[] = [
  { key: "ga4Id", label: "Google Analytics ID", placeholder: "G-XXXXXXXXXX", hint: "Found in Google Analytics under Admin, Data streams." },
  { key: "gtmId", label: "Google Tag Manager ID (optional)", placeholder: "GTM-XXXXXXX", hint: "Only needed if your team manages tags in Tag Manager." },
  { key: "metaPixelId", label: "Meta Pixel ID (optional)", placeholder: "123456789012345", hint: "Found in Meta Events Manager. Numbers only." },
];

export default function TrackingTab({ raw }: { raw: string | null }) {
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [tracking, setTracking] = useState<SeoTracking>(() => parseTracking(raw));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const cleaned: SeoTracking = {
      ga4Id: tracking.ga4Id.trim(),
      gtmId: tracking.gtmId.trim(),
      metaPixelId: tracking.metaPixelId.trim(),
    };
    const error = validateTracking(cleaned);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      await upsert({ key: SEO_TRACKING_KEY, value: JSON.stringify(cleaned) });
      setTracking(cleaned);
      toast.success("Tracking saved. It applies to public pages on the next page load.");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-2xl">
      <p className="text-sm text-gray-500">
        Paste your tracking IDs and save. Tracking runs on public pages only, never inside this admin area. Leave a box empty to turn it off.
      </p>

      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={f.key}>{f.label}</Label>
          <Input id={f.key} value={tracking[f.key]} placeholder={f.placeholder} onChange={(e) => setTracking({ ...tracking, [f.key]: e.target.value })} />
          <p className="text-xs text-gray-400">{f.hint}</p>
        </div>
      ))}

      <Button onClick={save} disabled={saving} className="cursor-pointer">
        {saving && <Spinner />} Save tracking
      </Button>
    </div>
  );
}
