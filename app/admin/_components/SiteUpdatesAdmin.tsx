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

  // Video paste-URL mode
  const [videoInputMode, setVideoInputMode] = useState<"upload" | "paste">("upload");
  const [pastedVideoUrl, setPastedVideoUrl] = useState("");

  // Custom project dropdown
  const [projOpen, setProjOpen] = useState(false);
  const projRef = useRef<HTMLDivElement>(null);

  // Close project dropdown on outside click
  useEffect(() => {
    if (!projOpen) return;
    const handler = (e: MouseEvent) => {
      if (!projRef.current?.contains(e.target as Node)) setProjOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [projOpen]);

  const [updates,      setUpdates]      = useState<SiteUpdate[]>([]);
  const [loadingList,  setLoadingList]  = useState(false);

  // Edit mode — null = creating new; string = editing this update id
  const [editingId, setEditingId] = useState<string | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  // Notify subscribers state
  const [notifyingId,   setNotifyingId]   = useState<string | null>(null);
  const [notifyMsg,     setNotifyMsg]     = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res  = await fetch("/api/admin/site-updates");
      const data = await res.json();
      setUpdates(Array.isArray(data) ? data : []);
    } finally { setLoadingList(false); }
  }, []);

  const fetchSubscriberCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notify", {
        headers: { "x-admin-password": pw },
      });
      const data = await res.json();
      setSubscriberCount(typeof data?.count === "number" ? data.count : null);
    } catch { /* ignore */ }
  }, [pw]);

  useEffect(() => { fetchList(); fetchSubscriberCount(); }, [fetchList, fetchSubscriberCount]);

  async function handleNotify(id: string) {
    if (!confirm("Send email notification to all subscribers about this update?")) return;
    setNotifyingId(id);
    setNotifyMsg(null);
    try {
      const res  = await fetch("/api/admin/notify", {
        method:  "POST",
        headers: { "x-admin-password": pw, "Content-Type": "application/json" },
        body:    JSON.stringify({ updateId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifyMsg({ id, ok: true, text: "Notification sent to subscribers." });
      } else {
        setNotifyMsg({ id, ok: false, text: data.error ?? "Failed to send." });
      }
    } catch (err: any) {
      setNotifyMsg({ id, ok: false, text: err.message });
    } finally {
      setNotifyingId(null);
    }
  }

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
    setEditingId(null);
    setPastedVideoUrl("");
    if (fileRef.current) fileRef.current.value = "";
    setProgress(0);
  }

  function startEdit(u: SiteUpdate) {
    setEditingId(u.id);
    setTitle(u.title);
    setBody(u.body ?? "");
    setDate(u.date);
    setProjectSlug(u.projectSlug);
    setMediaType(u.mediaType);
    // Don't pre-fill file inputs (browsers won't allow it). User keeps existing
    // media by leaving the file pickers empty.
    setFile(null);
    setGalleryFiles([]);
    setPreview(u.coverImage);
    setPastedVideoUrl(u.videoUrl ?? "");
    setVideoInputMode(u.mediaType === "video" ? "paste" : "upload");
    setMsg(null);
    // Scroll the form into view
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    reset();
    setMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setMsg({ ok: false, text: "Title is required." }); return; }

    const isEditing = editingId !== null;

    // Validate media — only required when CREATING; editing can keep existing media
    if (!isEditing) {
      if (mediaType === "video" && videoInputMode === "paste") {
        if (!pastedVideoUrl.trim()) { setMsg({ ok: false, text: "Paste a Cloudinary video URL." }); return; }
      } else if (mediaType === "gallery" && galleryFiles.length === 0) {
        setMsg({ ok: false, text: "Select at least one photo." }); return;
      } else if (mediaType !== "gallery" && !file && !(mediaType === "video" && videoInputMode === "paste")) {
        setMsg({ ok: false, text: `Select a ${mediaType} file.` }); return;
      }
    }

    setUploading(true); setMsg(null); setProgress(0);
    try {
      // Media handling: undefined means "keep existing" when editing
      let coverImage: string | undefined;
      let videoUrl:   string | undefined;
      let gallery:    string[] | undefined;

      if (mediaType === "photo" && file) {
        const result = await uploadToCloudinary(file, setProgress);
        coverImage = result.secure_url;
      } else if (mediaType === "video") {
        if (videoInputMode === "paste" && pastedVideoUrl.trim()) {
          videoUrl   = pastedVideoUrl.trim();
          coverImage = cloudinaryVideoPoster(videoUrl);
        } else if (videoInputMode === "upload" && file) {
          const result = await uploadToCloudinary(file, setProgress);
          videoUrl   = result.secure_url;
          coverImage = cloudinaryVideoPoster(result.secure_url);
        }
      } else if (mediaType === "gallery" && galleryFiles.length > 0) {
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

      // Build payload — omit media fields that are undefined so the PUT handler
      // keeps the existing values
      const payload: any = { title, date, body, projectSlug, mediaType };
      if (coverImage !== undefined) payload.coverImage = coverImage;
      if (videoUrl   !== undefined) payload.videoUrl   = videoUrl;
      if (gallery    !== undefined) payload.gallery    = gallery;
      if (isEditing) payload.id = editingId;

      const res = await fetch("/api/admin/site-updates", {
        method: isEditing ? "PUT" : "POST",
        headers: { "x-admin-password": pw, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: isEditing ? "Update edited. Commit and push to deploy." : "Update published. Commit and push to deploy." });
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
      <div ref={formTopRef} className={`bg-bone border p-8 ${editingId ? "border-gold" : "border-hairline"}`}>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h2 className="font-display text-2xl text-navy-950">
            {editingId ? "Edit site update" : "Publish site update"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs uppercase tracking-widest text-ink-muted hover:text-navy-950 transition-colors px-3 py-1.5 border border-hairline"
            >
              Cancel edit
            </button>
          )}
        </div>
        <p className="text-xs text-ink-muted mb-7">
          {editingId
            ? "Update title, body, date, or replace the media. Leave file pickers empty to keep existing media."
            : "Photos and videos appear on the homepage, the Updates feed, and the project page."}
        </p>

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
              <div ref={projRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProjOpen((v) => !v)}
                  className="w-full flex items-center justify-between border-b border-navy-900 py-2 text-sm text-navy-950 bg-transparent outline-none cursor-pointer text-left"
                >
                  <span>{PROJECTS.find((p) => p.slug === projectSlug)?.name ?? "Select project"}</span>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${projOpen ? "rotate-180" : ""}`}><polyline points="4 6 8 10 12 6"/></svg>
                </button>
                {projOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 bg-white border border-hairline shadow-lg max-h-56 overflow-y-auto">
                    {PROJECTS.map((p) => (
                      <button
                        key={p.slug}
                        type="button"
                        onClick={() => { setProjectSlug(p.slug); setProjOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-bone-100 ${projectSlug === p.slug ? "font-medium text-navy-950 bg-bone" : "text-navy-900"}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

          {/* File picker / URL paste */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="admin-label !mb-0">
                {mediaType === "photo" ? "Photo file" :
                 mediaType === "video" ? "Video" : "Photos (multiple)"}
              </label>
              {/* Toggle: upload vs paste URL — only for video */}
              {mediaType === "video" && (
                <div className="flex text-[11px] border border-hairline">
                  {(["upload", "paste"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { setVideoInputMode(mode); setFile(null); setPastedVideoUrl(""); setPreview(null); }}
                      className={`px-3 py-1 uppercase tracking-wider transition-colors ${videoInputMode === mode ? "bg-navy-900 text-bone" : "text-ink-muted hover:text-navy-950"}`}
                    >
                      {mode === "upload" ? "Upload file" : "Paste URL"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Paste URL input — video only */}
            {mediaType === "video" && videoInputMode === "paste" ? (
              <div>
                <input
                  type="url"
                  value={pastedVideoUrl}
                  onChange={(e) => setPastedVideoUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/your-cloud/video/upload/..."
                  className="w-full border border-hairline bg-white px-3 py-2.5 text-sm text-navy-950 placeholder:text-ink-faint focus:outline-none focus:border-gold"
                />
                <p className="mt-1.5 text-xs text-ink-muted">Paste any Cloudinary video URL. The thumbnail is generated automatically.</p>
              </div>
            ) : (
              <>
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
              </>
            )}
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
            className={`w-full text-bone py-3 text-xs uppercase tracking-widest transition-colors disabled:opacity-50 ${
              editingId ? "bg-gold-dark hover:bg-gold text-navy-950" : "bg-navy-900 hover:bg-navy-800"
            }`}>
            {uploading
              ? (editingId ? "Saving…" : "Publishing…")
              : (editingId ? "Save changes" : "Publish update")}
          </button>
        </form>
      </div>

      {/* Existing updates */}
      <div>
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="font-display text-2xl text-navy-950">Published updates</h2>
          {subscriberCount !== null && (
            <p className="text-xs text-ink-muted">
              <span className="font-medium text-navy-950">{subscriberCount}</span> subscriber{subscriberCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
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
                <div key={u.id} className="bg-bone border border-hairline p-4">
                  <div className="flex gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u.coverImage} alt={u.title} className="h-20 w-20 object-cover shrink-0 bg-navy-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink-faint uppercase tracking-widest mb-1">
                        {proj?.name ?? u.projectSlug}{" · "}{u.mediaType}{" · "}{formatUpdateDate(u.date)}
                      </p>
                      <p className="text-sm text-navy-950 leading-snug truncate font-medium">{u.title}</p>
                      {u.body && <p className="text-xs text-ink-muted leading-snug line-clamp-1 mt-1">{u.body}</p>}
                    </div>
                    <div className="shrink-0 flex items-start gap-1">
                      <button
                        onClick={() => startEdit(u)}
                        className="text-navy-900 hover:text-gold-dark text-sm px-2"
                        title="Edit"
                      >✎</button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-red-400 hover:text-red-600 text-sm px-2"
                        title="Delete"
                      >✕</button>
                    </div>
                  </div>
                  {/* Notify action row */}
                  <div className="mt-3 pt-3 border-t border-hairline flex items-center justify-between gap-3">
                    <button
                      onClick={() => handleNotify(u.id)}
                      disabled={notifyingId === u.id}
                      className="text-xs font-medium text-navy-900 hover:text-gold-dark transition-colors uppercase tracking-widest disabled:opacity-50"
                    >
                      {notifyingId === u.id ? "Sending…" : "✉ Notify subscribers"}
                    </button>
                    {notifyMsg?.id === u.id && (
                      <p className={`text-xs ${notifyMsg.ok ? "text-green-700" : "text-red-500"}`}>{notifyMsg.text}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
