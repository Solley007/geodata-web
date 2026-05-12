"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PROJECTS } from "@/lib/projects-data";
import type { SiteUpdate, UpdateMediaType } from "@/lib/site-updates-types";
import { formatUpdateDate, cloudinaryVideoPoster } from "@/lib/site-updates-types";

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const today = () => new Date().toISOString().slice(0, 10);

interface CloudinaryAsset {
  secure_url:    string;
  resource_type: "image" | "video";
}

async function uploadToCloudinary(file: File, onProgress?: (pct: number) => void): Promise<CloudinaryAsset> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local.");
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);

    const resourceType = file.type.startsWith("video/") ? "video" : "image";
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(JSON.parse(xhr.responseText || "{}").error?.message ?? "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(fd);
  });
}

export default function SiteUpdatesAdmin({ pw }: { pw: string }) {
  const [mediaType,    setMediaType]    = useState<UpdateMediaType>("photo");
  const [projectSlug,  setProjectSlug]  = useState(PROJECTS[0].slug);
  const [date,         setDate]         = useState(today());
  const [title,        setTitle]        = useState("");
  const [body,         setBody]         = useState("");
  const [file,         setFile]         = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [preview,      setPreview]      = useState<string | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [msg,          setMsg]          = useState<{ ok: boolean; text: string } | null>(null);

  const [updates,      setUpdates]      = useState<SiteUpdate[]>([]);
  const [loadingList,  setLoadingList]  = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res  = await fetch("/api/admin/site-updates");
      const data = await res.json();
      setUpdates(Array.isArray(data) ? data : []);
    } finally { setLoadingList(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  function handleFilePick(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (mediaType === "gallery") {
      setGalleryFiles(Array.from(files));
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(files[0]);
    } else {
      const f = files[0];
      setFile(f);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    }
  }

  function reset() {
    setFile(null); setGalleryFiles([]); setPreview(null);
    setTitle(""); setBody("");
    if (fileRef.current) fileRef.current.value = "";
    setProgress(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setMsg({ ok: false, text: "Title is required." }); return; }

    if (mediaType === "gallery" && galleryFiles.length === 0) {
      setMsg({ ok: false, text: "Select at least one photo." }); return;
    }
    if (mediaType !== "gallery" && !file) {
      setMsg({ ok: false, text: `Select a ${mediaType} file.` }); return;
    }

    setUploading(true); setMsg(null); setProgress(0);
    try {
      let coverImage = "";
      let videoUrl: string | undefined;
      let gallery: string[] | undefined;

      if (mediaType === "photo") {
        const result = await uploadToCloudinary(file!, setProgress);
        coverImage = result.secure_url;
      } else if (mediaType === "video") {
        const result = await uploadToCloudinary(file!, setProgress);
        videoUrl = result.secure_url;
        coverImage = cloudinaryVideoPoster(result.secure_url);
      } else if (mediaType === "gallery") {
        const urls: string[] = [];
        for (let i = 0; i < galleryFiles.length; i++) {
          const result = await uploadToCloudinary(galleryFiles[i], (p) => {
            setProgress(Math.round(((i + p / 100) / galleryFiles.length) * 100));
          });
          urls.push(result.secure_url);
        }
        gallery = urls;
        coverImage = urls[0];
      }

      // Save metadata
      const res = await fetch("/api/admin/site-updates", {
        method: "POST",
        headers: { "x-admin-password": pw, "Content-Type": "application/json" },
        body: JSON.stringify({
          title, date, body, projectSlug, mediaType, coverImage, videoUrl, gallery,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: "Update published. Commit and push to deploy." });
        reset();
        fetchList();
      } else {
        setMsg({ ok: false, text: data.error ?? "Failed to save metadata." });
      }
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this update? The Cloudinary asset will remain in your account but will no longer appear on the site.")) return;
    await fetch("/api/admin/site-updates", {
      method: "DELETE",
      headers: { "x-admin-password": pw, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchList();
  }

  const cloudinaryReady = !!CLOUD_NAME && !!UPLOAD_PRESET;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Form */}
      <div className="bg-bone border border-hairline p-8">
        <h2 className="font-display text-2xl text-navy-950 mb-2">Publish site update</h2>
        <p className="text-xs text-ink-muted mb-7">Photos and videos appear on the homepage, the Updates feed, and the project page.</p>

        {!cloudinaryReady && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-xs text-red-700">
            <p className="font-medium mb-1">Cloudinary not configured</p>
            <p>Add <code className="font-mono">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code> and <code className="font-mono">NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</code> to <code className="font-mono">.env.local</code>, then restart the dev server.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="admin-label">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Block A roof complete"
              className="admin-input" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="admin-input" />
            </div>
            <div>
              <label className="admin-label">Project</label>
              <select value={projectSlug} onChange={(e) => setProjectSlug(e.target.value)} className="admin-select">
                {PROJECTS.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="admin-label">Description</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4}
              placeholder="A few sentences about this update — what was done, what's next."
              className="w-full border border-hairline bg-bone px-3 py-2 text-sm text-navy-950 focus:outline-none focus:border-gold resize-none" />
          </div>

          {/* Media type selector */}
          <div>
            <label className="admin-label">Media type</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(["photo", "video", "gallery"] as const).map((t) => (
                <button key={t} type="button" onClick={() => { setMediaType(t); reset(); }}
                  className={`py-2 text-xs uppercase tracking-widest border transition-colors ${
                    mediaType === t ? "bg-navy-900 text-bone border-navy-900" : "bg-bone text-ink-muted border-hairline hover:border-navy-900"
                  }`}>{t}</button>
              ))}
            </div>
          </div>

          {/* File picker */}
          <div>
            <label className="admin-label">
              {mediaType === "photo" ? "Photo file" :
               mediaType === "video" ? "Video file" : "Photos (multiple)"}
            </label>
            <div
              className="border-2 border-dashed border-hairline hover:border-navy-900 transition-colors cursor-pointer text-center p-6"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFilePick(e.dataTransfer.files); }}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="preview" className="max-h-40 mx-auto object-contain" />
              ) : (
                <div>
                  <p className="text-ink-muted text-sm">Drag & drop or click to select</p>
                  <p className="text-xs text-ink-faint mt-1">
                    {mediaType === "video" ? "MP4, MOV, WebM" : "JPG, PNG, WebP"}
                  </p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file"
              accept={mediaType === "video" ? "video/*" : "image/*"}
              multiple={mediaType === "gallery"}
              className="hidden"
              onChange={(e) => handleFilePick(e.target.files)} />
            {file && <p className="mt-2 text-xs text-ink-muted">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
            {galleryFiles.length > 0 && <p className="mt-2 text-xs text-ink-muted">{galleryFiles.length} files selected ({(galleryFiles.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(2)} MB total)</p>}
          </div>

          {uploading && progress > 0 && (
            <div>
              <div className="text-xs text-ink-muted mb-1">Uploading to Cloudinary… {progress}%</div>
              <div className="h-1 bg-hairline overflow-hidden">
                <div className="h-full bg-gold transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-500"}`}>{msg.text}</p>}

          <button type="submit" disabled={uploading || !cloudinaryReady}
            className="w-full bg-navy-900 text-bone py-3 text-xs uppercase tracking-widest hover:bg-navy-800 transition-colors disabled:opacity-50">
            {uploading ? "Publishing…" : "Publish update"}
          </button>
        </form>
      </div>

      {/* Existing updates */}
      <div>
        <h2 className="font-display text-2xl text-navy-950 mb-4">Published updates</h2>
        {loadingList ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : updates.length === 0 ? (
          <div className="bg-bone border border-dashed border-hairline p-8 text-center">
            <p className="text-sm text-ink-muted">No updates yet. Publish your first one using the form.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {updates.map((u) => {
              const proj = PROJECTS.find((p) => p.slug === u.projectSlug);
              return (
                <div key={u.id} className="bg-bone border border-hairline flex gap-4 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.coverImage} alt={u.title} className="h-20 w-20 object-cover shrink-0 bg-navy-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-faint uppercase tracking-widest mb-1">
                      {proj?.title ?? u.projectSlug}{" · "}{u.mediaType}{" · "}{formatUpdateDate(u.date)}
                    </p>
                    <p className="text-sm text-navy-950 leading-snug truncate font-medium">{u.title}</p>
                    {u.body && <p className="text-xs text-ink-muted leading-snug line-clamp-1 mt-1">{u.body}</p>}
                  </div>
                  <button onClick={() => handleDelete(u.id)} className="shrink-0 text-red-400 hover:text-red-600 text-sm px-2" title="Delete">✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
