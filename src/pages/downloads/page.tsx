import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { FileText, Search } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useSeo } from "@/hooks/use-seo.ts";
import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { DocCard, DocViewer as Viewer } from "@/components/public-documents/doc-cards.tsx";
import { downloadFile, type PublicDoc } from "@/lib/public-documents.ts";

const BASE_PATH = "/downloads";

export default function DownloadsPage() {
  useSeo({
    title: "Downloads – Company Documents | Geodata",
    description: "Company profile, brochures, price lists, estate maps and policies from Geodata World Services.",
    canonicalPath: "/downloads",
  });
  const docs = useQuery(api.publicDocuments.listPublic, {}) as PublicDoc[] | undefined;
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl space-y-8 px-6 pb-20 pt-24 sm:px-10">
        <div className="text-center">
          <span className="mb-2 block text-sm font-semibold uppercase tracking-widest text-[var(--brand)]">Resources</span>
          <h1 className="text-3xl font-bold lg:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>Company Documents</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">View, download and share our brochures, price lists, maps and policies.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents" className="pl-9" />
          </div>
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

        {docs === undefined ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><FileText /></EmptyMedia>
              <EmptyTitle>{docs.length === 0 ? "No documents yet" : "No matching documents"}</EmptyTitle>
              <EmptyDescription>{docs.length === 0 ? "Documents will appear here once they are published." : "Try a different search or category."}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => <DocCard key={d._id} doc={d} basePath={BASE_PATH} onView={() => view(d)} onDownload={() => download(d)} />)}
          </div>
        )}
      </main>
      <Viewer doc={viewing} basePath={BASE_PATH} onClose={() => setParams({})} onDownload={() => viewing && download(viewing)} />
      <Footer />
    </div>
  );
}
