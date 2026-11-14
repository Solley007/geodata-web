import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

// Email code sign-in (Convex Auth, provider "email-code" in convex/auth.ts).
export default function SignInPage() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const { isAuthenticated } = useConvexAuth();

  // The session takes a moment to become active after the code is accepted,
  // so wait for it before moving on.
  useEffect(() => {
    if (!verified) return;
    if (isAuthenticated) {
      navigate(`/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`, { replace: true });
      return;
    }
    const t = setTimeout(() => {
      setVerified(false);
      setBusy(false);
      setError("Your code was accepted but we couldn't start your session. Please refresh the page and try again.");
    }, 15000);
    return () => clearTimeout(t);
  }, [verified, isAuthenticated, navigate, next]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(clean)) {
      setError("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signIn("email-code", { email: clean });
      setEmail(clean);
      setCode("");
      setStep("code");
    } catch {
      setError("We couldn't send a code just now. Please try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    if (value.length !== 6) return;
    setBusy(true);
    setError("");
    try {
      await signIn("email-code", { email, code: value });
      setVerified(true);
    } catch {
      setError("That code didn't work. Check the latest email from us, or send a new code.");
      setCode("");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-[var(--brand)] px-6 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <Mail size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Sign in
          </h1>
          <p className="text-blue-200 text-sm mt-1">Geodata World Services Limited</p>
        </div>

        <div className="px-6 py-8 space-y-5">
          {step === "email" ? (
            <form onSubmit={sendCode} className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter your email and we'll send you a 6-digit code. No password needed.
              </p>
              <Input
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                autoFocus
              />
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white h-11 rounded-xl font-medium text-sm cursor-pointer"
              >
                {busy ? <Spinner className="size-4" /> : "Send me a code"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                We sent a code to <span className="font-medium text-gray-900">{email}</span>. It expires in 15 minutes.
              </p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    void verify(v);
                  }}
                  disabled={busy}
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {busy && (
                <div className="flex justify-center">
                  <Spinner className="size-5" />
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setError(""); }}
                  className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Change email
                </button>
                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={busy}
                  className="text-[var(--brand)] hover:underline cursor-pointer"
                >
                  Send a new code
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        <Link to="/" className="underline hover:text-gray-600">Return to website</Link>
      </p>
    </div>
  );
}
