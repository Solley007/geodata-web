import { MessageSquare, Paperclip, Pin, PinOff, SmilePlus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀", "✅"];

export type Attachment = { fileName: string; url: string | null };
export type MessageView = {
  _id: string;
  _creationTime: number;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  deleted: boolean;
  attachments: Attachment[];
  replyCount?: number;
  pinned?: boolean;
  reactions?: { emoji: string; count: number; mine: boolean }[];
};

type Props = {
  message: MessageView;
  canDelete: boolean;
  isOwner?: boolean;
  onDelete: () => void;
  onReact?: (emoji: string) => void;
  onOpenThread?: () => void;
  onTogglePin?: () => void;
};

// Highlights @Name mentions inside message text
function renderBody(text: string) {
  return text.split(/(@[A-Z][\w.'-]*(?: [A-Z][\w.'-]*)*)/g).map((part, i) =>
    part.startsWith("@") ? <span key={i} className="rounded bg-primary/10 px-1 font-medium text-primary">{part}</span> : <span key={i}>{part}</span>);
}

export default function MessageItem({ message: m, canDelete, isOwner, onDelete, onReact, onOpenThread, onTogglePin }: Props) {
  return (
    <div className="group flex gap-3 px-4 py-2 hover:bg-muted/40">
      <Avatar className="mt-0.5 size-9">
        {m.authorAvatar && <AvatarImage src={m.authorAvatar} alt={m.authorName} />}
        <AvatarFallback>{m.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold">{m.authorName}</span>
          <span className="text-xs text-muted-foreground">{formatDistanceToNow(m._creationTime, { addSuffix: true })}</span>
          {m.pinned && <Pin size={12} className="text-amber-500" />}
        </div>
        {m.deleted ? (
          <p className="text-sm italic text-muted-foreground">This message was deleted</p>
        ) : (
          <>
            {m.body && <p className="whitespace-pre-wrap break-words text-sm">{renderBody(m.body)}</p>}
            {m.attachments.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {m.attachments.map((a, i) => (
                  <a key={i} href={a.url ?? undefined} target="_blank" rel="noopener noreferrer" download={a.fileName}
                    className="flex max-w-[240px] cursor-pointer items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs hover:bg-muted">
                    <Paperclip size={12} /> <span className="truncate">{a.fileName}</span>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
        {!m.deleted && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {m.reactions?.map((r) => (
              <button key={r.emoji} onClick={() => onReact?.(r.emoji)}
                className={`cursor-pointer rounded-full border px-2 py-0.5 text-xs ${r.mine ? "border-primary bg-primary/10" : "bg-card"}`}>
                {r.emoji} {r.count}
              </button>
            ))}
            {onOpenThread && (
              <button onClick={onOpenThread} className="flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline">
                <MessageSquare size={12} /> {m.replyCount ? `${m.replyCount} ${m.replyCount === 1 ? "reply" : "replies"}` : "Reply"}
              </button>
            )}
          </div>
        )}
      </div>
      {!m.deleted && (
        <div className="flex shrink-0 items-start gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onReact && (
            <Popover>
              <PopoverTrigger asChild><Button size="icon" variant="ghost" className="size-7 cursor-pointer" aria-label="React"><SmilePlus size={14} /></Button></PopoverTrigger>
              <PopoverContent className="flex w-auto gap-1 p-1.5">
                {REACTION_EMOJIS.map((e) => <button key={e} onClick={() => onReact(e)} className="cursor-pointer rounded px-1.5 py-1 text-lg hover:bg-muted">{e}</button>)}
              </PopoverContent>
            </Popover>
          )}
          {isOwner && onTogglePin && (
            <Button size="icon" variant="ghost" className="size-7 cursor-pointer" onClick={onTogglePin} aria-label={m.pinned ? "Unpin" : "Pin"}>
              {m.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            </Button>
          )}
          {canDelete && <Button size="icon" variant="ghost" className="size-7 cursor-pointer text-red-500" onClick={onDelete} aria-label="Delete"><Trash2 size={14} /></Button>}
        </div>
      )}
    </div>
  );
}
