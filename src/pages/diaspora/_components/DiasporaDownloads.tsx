import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import { ArrowRight, Download, FileText, FolderDown, Lock } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { downloadFile, fileExtension, type PublicDoc } from "@/lib/public-documents.ts";

const PREVIEW_COUNT = 6;

/**
 * Preview of the documents selected in Admin → Diaspora → Downloads, with a
 * clear button to the full /diaspora/downloads page.
 */
export default function DiasporaDownloads() {
  const docs = useQuery(api.publicDocuments.listDiaspora, {}) as PublicDoc[] | undefined;
  const record = useMutation(api.publicDocuments.recordEvent);

  const download = (d: PublicDoc) => {
    if (!d.fileUrl) return;
    void record({ documentId: d._id as Id<"publicDocuments">, event: "download" });
    void downloadFile(d.fileUrl, d.fileName);
  };

  return (
    <section id="downloads" className="py-20 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <span className="text-[var(--brand)] text-xs font-bold tracking-widest uppercase block mb-3">Downloads</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Take the details with you</h2>
            <p className="text-gray-500 mt-2">Brochures, price schedules and forms to read in your own time or share with family.</p>
          </div>
          <Button size="lg" asChild className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 cursor-pointer shrink-0">
            <Link to="/diaspora/downloads"><FolderDown size={17} /> View all downloads</Link>
          </Button>
        </div>

        {docs === undefined ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Brochures and price schedules will appear here soon. Open the downloads page or message the Diaspora Desk to receive them now.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {docs.slice(0, PREVIEW_COUNT).map((d, i) => (
              <motion.div
                key={d._id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
                className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
              >
                <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-amber-50 text-amber-600 flex items-center justify-center">
                  {d.coverUrl ? <img src={d.coverUrl} alt="" className="w-full h-full object-cover" /> : <FileText size={22} />}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/diaspora/downloads?doc=${d._id}`} className="font-semibold text-gray-900 text-sm truncate block hover:underline cursor-pointer">{d.title}</Link>
                  <p className="text-xs text-gray-400 uppercase mt-0.5">{d.category} · {fileExtension(d.fileName) || "file"}</p>
                </div>
                {d.locked ? (
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] text-gray-400 flex items-center gap-1"><Lock size={10} /> Sign in</span>
                    <SignInButton />
                  </div>
                ) : (
                  <Button size="sm" onClick={() => download(d)} className="shrink-0 gap-1.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white cursor-pointer">
                    <Download size={14} /> Download
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {docs !== undefined && docs.length > PREVIEW_COUNT && (
          <div className="text-center mt-8">
            <Link to="/diaspora/downloads" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand)] hover:underline cursor-pointer">
              See all {docs.length} documents <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
