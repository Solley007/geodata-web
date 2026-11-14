import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { ArrowLeft, UserRound } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";

const ADMIN_ROLES = new Set(["super_admin", "admin", "manager", "agent"]);

// Where the "Back" link goes depends on which dashboard the person normally uses
function homeFor(user: Doc<"users">, isPartner: boolean): { href: string; label: string } {
  if (user.role && ADMIN_ROLES.has(user.role)) return { href: "/admin", label: "Back to dashboard" };
  if (isPartner) return { href: "/partner", label: "Back to partner portal" };
  return { href: "/client", label: "Back to my portal" };
}

function ReadOnlyRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium capitalize text-right">{value || "—"}</span>
    </div>
  );
}

function ProfileForm({ user }: { user: Doc<"users"> }) {
  const navigate = useNavigate();
  const partner = useQuery(api.partners.getMyPartnerProfile, {});
  const update = useMutation(api.users.updateMyProfile);
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);
  const home = homeFor(user, partner?.status === "approved");

  const save = async (avatar?: string | null) => {
    setSaving(true);
    try {
      await update({ name, phone, ...(avatar !== undefined ? { avatar } : {}) });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 sm:p-8">
      <button onClick={() => navigate(home.href)} className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> {home.label}
      </button>
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground">Update your own details. Role and department are set by an administrator.</p>
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {user.avatar ? <img src={user.avatar} alt={user.name ?? "Profile"} className="h-full w-full object-cover" /> : <UserRound size={28} className="text-muted-foreground" />}
          </div>
          <FileUploadButton
            label={user.avatar ? "Replace photo" : "Upload photo"}
            mediaType="image"
            onUpload={(_id, url) => { if (url) void save(url); }}
            onClear={user.avatar ? () => void save(null) : undefined}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Full name</Label>
          <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-phone">Phone number</Label>
          <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" />
        </div>
        <Button onClick={() => void save()} disabled={saving} className="cursor-pointer">{saving ? "Saving…" : "Save changes"}</Button>
      </div>

      <div className="divide-y rounded-2xl border bg-card px-6 py-2">
        <ReadOnlyRow label="Email" value={user.email} />
        <ReadOnlyRow label="Role" value={user.role?.replace("_", " ")} />
        <ReadOnlyRow label="Department" value={user.department} />
      </div>
    </div>
  );
}

function ProfileLoader() {
  const user = useQuery(api.users.getCurrentUser);
  if (user === undefined) return <div className="mx-auto max-w-xl space-y-4 p-8"><Skeleton className="h-8 w-40" /><Skeleton className="h-64 w-full" /></div>;
  if (user === null) return <p className="p-8 text-center text-sm text-muted-foreground">Your account is still being set up. Please refresh in a moment.</p>;
  return <ProfileForm user={user} />;
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <AuthLoading><div className="mx-auto max-w-xl p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated>
        <div className="mx-auto max-w-sm space-y-4 p-12 text-center">
          <p className="text-sm text-muted-foreground">Please sign in to manage your profile.</p>
          <SignInButton />
          <Link to="/" className="block text-xs text-muted-foreground underline">Back to home</Link>
        </div>
      </Unauthenticated>
      <Authenticated><ProfileLoader /></Authenticated>
    </div>
  );
}
