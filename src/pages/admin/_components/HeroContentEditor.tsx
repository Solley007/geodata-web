import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import {
  HERO_DEFAULTS, HERO_SETTINGS_KEY, parseHeroContent, type HeroContent,
} from "@/pages/group/_lib/hero-content.ts";

const FIELDS: { key: keyof HeroContent; label: string; multiline?: boolean; half?: boolean }[] = [
  { key: "badge", label: "Badge (small label above heading)" },
  { key: "headingLine1", label: "Heading - first line", half: true },
  { key: "headingHighlight", label: "Heading - highlighted part", half: true },
  { key: "headingRest", label: "Heading - rest of line" },
  { key: "description", label: "Description", multiline: true },
  { key: "primaryButtonLabel", label: "Primary button label", half: true },
  { key: "secondaryButtonLabel", label: "Secondary button label", half: true },
];

// Edits the hero section shown at the top of the public World Corporate
// Directory page. Stored in the existing siteSettings table.
function HeroForm({ initial }: { initial: HeroContent }) {
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [form, setForm] = useState<HeroContent>(initial);
  const [saving, setSaving] = useState(false);

  const save = async (value: HeroContent, message: string) => {
    setSaving(true);
    try {
      await upsert({ key: HERO_SETTINGS_KEY, value: JSON.stringify(value) });
      toast.success(message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save hero content");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (FIELDS.some((f) => !form[f.key].trim())) {
      toast.error("All hero fields are required");
      return;
    }
    void save(form, "Hero content updated");
  };

  const handleReset = () => {
    setForm(HERO_DEFAULTS);
    void save(HERO_DEFAULTS, "Hero content reset to default");
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--brand)]" /> Hero Slide Content
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">The headline area at the very top of the public directory page.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.half ? "col-span-2 sm:col-span-1" : "col-span-2"}>
            <Label className="text-xs font-semibold mb-1 block">{f.label}</Label>
            {f.multiline ? (
              <Textarea rows={4} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            ) : (
              <Input value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button type="button" onClick={handleReset} disabled={saving} className="bg-gray-100 hover:bg-gray-200 text-gray-700 gap-1.5 cursor-pointer">
          <RotateCcw size={13} /> Reset to default
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white cursor-pointer">
          {saving ? "Saving…" : "Save Hero Content"}
        </Button>
      </div>
    </div>
  );
}

export default function HeroContentEditor() {
  const raw = useQuery(api.cms.getSiteSettings, { key: HERO_SETTINGS_KEY });
  if (raw === undefined) return <Skeleton className="h-64 w-full rounded-2xl" />;
  // Keyed on the loaded value so the form initialises once with saved content
  return <HeroForm key={raw ?? "default"} initial={parseHeroContent(raw)} />;
}
