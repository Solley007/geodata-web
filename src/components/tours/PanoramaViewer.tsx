import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Info, ArrowRightCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner.tsx";

// ══════════════════════════════════════════════════════════════════════════
// Shared 360° panoramic viewer — used by both the admin tour preview and the
// public self-guided tour. Renders the panorama on the inside of a sphere
// with plain three.js (no React renderer layer, so it can't corrupt global
// JSX types) and lets the visitor drag to look around (yaw/pitch), matching
// a standard "photo sphere" viewer. Hotspots are absolutely-positioned HTML
// elements projected from 3D → 2D screen space every frame, keyed by
// spherical coordinates (yaw/pitch degrees) so the same data works
// regardless of screen size and is future-ready for WebXR (an XR camera
// rig can reuse the same sphere + scene graph).
// ══════════════════════════════════════════════════════════════════════════

export type ViewerHotspot = {
  _id: string;
  kind: "navigation" | "info";
  yaw: number;
  pitch: number;
  label: string;
  infoText?: string;
  targetSceneId?: string;
};

function yawPitchToVector3(yawDeg: number, pitchDeg: number, radius: number): THREE.Vector3 {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const x = radius * Math.cos(pitch) * Math.sin(yaw);
  const y = radius * Math.sin(pitch);
  const z = -radius * Math.cos(pitch) * Math.cos(yaw);
  return new THREE.Vector3(x, y, z);
}

type ProjectedHotspot = ViewerHotspot & { screenX: number; screenY: number; visible: boolean };

export default function PanoramaViewer({
  imageUrl,
  hotspots,
  initialYaw = 0,
  onNavigate,
  className,
}: {
  imageUrl: string;
  hotspots: ViewerHotspot[];
  initialYaw?: number;
  onNavigate?: (targetSceneId: string) => void;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [projected, setProjected] = useState<ProjectedHotspot[]>([]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 1;
    let height = mount.clientHeight || 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    let disposed = false;
    new THREE.TextureLoader().load(imageUrl, (texture) => {
      if (disposed) return;
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.needsUpdate = true;
      setLoading(false);
    });

    let yaw = (initialYaw * Math.PI) / 180;
    let pitch = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      yaw -= dx * 0.004;
      pitch = Math.max(-1.4, Math.min(1.4, pitch + dy * 0.004));
    };
    const onPointerUp = () => { dragging = false; };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const target = new THREE.Vector3();
    const projector = new THREE.Vector3();

    let rafId = 0;
    const animate = () => {
      target.set(
        Math.cos(pitch) * Math.sin(yaw),
        Math.sin(pitch),
        -Math.cos(pitch) * Math.cos(yaw)
      );
      camera.lookAt(camera.position.clone().add(target));
      renderer.render(scene, camera);

      // Project hotspots to screen space for the HTML overlay.
      const next: ProjectedHotspot[] = hotspots.map((h) => {
        const pos = yawPitchToVector3(h.yaw, h.pitch, 480);
        projector.copy(pos).project(camera);
        const visible = projector.z < 1;
        return {
          ...h,
          screenX: (projector.x * 0.5 + 0.5) * width,
          screenY: (-projector.y * 0.5 + 0.5) * height,
          visible,
        };
      });
      setProjected(next);

      rafId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      width = mount.clientWidth || 1;
      height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      material.map?.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // Re-create the whole scene when the image or hotspot set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, initialYaw]);

  return (
    <div ref={mountRef} className={className ?? "relative w-full h-full bg-black"}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <Spinner className="text-white" />
        </div>
      )}
      {projected.filter((p) => p.visible).map((h) => (
        <HotspotMarker key={h._id} hotspot={h} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function HotspotMarker({ hotspot, onNavigate }: { hotspot: ProjectedHotspot; onNavigate?: (targetSceneId: string) => void }) {
  const [open, setOpen] = useState(false);
  const isNav = hotspot.kind === "navigation";
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
      style={{ left: hotspot.screenX, top: hotspot.screenY }}
    >
      <button
        type="button"
        onClick={() => (isNav && hotspot.targetSceneId ? onNavigate?.(hotspot.targetSceneId) : setOpen((o) => !o))}
        className={`pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-pointer transition-transform hover:scale-110 ${
          isNav ? "bg-[var(--brand)] text-white" : "bg-white text-[var(--brand)]"
        }`}
        title={hotspot.label}
      >
        {isNav ? <ArrowRightCircle size={18} /> : <Info size={18} />}
      </button>
      <span className="mt-1 text-[10px] font-semibold text-white bg-black/60 rounded-full px-2 py-0.5 whitespace-nowrap">
        {hotspot.label}
      </span>
      {open && !isNav && hotspot.infoText && (
        <div className="pointer-events-auto absolute top-11 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-3 text-xs text-gray-700 z-10">
          {hotspot.infoText}
        </div>
      )}
    </div>
  );
}

export function PanoramaViewerLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <Spinner className="text-white" />
    </div>
  );
}
