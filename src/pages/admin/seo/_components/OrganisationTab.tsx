import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { SEO_ORG_KEY, parseOrganisation, type SeoOrganisation } from "@/lib/seo-settings.ts";

export default function OrganisationTab({ raw }: { raw: string | null }) {
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [org, setOrg] = useState<SeoOrganisation>(() => parseOrganisation(raw));
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<SeoOrganisation>) => setOrg({ ...org, ...patch });

  const save = async () => {
    const socials = org.socials.map((s) => s.trim()).filter(Boolean);
    if (socials.some((s) => !/^https?:\/\//i.test(s))) {
      toast.error("Each social profile must start with https://");
      return;
    }
    setSaving(true);
    try {
      await upsert({ key: SEO_ORG_KEY, value: JSON.stringify({ ...org, socials }) });
      toast.success("Organisation details saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-2xl">
      <p className="text-sm text-gray-500">
        These details tell Google who you are. They are added to every page in a hidden form and help your brand search result.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="org-name">Company name</Label>
        <Input id="org-name" value={org.name} placeholder="Geodata World Services Limited" onChange={(e) => set({ name: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          {org.logoUrl && <img src={org.logoUrl} alt="Logo preview" width={64} height={64} className="h-16 w-16 rounded-xl border object-contain bg-white" />}
          <FileUploadButton
            mediaType="image"
            label={org.logoUrl ? "Replace logo" : "Upload logo"}
            onUpload={(_id, url) => set({ logoUrl: url ?? "" })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="org-phone">Phone</Label>
          <Input id="org-phone" value={org.phone} placeholder="+234 800 000 0000" onChange={(e) => set({ phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-email">Email</Label>
          <Input id="org-email" type="email" value={org.email} placeholder="info@example.com" onChange={(e) => set({ email: e.target.value })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-address">Address</Label>
        <Input id="org-address" value={org.address} placeholder="Office address, city, country" onChange={(e) => set({ address: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-socials">Social profile links (one per line)</Label>
        <Textarea
          id="org-socials"
          rows={4}
          value={org.socials.join("\n")}
          placeholder={"https://www.linkedin.com/company/your-company\nhttps://www.instagram.com/your-company"}
          onChange={(e) => set({ socials: e.target.value.split("\n") })}
        />
      </div>

      <Button onClick={save} disabled={saving} className="cursor-pointer">
        {saving && <Spinner />} Save organisation
      </Button>
    </div>
  );
}
