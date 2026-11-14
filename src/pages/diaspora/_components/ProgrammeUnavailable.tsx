import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

/**
 * Shown on a single programme page (/diaspora/:key) when that specific
 * programme is disabled or hidden — distinct from the master-toggle-off
 * state in DiasporaShell, which covers the whole /diaspora/* tree.
 */
export default function ProgrammeUnavailable({ label }: { label: string }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
        <AlertCircle size={24} className="text-amber-500" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        {label} is currently unavailable
      </h1>
      <p className="text-gray-500 mb-7 text-sm">
        This programme isn&apos;t open to the public right now. Explore the other Diaspora programmes, or contact us directly and we&apos;ll point you in the right direction.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button variant="secondary" className="border border-gray-200" asChild>
          <Link to="/diaspora"><ArrowLeft size={14} className="mr-1.5" /> Back to Diaspora Hub</Link>
        </Button>
        <Button className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white" asChild>
          <Link to="/contact">Contact Us</Link>
        </Button>
      </div>
    </div>
  );
}
