import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion } from "motion/react";
import { format, parseISO } from "date-fns";
import { Stamp, CheckCircle, XCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import Navbar from "./home/_components/Navbar.tsx";
import Footer from "./home/_components/Footer.tsx";

// ══════════════════════════════════════════════════════════════════════════
// PUBLIC E-STAMP VERIFICATION
//
// Verifies an official GEODATA WORLD SERVICES LIMITED e-stamp by its public
// reference (e.g. "GWSL-2026-00124") alone. No authentication required.
// Deliberately shows only the small whitelist the backend query returns —
// never document content, client/transaction linkage, or staff identities.
// ══════════════════════════════════════════════════════════════════════════

const STAMP_STATUS_LABEL: Record<string, string> = {
  applied: "Applied",
  revoked: "Revoked",
  superseded: "Superseded",
  invalid: "Invalid",
};

export default function EStampVerify() {
  const [ref, setRef] = useState("");
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const result = useQuery(api.estamp.verifyStampByRef, submittedRef ? { stampRef: submittedRef } : "skip");

  const handleVerify = () => {
    if (!ref.trim()) return;
    setSubmittedRef(ref.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[var(--brand)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Stamp size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              E-Stamp Verification
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              Verify the authenticity of an official GEODATA WORLD SERVICES LIMITED e-stamp by its reference number.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">E-Stamp Reference</Label>
              <Input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
                placeholder="e.g. GWSL-2026-00124"
                className="font-mono"
              />
            </div>
            <Button
              onClick={handleVerify}
              disabled={!ref.trim() || result === undefined && submittedRef !== null}
              className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white h-11 text-sm gap-2"
            >
              <ShieldCheck size={16} /> Verify E-Stamp
            </Button>
          </div>

          {submittedRef && result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-5 rounded-2xl p-5 border ${result.valid ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
            >
              <div className="flex items-center gap-3 mb-3">
                {result.valid ? (
                  <CheckCircle size={22} className="text-green-600 shrink-0" />
                ) : (
                  <XCircle size={22} className="text-red-500 shrink-0" />
                )}
                <span className={`font-bold text-base ${result.valid ? "text-green-800" : "text-red-700"}`}>
                  {result.valid ? "E-Stamp Verified ✓" : "Not a Valid E-Stamp"}
                </span>
              </div>
              <p className={`text-sm ${result.valid ? "text-green-700" : "text-red-600"}`}>{result.message}</p>

              {result.status && (
                <div className="mt-4 space-y-1.5 bg-white rounded-xl p-4 border border-green-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Reference</span>
                    <span className="font-medium text-gray-900 font-mono">{result.stampRef}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className="font-medium text-gray-900">{STAMP_STATUS_LABEL[result.status] ?? result.status}</span>
                  </div>
                  {result.docType && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Document Category</span>
                      <span className="font-medium text-gray-900 capitalize">{result.docType.replace(/_/g, " ")}</span>
                    </div>
                  )}
                  {result.appliedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Stamped On</span>
                      <span className="font-medium text-gray-900">{format(parseISO(result.appliedAt), "dd MMM yyyy, HH:mm")}</span>
                    </div>
                  )}
                  {result.revokedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Revoked On</span>
                      <span className="font-medium text-gray-900">{format(parseISO(result.revokedAt), "dd MMM yyyy, HH:mm")}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            Only e-stamps issued by GEODATA WORLD SERVICES LIMITED can be verified here.
            <br />Contact us at <strong>hello@geodata.com.ng</strong> for disputes.
          </p>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
