import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils.ts";
import {
  SEO_PAGES_KEY,
  SEO_PAGE_LIST,
  TITLE_MAX,
  DESCRIPTION_MAX,
  parseSeoPages,
  type SeoPagesMap,
} from "@/lib/seo-settings.ts";

const SITE_HOST = "geodata.com.ng";

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={cn("text-xs", value > max ? "text-red-600 font-medium" : "text-gray-400")}>
      {value}/{max}
    </span>
  );
}

function GooglePreview({ path, title, description }: { path: string; title: string; description: string }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-0.5">
      <p className="text-xs text-gray-500 truncate">{SITE_HOST}{path === "/" ? "" : path}</p>
      <p className="text-base text-blue-700 truncate">{title || "Page title appears here"}</p>
      <p className="text-sm text-gray-600 line-clamp-2">{description || "Your description appears here."}</p>
    </div>
  );
}

export default function PagesTab({ raw }: { raw: string | null }) {
  const upsert = useMutation(api.cms.upsertSiteSettings);
  const [pages, setPages] = useState<SeoPagesMap>(() => parseSeoPages(raw));
  const [saving, setSaving] = useState(false);

  const update = (path: string, patch: Partial<{ title: string; description: string }>) => {
    const current = pages[path] ?? { title: "", description: "" };
    setPages({ ...pages, [path]: { ...current, ...patch } });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Drop empty rows so the coded defaults keep applying to those pages
      const cleaned = Object.fromEntries(
        Object.entries(pages).filter(([, p]) => p.title.trim() || p.description.trim()),
      );
      await upsert({ key: SEO_PAGES_KEY, value: JSON.stringify(cleaned) });
      toast.success("Page titles and descriptions saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Give each page its own title and description. Leave a field empty to keep the built-in text.
        Aim for titles under {TITLE_MAX} characters and descriptions under {DESCRIPTION_MAX}.
      </p>

      {SEO_PAGE_LIST.map(({ path, label }) => {
        const entry = pages[path] ?? { title: "", description: "" };
        return (
          <div key={path} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{label}</h2>
              <span className="text-xs text-gray-400">{path}</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-sm font-medium text-gray-700">Title</span><Counter value={entry.title.length} max={TITLE_MAX} /></div>
              <Input value={entry.title} placeholder="Built-in title is used" onChange={(e) => update(path, { title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-sm font-medium text-gray-700">Description</span><Counter value={entry.description.length} max={DESCRIPTION_MAX} /></div>
              <Textarea rows={2} value={entry.description} placeholder="Built-in description is used" onChange={(e) => update(path, { description: e.target.value })} />
            </div>
            {(entry.title || entry.description) && <GooglePreview path={path} title={entry.title} description={entry.description} />}
          </div>
        );
      })}

      <Button onClick={save} disabled={saving} className="cursor-pointer">
        {saving && <Spinner />} Save pages
      </Button>
    </div>
  );
}
