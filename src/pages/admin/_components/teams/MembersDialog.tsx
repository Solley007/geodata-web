import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Crown, LogOut, UserMinus, UserPlus } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";

type Member = { userId: Id<"users">; role: "owner" | "member"; name: string; email: string | null };
type Props = { open: boolean; onOpenChange: (o: boolean) => void; teamId: Id<"teams">; members: Member[]; isOwner: boolean; myUserId: string };

export default function MembersDialog({ open, onOpenChange, teamId, members, isOwner, myUserId }: Props) {
  const [search, setSearch] = useState("");
  const [debounced] = useDebounce(search, 250);
  const staff = useQuery(api.teams.teams.searchStaff, open && isOwner ? { search: debounced } : "skip");
  const add = useMutation(api.teams.teams.addMember);
  const remove = useMutation(api.teams.teams.removeMember);
  const setRole = useMutation(api.teams.teams.setMemberRole);

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); } catch (e) { toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Something went wrong"); }
  };
  const memberIds = new Set(members.map((m) => m.userId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Team members ({members.length})</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-2 rounded-lg border p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}</p>
                {m.email && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
              </div>
              {m.role === "owner" && <Badge className="gap-1"><Crown size={10} /> Owner</Badge>}
              {isOwner && (
                <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => run(() => setRole({ teamId, userId: m.userId, role: m.role === "owner" ? "member" : "owner" }))}>
                  {m.role === "owner" ? "Make member" : "Make owner"}
                </Button>
              )}
              {(isOwner && m.userId !== myUserId) && (
                <Button size="icon" variant="ghost" className="cursor-pointer text-red-500" aria-label="Remove" onClick={() => run(() => remove({ teamId, userId: m.userId }))}><UserMinus size={15} /></Button>
              )}
              {m.userId === myUserId && (
                <Button size="sm" variant="ghost" className="cursor-pointer text-red-500" onClick={() => run(async () => { await remove({ teamId, userId: m.userId }); onOpenChange(false); })}><LogOut size={14} /> Leave</Button>
              )}
            </div>
          ))}
        </div>
        {isOwner && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-semibold">Add people</p>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff by name or email" />
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {staff?.filter((s) => !memberIds.has(s._id)).map((s) => (
                <div key={s._id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm">{s.name}</p>{s.email && <p className="truncate text-xs text-muted-foreground">{s.email}</p>}</div>
                  <Button size="sm" className="cursor-pointer" onClick={() => run(() => add({ teamId, userId: s._id }))}><UserPlus size={14} /> Add</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
