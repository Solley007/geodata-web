import { useMutation, useQuery } from "convex/react";
import { X } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import Composer from "./Composer.tsx";
import MessageItem, { type MessageView } from "./MessageItem.tsx";

type Props = {
  parent: MessageView;
  myUserId: string;
  isOwner: boolean;
  memberNames: string[];
  onClose: () => void;
};

export default function ThreadPanel({ parent, myUserId, isOwner, memberNames, onClose }: Props) {
  const messageId = parent._id as Id<"teamMessages">;
  const replies = useQuery(api.teams.messages.listReplies, { messageId });
  const postReply = useMutation(api.teams.messages.postReply);
  const deleteReply = useMutation(api.teams.messages.deleteReply);

  return (
    <aside className="flex h-full w-full flex-col border-l bg-background md:w-96">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Thread</h3>
        <Button size="icon" variant="ghost" onClick={onClose} className="size-7 cursor-pointer" aria-label="Close thread"><X size={16} /></Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <MessageItem message={parent} canDelete={false} onDelete={() => undefined} />
        <div className="mx-4 my-1 border-t" />
        {replies === undefined ? (
          <div className="space-y-2 p-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        ) : replies.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No replies yet. Start the conversation.</p>
        ) : (
          replies.map((r) => (
            <MessageItem key={r._id} message={r} canDelete={r.authorId === myUserId || isOwner}
              onDelete={() => void deleteReply({ replyId: r._id })} />
          ))
        )}
      </div>
      <Composer placeholder="Reply in thread" memberNames={memberNames}
        onSend={async (body, attachments) => { await postReply({ messageId, body, attachments }); }} />
    </aside>
  );
}
