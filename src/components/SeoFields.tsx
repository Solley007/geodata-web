import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";
import { TITLE_MAX, DESCRIPTION_MAX } from "@/lib/seo-settings.ts";

type SeoFieldsProps = {
  title: string;
  description: string;
  /** Text used by the public page when a field is left empty, shown as the placeholder. */
  fallbackTitle: string;
  fallbackDescription: string;
  /** Public address of the page, e.g. "/news/my-article", for the Google preview. */
  path: string;
  onChange: (patch: { seoTitle?: string; seoDescription?: string }) => void;
};

function Counter({ value, max }: { value: number; max: number }) {
  return <span className={cn("text-xs", value > max ? "text-red-600 font-medium" : "text-gray-400")}>{value}/{max}</span>;
}

/** "Search appearance" editor shared by the property and news article forms. */
export default function SeoFields({ title, description, fallbackTitle, fallbackDescription, path, onChange }: SeoFieldsProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Search appearance (SEO)</h3>
        <p className="text-xs text-gray-500">How this page looks on Google. Leave empty to use the automatic text.</p>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between"><span className="text-xs font-semibold text-gray-600">SEO title</span><Counter value={title.length} max={TITLE_MAX} /></div>
        <Input value={title} placeholder={fallbackTitle} onChange={(e) => onChange({ seoTitle: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between"><span className="text-xs font-semibold text-gray-600">SEO description</span><Counter value={description.length} max={DESCRIPTION_MAX} /></div>
        <Textarea rows={2} value={description} placeholder={fallbackDescription} onChange={(e) => onChange({ seoDescription: e.target.value })} />
      </div>
      <div className="rounded-xl bg-white border border-gray-100 p-3 space-y-0.5">
        <p className="text-xs text-gray-500 truncate">geodata.com.ng{path}</p>
        <p className="text-base text-blue-700 truncate">{title || fallbackTitle}</p>
        <p className="text-sm text-gray-600 line-clamp-2">{description || fallbackDescription}</p>
      </div>
    </div>
  );
}
