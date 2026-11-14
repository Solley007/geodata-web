import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { X, Orbit, Map as MapIcon, Info, ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import { motion } from "motion/react";
import PanoramaViewer, { type ViewerHotspot } from "@/components/tours/PanoramaViewer.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";

// ══════════════════════════════════════════════════════════════════════════
// Public self-guided 360°/VR Tour — the second mode of GEODATA LIVE INSPECT™.
// Fetches only the published tour for a property (feature-toggle gated
// server-side in api.propertyTours.getPublishedTourForProperty). No IAM
// permission needed to view — same visibility level as the property page.
// ══════════════════════════════════════════════════════════════════════════

export default function PropertyTourModal({
  propertyId,
  onClose,
  onRequestLiveInspection,
}: {
  propertyId: Id<"properties">;
  onClose: () => void;
  onRequestLiveInspection?: () => void;
}) {
  const tour = useQuery(api.propertyTours.getPublishedTourForProperty, { propertyId });
  const [activeSceneId, setActiveSceneId] = useState<Id<"tourScenes"> | null>(null);
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  if (tour === undefined) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <Skeleton className="h-20 w-20 rounded-full bg-white/10" />
      </div>
    );
  }
  if (tour === null || tour.scenes.length === 0) {
    return null;
  }

  const scene = tour.scenes.find((s) => s._id === activeSceneId) ?? tour.scenes.find((s) => s._id === tour.startSceneId) ?? tour.scenes[0];
  const hotspots: ViewerHotspot[] = scene.hotspots.map((h) => ({
    _id: h._id, kind: h.kind, yaw: h.yaw, pitch: h.pitch, label: h.label, infoText: h.infoText, targetSceneId: h.targetSceneId,
  }));
  const sceneIndex = tour.scenes.findIndex((s) => s._id === scene._id);

  const goToScene = (id: string) => setActiveSceneId(id as Id<"tourScenes">);
  const goRelative = (delta: number) => {
    const next = tour.scenes[(sceneIndex + delta + tour.scenes.length) % tour.scenes.length];
    setActiveSceneId(next._id);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black"
    >
      {!scene.panoramaUrl ? (
        <div className="w-full h-full flex items-center justify-center text-white/60 text-sm">Panorama unavailable.</div>
      ) : (
        <PanoramaViewer imageUrl={scene.panoramaUrl} hotspots={hotspots} initialYaw={scene.initialYaw ?? 0} onNavigate={goToScene} className="relative w-full h-full bg-black" />
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 text-white pointer-events-auto">
          <Orbit size={18} className="text-[var(--brand)]" />
          <div>
            <p className="font-bold text-sm leading-tight">{tour.title}</p>
            <p className="text-[11px] text-white/60 leading-tight">{scene.name} · {sceneIndex + 1}/{tour.scenes.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          {tour.floorPlanUrl && (
            <Button size="sm" onClick={() => setShowFloorPlan(true)} className="h-8 text-xs gap-1.5 bg-white/10 text-white hover:bg-white/20 cursor-pointer">
              <MapIcon size={13} /> Floor Plan
            </Button>
          )}
          {onRequestLiveInspection && (
            <Button size="sm" onClick={onRequestLiveInspection} className="h-8 text-xs gap-1.5 bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)] cursor-pointer">
              <CalendarCheck size={13} /> Request Live Inspection
            </Button>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scene switcher / info bar */}
      <div className="absolute bottom-0 left-0 right-0 pb-5 px-4 sm:px-6 pt-8 bg-gradient-to-t from-black/70 to-transparent">
        {scene.description && (
          <div className="max-w-lg mx-auto sm:mx-0 mb-3 flex items-start gap-2 text-white/80 text-xs bg-black/40 rounded-xl px-3 py-2">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>{scene.description}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => goRelative(-1)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => goToScene(scene._id)} className="flex-1 overflow-x-auto flex gap-2 justify-center">
            {tour.scenes.map((s) => (
              <span
                key={s._id}
                onClick={(e) => { e.stopPropagation(); goToScene(s._id); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${s._id === scene._id ? "bg-[var(--brand)] text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
              >
                {s.name}
              </span>
            ))}
          </button>
          <button onClick={() => goRelative(1)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <Dialog open={showFloorPlan} onOpenChange={setShowFloorPlan}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Floor Plan</DialogTitle></DialogHeader>
          {tour.floorPlanUrl && <img src={tour.floorPlanUrl} alt="Floor plan" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
