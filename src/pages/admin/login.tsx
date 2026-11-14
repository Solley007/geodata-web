import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Shield, Lock } from "lucide-react";

// ── After sign-in, redirect admins/staff to admin panel ──────────────────────
function AuthenticatedRedirect() {
  const navigate = useNavigate();
  const currentUser = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (currentUser === undefined) return; // still loading
    if (currentUser && (currentUser.role === "admin" || currentUser.role === "manager" || currentUser.role === "agent")) {
      navigate("/admin", { replace: true });
    } else if (currentUser) {
      // Signed in but not staff — redirect home
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Spinner className="size-6" />
      <p className="text-sm text-gray-500">Redirecting…</p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header strip */}
        <div className="bg-[var(--brand)] px-6 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <Lock size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Admin Access
          </h1>
          <p className="text-blue-200 text-sm mt-1">Geodata World Services Limited</p>
        </div>

        {/* Body */}
        <div className="px-6 py-8 space-y-5">
          <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
            <Shield size={16} className="shrink-0 mt-0.5 text-[var(--brand)]" />
            <p>This page is for authorised staff only. Sign in with your work email to continue.</p>
          </div>

          <AuthLoading>
            <div className="flex justify-center py-4">
              <Spinner className="size-6" />
            </div>
          </AuthLoading>

          <Unauthenticated>
            <SignInButton
              signInText="Sign in with email"
              showIcon={false}
              className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white h-11 rounded-xl font-medium text-sm shadow-md cursor-pointer"
            />
          </Unauthenticated>

          <Authenticated>
            <AuthenticatedRedirect />
          </Authenticated>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 mt-6 text-center">
        Not authorised? <a href="/" className="underline hover:text-gray-600">Return to website</a>
      </p>
    </div>
  );
}
