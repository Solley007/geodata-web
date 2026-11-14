import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion } from "motion/react";
import { QrCode, CheckCircle, XCircle, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import Navbar from "./home/_components/Navbar.tsx";
import Footer from "./home/_components/Footer.tsx";

export default function QRVerify() {
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; data?: Record<string, string>; message: string } | null>(null);

  const verifyQR = useAction(api.documents.verifyAllocationQR);

  const handleVerify = async () => {
    if (!input.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const res = await verifyQR({ qrPayload: input.trim() });
      setResult(res);
    } catch {
      setResult({ valid: false, message: "Verification failed. Please try again." });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[var(--brand)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <QrCode size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              Allocation Verifier
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              Verify the authenticity of any GEODATA WORLD SERVICES allocation document by pasting the QR code data below.
            </p>
          </div>

          {/* Input */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-1.5 block">QR Code Data / Allocation Reference</Label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Paste the QR code JSON here e.g. {"allocationNumber":"GWS-ALLOC-0001","issuer":"GEODATA WORLD SERVICES",...}'
                rows={4}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 font-mono"
              />
            </div>

            <Button
              onClick={handleVerify}
              disabled={scanning || !input.trim()}
              className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white h-11 text-sm gap-2"
            >
              {scanning ? <><Spinner />Verifying...</> : <><ScanLine size={16} />Verify Allocation</>}
            </Button>
          </div>

          {/* Result */}
          {result && (
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
                  {result.valid ? "Allocation Verified ✓" : "Verification Failed"}
                </span>
              </div>
              <p className={`text-sm ${result.valid ? "text-green-700" : "text-red-600"}`}>{result.message}</p>

              {result.valid && result.data && (
                <div className="mt-4 space-y-1.5 bg-white rounded-xl p-4 border border-green-100">
                  {Object.entries(result.data).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                      <span className="font-medium text-gray-900 text-right max-w-[55%] break-all">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            Only documents issued by GEODATA WORLD SERVICES LTD can be verified here.
            <br />Contact us at <strong>hello@geodata.com.ng</strong> for disputes.
          </p>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
