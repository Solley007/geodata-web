import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Camera, Send,
  CheckCircle2, Circle, Building2, MapPin, User, Loader2, ChevronRight, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { useInspectionWebRTC } from "@/hooks/useInspectionWebRTC.ts";

const VIEW_AREA_LABELS: Record<string, string> = {
  kitchen: "Kitchen", master_bedroom: "Master Bedroom", bedroom: "Bedroom", bathroom: "Bathroom",
  living_room: "Living Room", exterior: "Exterior", parking: "Parking", road: "Road",
  estate_facility: "Estate Facility", other: "Other",
};

type Props = {
  inspectionId: Id<"liveInspections">;
  onExit: () => void;
};

// Shared live session room used by both the officer (admin) side and the
// client (buyer portal) side. Behaviour that differs by role — capture,
// checklist edits, internal notes, fulfilling view requests — is gated by
// the `side` returned from getSessionContext, which the server derives
// from the caller's IAM permission or matching client record. No feature
// here bypasses server-side authorization; the UI simply hides actions the
// server would reject anyway.
export default function LiveInspectionSessionRoom({ inspectionId, onExit }: Props) {
  const myKeyRef = useRef(`participant-${Math.random().toString(36).slice(2)}-${Date.now()}`);
  const context = useQuery(api.liveInspections.getSessionContext, { id: inspectionId });
  const [tab, setTab] = useState<"checklist" | "chat" | "requests" | "info">("checklist");
  const [panelOpen, setPanelOpen] = useState(true);

  const side = context?.side;
  const isOfficer = side === "officer";
  // Client is the initiator's counterpart: officer starts the session (creates
  // offer) since they're expected to already be in the room; client answers.
  const webrtc = useInspectionWebRTC(inspectionId, myKeyRef.current, isOfficer);

  useEffect(() => {
    if (side) void webrtc.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side]);

  const handleExit = () => {
    webrtc.stop();
    onExit();
  };

  if (context === undefined) {
    return <div className="p-6"><Skeleton className="h-96 w-full rounded-2xl" /></div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2 text-white min-w-0">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="font-semibold text-sm truncate">{context.inspection.inspectionRef}</span>
          <span className="text-xs text-gray-400 truncate hidden sm:inline">
            · {context.inspection.propertyTitle ?? context.inspection.estateName ?? "Live inspection"}
          </span>
        </div>
        <Button size="sm" onClick={handleExit} className="bg-red-600 hover:bg-red-700 text-white gap-1.5 cursor-pointer shrink-0">
          <PhoneOff size={14} /> <span className="hidden sm:inline">Leave</span>
        </Button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video area */}
        <div className="relative flex-1 bg-black min-h-[45vh] lg:min-h-0">
          <video ref={webrtc.remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain bg-gray-900" />
          {!webrtc.remoteJoined && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 text-sm">
              <Loader2 size={22} className="animate-spin" />
              Waiting for {isOfficer ? "the client" : "the officer"} to join…
            </div>
          )}
          {webrtc.error && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs px-3 py-1.5 rounded-full">
              {webrtc.error}
            </div>
          )}

          {/* Local PIP */}
          <div className="absolute bottom-4 right-4 w-28 sm:w-40 aspect-video rounded-xl overflow-hidden border-2 border-white/20 bg-gray-800 shadow-lg">
            <video ref={webrtc.localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!webrtc.cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800"><VideoOff size={16} className="text-gray-400" /></div>
            )}
          </div>

          {/* Media controls — large, touch-friendly for mobile officers */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <button
              onClick={webrtc.toggleMic}
              className={cn("w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-colors",
                webrtc.micOn ? "bg-white/15 text-white hover:bg-white/25" : "bg-red-600 text-white")}
            >
              {webrtc.micOn ? <Mic size={19} /> : <MicOff size={19} />}
            </button>
            <button
              onClick={webrtc.toggleCamera}
              className={cn("w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-colors",
                webrtc.cameraOn ? "bg-white/15 text-white hover:bg-white/25" : "bg-red-600 text-white")}
            >
              {webrtc.cameraOn ? <VideoIcon size={19} /> : <VideoOff size={19} />}
            </button>
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="lg:hidden w-12 h-12 rounded-full bg-white/15 text-white hover:bg-white/25 flex items-center justify-center cursor-pointer"
            >
              {panelOpen ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
            </button>
          </div>
        </div>

        {/* Side panel */}
        {panelOpen && (
          <div className="w-full lg:w-96 bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col shrink-0 max-h-[55vh] lg:max-h-none">
            <div className="flex border-b border-gray-800 shrink-0 overflow-x-auto">
              {(["checklist", "chat", "requests", "info"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn("flex-1 py-2.5 text-xs font-semibold capitalize cursor-pointer whitespace-nowrap px-3",
                    tab === t ? "text-white border-b-2 border-red-500" : "text-gray-400 hover:text-gray-200")}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {tab === "checklist" && <ChecklistPanel inspectionId={inspectionId} isOfficer={isOfficer} />}
              {tab === "chat" && <ChatPanel inspectionId={inspectionId} />}
              {tab === "requests" && <ViewRequestsPanel inspectionId={inspectionId} isOfficer={isOfficer} />}
              {tab === "info" && <PropertyInfoPanel context={context} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Checklist & snapshots (officers capture; clients only view progress) ──
function ChecklistPanel({ inspectionId, isOfficer }: { inspectionId: Id<"liveInspections">; isOfficer: boolean }) {
  const context = useQuery(api.liveInspections.getSessionContext, { id: inspectionId });
  const toggle = useMutation(api.liveInspections.toggleChecklistItem);
  const generateUploadUrl = useMutation(api.liveInspections.generateSnapshotUploadUrl);
  const captureSnapshot = useMutation(api.liveInspections.captureSnapshot);
  const [captureFor, setCaptureFor] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const checklist = context?.checklist ?? [];
  const doneCount = checklist.filter((c) => c.completed).length;

  const handleFileSelected = async (file: File, itemKey: string, clientVisible: boolean) => {
    setCapturing(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await result.json();
      await captureSnapshot({ inspectionId, storageId, checklistItemKey: itemKey, clientVisible });
      toast.success("Snapshot captured");
    } catch {
      toast.error("Failed to capture snapshot");
    } finally {
      setCapturing(false);
      setCaptureFor(null);
    }
  };

  return (
    <div className="p-3 space-y-2">
      <div className="text-xs text-gray-400 px-1 pb-1">
        {doneCount} of {checklist.length} items completed
      </div>
      {checklist.length === 0 ? (
        <p className="text-xs text-gray-500 px-1">No checklist items for this inspection.</p>
      ) : (
        checklist.map((item) => (
          <div key={item._id} className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2.5">
            <button
              disabled={!isOfficer}
              onClick={() => isOfficer && void toggle({ itemId: item._id, completed: !item.completed })}
              className={cn("shrink-0", isOfficer && "cursor-pointer")}
            >
              {item.completed ? <CheckCircle2 size={17} className="text-green-500" /> : <Circle size={17} className="text-gray-500" />}
            </button>
            <span className={cn("text-sm flex-1 min-w-0 truncate", item.completed ? "text-gray-400 line-through" : "text-white")}>
              {item.label}
            </span>
            {isOfficer && (
              <button
                title="Capture snapshot"
                onClick={() => { setCaptureFor(item.itemKey); fileInputRef.current?.click(); }}
                disabled={capturing}
                className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Camera size={14} />
              </button>
            )}
          </div>
        ))
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && captureFor) void handleFileSelected(file, captureFor, true);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── Live chat ───────────────────────────────────────────────────────────
function ChatPanel({ inspectionId }: { inspectionId: Id<"liveInspections"> }) {
  const messages = useQuery(api.liveInspections.listChatMessages, { id: inspectionId });
  const sendMessage = useMutation(api.liveInspections.sendChatMessage);
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [messages]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setBody("");
    try {
      await sendMessage({ id: inspectionId, body: trimmed });
    } catch {
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {(messages ?? []).map((m) => (
          <div key={m._id} className="text-sm">
            <span className={cn("font-semibold text-xs", m.senderRole === "officer" ? "text-blue-400" : "text-amber-400")}>{m.senderName}</span>
            <p className="text-gray-200">{m.body}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 p-2.5 border-t border-gray-800 shrink-0">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleSend(); }}
          placeholder="Type a message…"
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-9 text-sm"
        />
        <Button size="sm" onClick={handleSend} className="bg-red-600 hover:bg-red-700 text-white h-9 w-9 p-0 cursor-pointer shrink-0"><Send size={14} /></Button>
      </div>
    </div>
  );
}

// ── Client view requests ─────────────────────────────────────────────────
function ViewRequestsPanel({ inspectionId, isOfficer }: { inspectionId: Id<"liveInspections">; isOfficer: boolean }) {
  const requests = useQuery(api.liveInspections.listViewRequests, { id: inspectionId });
  const requestView = useMutation(api.liveInspections.requestView);
  const fulfill = useMutation(api.liveInspections.fulfillViewRequest);
  const areas = useMemo(() => Object.entries(VIEW_AREA_LABELS), []);

  return (
    <div className="p-3 space-y-3">
      {!isOfficer && (
        <div>
          <p className="text-xs text-gray-400 mb-2">Ask to see a specific area:</p>
          <div className="flex flex-wrap gap-1.5">
            {areas.map(([key, label]) => (
              <button key={key} onClick={() => void requestView({ inspectionId, requestedArea: key as never })}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-2.5 py-1.5 rounded-full cursor-pointer">
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        {(requests ?? []).length === 0 ? (
          <p className="text-xs text-gray-500">No view requests yet.</p>
        ) : (
          (requests ?? []).map((r) => (
            <div key={r._id} className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm text-white">{VIEW_AREA_LABELS[r.requestedArea] ?? r.requestedArea}</p>
                {r.note && <p className="text-xs text-gray-400">{r.note}</p>}
              </div>
              {isOfficer && r.status === "pending" ? (
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" onClick={() => void fulfill({ id: r._id, status: "fulfilled" })} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white cursor-pointer">Done</Button>
                  <Button size="sm" onClick={() => void fulfill({ id: r._id, status: "declined" })} className="h-7 text-xs bg-gray-700 hover:bg-gray-600 text-white cursor-pointer">Skip</Button>
                </div>
              ) : (
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                  r.status === "fulfilled" ? "bg-green-900 text-green-300" : r.status === "declined" ? "bg-gray-700 text-gray-300" : "bg-amber-900 text-amber-300")}>
                  {r.status}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Property/estate info panel ───────────────────────────────────────────
type SessionContext = {
  property: { title: string; location: string; state: string; price: number; priceType: string; bedrooms?: number; bathrooms?: number; landSize?: string } | null;
  estate: { name: string; location: string; state: string; availablePlots: number; totalPlots: number; pricePerPlot: number } | null;
  inspection: { clientName: string };
};

function PropertyInfoPanel({ context }: { context: SessionContext }) {
  const { property, estate, inspection } = context;
  return (
    <div className="p-4 space-y-3 text-sm text-gray-200">
      <div className="flex items-center gap-2 text-white font-semibold">
        {property ? <Building2 size={15} /> : <MapPin size={15} />}
        {property?.title ?? estate?.name ?? "No property linked"}
      </div>
      {property && (
        <div className="space-y-1 text-gray-400">
          <p>{property.location}, {property.state}</p>
          <p>₦{property.price.toLocaleString()} {property.priceType}</p>
          {(property.bedrooms || property.bathrooms) && (
            <p>{property.bedrooms ?? 0} bed · {property.bathrooms ?? 0} bath</p>
          )}
          {property.landSize && <p>{property.landSize}</p>}
        </div>
      )}
      {estate && (
        <div className="space-y-1 text-gray-400">
          <p>{estate.location}, {estate.state}</p>
          <p>{estate.availablePlots} plots available of {estate.totalPlots}</p>
          <p>₦{estate.pricePerPlot.toLocaleString()} per plot</p>
        </div>
      )}
      <div className="pt-3 border-t border-gray-800 flex items-center gap-2 text-gray-400">
        <User size={14} /> {inspection.clientName}
      </div>
      {!property && !estate && (
        <p className="text-gray-500 text-xs">No floor plan available for this inspection type.</p>
      )}
    </div>
  );
}
