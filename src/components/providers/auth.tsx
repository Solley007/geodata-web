// Sign-in state lives in ConvexAuthProvider (see convex.tsx). Kept so the
// provider tree in default.tsx stays the same.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
