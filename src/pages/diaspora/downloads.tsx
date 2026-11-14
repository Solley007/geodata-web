import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, FileText, MessageCircle, Search } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useSeo } from "@/hooks/use-seo.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { DocCard, DocViewer } from "@/components/public-documents/doc-cards.tsx";
import { downloadFile, type PublicDoc } from "@/lib/public-documents.ts";
import DiasporaShell from "./_components/DiasporaShell.tsx";

const BASE_PATH = "/diaspora/downloads";

/** Documents an admin has selected for the Diaspora platform (Admin → Diaspora → Downloads). */
export default function DiasporaDownloadsPage() {
  useSeo({
    title: "Diaspora Downloads – Brochures & Price Schedules | Geodata",
    description: "Brochures, price schedules, forms and guides for Nigerians abroad buying or investing in Southern Bridge City, Abuja.",
    canonicalPath: BASE_PATH,
  });
  const docs = useQuery(api.publicDocuments.listDiaspora, {}) as PublicDoc[] | undefined;
  const record = useMutation(api.publicDocuments.recordEvent);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const openId = params.get("doc");
  const viewing = docs?.find((d) => d._id === openId && !d.locked) ?? null;

  const categories = useMemo(() => Array.from(new Set((docs ?? []).map((d) => d.category))), [docs]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (docs ?? []).filter((d) =>
      (category === "all" || d.category === category) &&
      (!q || d.title.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q)));
  }, [docs, search, category]);

  const view = (d: PublicDoc) => {
    setParams({ doc: d._id });
    void record({ documentId: d._id as Id<"publicDocuments">, event: "view" });
  };
  const download = (d: PublicDoc) => {
    if (!d.fileUrl) return;
    void record({ documentId: d._id as Id<"publicDocuments">, event: "download" });
    void downloadFile(d.fileUrl, d.fileName);
  };

  return (
    <DiasporaShell>
      <section className="bg-gradient-to-br from-[#061433] via-[#0a2257] to-emerald-900 px-6 pb-14 pt-28 text-center">
        <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-amber-300">Diaspora Downloads</span>
        <h1 className="text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>Take the details with you</h1>
        <p className="mx-auto mt-3 max-w-xl text-blue-100/90">Brochures, price schedules and forms to read in your own time or share with family.</p>
      </section>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-12 sm:px-10">
        <Button variant="ghost" asChild className="cursor-pointer">
          <Link to="/diaspora"><ArrowLeft size={14} /> Back to Diaspora</Link>
        </Button>

        {docs !== undefined && docs.length > 0 && (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents" className="pl-9" />
            </div>
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {["all", ...categories].map((c) => (
                  <Button key={c} size="sm" variant={category === c ? "default" : "secondary"} onClick={() => setCategory(c)} className="cursor-pointer">
                    {c === "all" ? "All" : c}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}

        {docs === undefined ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><FileText /></EmptyMedia>
              <EmptyTitle>{docs.length === 0 ? "Documents coming soon" : "No matching documents"}</EmptyTitle>
              <EmptyDescription>
                {docs.length === 0 ? "Our Diaspora Desk can send you the brochure and price schedule directly." : "Try a different search or category."}
              </EmptyDescription>
            </EmptyHeader>
            {docs.length === 0 && (
              <EmptyContent>
                <Button size="sm" asChild className="cursor-pointer bg-[#25D366] text-white hover:bg-[#1ebe5b]">
                  <a href="https://wa.me/2347047620492" target="_blank" rel="noopener noreferrer"><MessageCircle size={14} /> Ask on WhatsApp</a>
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => <DocCard key={d._id} doc={d} basePath={BASE_PATH} onView={() => view(d)} onDownload={() => download(d)} />)}
          </div>
        )}
      </main>
      <DocViewer doc={viewing} basePath={BASE_PATH} onClose={() => setParams({})} onDownload={() => viewing && download(viewing)} />
    </DiasporaShell>
  );
}
