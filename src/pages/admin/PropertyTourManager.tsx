import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Eye, EyeOff, Orbit,
  MapPin as PinIcon, Info as InfoIcon, ArrowRightCircle, Upload, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { ErrorState, ErrorStateHeader, ErrorStateMedia, ErrorStateTitle, ErrorStateDescription, ErrorStateContent } from "@/components/ui/error-state.tsx";
import PanoramaViewer, { type ViewerHotspot } from "@/components/tours/PanoramaViewer.tsx";
import { cn } from "@/lib/utils.ts";

const SCENE_TYPE_LABEL: Record<string, string> = { interior: "Interior", exterior: "Exterior", estate: "Estate" };

function useTourUpload() {
  const generateUploadUrl = useMutation(api.propertyTours.generateUploadUrl);
  const convex = useConvex();

  return async (file: File): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();
    const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    if (!res.ok) throw new Error("Upload failed");
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    return storageId;
  };
}

export default function PropertyTourManager() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const access = useQuery(api.propertyTours.getMyAccess, {});
  const property = useQuery(api.properties.getById, propertyId ? { id: propertyId as Id<"properties"> } : "skip");
  const tours = useQuery(
    api.propertyTours.listToursForProperty,
    propertyId && access?.canView ? { propertyId: propertyId as Id<"properties"> } : "skip"
  );
  const createTour = useMutation(api.propertyTours.createTour);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [activeTourId, setActiveTourId] = useState<Id<"propertyTours"> | null>(null);

  if (access === undefined) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!access.canView) {
    return (
      <ErrorState>
        <ErrorStateHeader>
          <ErrorStateMedia variant="icon">
            <Lock />
          </ErrorStateMedia>
          <ErrorStateTitle>You don't have access to 360°/VR Tours</ErrorStateTitle>
          <ErrorStateDescription>
            {access.isAdmin
              ? "Your account is an administrator but has not been granted the \"View 360°/VR Tours\" permission yet. Grant it to yourself (or your role) from Users & Roles → Permissions."
              : "Ask an administrator to grant you the required 360°/VR Tour permissions from Users & Roles → Permissions."}
          </ErrorStateDescription>
        </ErrorStateHeader>
        <ErrorStateContent>
          {access.isAdmin ? (
            <Button size="sm" asChild>
              <Link to="/admin/users">Go to Users & Roles</Link>
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link to="/admin/properties">Back to properties</Link>
            </Button>
          )}
        </ErrorStateContent>
      </ErrorState>
    );
  }

  if (property === undefined || tours === undefined) {
    return <Skeleton className="h-96 w-full" />;
  }

  const tour = tours.find((t) => t._id === activeTourId) ?? tours[0];

  const handleCreate = async () => {
    if (!propertyId || !newTitle.trim()) { toast.error("Enter a tour title"); return; }
    setCreating(true);
    try {
      const id = await createTour({ propertyId: propertyId as Id<"properties">, title: newTitle.trim() });
      toast.success("Tour created");
      setActiveTourId(id);
      setShowCreate(false);
      setNewTitle("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tour");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/admin/properties" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} /> Back to properties
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Orbit size={20} className="text-indigo-500" /> 360°/VR Tour — {property?.title ?? "Property"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage scenes, hotspots and publish status for this property's self-guided tour.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5 cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700">
          <Plus size={14} /> New Tour
        </Button>
      </div>

      {tours.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
          No tour exists for this property yet. Create one to get started.
        </div>
      ) : (
        <>
          {tours.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {tours.map((t) => (
                <button
                  key={t._id}
                  onClick={() => setActiveTourId(t._id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer",
                    (tour?._id === t._id) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200"
                  )}
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}
          {tour && <TourEditor tourId={tour._id} />}
        </>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create 360°/VR Tour</DialogTitle></DialogHeader>
          <Input placeholder="Tour title, e.g. Full Property Walkthrough" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TourEditor({ tourId }: { tourId: Id<"propertyTours"> }) {
  const tour = useQuery(api.propertyTours.getTourAdmin, { id: tourId });
  const setStatus = useMutation(api.propertyTours.setTourStatus);
  const deleteTour = useMutation(api.propertyTours.deleteTour);
  const addScene = useMutation(api.propertyTours.addScene);
  const deleteScene = useMutation(api.propertyTours.deleteScene);
  const upload = useTourUpload();
  const [activeSceneId, setActiveSceneId] = useState<Id<"tourScenes"> | null>(null);
  const [addingScene, setAddingScene] = useState(false);
  const [sceneName, setSceneName] = useState("");
  const [sceneType, setSceneType] = useState<"interior" | "exterior" | "estate">("interior");
  const [sceneFile, setSceneFile] = useState<File | null>(null);
  const [showAddScene, setShowAddScene] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  if (tour === undefined) return <Skeleton className="h-80 w-full" />;
  if (tour === null) return <p className="text-sm text-gray-400">Tour not found.</p>;

  const scene = tour.scenes.find((s) => s._id === activeSceneId) ?? tour.scenes[0];

  const handlePublishToggle = async () => {
    try {
      await setStatus({ id: tourId, status: tour.status === "published" ? "unpublished" : "published" });
      toast.success(tour.status === "published" ? "Tour unpublished" : "Tour published");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleDeleteTour = async () => {
    if (!window.confirm("Delete this entire tour and all its scenes?")) return;
    try {
      await deleteTour({ id: tourId });
      toast.success("Tour deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tour");
    }
  };

  const handleAddScene = async () => {
    if (!sceneName.trim() || !sceneFile) { toast.error("Name and panorama image are required"); return; }
    setAddingScene(true);
    try {
      const storageId = await upload(sceneFile);
      const id = await addScene({ tourId, name: sceneName.trim(), sceneType, panoramaStorageId: storageId });
      toast.success("Scene added");
      setActiveSceneId(id);
      setShowAddScene(false);
      setSceneName("");
      setSceneFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add scene");
    } finally {
      setAddingScene(false);
    }
  };

  const handleDeleteScene = async (id: Id<"tourScenes">) => {
    if (!window.confirm("Delete this scene? Navigation hotspots pointing to it will be removed.")) return;
    try {
      await deleteScene({ id });
      toast.success("Scene deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete scene");
    }
  };

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-5">
      {/* Scene list sidebar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900 text-sm">{tour.title}</p>
            <Badge className={cn("text-[10px] border-0 mt-1", tour.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
              {tour.status === "published" ? "Published" : tour.status === "draft" ? "Draft" : "Unpublished"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" onClick={handlePublishToggle} className="h-7 text-xs flex-1 gap-1 cursor-pointer bg-green-600 text-white hover:bg-green-700">
            {tour.status === "published" ? <><EyeOff size={12} /> Unpublish</> : <><Eye size={12} /> Publish</>}
          </Button>
          <Button size="sm" onClick={handleDeleteTour} className="h-7 w-7 p-0 bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"><Trash2 size={12} /></Button>
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-1.5">
          {tour.scenes.map((s) => (
            <div
              key={s._id}
              onClick={() => setActiveSceneId(s._id)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm cursor-pointer group",
                scene?._id === s._id ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50 text-gray-700"
              )}
            >
              <GripVertical size={13} className="text-gray-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{s.name}</p>
                <p className="text-[10px] text-gray-400">{SCENE_TYPE_LABEL[s.sceneType]} · {s.hotspots.length} hotspot(s)</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); void handleDeleteScene(s._id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 cursor-pointer shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {tour.scenes.length === 0 && <p className="text-xs text-gray-400 px-1">No scenes yet.</p>}
        </div>

        <Button size="sm" onClick={() => setShowAddScene(true)} className="w-full h-8 text-xs gap-1 cursor-pointer bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
          <Plus size={12} /> Add Scene
        </Button>
      </div>

      {/* Scene viewer / hotspot editor */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {scene ? (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900 text-sm">{scene.name}</p>
                <p className="text-xs text-gray-400">Click on the panorama to place a hotspot, or toggle preview to test navigation.</p>
              </div>
              <Button size="sm" onClick={() => setPreviewMode((p) => !p)} className="h-7 text-xs gap-1 cursor-pointer bg-gray-100 text-gray-700 hover:bg-gray-200">
                {previewMode ? "Edit Mode" : "Preview"}
              </Button>
            </div>
            {previewMode ? (
              <PreviewScene tour={tour} scene={scene} onExit={() => setPreviewMode(false)} />
            ) : (
              <SceneHotspotEditor tour={tour} scene={scene} />
            )}
          </>
        ) : (
          <div className="p-10 text-center text-sm text-gray-400">Add a scene to get started.</div>
        )}
      </div>

      <Dialog open={showAddScene} onOpenChange={setShowAddScene}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Scene</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Scene name, e.g. Master Bedroom" value={sceneName} onChange={(e) => setSceneName(e.target.value)} />
            <Select value={sceneType} onValueChange={(v) => setSceneType(v as typeof sceneType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="interior">Interior</SelectItem>
                <SelectItem value="exterior">Exterior</SelectItem>
                <SelectItem value="estate">Estate</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-3 py-4 text-sm text-gray-500 cursor-pointer hover:border-indigo-300">
              <Upload size={15} />
              {sceneFile ? sceneFile.name : "Upload 360° panoramic image (equirectangular JPG/PNG)"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setSceneFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowAddScene(false)}>Cancel</Button>
            <Button onClick={handleAddScene} disabled={addingScene}>{addingScene ? "Uploading…" : "Add Scene"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type AdminTour = NonNullable<ReturnType<typeof useQuery<typeof api.propertyTours.getTourAdmin>>>;
type AdminScene = AdminTour["scenes"][number];

function SceneHotspotEditor({ tour, scene }: { tour: AdminTour; scene: AdminScene }) {
  const addHotspot = useMutation(api.propertyTours.addHotspot);
  const deleteHotspot = useMutation(api.propertyTours.deleteHotspot);
  const [placing, setPlacing] = useState<"navigation" | "info" | null>(null);
  const [pendingPos, setPendingPos] = useState<{ yaw: number; pitch: number } | null>(null);
  const [label, setLabel] = useState("");
  const [targetSceneId, setTargetSceneId] = useState<string>("");
  const [infoText, setInfoText] = useState("");

  if (!scene.panoramaUrl) return <div className="p-10 text-center text-sm text-gray-400">Panorama image unavailable.</div>;

  // Simplified placement: click anywhere on the viewer area to drop a
  // hotspot at a computed yaw/pitch based on click position within the
  // element (approximate equirectangular mapping — precise enough for a
  // self-service admin tool, refined further by dragging in a future pass).
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width; // 0..1
    const relY = (e.clientY - rect.top) / rect.height; // 0..1
    const yaw = relX * 360 - 180;
    const pitch = 90 - relY * 180;
    setPendingPos({ yaw: Math.round(yaw), pitch: Math.round(Math.max(-80, Math.min(80, pitch))) });
  };

  const otherScenes = tour.scenes.filter((s) => s._id !== scene._id);

  const handleSaveHotspot = async () => {
    if (!pendingPos || !label.trim()) { toast.error("Enter a label"); return; }
    if (placing === "navigation" && !targetSceneId) { toast.error("Choose a target scene"); return; }
    if (placing === "info" && !infoText.trim()) { toast.error("Enter info text"); return; }
    try {
      await addHotspot({
        sceneId: scene._id,
        kind: placing === "info" ? "info" : "navigation",
        yaw: pendingPos.yaw,
        pitch: pendingPos.pitch,
        label: label.trim(),
        targetSceneId: placing === "navigation" ? (targetSceneId as Id<"tourScenes">) : undefined,
        infoText: placing === "info" ? infoText.trim() : undefined,
      });
      toast.success("Hotspot added");
      setPlacing(null);
      setPendingPos(null);
      setLabel("");
      setTargetSceneId("");
      setInfoText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add hotspot");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <Button
          size="sm"
          onClick={() => setPlacing(placing === "navigation" ? null : "navigation")}
          className={cn("h-7 text-xs gap-1 cursor-pointer", placing === "navigation" ? "bg-[var(--brand)] text-white" : "bg-white text-gray-700 border border-gray-200")}
          disabled={otherScenes.length === 0}
        >
          <ArrowRightCircle size={12} /> Place Navigation Hotspot
        </Button>
        <Button
          size="sm"
          onClick={() => setPlacing(placing === "info" ? null : "info")}
          className={cn("h-7 text-xs gap-1 cursor-pointer", placing === "info" ? "bg-[var(--brand)] text-white" : "bg-white text-gray-700 border border-gray-200")}
        >
          <InfoIcon size={12} /> Place Info Hotspot
        </Button>
        {placing && <span className="text-xs text-gray-400 flex items-center gap-1"><PinIcon size={11} /> Click on the image below to place it</span>}
      </div>

      <div onClick={handleContainerClick} className={cn("relative w-full aspect-video bg-black", placing && "cursor-crosshair")}>
        <img src={scene.panoramaUrl} alt={scene.name} className="w-full h-full object-cover opacity-90" />
        {scene.hotspots.map((h) => {
          const x = ((h.yaw + 180) / 360) * 100;
          const y = ((90 - h.pitch) / 180) * 100;
          return (
            <div key={h._id} style={{ left: `${x}%`, top: `${y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 group">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white", h.kind === "navigation" ? "bg-[var(--brand)] text-white" : "bg-white text-[var(--brand)]")}>
                {h.kind === "navigation" ? <ArrowRightCircle size={13} /> : <InfoIcon size={13} />}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); void deleteHotspot({ id: h._id }); }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] items-center justify-center hidden group-hover:flex cursor-pointer"
              >
                ×
              </button>
              <span className="absolute top-8 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-white bg-black/60 rounded-full px-1.5 py-0.5 whitespace-nowrap">{h.label}</span>
            </div>
          );
        })}
        {pendingPos && (
          <div style={{ left: `${((pendingPos.yaw + 180) / 360) * 100}%`, top: `${((90 - pendingPos.pitch) / 180) * 100}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-amber-400 border-2 border-white animate-pulse" />
        )}
      </div>

      {pendingPos && (
        <div className="p-4 border-t border-gray-100 space-y-2 bg-amber-50">
          <p className="text-xs font-semibold text-amber-800">New {placing === "navigation" ? "navigation" : "info"} hotspot</p>
          <Input placeholder="Label, e.g. Go to Kitchen" value={label} onChange={(e) => setLabel(e.target.value)} />
          {placing === "navigation" ? (
            <Select value={targetSceneId} onValueChange={setTargetSceneId}>
              <SelectTrigger><SelectValue placeholder="Target scene" /></SelectTrigger>
              <SelectContent>
                {otherScenes.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Textarea placeholder="Info text shown to visitors" value={infoText} onChange={(e) => setInfoText(e.target.value)} rows={2} />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveHotspot} className="cursor-pointer">Save Hotspot</Button>
            <Button size="sm" variant="secondary" onClick={() => { setPendingPos(null); setPlacing(null); }} className="cursor-pointer">Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewScene({ tour, scene, onExit }: { tour: AdminTour; scene: AdminScene; onExit: () => void }) {
  const [currentSceneId, setCurrentSceneId] = useState(scene._id);
  const current = tour.scenes.find((s) => s._id === currentSceneId) ?? scene;
  if (!current.panoramaUrl) return null;

  const hotspots: ViewerHotspot[] = current.hotspots.map((h) => ({
    _id: h._id, kind: h.kind, yaw: h.yaw, pitch: h.pitch, label: h.label, infoText: h.infoText, targetSceneId: h.targetSceneId,
  }));

  return (
    <div className="relative w-full aspect-video">
      <PanoramaViewer
        imageUrl={current.panoramaUrl}
        hotspots={hotspots}
        initialYaw={current.initialYaw ?? 0}
        onNavigate={(targetId) => setCurrentSceneId(targetId as Id<"tourScenes">)}
      />
      <div className="absolute top-3 left-3 bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-2">
        <Orbit size={12} /> {current.name}
      </div>
      <Button size="sm" onClick={onExit} className="absolute top-3 right-3 h-7 text-xs bg-white/90 text-gray-800 hover:bg-white cursor-pointer">
        <Spinner className="hidden" /> Exit Preview
      </Button>
    </div>
  );
}
