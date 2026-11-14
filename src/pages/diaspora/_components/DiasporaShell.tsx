import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Globe2, ArrowLeft } from "lucide-react";
import Navbar from "../../home/_components/Navbar.tsx";
import Footer from "../../home/_components/Footer.tsx";
import WhatsAppButton from "../../home/_components/WhatsAppButton.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";

/**
 * Shared chrome + master-toggle gate for every public Diaspora page. Always
 * checks `feature.getFeatureStatus` first — if the whole platform is OFF,
 * the entire /diaspora/* tree shows this friendly disabled state instead of
 * erroring, while the rest of the existing site stays completely unaffected.
 *
 * Also records a QR/campaign-link scan once, best-effort, whenever a
 * `?ref=CODE` param is present on any /diaspora/* page — never blocks
 * rendering and silently no-ops for a stale/unknown code.
 */
export default function DiasporaShell({ children }: { children: ReactNode }) {
  const status = useQuery(api.diaspora.feature.getFeatureStatus, {});
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const recordScan = useMutation(api.diaspora.qr.recordQrScan);
  const refCode = searchParams.get("ref");

  useEffect(() => {
    if (!refCode) return;
    recordScan({ code: refCode, landingPath: location.pathname }).catch(() => {
      // Best-effort analytics only — never surface an error to the visitor.
    });
    // Only fire once per landing (mount), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {status === undefined ? (
        <div className="max-w-4xl mx-auto px-6 py-24">
          <Skeleton className="h-10 w-2/3 mb-4" />
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-5 w-5/6" />
        </div>
      ) : !status.enabled ? (
        <DiasporaUnavailable />
      ) : (
        children
      )}
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

function DiasporaUnavailable() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-28 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center mx-auto mb-6">
        <Globe2 size={28} className="text-[var(--brand)]" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
        The Diaspora Investment &amp; Property Platform is temporarily unavailable
      </h1>
      <p className="text-gray-500 mb-8">
        We&apos;re making some updates. In the meantime, browse our full property catalogue or get in touch — our team is always happy to help.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button variant="secondary" className="border border-gray-200" asChild>
          <Link to="/"><ArrowLeft size={14} className="mr-1.5" /> Back Home</Link>
        </Button>
        <Button className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white" asChild>
          <Link to="/contact">Contact Us</Link>
        </Button>
      </div>
    </div>
  );
}
