import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { PartnerProfileContent } from "@/convex/schema/partnerProfile.ts";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import {
  PARTNER_CATEGORY_OPTIONS,
  type PartnerCategory,
  type PresentedProfileContent,
} from "@/lib/partner-showcase.ts";
import LogoUpload from "./logo-upload.tsx";

type Props = {
  initial: PresentedProfileContent | null;
  defaultName: string;
  submitLabel: string;
  onSubmit: (content: PartnerProfileContent) => Promise<void>;
};

type LogoState = { id?: Id<"_storage">; url: string | null };

export default function ProfileForm({ initial, defaultName, submitLabel, onSubmit }: Props) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? defaultName);
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [category, setCategory] = useState<PartnerCategory>(initial?.category ?? "agency");
  const [logo, setLogo] = useState<LogoState>({ id: initial?.logoStorageId, url: initial?.logoUrl ?? null });
  const [logoLight, setLogoLight] = useState<LogoState>({ id: initial?.logoLightStorageId, url: initial?.logoLightUrl ?? null });
  const [saving, setSaving] = useState(false);

  const nameError = displayName.trim().length < 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameError) return;
    setSaving(true);
    try {
      await onSubmit({
        displayName,
        tagline: tagline || undefined,
        description: description || undefined,
        website: website || undefined,
        country: country || undefined,
        category,
        logoStorageId: logo.id,
        logoLightStorageId: logoLight.id,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <LogoUpload
          label="Main logo"
          hint="Colour version for light backgrounds. PNG or SVG with a clear background."
          previewUrl={logo.url}
          onUploaded={(id, url) => setLogo({ id, url })}
          onClear={() => setLogo({ url: null })}
        />
        <LogoUpload
          dark
          label="White logo (optional)"
          hint="Used on dark sections such as the Diaspora page."
          previewUrl={logoLight.url}
          onUploaded={(id, url) => setLogoLight({ id, url })}
          onClear={() => setLogoLight({ url: null })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sp-name">Display name *</Label>
          <Input id="sp-name" value={displayName} maxLength={80} onChange={(e) => setDisplayName(e.target.value)} placeholder="Adeyemi Realty Ltd" />
          {nameError && <p className="text-xs text-red-500">Display name required</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Category *</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as PartnerCategory)}>
            <SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PARTNER_CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="cursor-pointer">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sp-tagline">Tagline</Label>
        <Input id="sp-tagline" value={tagline} maxLength={120} onChange={(e) => setTagline(e.target.value)} placeholder="Helping UK families own homes in Abuja" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sp-desc">About</Label>
        <Textarea id="sp-desc" value={description} maxLength={1200} rows={4} onChange={(e) => setDescription(e.target.value)} placeholder="A short introduction shown on your partner profile page." />
        <p className="text-right text-xs text-gray-400">{description.length}/1200</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sp-web">Website</Label>
          <Input id="sp-web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sp-country">Country</Label>
          <Input id="sp-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United Kingdom" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving || nameError} className="cursor-pointer gap-1.5 bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
