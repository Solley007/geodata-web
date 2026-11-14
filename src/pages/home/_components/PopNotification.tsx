import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink, Info, CheckCircle2, AlertTriangle, Megaphone, Bell } from "lucide-react";
import { cn } from "@/lib/utils.ts";

type PopNotification = {
  _id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  linkLabel?: string;
  icon?: string;
  showOnce: boolean;
  delay: number;
  position: string;
};

const SEEN_KEY = "gws_seen_popups";

function getSeenSet(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  try {
    const s = getSeenSet();
    s.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...s]));
  } catch { /* noop */ }
}

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  info:    { bg: "bg-blue-50",   border: "border-blue-200",  icon: <Info size={18} className="text-blue-600" /> },
  success: { bg: "bg-green-50",  border: "border-green-200", icon: <CheckCircle2 size={18} className="text-green-600" /> },
  warning: { bg: "bg-amber-50",  border: "border-amber-200", icon: <AlertTriangle size={18} className="text-amber-600" /> },
  promo:   { bg: "bg-purple-50", border: "border-purple-200",icon: <Megaphone size={18} className="text-purple-600" /> },
  alert:   { bg: "bg-red-50",    border: "border-red-200",   icon: <Bell size={18} className="text-red-600" /> },
};

const POSITION_CLASSES: Record<string, string> = {
  "bottom-right": "bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6",
  "bottom-left":  "bottom-4 left-4 right-4 sm:right-auto sm:left-6 sm:bottom-6",
  "top-right":    "top-20 left-4 right-4 sm:left-auto sm:right-6",
  "top-left":     "top-20 left-4 right-4 sm:right-auto sm:left-6",
};

function SinglePopNotification({
  notification,
  onDismiss,
}: {
  notification: PopNotification;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), notification.delay);
    return () => clearTimeout(timer);
  }, [notification.delay]);

  const dismiss = () => {
    setVisible(false);
    if (notification.showOnce) markSeen(notification._id);
    setTimeout(() => onDismiss(notification._id), 300);
  };

  const style = TYPE_STYLES[notification.type] ?? TYPE_STYLES.info;
  const posClass = POSITION_CLASSES[notification.position] ?? POSITION_CLASSES["bottom-right"];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={notification._id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className={cn(
            "fixed z-[9999] w-[calc(100vw-2rem)] sm:w-80 max-w-sm shadow-xl rounded-2xl border p-4",
            style.bg,
            style.border,
            posClass
          )}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {notification.icon ? (
                <span className="text-xl leading-none">{notification.icon}</span>
              ) : (
                style.icon
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-snug">{notification.title}</p>
              <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{notification.message}</p>
              {notification.link && (
                <a
                  href={notification.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[var(--brand)] hover:underline"
                >
                  {notification.linkLabel ?? "Learn more"}
                  <ExternalLink size={10} />
                </a>
              )}
            </div>

            {/* Close */}
            <button
              onClick={dismiss}
              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer -mt-0.5"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Renders ALL active pop notifications at once. Each one handles its own
 * delay, position, and show-once logic independently.
 */
export default function PopNotification() {
  const raw = useQuery(api.communications.listActivePopNotifications, {});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (!raw) return null;

  const seen = getSeenSet();
  const toShow = raw.filter((n) => {
    if (dismissed.has(n._id)) return false;
    if (n.showOnce && seen.has(n._id)) return false;
    return true;
  });

  const dismiss = (id: string) => setDismissed((s) => new Set([...s, id]));

  return (
    <>
      {toShow.map((n) => (
        <SinglePopNotification
          key={n._id}
          notification={n as PopNotification}
          onDismiss={dismiss}
        />
      ))}
    </>
  );
}
