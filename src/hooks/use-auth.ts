import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api.js";

// Same shape the pages used with Hercules auth: isAuthenticated, isLoading,
// user.profile.{name,email}, signin(), signout().
export function useAuth() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const me = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");

  const signin = useCallback(async () => {
    const next = location.pathname + location.search;
    navigate(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }, [navigate, location.pathname, location.search]);

  const signout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const user = me ? { profile: { name: me.name, email: me.email } } : null;
  return { isAuthenticated, isLoading, user, signin, signout, error: undefined as Error | undefined };
}

export function useUser() {
  return useAuth().user;
}
