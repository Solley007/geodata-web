import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Hash, Plus, Users, UsersRound, Archive, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import ChannelView from "./_components/teams/ChannelView.tsx";
import ThreadPanel from "./_components/teams/ThreadPanel.tsx";
import MembersDialog from "./_components/teams/MembersDialog.tsx";
import NameDialog from "./_components/teams/NameDialog.tsx";
import type { MessageView } from "./_components/teams/MessageItem.tsx";

// Teams: project/department spaces with channels, files, @mentions, reactions and threads
export default function AdminTeams() {
  const data = useQuery(api.teams.teams.listMyTeams, {});
  const createTeam = useMutation(api.teams.teams.createTeam);
  const createChannel = useMutation(api.teams.teams.createChannel);
  const archiveTeam = useMutation(api.teams.teams.archiveTeam);

  const [teamId, setTeamId] = useState<Id<"teams"> | null>(null);
  const [channelId, setChannelId] = useState<Id<"teamChannels"> | null>(null);
  const [thread, setThread] = useState<MessageView | null>(null);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const activeTeam = data?.teams.find((t) => t._id === (teamId ?? data.teams[0]?._id));
  const activeChannel = activeTeam?.channels.find((c) => c._id === channelId) ?? activeTeam?.channels[0];
  const detail = useQuery(api.teams.teams.getTeam, activeTeam ? { teamId: activeTeam._id } : "skip");

  const pickTeam = (id: Id<"teams">) => { setTeamId(id); setChannelId(null); setThread(null); };
  const memberNames = detail?.members.map((m) => m.name) ?? [];

  if (data === undefined) {
    return <div className="space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-[60vh] w-full" /></div>;
  }

  const teamForm = (
    <NameDialog open={showTeamForm} onOpenChange={setShowTeamForm} title="Create a team" nameLabel="Team name" submitLabel="Create team"
      onSubmit={async (name, description) => { const r = await createTeam({ name, description }); pickTeam(r.teamId); toast.success("Team created"); }} />
  );

  if (data.teams.length === 0) {
    return (
      <>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><UsersRound /></EmptyMedia>
            <EmptyTitle>You are not in any team yet</EmptyTitle>
            <EmptyDescription>{data.canCreate ? "Create a team for a project or department and invite colleagues." : "Ask a manager to add you to a team."}</EmptyDescription>
          </EmptyHeader>
          {data.canCreate && <EmptyContent><Button size="sm" onClick={() => setShowTeamForm(true)} className="cursor-pointer">Create a team</Button></EmptyContent>}
        </Empty>
        {teamForm}
      </>
    );
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[480px] overflow-hidden rounded-2xl border bg-background shadow-sm">
      {/* Teams and channels list; on phones it replaces the chat until a channel is picked */}
      <nav className={`w-full shrink-0 flex-col overflow-y-auto border-r bg-muted/30 md:flex md:w-64 ${activeChannel && channelId ? "hidden" : "flex"}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-bold">Teams</h2>
          {data.canCreate && <Button size="icon" variant="ghost" className="size-7 cursor-pointer" onClick={() => setShowTeamForm(true)} aria-label="Create team"><Plus size={16} /></Button>}
        </div>
        {data.teams.map((t) => (
          <div key={t._id} className="px-2 pb-2">
            <button onClick={() => pickTeam(t._id)} className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold ${activeTeam?._id === t._id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
              <UsersRound size={16} /> <span className="truncate">{t.name}</span>
            </button>
            {activeTeam?._id === t._id && (
              <div className="ml-4 mt-1 space-y-0.5 border-l pl-2">
                {t.channels.map((c) => (
                  <button key={c._id} onClick={() => { setChannelId(c._id); setThread(null); }}
                    className={`flex w-full cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm ${activeChannel?._id === c._id ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted"}`}>
                    <Hash size={14} /> <span className="truncate">{c.name}</span>
                  </button>
                ))}
                {t.myRole === "owner" && (
                  <button onClick={() => setShowChannelForm(true)} className="flex w-full cursor-pointer items-center gap-1.5 px-2 py-1.5 text-xs text-primary hover:underline"><Plus size={12} /> Add channel</button>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Chat area */}
      <section className={`min-w-0 flex-1 flex-col ${channelId ? "flex" : "hidden md:flex"}`}>
        {activeTeam && activeChannel ? (
          <>
            <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Button size="icon" variant="ghost" className="size-8 cursor-pointer md:hidden" onClick={() => setChannelId(null)} aria-label="Back"><ArrowLeft size={16} /></Button>
                <div className="min-w-0">
                  <h2 className="flex items-center gap-1 truncate text-sm font-bold"><Hash size={14} /> {activeChannel.name}</h2>
                  <p className="truncate text-xs text-muted-foreground">{activeTeam.name}{activeChannel.description ? ` · ${activeChannel.description}` : ""}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => setShowMembers(true)}><Users size={14} /> {detail?.members.length ?? ""}</Button>
                {detail?.isOwner && (
                  <Button size="icon" variant="ghost" className="cursor-pointer text-red-500" aria-label="Archive team"
                    onClick={() => { void archiveTeam({ teamId: activeTeam._id }).then(() => { setTeamId(null); setChannelId(null); toast.success("Team archived"); }); }}><Archive size={15} /></Button>
                )}
              </div>
            </header>
            <div className="flex min-h-0 flex-1">
              <ChannelView key={activeChannel._id} channelId={activeChannel._id} myUserId={detail?.myUserId ?? ""} isOwner={detail?.isOwner ?? false}
                memberNames={memberNames} onOpenThread={setThread} />
              {thread && detail && (
                <div className="absolute inset-0 z-20 md:static md:inset-auto"><ThreadPanel key={thread._id} parent={thread} myUserId={detail.myUserId} isOwner={detail.isOwner} memberNames={memberNames} onClose={() => setThread(null)} /></div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Pick a channel to start chatting</div>
        )}
      </section>

      {teamForm}
      {activeTeam && (
        <NameDialog open={showChannelForm} onOpenChange={setShowChannelForm} title="Add a channel" nameLabel="Channel name" submitLabel="Add channel"
          onSubmit={async (name, description) => { const id = await createChannel({ teamId: activeTeam._id, name, description }); setChannelId(id); }} />
      )}
      {activeTeam && detail && (
        <MembersDialog open={showMembers} onOpenChange={setShowMembers} teamId={activeTeam._id} members={detail.members} isOwner={detail.isOwner} myUserId={detail.myUserId} />
      )}
    </div>
  );
}
