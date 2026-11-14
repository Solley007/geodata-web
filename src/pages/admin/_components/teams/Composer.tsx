import { useRef, useState } from "react";
import { Paperclip, Send, X, AtSign } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { useTeamUpload, type PendingFile } from "./use-team-upload.ts";

type Props = {
  placeholder: string;
  memberNames: string[];
  onSend: (body: string, attachments: PendingFile[]) => Promise<void>;
};

// Message box with file attach and an @mention picker (mentions notify the person)
export default function Composer({ placeholder, memberNames, onSend }: Props) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useTeamUpload();

  const send = async () => {
    if (sending || upload.uploading || (!body.trim() && upload.files.length === 0)) return;
    setSending(true);
    try {
      await onSend(body, upload.files);
      setBody("");
      upload.clear();
    } catch (e) {
      toast.error(e instanceof ConvexError ? (e.data as { message: string }).message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2 border-t bg-card p-3">
      {upload.files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {upload.files.map((f, i) => (
            <span key={f.storageId} className="flex max-w-[200px] items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
              <span className="truncate">{f.fileName}</span>
              <button onClick={() => upload.removeFile(i)} className="cursor-pointer" aria-label="Remove file"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
        placeholder={placeholder}
        rows={2}
        className="resize-none"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { void upload.addFiles(e.target.files); e.target.value = ""; }} />
          <Button size="icon" variant="ghost" onClick={() => fileRef.current?.click()} className="cursor-pointer" aria-label="Attach file">
            {upload.uploading ? <Spinner className="size-4" /> : <Paperclip size={16} />}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Mention someone"><AtSign size={16} /></Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-60 w-56 overflow-y-auto p-1">
              {memberNames.map((n) => (
                <button key={n} onClick={() => setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}@${n} `)} className="block w-full cursor-pointer truncate rounded px-2 py-1.5 text-left text-sm hover:bg-muted">{n}</button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
        <Button size="sm" onClick={send} disabled={sending} className="cursor-pointer"><Send size={14} /> Send</Button>
      </div>
    </div>
  );
}
