import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Save, Home, TrendingUp, Handshake, Users, Building } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import type { FaqEntry, ProgrammeContent } from "@/convex/diaspora/content.ts";

/**
 * Admin CMS editor for Diaspora hub + programme hero copy and per-programme
 * FAQs. Stored via `diaspora.content` (a `siteSettings` JSON blob, same
 * pattern `cms.ts` already uses for `categories`) — never a bespoke table.
 */

type ProgrammeKey = "own" | "invest" | "partner" | "refer" | "corporate";

const PROGRAMME_TABS: Array<{ key: ProgrammeKey; label: string; icon: React.ElementType }> = [
  { key: "own", label: "Own", icon: Home },
  { key: "invest", label: "Invest", icon: TrendingUp },
  { key: "partner", label: "Partner", icon: Handshake },
  { key: "refer", label: "Refer", icon: Users },
  { key: "corporate", label: "Corporate", icon: Building },
];

export default function DiasporaContentPanel() {
  const content = useQuery(api.diaspora.content.getContent, {});

  if (content === undefined) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2"><FileText size={18} className="text-[var(--brand)]" /> CMS Content</h2>
        <p className="text-sm text-gray-500 mt-0.5">Edit the hub and programme hero copy, plus per-programme FAQs, without any code changes.</p>
      </div>

      <Tabs defaultValue="hub" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="hub" className="cursor-pointer">Hub</TabsTrigger>
          {PROGRAMME_TABS.map((p) => (
            <TabsTrigger key={p.key} value={p.key} className="cursor-pointer gap-1.5"><p.icon size={13} /> {p.label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="hub" className="mt-4">
          <HubContentForm hub={content.hub} />
        </TabsContent>
        {PROGRAMME_TABS.map((p) => (
          <TabsContent key={p.key} value={p.key} className="mt-4">
            <ProgrammeContentForm programmeKey={p.key} content={content.programmes[p.key]} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function HubContentForm({ hub }: { hub: { heroHeadline: string; heroSubheadline: string } }) {
  const updateContent = useMutation(api.diaspora.content.updateContent);
  const [heroHeadline, setHeroHeadline] = useState(hub.heroHeadline);
  const [heroSubheadline, setHeroSubheadline] = useState(hub.heroSubheadline);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateContent({ hub: { heroHeadline: heroHeadline.trim(), heroSubheadline: heroSubheadline.trim() } });
      toast.success("Hub content saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="hub-headline">Hero Headline (optional — leave blank for the default)</Label>
        <Input id="hub-headline" placeholder="Own. Invest. Develop. Partner. From Anywhere." value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hub-sub">Hero Sub-headline (optional)</Label>
        <Textarea id="hub-sub" rows={3} placeholder="Wherever you are in the world, connect with real Nigerian property, investment, development and corporate opportunities." value={heroSubheadline} onChange={(e) => setHeroSubheadline(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="cursor-pointer gap-2"><Save size={14} /> {saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}

function ProgrammeContentForm({ programmeKey, content }: { programmeKey: ProgrammeKey; content: ProgrammeContent }) {
  const updateContent = useMutation(api.diaspora.content.updateContent);
  const [heroHeadline, setHeroHeadline] = useState(content.heroHeadline);
  const [heroSubheadline, setHeroSubheadline] = useState(content.heroSubheadline);
  const [faqs, setFaqs] = useState<FaqEntry[]>(content.faqs);
  const [saving, setSaving] = useState(false);

  const addFaq = () => setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  const removeFaq = (index: number) => setFaqs((prev) => prev.filter((_, i) => i !== index));
  const updateFaq = (index: number, field: keyof FaqEntry, value: string) => {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  };

  const handleSave = async () => {
    const validFaqs = faqs.filter((f) => f.question.trim() && f.answer.trim());
    setSaving(true);
    try {
      await updateContent({
        programmeKey,
        programmeContent: { heroHeadline: heroHeadline.trim(), heroSubheadline: heroSubheadline.trim(), faqs: validFaqs },
      });
      toast.success("Programme content saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor={`${programmeKey}-headline`}>Hero Headline Override (optional — leave blank to use the programme's default label)</Label>
        <Input id={`${programmeKey}-headline`} value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${programmeKey}-sub`}>Hero Sub-headline Override (optional)</Label>
        <Textarea id={`${programmeKey}-sub`} rows={2} value={heroSubheadline} onChange={(e) => setHeroSubheadline(e.target.value)} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Frequently Asked Questions</Label>
          <Button size="sm" variant="secondary" onClick={addFaq} className="cursor-pointer gap-1.5 h-8 text-xs"><Plus size={13} /> Add FAQ</Button>
        </div>
        {faqs.length === 0 ? (
          <p className="text-xs text-gray-400">No FAQs yet for this programme.</p>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Input placeholder="Question" value={faq.question} onChange={(e) => updateFaq(i, "question", e.target.value)} />
                  <button onClick={() => removeFaq(i)} className="text-gray-400 hover:text-red-600 cursor-pointer shrink-0"><Trash2 size={15} /></button>
                </div>
                <Textarea placeholder="Answer" rows={2} value={faq.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="cursor-pointer gap-2"><Save size={14} /> {saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
