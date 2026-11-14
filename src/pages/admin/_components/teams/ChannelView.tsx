import { useMemo } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { Hash } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import Composer from "./Composer.tsx";
import MessageItem, { type MessageView } from "./MessageItem.tsx";

type Props = {
  channelId: Id<"teamChannels">;
  myUserId: string;
  isOwner: boolean;
  memberNames: string[];
  onOpenThread: (m: MessageView) => void;
};

export default function ChannelView({ channelId, myUserId, isOwner, memberNames, onOpenThread }: Props) {
  const { results, status, loadMore } = usePaginatedQuery(api.teams.messages.listMessages, { channelId }, { initialNumItems: 30 });
  const post = useMutation(api.teams.messages.postMessage);
  const react = useMutation(api.teams.messages.toggleReaction);
  const pin = useMutation(api.teams.messages.setPinned);
  const del = useMutation(api.teams.messages.deleteMessage);

  // Query returns newest first; show oldest at top like a chat
  const ordered = useMemo(() => [...results].reverse(), [results]);
  const pinned = ordered.filter((m) => m.pinned && !m.deleted);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {pinned.length > 0 && (
        <div className="border-b bg-amber-50 px-4 py-2 text-xs dark:bg-amber-950/30">
          <span className="font-semibold">Pinned: </span>
          {pinned.map((m) => `${m.authorName}: ${m.body.slice(0, 60) || "attachment"}`).join("  |  ")}
        </div>
      )}
      <div className="flex-1 overflow-y-auto py-2">
        {status === "CanLoadMore" && (
          <div className="flex justify-center py-2"><Button size="sm" variant="ghost" onClick={() => loadMore(30)} className="cursor-pointer">Load earlier messages</Button></div>
        )}
        {status === "LoadingFirstPage" ? (
          <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : ordered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Hash /></EmptyMedia>
              <EmptyTitle>No messages yet</EmptyTitle>
              <EmptyDescription>Say hello to your team.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          ordered.map((m) => (
            <MessageItem key={m._id} message={m} isOwner={isOwner}
              canDelete={m.authorId === myUserId || isOwner}
              onDelete={() => void del({ messageId: m._id })}
              onReact={(emoji) => void react({ messageId: m._id, emoji })}
              onTogglePin={() => void pin({ messageId: m._id, pinned: !m.pinned })}
              onOpenThread={() => onOpenThread(m)} />
          ))
        )}
      </div>
      <Composer placeholder="Write a message. Use @ to mention a teammate" memberNames={memberNames}
        onSend={async (body, attachments) => { await post({ channelId, body, attachments }); }} />
    </div>
  );
}
