import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Button } from "@/components/ui/button.tsx";

// Runs after the sign-in page accepts a code: syncs the user record, then
// sends them back where they came from, or to their role-based dashboard.
export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (isLoading || started.current) return;
    if (!isAuthenticated) {
      navigate("/auth/sign-in", { replace: true });
      return;
    }
    started.current = true;
    updateCurrentUser()
      .then(() => {
        const next = params.get("next") ?? "";
        const safe = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/auth") && next !== "/";
        navigate(safe ? next : "/auth/redirect", { replace: true });
      })
      .catch((e: unknown) => {
        console.error("Sign-in sync failed", e);
        setError("We signed you in but couldn't load your account. Please try again.");
        started.current = false;
      });
  }, [isLoading, isAuthenticated, updateCurrentUser, navigate, params]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-svh gap-6 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-destructive font-medium">Something went wrong</p>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate("/", { replace: true })}>
            Return home
          </Button>
          <Button onClick={() => setError("")}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-svh gap-4">
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">Signing you in...</p>
    </div>
  );
}
