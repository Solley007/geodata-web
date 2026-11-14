import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { RichTextEditor } from "@/components/ui/rich-text-editor.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { X, Plus, Link2, Upload, Image as ImageIcon, Video, MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import DiasporaVisibilityPanel from "./DiasporaVisibilityPanel.tsx";
import SeoFields from "@/components/SeoFields.tsx";

type Props = {
  propertyId: Id<"properties"> | null;
  onSuccess: () => void;
  onCancel: () => void;
};

const AMENITY_SUGGESTIONS = [
  "Swimming Pool", "Gym", "Security", "Parking", "24/7 Power",
  "Water Supply", "CCTV", "Garden", "Playground", "Clubhouse",
  "School Nearby", "Shopping Mall",
];

// Each gallery/featured slot: image or video, uploaded or URL
type MediaSlot = {
  storageId: Id<"_storage"> | null;
  url: string;
  useUrl: boolean;
  preview: string;
  mediaType: "image" | "video";
};

const emptyImageSlot = (): MediaSlot => ({ storageId: null, url: "", useUrl: false, preview: "", mediaType: "image" });
const emptyVideoSlot = (): MediaSlot => ({ storageId: null, url: "", useUrl: true, preview: "", mediaType: "video" });

function MediaSlotEditor({
  slot,
  label,
  required,
  onChange,
  onRemove,
  allowMediaTypeToggle = false,
}: {
  slot: MediaSlot;
  label: string;
  required?: boolean;
  onChange: (patch: Partial<MediaSlot>) => void;
  onRemove?: () => void;
  allowMediaTypeToggle?: boolean;
}) {
  const preview = slot.storageId ? slot.preview : slot.url;
  const isVideo = slot.mediaType === "video";

  return (
    <div className="rounded-xl border border-gray-200 p-3 space-y-2 bg-gray-50">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">{label}{required && " *"}</span>
          {allowMediaTypeToggle && (
            <div className="flex gap-1">
              <button type="button"
                onClick={() => onChange({ mediaType: "image", storageId: null, preview: "", url: "" })}
                className={cn("px-2 py-0.5 rounded text-xs font-medium border transition-colors flex items-center gap-1",
                  !isVideo ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand)]/40")}>
                <ImageIcon size={10} /> Image
              </button>
              <button type="button"
                onClick={() => onChange({ mediaType: "video", storageId: null, preview: "", url: "", useUrl: true })}
                className={cn("px-2 py-0.5 rounded text-xs font-medium border transition-colors flex items-center gap-1",
                  isVideo ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand)]/40")}>
                <Video size={10} /> Video
              </button>
            </div>
          )}
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors">
            <X size={11} />
          </button>
        )}
      </div>

      {/* Upload / URL toggle — videos always use URL; images can upload or URL */}
      {!isVideo && (
        <div className="flex gap-1.5">
          <button type="button"
            onClick={() => onChange({ useUrl: false })}
            className={cn("flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1",
              !slot.useUrl ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand)]/40")}>
            <Upload size={10} /> Upload
          </button>
          <button type="button"
            onClick={() => onChange({ useUrl: true })}
            className={cn("flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1",
              slot.useUrl ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-gray-500 border-gray-200 hover:border-[var(--brand)]/40")}>
            <Link2 size={10} /> URL
          </button>
        </div>
      )}

      {/* Input area */}
      {isVideo ? (
        <div>
          <Input
            placeholder="https://youtube.com/watch?v=... or direct video URL"
            value={slot.url}
            onChange={(e) => onChange({ url: e.target.value, storageId: null })}
            className="text-sm h-8"
          />
          {slot.url && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <Video size={12} className="text-[var(--brand)]" />
              Video URL saved — will display on property detail page
            </div>
          )}
        </div>
      ) : slot.useUrl ? (
        <div>
          <Input
            placeholder="https://images.unsplash.com/…"
            value={slot.url}
            onChange={(e) => onChange({ url: e.target.value, storageId: null })}
            className="text-sm h-8"
          />
          {slot.url && (
            <img src={slot.url} alt={label} className="mt-2 h-24 w-full rounded-lg object-cover border border-gray-200"
              onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
        </div>
      ) : (
        <FileUploadButton
          variant="dropzone"
          mediaType="image"
          label="Click to upload image"
          currentUrl={preview || null}
          currentStorageId={slot.storageId}
          onUpload={(storageId, url) => onChange({ storageId, preview: url ?? "", useUrl: false })}
          onClear={() => onChange({ storageId: null, preview: "", useUrl: false })}
        />
      )}
    </div>
  );
}

// ── Map Location Section ─────────────────────────────────────────────
function parseGoogleMapsUrl(url: string): { lat: string; lng: string } | null {
  // Handles: @lat,lng,zoom  or  ?q=lat,lng  or  ll=lat,lng
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };
  const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (llMatch) return { lat: llMatch[1], lng: llMatch[2] };
  return null;
}

function MapLocationSection({
  lat, lng, onChange,
}: {
  lat: string; lng: string;
  onChange: (lat: string, lng: string) => void;
}) {
  const [mapsLink, setMapsLink] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handlePasteLink = () => {
    const coords = parseGoogleMapsUrl(mapsLink);
    if (coords) {
      onChange(coords.lat, coords.lng);
      setShowPreview(true);
      toast.success(`Coordinates extracted: ${coords.lat}, ${coords.lng}`);
    } else {
      toast.error("Couldn't extract coordinates — try a maps.google.com link with @lat,lng in the URL");
    }
  };

  const hasCoords = lat && lng;
  const embedUrl = hasCoords
    ? `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d2000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sng!4v1700000000000!5m2!1sen!2sng`
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin size={14} className="text-[var(--brand)]" />
        <Label className="text-xs font-semibold text-gray-700">Map Location</Label>
        <span className="text-xs text-gray-400">(shown on property detail page)</span>
      </div>

      {/* Paste Google Maps link */}
      <div>
        <Label className="text-xs text-gray-500 mb-1.5 block">Paste a Google Maps link to auto-fill coordinates</Label>
        <div className="flex gap-2">
          <Input
            placeholder="https://maps.google.com/maps?q=9.057,7.399 or copy URL from Google Maps"
            value={mapsLink}
            onChange={(e) => setMapsLink(e.target.value)}
            className="text-sm flex-1"
          />
          <Button type="button" onClick={handlePasteLink}
            className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-xs px-3 shrink-0 gap-1">
            <MapPin size={12} /> Extract
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          Open Google Maps → find the property → copy the URL → paste here.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className="flex-1 h-px bg-gray-200" />
        <span>or enter manually</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Manual lat/lng */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Latitude</Label>
          <Input
            placeholder="e.g. 9.057853"
            value={lat}
            onChange={(e) => { onChange(e.target.value, lng); setShowPreview(false); }}
            className="text-sm font-mono"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Longitude</Label>
          <Input
            placeholder="e.g. 7.399722"
            value={lng}
            onChange={(e) => { onChange(lat, e.target.value); setShowPreview(false); }}
            className="text-sm font-mono"
          />
        </div>
      </div>

      {/* Live preview */}
      {hasCoords && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setShowPreview((p) => !p)}
              className="text-xs text-[var(--brand)] hover:underline flex items-center gap-1">
              {showPreview ? "Hide" : "Show"} map preview
            </button>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-[var(--brand)] flex items-center gap-1">
              Open in Google Maps <ExternalLink size={10} />
            </a>
          </div>
          {showPreview && embedUrl && (
            <div className="rounded-xl overflow-hidden border border-gray-200 h-48">
              <iframe
                src={embedUrl}
                width="100%" height="100%"
                style={{ border: 0 }}
                allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Property Map Preview"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PropertyForm({ propertyId, onSuccess, onCancel }: Props) {
  const properties = useQuery(api.admin.listProperties, {});
  const property = propertyId ? properties?.find((p) => p._id === propertyId) : null;

  const createProperty = useMutation(api.admin.createProperty);
  const updateProperty = useMutation(api.admin.updateProperty);

  const [loading, setLoading] = useState(false);
  const [amenityInput, setAmenityInput] = useState("");

  const [featuredSlot, setFeaturedSlot] = useState<MediaSlot>(emptyImageSlot());
  const [gallerySlots, setGallerySlots] = useState<MediaSlot[]>([emptyImageSlot()]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    priceType: "outright",
    propertyType: "residential",
    status: "available",
    location: "",
    state: "",
    lga: "",
    estate: "",
    bedrooms: "",
    bathrooms: "",
    landSize: "",
    amenities: [] as string[],
    featured: false,
    yearBuilt: "",
    floors: "",
    parkingSpaces: "",
    plotNumber: "",
    mapLat: "",
    mapLng: "",
    seoTitle: "",
    seoDescription: "",
  });

  useEffect(() => {
    if (property) {
      setForm({
        title: property.title,
        description: property.description,
        price: String(property.price),
        priceType: property.priceType,
        propertyType: property.propertyType,
        status: property.status,
        location: property.location,
        state: property.state,
        lga: property.lga,
        estate: property.estate ?? "",
        bedrooms: property.bedrooms != null ? String(property.bedrooms) : "",
        bathrooms: property.bathrooms != null ? String(property.bathrooms) : "",
        landSize: property.landSize ?? "",
        amenities: property.amenities,
        featured: property.featured,
        yearBuilt: property.yearBuilt != null ? String(property.yearBuilt) : "",
        floors: property.floors != null ? String(property.floors) : "",
        parkingSpaces: property.parkingSpaces != null ? String(property.parkingSpaces) : "",
        plotNumber: property.plotNumber ?? "",
        mapLat: property.mapLat != null ? String(property.mapLat) : "",
        mapLng: property.mapLng != null ? String(property.mapLng) : "",
        seoTitle: property.seoTitle ?? "",
        seoDescription: property.seoDescription ?? "",
      });

      // Featured image slot
      setFeaturedSlot({
        storageId: (property.featuredImageStorageId ?? null) as Id<"_storage"> | null,
        url: property.featuredImage,
        useUrl: !property.featuredImageStorageId,
        preview: property.featuredImage,
        mediaType: "image",
      });

      // Gallery slots — preserve existing images as URL slots
      const videoUrl = property.videoUrl;
      const imgSlots: MediaSlot[] = property.images.length
        ? property.images.map((img) => ({ storageId: null, url: img, useUrl: true, preview: img, mediaType: "image" as const }))
        : [emptyImageSlot()];

      // If there's a stored videoUrl, add it as a video slot at the end
      if (videoUrl) {
        imgSlots.push({ ...emptyVideoSlot(), url: videoUrl });
      }

      setGallerySlots(imgSlots);
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasFeaturedImage = !!(featuredSlot.storageId || featuredSlot.url.trim());
    if (!form.title || !form.price || !form.location || !form.state || !hasFeaturedImage) {
      toast.error("Please fill required fields: title, price, location, state, featured image");
      return;
    }

    setLoading(true);
    try {
      const imageSlots = gallerySlots.filter((s) => s.mediaType === "image" && (s.storageId || s.url.trim()));
      const videoSlots = gallerySlots.filter((s) => s.mediaType === "video" && s.url.trim());

      const galleryStorageIds = imageSlots
        .filter((s) => s.storageId)
        .map((s) => s.storageId as Id<"_storage">);
      const galleryUrls = imageSlots.map((s) => (s.storageId ? s.preview : s.url)).filter(Boolean);

      // First video URL in gallery becomes the property videoUrl
      const videoUrl = videoSlots[0]?.url || undefined;

      const featuredImageValue = featuredSlot.preview || featuredSlot.url || "";

      const payload = {
        title: form.title,
        description: form.description,
        price: Number(form.price),
        priceType: form.priceType,
        propertyType: form.propertyType,
        status: form.status,
        location: form.location,
        state: form.state,
        lga: form.lga,
        estate: form.estate || undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        landSize: form.landSize || undefined,
        featuredImage: featuredImageValue,
        featuredImageStorageId: featuredSlot.storageId ?? undefined,
        images: galleryUrls.length ? galleryUrls : (featuredImageValue ? [featuredImageValue] : []),
        imageStorageIds: galleryStorageIds.length ? galleryStorageIds : undefined,
        amenities: form.amenities,
        featured: form.featured,
        videoUrl,
        yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : undefined,
        floors: form.floors ? Number(form.floors) : undefined,
        parkingSpaces: form.parkingSpaces ? Number(form.parkingSpaces) : undefined,
        plotNumber: form.plotNumber || undefined,
        mapLat: form.mapLat ? Number(form.mapLat) : undefined,
        mapLng: form.mapLng ? Number(form.mapLng) : undefined,
        // Empty string (not undefined) so clearing a field actually clears the stored value on update
        seoTitle: form.seoTitle.trim(),
        seoDescription: form.seoDescription.trim(),
      };

      if (propertyId) {
        await updateProperty({ id: propertyId, ...payload });
      } else {
        await createProperty(payload);
      }
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save property";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const addAmenity = (a: string) => {
    if (a && !form.amenities.includes(a)) setForm({ ...form, amenities: [...form.amenities, a] });
    setAmenityInput("");
  };

  const f = (field: keyof typeof form, value: string | boolean | string[]) =>
    setForm({ ...form, [field]: value });

  const updateGallerySlot = (i: number, patch: Partial<MediaSlot>) => {
    const next = [...gallerySlots];
    next[i] = { ...next[i], ...patch };
    setGallerySlots(next);
  };

  const addGallerySlot = (type: "image" | "video") =>
    setGallerySlots((prev) => [...prev, type === "video" ? emptyVideoSlot() : emptyImageSlot()]);
  const removeGallerySlot = (i: number) => setGallerySlots((prev) => prev.filter((_, j) => j !== i));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic Info */}
      <div className="grid gap-4">
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Title *</Label>
          <Input placeholder="e.g. Royal Gardens 4-Bed Villa" value={form.title} onChange={(e) => f("title", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Description</Label>
          <RichTextEditor value={form.description} onChange={(html) => f("description", html)} placeholder="Property description..." minHeight={140} />
        </div>
      </div>

      {/* Price & Type */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Price (₦) *</Label>
          <Input type="number" placeholder="45000000" value={form.price} onChange={(e) => f("price", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Price Type</Label>
          <Select value={form.priceType} onValueChange={(v) => f("priceType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="outright">Outright</SelectItem>
              <SelectItem value="installment">Installment</SelectItem>
              <SelectItem value="rent">Rent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Status</Label>
          <Select value={form.status} onValueChange={(v) => f("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="under_construction">Under Construction</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Property Type</Label>
          <Select value={form.propertyType} onValueChange={(v) => f("propertyType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Bedrooms</Label>
          <Input type="number" placeholder="4" value={form.bedrooms} onChange={(e) => f("bedrooms", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Bathrooms</Label>
          <Input type="number" placeholder="3" value={form.bathrooms} onChange={(e) => f("bathrooms", e.target.value)} />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Label className="text-xs font-semibold mb-1.5 block">Location *</Label>
          <Input placeholder="e.g. Gwarimpa, Abuja" value={form.location} onChange={(e) => f("location", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">State *</Label>
          <Input placeholder="e.g. FCT" value={form.state} onChange={(e) => f("state", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">LGA</Label>
          <Input placeholder="e.g. Abuja Municipal" value={form.lga} onChange={(e) => f("lga", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Estate</Label>
          <Input placeholder="e.g. Royal Gardens" value={form.estate} onChange={(e) => f("estate", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Plot Number</Label>
          <Input placeholder="e.g. A23" value={form.plotNumber} onChange={(e) => f("plotNumber", e.target.value)} />
        </div>
      </div>

      {/* Map Location */}
      <MapLocationSection
        lat={form.mapLat}
        lng={form.mapLng}
        onChange={(lat, lng) => setForm((prev) => ({ ...prev, mapLat: lat, mapLng: lng }))}
      />

      {/* Featured Image */}
      <div>
        <Label className="text-xs font-semibold mb-2 block flex items-center gap-1.5">
          <ImageIcon size={13} className="text-[var(--brand)]" /> Featured Image *
          <span className="font-normal text-gray-400">(shown in listing cards)</span>
        </Label>
        <MediaSlotEditor
          slot={featuredSlot}
          label="Featured image"
          required
          onChange={(patch) => setFeaturedSlot((prev) => ({ ...prev, ...patch }))}
        />
      </div>

      {/* Gallery — Images & Videos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <ImageIcon size={13} className="text-[var(--brand)]" /> Gallery
            <span className="font-normal text-gray-400">(images & videos shown on property detail)</span>
          </Label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => addGallerySlot("image")}
              className="text-xs text-[var(--brand)] flex items-center gap-1 hover:underline border border-[var(--brand)]/30 rounded-lg px-2 py-1">
              <Plus size={11} /><ImageIcon size={11} /> Add Image
            </button>
            <button type="button" onClick={() => addGallerySlot("video")}
              className="text-xs text-[var(--brand)] flex items-center gap-1 hover:underline border border-[var(--brand)]/30 rounded-lg px-2 py-1">
              <Plus size={11} /><Video size={11} /> Add Video
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {gallerySlots.map((slot, i) => (
            <MediaSlotEditor
              key={i}
              slot={slot}
              label={slot.mediaType === "video" ? `Video ${gallerySlots.filter((s, j) => s.mediaType === "video" && j <= i).length}` : `Image ${gallerySlots.filter((s, j) => s.mediaType === "image" && j <= i).length}`}
              allowMediaTypeToggle
              onChange={(patch) => updateGallerySlot(i, patch)}
              onRemove={gallerySlots.length > 1 ? () => removeGallerySlot(i) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <Label className="text-xs font-semibold mb-1.5 block">Amenities</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.amenities.map((a) => (
            <Badge key={a} className="bg-[var(--brand)]/10 text-[var(--brand)] border-0 text-xs gap-1">
              {a}
              <button type="button" onClick={() => f("amenities", form.amenities.filter((x) => x !== a))}>
                <X size={10} />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {AMENITY_SUGGESTIONS.filter((a) => !form.amenities.includes(a)).map((a) => (
            <button key={a} type="button" onClick={() => addAmenity(a)}
              className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-[var(--brand)]/10 hover:text-[var(--brand)] rounded-lg transition-colors border border-gray-200">
              + {a}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Custom amenity..." value={amenityInput} onChange={(e) => setAmenityInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAmenity(amenityInput); } }} className="text-sm" />
          <Button type="button" onClick={() => addAmenity(amenityInput)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3">
            <Plus size={14} />
          </Button>
        </div>
      </div>

      {/* Other details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Land Size</Label>
          <Input placeholder="e.g. 600 sqm" value={form.landSize} onChange={(e) => f("landSize", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Year Built</Label>
          <Input type="number" placeholder="2024" value={form.yearBuilt} onChange={(e) => f("yearBuilt", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Floors</Label>
          <Input type="number" placeholder="2" value={form.floors} onChange={(e) => f("floors", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Parking</Label>
          <Input type="number" placeholder="2" value={form.parkingSpaces} onChange={(e) => f("parkingSpaces", e.target.value)} />
        </div>
      </div>

      {/* Featured toggle */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => f("featured", !form.featured)}
          className={`w-10 h-5 rounded-full transition-colors ${form.featured ? "bg-[var(--brand)]" : "bg-gray-200"} relative`}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.featured ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
        <Label className="text-xs font-semibold cursor-pointer" onClick={() => f("featured", !form.featured)}>
          Featured Property
        </Label>
      </div>

      {/* Search appearance */}
      <SeoFields
        title={form.seoTitle}
        description={form.seoDescription}
        fallbackTitle={form.title ? `${form.title} – Geodata World` : "Automatic title from the property name and price"}
        fallbackDescription="Automatic description from the property name, location and price"
        path={propertyId ? `/properties/${propertyId}` : "/properties/…"}
        onChange={(patch) => setForm({ ...form, ...patch })}
      />

      {/* Diaspora Investment & Property Platform visibility — only shown once
          the property has been saved, since the toggles patch a real record. */}
      {propertyId && <DiasporaVisibilityPanel propertyId={propertyId} />}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button type="button" onClick={onCancel} className="bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
        <Button type="submit" disabled={loading} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2">
          {loading ? "Saving..." : propertyId ? "Update Property" : "Create Property"}
        </Button>
      </div>
    </form>
  );
}
