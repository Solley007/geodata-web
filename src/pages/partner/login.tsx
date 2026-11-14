import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Handshake, Shield, ArrowRight, Clock, XCircle,
  CheckCircle2, UserPlus
} from "lucide-react";
import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";

// ── After sign-in, check partner status and show appropriate state ────────────
function AuthenticatedView() {
  const navigate = useNavigate();
  const partner = useQuery(api.partners.getMyPartnerProfile, {});

  // Still loading
  if (partner === undefined) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Spinner className="size-6" />
        <p className="text-sm text-gray-500">Loading your account…</p>
      </div>
    );
  }

  // Approved — redirect to portal
  if (partner && partner.status === "approved") {
    return <AutoRedirect />;
  }

  // Pending approval
  if (partner && partner.status === "pending") {
    return (
      <div className="space-y-5 text-center py-4">
        <div className="w-14 h-14 rounded-full bg-yellow-50 flex items-center justify-center mx-auto">
          <Clock size={26} className="text-yellow-500" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Application Under Review</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Our team is reviewing your application and will get back to you within 24 hours. We'll notify you by email once approved.
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-700 text-left flex items-start gap-2">
          <Clock size={14} className="shrink-0 mt-0.5" />
          <span>Once approved, you can sign back in here to access your full partner dashboard.</span>
        </div>
        <Button variant="secondary" size="sm" asChild className="w-full cursor-pointer">
          <Link to="/">Return to Website</Link>
        </Button>
      </div>
    );
  }

  // Rejected
  if (partner && partner.status === "rejected") {
    return (
      <div className="space-y-5 text-center py-4">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <XCircle size={26} className="text-red-500" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Application Not Approved</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Unfortunately your application was not approved at this time. Please contact us for more information.
          </p>
        </div>
        <Button variant="secondary" size="sm" asChild className="w-full cursor-pointer">
          <Link to="/contact">Contact Us</Link>
        </Button>
      </div>
    );
  }

  // Not a partner yet
  return (
    <div className="space-y-5 text-center py-4">
      <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
        <Handshake size={26} className="text-[var(--brand)]" />
      </div>
      <div>
        <h3 className="font-bold text-gray-900 text-lg mb-1">You're Not a Partner Yet</h3>
        <p className="text-gray-500 text-sm leading-relaxed">
          Join our Partner Program to earn commissions by referring clients to Geodata World properties.
        </p>
      </div>

      {/* Benefits */}
      <div className="text-left space-y-2">
        {[
          "Earn commissions on every successful referral",
          "Access exclusive marketing & promo materials",
          "Track referrals & commissions in real time",
        ].map((b) => (
          <div key={b} className="flex items-start gap-2 text-sm text-gray-600">
            <CheckCircle2 size={15} className="text-[var(--brand)] shrink-0 mt-0.5" />
            <span>{b}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white cursor-pointer gap-2" asChild>
          <Link to="/partner/apply">
            <UserPlus size={15} /> Apply as External Partner
          </Link>
        </Button>
        <Button variant="secondary" size="sm" asChild className="w-full cursor-pointer">
          <Link to="/">Return to Website</Link>
        </Button>
      </div>
    </div>
  );
}

// Approved partner: auto-redirect with a brief message
function AutoRedirect() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/partner", { replace: true }); }, [navigate]);
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
        <CheckCircle2 size={24} className="text-green-500" />
      </div>
      <p className="font-semibold text-gray-800 text-sm">Welcome back!</p>
      <p className="text-gray-400 text-xs">Redirecting to your portal…</p>
      <Spinner className="size-5" />
    </div>
  );
}

export default function PartnerLoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

            {/* Header strip */}
            <div className="bg-[var(--brand)] px-6 py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                <Handshake size={26} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Partner Portal Login
              </h1>
              <p className="text-blue-200 text-sm mt-1">Geodata World Services Limited</p>
            </div>

            {/* Body */}
            <div className="px-6 py-8 space-y-5">

              <AuthLoading>
                <div className="flex justify-center py-6">
                  <Spinner className="size-6" />
                </div>
              </AuthLoading>

              <Unauthenticated>
                <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                  <Shield size={16} className="shrink-0 mt-0.5 text-[var(--brand)]" />
                  <p>Sign in with your email to access your partner dashboard, commissions, and promo materials.</p>
                </div>
                <SignInButton
                  signInText="Sign in to Partner Portal"
                  showIcon={false}
                  className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white h-11 rounded-xl font-medium text-sm shadow-md cursor-pointer"
                />
                <div className="text-center">
                  <p className="text-xs text-gray-400">
                    Not a partner yet?{" "}
                    <Link to="/partner/apply" className="text-[var(--brand)] underline hover:opacity-80">
                      Apply here <ArrowRight size={11} className="inline" />
                    </Link>
                  </p>
                </div>
              </Unauthenticated>

              <Authenticated>
                <AuthenticatedView />
              </Authenticated>

            </div>
          </div>

          <p className="text-xs text-gray-400 mt-5 text-center">
            <Link to="/" className="underline hover:text-gray-600">Return to website</Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
