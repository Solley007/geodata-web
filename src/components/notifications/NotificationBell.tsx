import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

// Shared bell notification panel used on every authenticated dashboard
// (client, partner, admin) so end users always have a consistent, world-class
// way to know about new messages or account updates. Reactive by nature via
// Convex — the badge updates the instant a new notification is created,
// with no polling required.
export default function NotificationBell({ triggerClassName }: { triggerClassName?: string } = {}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const unreadCount = useQuery(api.notifications.unreadCount);
  const notifications = useQuery(api.notifications.listMine, open ? {} : "skip");
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const handleSelect = async (n: Doc<"notifications">) => {
    if (!n.isRead) await markRead({ id: n._id });
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn("relative text-gray-500 hover:text-gray-800 cursor-pointer", triggerClassName)}
          aria-label="Notifications"
        >
          <Bell size={18} />
          {!!unreadCount && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-0.5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[28rem] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-sm text-gray-800">Notifications</span>
          {!!unreadCount && unreadCount > 0 && (
            <button
              onClick={() => markAllRead({})}
              className="flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline cursor-pointer"
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {notifications === undefined ? (
            <div className="px-4 py-8 text-center text-xs text-gray-400">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Inbox className="mx-auto mb-2 text-gray-300" size={28} />
              <p className="text-xs text-gray-400">You're all caught up. No notifications yet.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => handleSelect(n)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer",
                  !n.isRead && "bg-blue-50/60"
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--brand)] shrink-0" />}
                  <div className={cn("flex-1 min-w-0", n.isRead && "pl-3.5")}>
                    <p className={cn("text-xs font-semibold text-gray-800 truncate", !n.isRead && "text-gray-900")}>{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        {!!notifications && notifications.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-gray-500 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
