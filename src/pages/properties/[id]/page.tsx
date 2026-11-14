import { useState, useEffect, useRef } from "react";
import { StyledMap } from "@/pages/home/RealEstateLandingPage.tsx";
import { SBC_FLOOR_PLANS, SBC_SITE_UPDATES, SBC_VIDEOS } from "@/pages/developments/page.tsx";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import QRCodeLib from "qrcode";
import {
  MapPin, BedDouble, Bath, Expand, Eye, Heart, Share2, QrCode,
  ChevronLeft, ChevronRight, X, Phone, Mail, Send, CheckCircle,
  School, Hospital, ShoppingBag, Car, Wifi, Shield, Zap, Waves,
  Trees, ParkingCircle, Dumbbell, Coffee, Building2, ArrowLeft,
  MessageSquare, Download, PlayCircle, Home, Handshake, Orbit,
  Video, HardHat, Banknote, Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { ensureHtml } from "@/components/ui/rich-text-editor.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import FxEquivalents from "@/components/fx/fx-equivalents.tsx";
import Navbar from "../../home/_components/Navbar.tsx";
import Footer from "../../home/_components/Footer.tsx";
import WhatsAppButton from "../../home/_components/WhatsAppButton.tsx";
import { useContactInfo } from "@/hooks/use-contact-info.ts";
import { useWishlist } from "@/hooks/use-wishlist.ts";
import { useSeo, useJsonLd } from "@/hooks/use-seo.ts";
import PropertyTourModal from "@/components/tours/PropertyTourModal.tsx";
import { CONVEX_SITE_URL } from "@/lib/convex-site";

// ──────────── Helpers ─────────────
function formatPrice(price: number): string {
  if (price >= 1_000_000_000) return `₦${(price / 1_000_000_000).toFixed(2)}B`;
  if (price >= 1_000_000) return `₦${(price / 1_000_000).toFixed(1)}M`;
  return `₦${price.toLocaleString()}`;
}

const AMENITY_ICONS: Record<string, React.ElementType> = {
  wifi: Wifi, security: Shield, electricity: Zap, pool: Waves, garden: Trees,
  parking: ParkingCircle, gym: Dumbbell, cafeteria: Coffee, borehole: Waves,
  generator: Zap, cctv: Shield, "24/7 security": Shield,
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200",
  "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200",
  "https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200",
  "https://images.unsplash.com/photo-1673563932832-a0c9e0ed26f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200",
  "https://images.unsplash.com/photo-1613977257363-707ba9348227?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200",
];

const DEMO_AMENITIES = ["24/7 Security", "CCTV", "Generator", "Borehole", "Parking", "Swimming Pool", "Garden", "Wifi"];

const NEARBY_POIS = [
  { icon: School, label: "Schools", items: ["Greenfield International School (1.2km)", "Heritage Academy (2.5km)", "Nigerian Turkish International College (3km)"] },
  { icon: Hospital, label: "Hospitals", items: ["National Hospital (2km)", "Garki Hospital (3.5km)", "Maitama District Hospital (4km)"] },
  { icon: ShoppingBag, label: "Shopping", items: ["Jabi Lake Mall (2km)", "Ceddi Plaza (3km)", "Silverbird Galleria (5km)"] },
  { icon: Car, label: "Transport", items: ["Airport (25km)", "Bus Terminal (1.5km)", "Train Station (8km)"] },
];

const PAYMENT_PLAN = [
{ step: "Outright Payment", percent: "100%", note: "Pay the full price in one transaction. Qualifies for a 5% discount." },
{ step: "Pay in Installment", percent: "40%", note: "40% deposit, then the remaining balance within 12 months." },
{ step: "Mortgage (MREIF)", percent: "10%", note: "10% minimum equity. 9.75% fixed interest p.a., up to 20 years, maximum loan ₦100m." },

];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available:          { label: "Available",          className: "bg-emerald-100 text-emerald-700" },
  sold:               { label: "Sold",               className: "bg-red-100 text-red-700" },
  reserved:           { label: "Reserved",           className: "bg-amber-100 text-amber-700" },
  under_construction: { label: "Under Construction", className: "bg-blue-100 text-blue-700" },
};

// ──────────── Gallery Lightbox ─────────────
function Lightbox({ images, index, onClose, onPrev, onNext }: {
  images: string[]; index: number; onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/25 transition-colors">
        <X size={20} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/25 transition-colors">
        <ChevronLeft size={22} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/25 transition-colors">
        <ChevronRight size={22} />
      </button>
      <motion.img
        key={index}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        src={images[index]}
        alt=""
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="absolute bottom-4 text-white/60 text-sm">
        {index + 1} / {images.length}
      </div>
    </motion.div>
  );
}

// ──────────── QR Code Modal ─────────────
function PropertyQRModal({ qrData, propertyId, onClose }: { qrData: string; propertyId: string; onClose: () => void }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCodeLib.toDataURL(qrData, { width: 320, margin: 2, color: { dark: "#0B4DBB", light: "#FFFFFF" } })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, [qrData]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Property Verification QR</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {qrUrl ? (
            <img src={qrUrl} alt="Property QR Code" className="w-60 h-60 rounded-xl border border-gray-100" />
          ) : (
            <div className="w-60 h-60 bg-gray-100 rounded-xl flex items-center justify-center"><Spinner /></div>
          )}
          <p className="text-xs text-gray-500 text-center">
            Scan this code to verify this property listing and view it on the Geodata World Services website.
          </p>
          <p className="text-xs text-[var(--brand)] font-medium">GWS-{propertyId.slice(-8).toUpperCase()}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────── Brochure PDF Generator ─────────────
type DescriptionBlock =
  | { type: "h"; level: 1 | 2 | 3; text: string }
  | { type: "p"; text: string }
  | { type: "li"; ordered: boolean; index: number; text: string }
  | { type: "quote"; text: string };

// Parses the property description HTML (produced by the rich text editor) into
// a flat list of typed blocks so the brochure can render it with real
// headings/paragraphs/lists instead of one flattened wall of plain text.
function parseDescriptionBlocks(html: string): DescriptionBlock[] {
  const container = document.createElement("div");
  container.innerHTML = html;
  const blocks: DescriptionBlock[] = [];

  const textOf = (node: Element) => (node.textContent ?? "").replace(/\s+/g, " ").trim();

  for (const node of Array.from(container.children)) {
    const tag = node.tagName.toLowerCase();
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const text = textOf(node);
      if (text) blocks.push({ type: "h", level: tag === "h1" ? 1 : tag === "h2" ? 2 : 3, text });
    } else if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.querySelectorAll(":scope > li"));
      items.forEach((li, i) => {
        const text = textOf(li);
        if (text) blocks.push({ type: "li", ordered: tag === "ol", index: i + 1, text });
      });
    } else if (tag === "blockquote") {
      const text = textOf(node);
      if (text) blocks.push({ type: "quote", text });
    } else {
      const text = textOf(node);
      if (text) blocks.push({ type: "p", text });
    }
  }

  // Fallback: no recognizable block-level structure (plain text) — treat as one paragraph
  if (blocks.length === 0) {
    const text = (container.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text) blocks.push({ type: "p", text });
  }

  return blocks;
}

async function generatePropertyBrochure(p: {
  _id: string; title: string; description: string; price: number; priceType: string;
  propertyType: string; status: string; location: string; state: string; lga: string;
  estate?: string; bedrooms?: number; bathrooms?: number; landSize?: string;
  featuredImage: string; images: string[]; amenities: string[];
  otherProperties: {
    _id: string; title: string; price: number; priceType: string; propertyType: string;
    location: string; state: string; bedrooms?: number; bathrooms?: number;
    landSize?: string; featuredImage: string;
  }[];
  contact: { primaryPhone: string; primaryEmail: string; offices: { city: string; address: string }[] };
}): Promise<void> {
  const doc = new jsPDF();
  const BRAND_BLUE: [number, number, number] = [11, 77, 187];
  const BRAND_LIGHT: [number, number, number] = [235, 241, 253];
  const BLACK: [number, number, number] = [23, 23, 23];
  const GRAY: [number, number, number] = [100, 100, 100];
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 16;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const FOOTER_H = 18;
  const LINE_H = 5;

  let y = 0;
  let page = 1;

  // ── Helper: load any image URL → PNG data URL via canvas ──
  const loadImageAsDataUrl = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      return await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || 256;
          canvas.height = img.naturalHeight || 256;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("no ctx")); return; }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
          URL.revokeObjectURL(blobUrl);
        };
        img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("load error")); };
        img.src = blobUrl;
      });
    } catch {
      return null;
    }
  };

  // ── Section heading helper ──
  const sectionHeading = (label: string) => {
    ensureSpace(14);
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(MARGIN, y - 5, 3, 8, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_BLUE);
    doc.text(label.toUpperCase(), MARGIN + 6, y);
    y += 7;
    doc.setDrawColor(...BRAND_LIGHT);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    doc.setLineWidth(0.2);
    y += 5;
  };

  const drawFooter = () => {
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(0, PAGE_H - FOOTER_H, PAGE_W, FOOTER_H, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("Geodata World Services Limited  •  www.geodata.com.ng", MARGIN, PAGE_H - 11);
    doc.text(`Ref: GWS-${p._id.slice(-8).toUpperCase()}`, PAGE_W - MARGIN, PAGE_H - 11, { align: "right" });
    doc.setFontSize(7);
    doc.text(`Page ${page}`, PAGE_W / 2, PAGE_H - 6, { align: "center" });
    doc.setFontSize(6.5);
    doc.setTextColor(200, 215, 255);
    doc.text("Prices subject to change. Subject to availability at time of purchase. E.&O.E.", PAGE_W / 2, PAGE_H - 2, { align: "center" });
  };

  const addPage = () => {
    drawFooter();
    doc.addPage();
    page += 1;
    // Thin blue top stripe on continuation pages
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(0, 0, PAGE_W, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("GEODATA WORLD SERVICES LIMITED  •  Property Brochure", MARGIN, 5.5);
    y = 14;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - FOOTER_H - 4) addPage();
  };

  // ════════════════════════════════════
  // PAGE 1 — COVER
  // ════════════════════════════════════

  // ── Header band ──
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, PAGE_W, 30, "F");

  // Logo
  const logoDataUrl = await loadImageAsDataUrl("https://hercules-cdn.com/file_RMTYfsU79rafY2hq3AP7BqTI");
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", MARGIN, 5, 18, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("GEODATA WORLD SERVICES LIMITED", MARGIN + 22, 13);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Property Brochure  •  www.geodata.com.ng", MARGIN + 22, 20);
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("GEODATA WORLD SERVICES LIMITED", MARGIN, 13);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Property Brochure  •  www.geodata.com.ng", MARGIN, 20);
  }

  y = 36;

  // ── Hero image ──
  const heroDataUrl = await loadImageAsDataUrl(p.featuredImage);
  if (heroDataUrl) {
    const imgH = 88;
    doc.addImage(heroDataUrl, "PNG", MARGIN, y, CONTENT_W, imgH);
    // Status badge over image
    const statusLabel = p.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
    doc.setFillColor(...BRAND_BLUE);
    doc.roundedRect(MARGIN + 3, y + 3, doc.getTextWidth(statusLabel) + 8, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(statusLabel, MARGIN + 7, y + 8.5);
    y += imgH + 6;
  }

  // ── Title block ──
  doc.setTextColor(...BLACK);
  doc.setFontSize(20);
  doc.setFont("times", "bold");
  const titleLines = doc.splitTextToSize(p.title, CONTENT_W - 30);
  doc.text(titleLines, MARGIN, y);

  // Price right-aligned alongside title
  const formatBrochurePrice = (n: number) => {
    if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
    return `₦${n.toLocaleString()}`;
  };
  doc.setFontSize(22);
  doc.setFont("times", "bold");
  doc.setTextColor(...BRAND_BLUE);
  doc.text(formatBrochurePrice(p.price), PAGE_W - MARGIN, y, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`(${p.priceType} basis)`, PAGE_W - MARGIN, y + 5.5, { align: "right" });

  y += titleLines.length * 8 + 2;

  // Location
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`📍  ${p.location}, ${p.state}${p.estate ? "  •  " + p.estate : ""}  •  ${p.lga} LGA`, MARGIN, y);
  y += 9;

  // ── Key fact chips ──
  const facts: string[] = [];
  if (p.bedrooms != null) facts.push(`${p.bedrooms} Beds`);
  if (p.bathrooms != null) facts.push(`${p.bathrooms} Baths`);
  if (p.landSize) facts.push(p.landSize);
  facts.push(p.propertyType.charAt(0).toUpperCase() + p.propertyType.slice(1));

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  let chipX = MARGIN;
  const chipY = y;
  for (const fact of facts) {
    const w = doc.getTextWidth(fact) + 8;
    if (chipX + w > PAGE_W - MARGIN) break;
    doc.setFillColor(...BRAND_LIGHT);
    doc.roundedRect(chipX, chipY - 5.5, w, 8, 2, 2, "F");
    doc.setTextColor(...BRAND_BLUE);
    doc.text(fact, chipX + 4, chipY);
    chipX += w + 4;
  }
  y += 12;

  // ── Gallery strip (up to 4 additional thumbnails) ──
  const thumbUrls = p.images.filter(u => u !== p.featuredImage).slice(0, 4);
  if (thumbUrls.length > 0) {
    const thumbDataUrls = await Promise.all(thumbUrls.map(loadImageAsDataUrl));
    const valid = thumbDataUrls.filter((d): d is string => !!d);
    if (valid.length > 0) {
      ensureSpace(28);
      const thumbW = CONTENT_W / valid.length - 2;
      const thumbH = 26;
      let tx = MARGIN;
      for (const td of valid) {
        doc.addImage(td, "PNG", tx, y, thumbW, thumbH);
        doc.setDrawColor(220, 220, 220);
        doc.rect(tx, y, thumbW, thumbH);
        tx += thumbW + 2;
      }
      y += thumbH + 6;
    }
  }

  // ── Property specifications table ──
  sectionHeading("Property Specifications");

  const specs: [string, string][] = [
    ["Property ID", `GWS-${p._id.slice(-8).toUpperCase()}`],
    ["Type", p.propertyType.charAt(0).toUpperCase() + p.propertyType.slice(1)],
    ["Status", p.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())],
    ["Price", formatBrochurePrice(p.price)],
    ["Price Type", p.priceType.charAt(0).toUpperCase() + p.priceType.slice(1)],
    ["State", p.state],
    ["Location", p.location],
    ["LGA", p.lga],
    ...(p.estate ? [["Estate", p.estate] as [string, string]] : []),
    ...(p.bedrooms != null ? [[`Bedrooms`, `${p.bedrooms}`] as [string, string]] : []),
    ...(p.bathrooms != null ? [[`Bathrooms`, `${p.bathrooms}`] as [string, string]] : []),
    ...(p.landSize ? [["Land Size", p.landSize] as [string, string]] : []),
  ];

  const colW = CONTENT_W / 2 - 2;
  for (let i = 0; i < specs.length; i += 2) {
    ensureSpace(7);
    const rowY = y;
    const isEven = (i / 2) % 2 === 0;
    // Alternating row shading
    if (isEven) {
      doc.setFillColor(249, 250, 255);
      doc.rect(MARGIN, rowY - 4.5, CONTENT_W, 7, "F");
    }
    const pair = [specs[i], specs[i + 1]].filter(Boolean) as [string, string][];
    pair.forEach(([label, val], ci) => {
      const x = MARGIN + ci * (colW + 4);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GRAY);
      doc.text(label, x, rowY);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BLACK);
      doc.text(val, x + 28, rowY);
    });
    y += 7;
  }
  y += 4;

  // ── Description ──
  sectionHeading("Property Description");

  const blocks = parseDescriptionBlocks(p.description);

  for (const block of blocks) {
    if (block.type === "h") {
      const size = block.level === 1 ? 12 : block.level === 2 ? 11 : 10;
      ensureSpace(LINE_H + 5);
      y += 2;
      doc.setFontSize(size);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLACK);
      const lines = doc.splitTextToSize(block.text, CONTENT_W);
      for (const line of lines) {
        ensureSpace(LINE_H);
        doc.text(line, MARGIN, y);
        y += LINE_H + 0.5;
      }
      y += 2;
    } else if (block.type === "p") {
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(65, 65, 65);
      const lines = doc.splitTextToSize(block.text, CONTENT_W);
      for (const line of lines) {
        ensureSpace(LINE_H);
        doc.text(line, MARGIN, y);
        y += LINE_H;
      }
      y += 3;
    } else if (block.type === "li") {
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(65, 65, 65);
      const bullet = block.ordered ? `${block.index}.` : "•";
      const lines = doc.splitTextToSize(block.text, CONTENT_W - 7);
      lines.forEach((line: string, i: number) => {
        ensureSpace(LINE_H);
        if (i === 0) {
          doc.setTextColor(...BRAND_BLUE);
          doc.text(bullet, MARGIN, y);
          doc.setTextColor(65, 65, 65);
        }
        doc.text(line, MARGIN + 7, y);
        y += LINE_H;
      });
      y += 1.5;
    } else if (block.type === "quote") {
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(90, 90, 90);
      const lines = doc.splitTextToSize(block.text, CONTENT_W - 8);
      const blockH = lines.length * LINE_H + 6;
      ensureSpace(blockH + 2);
      doc.setFillColor(247, 249, 253);
      doc.rect(MARGIN, y - 4, CONTENT_W, blockH, "F");
      doc.setDrawColor(...BRAND_BLUE);
      doc.setLineWidth(1.2);
      doc.line(MARGIN, y - 4, MARGIN, y - 4 + blockH);
      doc.setLineWidth(0.2);
      for (const line of lines) {
        doc.text(line, MARGIN + 6, y);
        y += LINE_H;
      }
      y += 5;
    }
  }

  // ── Amenities ──
  if (p.amenities.length > 0) {
    y += 2;
    sectionHeading("Amenities & Features");

    const aColW = CONTENT_W / 3;
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    for (let i = 0; i < p.amenities.length; i++) {
      const col = i % 3;
      if (col === 0) ensureSpace(LINE_H + 2);
      const x = MARGIN + col * aColW;
      doc.setTextColor(...BRAND_BLUE);
      doc.text("✓", x, y);
      doc.setTextColor(...BLACK);
      doc.text(p.amenities[i], x + 5, y);
      if (col === 2) y += LINE_H + 2;
    }
    if (p.amenities.length % 3 !== 0) y += LINE_H + 2;
    y += 2;
  }

  // ── Investment Highlights ──
  y += 2;
  sectionHeading("Why Invest in This Property");

  const highlights = [
    `Prime location in ${p.location}, ${p.state} — a high-growth real estate corridor`,
    "Backed by Geodata World Services Limited, Nigeria's trusted real estate company",
    `${p.status === "available" ? "Currently available — act fast to secure at current pricing" : p.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) + " — interest already confirmed"}`,
    "Flexible payment plans available including mortgage financing through partner banks",
  ];

  for (const highlight of highlights) {
    ensureSpace(LINE_H + 2);
    doc.setFillColor(...BRAND_LIGHT);
    const hl = doc.splitTextToSize(highlight, CONTENT_W - 12);
    const hlH = hl.length * LINE_H + 4;
    doc.rect(MARGIN, y - 4, CONTENT_W, hlH, "F");
    doc.setTextColor(...BRAND_BLUE);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("→", MARGIN + 2, y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BLACK);
    for (let li = 0; li < hl.length; li++) {
      doc.text(hl[li], MARGIN + 9, y + li * LINE_H);
    }
    y += hlH + 3;
  }

  // ── Strategic Location Advantages ──
  y += 2;
  sectionHeading("Strategic Location Advantages");

  const locationAdvantages = [
    { label: "Idu Railway Station", distance: "Approximately 5 Minutes Drive" },
    { label: "Idu Industrial Zone", distance: "Approximately 5 Minutes Drive" },
    { label: "Nnamdi Azikiwe International Airport", distance: "Approximately 15–20 Minutes Drive" },
    { label: "Abuja City Centre (CBD)", distance: "Approximately 20 Minutes Drive" },
    { label: "Jabi District", distance: "Approximately 15 Minutes Drive" },
    { label: "Life Camp & Gwarinpa", distance: "Approximately 15–20 Minutes Drive" },
  ];

  for (let i = 0; i < locationAdvantages.length; i++) {
    const adv = locationAdvantages[i];
    const isEven = i % 2 === 0;
    ensureSpace(8);
    if (isEven) {
      doc.setFillColor(249, 250, 255);
      doc.rect(MARGIN, y - 4.5, CONTENT_W, 7.5, "F");
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_BLUE);
    doc.text("📍", MARGIN + 1, y);
    doc.setTextColor(...BLACK);
    doc.text(adv.label, MARGIN + 7, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(adv.distance, PAGE_W - MARGIN, y, { align: "right" });
    y += 7.5;
  }
  y += 4;

  // ── Payment Plan ──
  y += 2;
  sectionHeading("Flexible Payment Plan");

  const paymentPlan = [
{ step: "Outright Payment", percent: "100%", note: "Full price in one transaction. 5% discount applies" },
{ step: "Pay in Installment", percent: "40%", note: "40% deposit, balance within 12 months" },
{ step: "Mortgage (MREIF)", percent: "10%", note: "9.75% fixed, up to 20 years, max loan ₦100m, 10% minimum equity" },
  ];

  for (let i = 0; i < paymentPlan.length; i++) {
    const item = paymentPlan[i];
    ensureSpace(14);
    // Step number circle
    doc.setFillColor(...BRAND_BLUE);
    doc.circle(MARGIN + 4, y - 1.5, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(String(i + 1), MARGIN + 4, y - 0.5, { align: "center" });
    // Step label
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLACK);
    doc.text(item.step, MARGIN + 11, y);
    // Note
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(item.note, MARGIN + 11, y + 4.5);
    // Percent badge
    doc.setFillColor(...BRAND_LIGHT);
    const pctW = doc.getTextWidth(item.percent) + 10;
    doc.setFontSize(10);
    doc.setFont("times", "bold");
    doc.roundedRect(PAGE_W - MARGIN - pctW, y - 5, pctW, 9, 2, 2, "F");
    doc.setTextColor(...BRAND_BLUE);
    doc.text(item.percent, PAGE_W - MARGIN - pctW / 2, y, { align: "center" });
    // Connector line (not after last)
    if (i < paymentPlan.length - 1) {
      doc.setDrawColor(200, 210, 240);
      doc.setLineWidth(0.4);
      doc.line(MARGIN + 4, y + 2, MARGIN + 4, y + 10);
      doc.setLineWidth(0.2);
    }
    y += 13;
  }

  const totalNote = `Total price: ${formatBrochurePrice(p.price)}. Mortgage financing available through partner banks. Contact our team for a personalised schedule.`;
  ensureSpace(12);
  doc.setFillColor(249, 250, 255);
  const tnLines = doc.splitTextToSize(totalNote, CONTENT_W - 8);
  doc.rect(MARGIN, y - 3, CONTENT_W, tnLines.length * LINE_H + 4, "F");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...GRAY);
  for (let li = 0; li < tnLines.length; li++) {
    doc.text(tnLines[li], MARGIN + 4, y + li * LINE_H);
  }
  y += tnLines.length * LINE_H + 6;

  // ── Related / Other Properties ──
  if (p.otherProperties.length > 0) {
    y += 2;
    sectionHeading("Other Available Properties");

    const otherImgDataUrls = await Promise.all(
      p.otherProperties.map(op => loadImageAsDataUrl(op.featuredImage))
    );

    const cardW = CONTENT_W;
    for (let i = 0; i < p.otherProperties.length; i++) {
      const op = p.otherProperties[i];
      ensureSpace(28);
      const cardY = y;
      const opPrice = op.price >= 1_000_000_000
        ? `₦${(op.price / 1_000_000_000).toFixed(2)}B`
        : op.price >= 1_000_000
        ? `₦${(op.price / 1_000_000).toFixed(1)}M`
        : `₦${op.price.toLocaleString()}`;

      // Card background
      doc.setFillColor(250, 251, 255);
      doc.roundedRect(MARGIN, cardY - 2, cardW, 26, 2, 2, "F");
      doc.setDrawColor(225, 232, 250);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, cardY - 2, cardW, 26, 2, 2, "S");
      doc.setLineWidth(0.2);

      // Thumbnail
      const thumbDataUrl = otherImgDataUrls[i];
      const thumbW = 32;
      const thumbH = 22;
      if (thumbDataUrl) {
        doc.addImage(thumbDataUrl, "PNG", MARGIN + 3, cardY, thumbW, thumbH);
        doc.setDrawColor(220, 220, 220);
        doc.rect(MARGIN + 3, cardY, thumbW, thumbH);
      }

      const textX = MARGIN + thumbW + 8;
      // Title
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLACK);
      const opTitle = doc.splitTextToSize(op.title, cardW - thumbW - 16);
      doc.text(opTitle[0], textX, cardY + 5);
      // Location
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(`${op.location}, ${op.state}  •  ${op.propertyType.charAt(0).toUpperCase() + op.propertyType.slice(1)}`, textX, cardY + 10);
      // Facts
      const opFacts: string[] = [];
      if (op.bedrooms != null) opFacts.push(`${op.bedrooms} Beds`);
      if (op.bathrooms != null) opFacts.push(`${op.bathrooms} Baths`);
      if (op.landSize) opFacts.push(op.landSize);
      if (opFacts.length > 0) {
        doc.setFontSize(7.5);
        doc.setTextColor(130, 130, 130);
        doc.text(opFacts.join("  ·  "), textX, cardY + 15);
      }
      // Price
      doc.setFontSize(11);
      doc.setFont("times", "bold");
      doc.setTextColor(...BRAND_BLUE);
      doc.text(opPrice, PAGE_W - MARGIN - 4, cardY + 7, { align: "right" });
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(op.priceType, PAGE_W - MARGIN - 4, cardY + 12, { align: "right" });

      y += 28;
    }
    y += 2;
  }

  // ── QR Code ──
  y += 2;
  sectionHeading("Verify This Listing");

  const qrValue = `${CONVEX_SITE_URL}/og/property?id=${p._id}`;
  try {
    const qrDataUrl: string = await QRCodeLib.toDataURL(qrValue, {
      width: 256, margin: 1, color: { dark: "#0B4DBB", light: "#FFFFFF" },
    });
    ensureSpace(52);
    const qrSize = 40;
    doc.addImage(qrDataUrl, "PNG", MARGIN, y, qrSize, qrSize);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLACK);
    doc.text("Scan to verify this property", MARGIN + qrSize + 8, y + 8);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text("Scan the QR code with your phone camera to open the", MARGIN + qrSize + 8, y + 15);
    doc.text("live listing and confirm authenticity on our website.", MARGIN + qrSize + 8, y + 20);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_BLUE);
    doc.text(`GWS-${p._id.slice(-8).toUpperCase()}`, MARGIN + qrSize + 8, y + 28);
    y += qrSize + 6;
  } catch {
    // QR generation failed — skip silently
  }

  // ── Contact Block ──
  y += 4;
  sectionHeading("Contact Our Sales Team");

  ensureSpace(40);
  // Blue card background
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(MARGIN, y - 4, CONTENT_W, 38, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Geodata World Services Limited", MARGIN + 6, y + 4);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`📞  ${p.contact.primaryPhone}`, MARGIN + 6, y + 11);
  doc.text(`✉   ${p.contact.primaryEmail}`, MARGIN + 6, y + 17);
  doc.text(`🌐  www.geodata.com.ng`, MARGIN + 6, y + 23);

  const hq = p.contact.offices[0];
  if (hq) {
    doc.text(`🏢  ${hq.city}: ${hq.address}`, MARGIN + 6, y + 29);
  }

  y += 42;

  drawFooter();
  doc.save(`${p.title.replace(/[^a-z0-9]+/gi, "-")}-brochure.pdf`);
}


// ──────────── Inquiry Form ─────────────
function InquiryForm({ propertyId, type }: { propertyId: Id<"properties"> | undefined; type: string }) {
  const createInquiry = useMutation(api.inquiries.create);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) { toast.error("Please fill in all required fields."); return; }
    setLoading(true);
    try {
      await createInquiry({ ...form, propertyId, type });
      setDone(true);
      toast.success("Request submitted! We'll contact you shortly.");
    } catch { toast.error("Failed. Please try again."); }
    finally { setLoading(false); }
  };

  if (done) return (
    <div className="text-center py-8">
      <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <CheckCircle className="text-emerald-600" size={28} />
      </div>
      <h4 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Request Submitted!</h4>
      <p className="text-sm text-gray-500">Our team will contact you within 2 hours.</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input placeholder="Email Address *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Input placeholder="Phone Number *" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <Textarea placeholder="Additional message..." rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="resize-none" />
      <Button type="submit" className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2" disabled={loading}>
        <Send size={15} /> {loading ? "Sending..." : "Submit Request"}
      </Button>
    </form>
  );
}

// ──────────── Request Live Inspection dialog ─────────────
// Opened from either the "Live Property Inspection" or "Live Construction
// Inspection" card. Creates a real, trackable liveInspections row (status
// "requested") via the same backend system admins use to schedule — instead
// of just scrolling to the generic inquiry form.
function RequestLiveInspectionDialog({
  open,
  onClose,
  propertyId,
  inspectionType,
}: {
  open: boolean;
  onClose: () => void;
  propertyId: Id<"properties"> | undefined;
  inspectionType: "property" | "construction";
}) {
  const requestInspection = useMutation(api.liveInspections.requestPublic);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", preferredAt: "", note: "" });

  const title = inspectionType === "construction" ? "Live Construction Inspection" : "Live Property Inspection";

  const handleClose = () => {
    onClose();
    setDone(false);
    setForm({ name: "", email: "", phone: "", preferredAt: "", note: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return;
    if (!form.name || !form.email || !form.phone) { toast.error("Please fill in all required fields."); return; }
    setLoading(true);
    try {
      await requestInspection({
        inspectionType,
        propertyId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        preferredAt: form.preferredAt ? new Date(form.preferredAt).toISOString() : undefined,
        note: form.note || undefined,
      });
      setDone(true);
      toast.success("Live inspection request submitted!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request {title}</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="text-emerald-600" size={28} />
            </div>
            <h4 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Request Submitted!</h4>
            <p className="text-sm text-gray-500">Our team will reach out shortly to confirm a time for your live video session.</p>
            <Button onClick={handleClose} className="mt-4 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm text-gray-500">
              {inspectionType === "construction"
                ? "Request a real-time video walkthrough of this construction/site progress with a Geodata officer."
                : "Request a real-time video walkthrough of this property with a Geodata officer."}
            </p>
            <Input placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Email Address *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Phone Number *" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Preferred Date &amp; Time (optional)</label>
              <input
                type="datetime-local"
                value={form.preferredAt}
                onChange={(e) => setForm({ ...form, preferredAt: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 text-gray-800"
              />
            </div>
            <Textarea placeholder="Additional message..." rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="resize-none" />
            <Button type="submit" className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2" disabled={loading}>
              {loading ? <Spinner className="h-4 w-4" /> : <Send size={15} />} {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ──────────── Buy Outright / Buy With Mortgage dialog ─────────────
// Lets a visitor or signed-in client declare their financing preference
// directly from the property page, instead of only being able to ask for a
// generic callback. Creates a real, trackable lead (tagged with
// financePreference) via the same pipeline sales already works from — no
// separate purchase-request system. Signed-in clients skip re-entering their
// contact details, mirroring RequestInspectionDialog on the client dashboard.
function PurchaseIntentDialog({ open, onClose, propertyId, financePreference, price = 0, propertyTitle = "" }: { open: boolean; onClose: () => void; propertyId: Id<"properties"> | undefined; financePreference: "outright" | "mortgage"; price?: number; propertyTitle?: string }) { const { isAuthenticated } = useConvexAuth(); const requestPurchasePublic = useMutation(api.sales.requestPurchase); const requestPurchaseAuthed = useMutation(api.sales.requestPurchaseFromClient); const mortgage = financePreference === "mortgage"; const blank = { name: "", email: "", phone: "", note: "", age: "", income: "", employment: "Salaried", rsa: "", agree: false }; const [step, setStep] = useState(1); const [loading, setLoading] = useState(false); const [done, setDone] = useState(false); const [plan, setPlan] = useState<"outright" | "instalment">("outright"); const [form, setForm] = useState(blank); const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v })); const ngn = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG"); const num = (s: string) => Number(s.replace(/[^0-9]/g, "")) || 0; const discounted = price * 0.95; const deposit = price * 0.4; const loan = Math.min(price * 0.9, 100_000_000); const equity = price - loan; const age = num(form.age); const years = Math.max(0, Math.min(20, 60 - age)); const r = 0.0975 / 12; const n = years * 12; const monthly = n > 0 ? (loan * r) / (1 - Math.pow(1 + r, -n)) : 0; const income = num(form.income); const rsaUse = num(form.rsa) * 0.25; const ageOk = age >= 21 && years >= 5; const afford = income > 0 && monthly <= income / 3; const handleClose = () => { onClose(); setDone(false); setStep(1); setPlan("outright"); setForm(blank); }; const summary = mortgage ? `MREIF MORTGAGE APPLICATION | ${propertyTitle} (${ngn(price)}) | Age ${age} | ${form.employment} | Net monthly income ${ngn(income)} | Est. loan ${ngn(loan)} over ${years} yrs, est. monthly ${ngn(monthly)} | Equity needed ${ngn(equity)}${rsaUse ? `, RSA usable ${ngn(rsaUse)}` : ""} | Pre-check: ${ageOk && afford ? "likely eligible" : "needs review"}` : `ONLINE RESERVATION | ${propertyTitle} | ${plan === "outright" ? `Outright, ${ngn(discounted)} after 5% discount` : `Instalments, 40% deposit ${ngn(deposit)}, balance ${ngn(price - deposit)} within 12 months`}`; const next = () => { if (mortgage && (age < 18 || age > 75 || income <= 0)) { toast.error("Please enter your age and monthly income."); return; } setStep(2); }; const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!propertyId) return; if (!isAuthenticated && (!form.name || !form.email || !form.phone)) { toast.error("Please fill in your name, email and phone number."); return; } if (!form.agree) { toast.error("Please confirm the payment notice to continue."); return; } setLoading(true); try { const note = summary + (form.note ? " | Buyer note: " + form.note : ""); const budget = mortgage ? price : plan === "outright" ? Math.round(discounted) : price; if (isAuthenticated) { await requestPurchaseAuthed({ financePreference, propertyId, budget, note }); } else { await requestPurchasePublic({ financePreference, propertyId, name: form.name, email: form.email, phone: form.phone, budget, note }); } setDone(true); } catch (err) { toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again."); } finally { setLoading(false); } }; const opt = (active: boolean) => cn("w-full text-left rounded-xl border p-4 transition-colors", active ? "border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]" : "border-gray-200 hover:border-gray-300"); const row = "flex justify-between gap-4 text-sm py-1.5"; return (<Dialog open={open} onOpenChange={(v) => !v && handleClose()}><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{mortgage ? "Apply for an MREIF mortgage" : "Reserve this home"}</DialogTitle></DialogHeader>{done ? (<div className="text-center py-6"><div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle className="text-emerald-600" size={28} /></div><h3 className="font-semibold text-gray-900 mb-2">{mortgage ? "Application received" : "Reservation request received"}</h3><p className="text-sm text-gray-600 leading-relaxed">{mortgage ? "Our mortgage desk will review your details and contact you within one business day with the next steps and the participating bank." : "Our team will confirm this home is held for you and send the reservation deposit amount and Geodata's official account details, usually within one business day."}</p><p className="mt-3 text-xs text-gray-500">Geodata will never ask you to pay into a personal account.</p><Button onClick={handleClose} className="mt-5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">Done</Button></div>) : (<div><p className="text-sm text-gray-500 -mt-1 mb-4">{propertyTitle} {"·"} {ngn(price)} {"·"} Step {step} of 2</p>{step === 1 ? (<div className="space-y-3">{mortgage ? (<><div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-gray-600">Your age</label><Input type="number" inputMode="numeric" value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="e.g. 35" /></div><div><label className="text-xs text-gray-600">Net monthly income ({"₦"})</label><Input inputMode="numeric" value={form.income} onChange={(e) => set("income", e.target.value)} placeholder="e.g. 1,500,000" /></div><div><label className="text-xs text-gray-600">Employment</label><select value={form.employment} onChange={(e) => set("employment", e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"><option>Salaried</option><option>Self-employed</option></select></div><div><label className="text-xs text-gray-600">RSA balance (optional)</label><Input inputMode="numeric" value={form.rsa} onChange={(e) => set("rsa", e.target.value)} placeholder={"₦"} /></div></div>{age > 0 && income > 0 && (<div className="rounded-xl bg-gray-50 border border-gray-100 p-4"><div className={row}><span className="text-gray-500">Estimated loan</span><span className="font-medium">{ngn(loan)}</span></div><div className={row}><span className="text-gray-500">Your equity</span><span className="font-medium">{ngn(equity)}</span></div><div className={row}><span className="text-gray-500">Tenure</span><span className="font-medium">{years} years</span></div><div className={row}><span className="text-gray-500">Est. monthly repayment</span><span className="font-semibold text-[var(--brand)]">{ngn(monthly)}</span></div>{rsaUse > 0 && <p className="text-xs text-gray-600 mt-2">Up to {ngn(rsaUse)} of your RSA can go towards your equity.</p>}<p className={cn("mt-3 text-sm font-medium", ageOk && afford ? "text-emerald-700" : "text-amber-700")}>{!ageOk ? "MREIF loans must end by age 60, so your tenure would be under 5 years. Our team can advise on options." : !afford ? "The repayment is above a third of your income. A larger equity contribution may help." : "You look likely to qualify."}</p></div>)}<p className="text-xs text-gray-500">Estimate only, at 9.75% fixed for up to 20 years and a maximum loan of {"₦"}100m. Final approval is by the participating bank.</p></>) : (<><button type="button" onClick={() => setPlan("outright")} className={opt(plan === "outright")}><div className="flex justify-between items-baseline gap-3"><span className="font-semibold text-gray-900">Pay in full</span><span className="font-semibold text-[var(--brand)]">{ngn(discounted)}</span></div><p className="text-xs text-gray-500 mt-1">5% off the listed price of {ngn(price)}.</p></button><button type="button" onClick={() => setPlan("instalment")} className={opt(plan === "instalment")}><div className="flex justify-between items-baseline gap-3"><span className="font-semibold text-gray-900">Pay in instalments</span><span className="font-semibold text-[var(--brand)]">{ngn(deposit)} deposit</span></div><p className="text-xs text-gray-500 mt-1">40% deposit, then {ngn(price - deposit)} within 12 months.</p></button><p className="text-xs text-gray-500">No payment is taken on this page. Once we confirm the home is available, we send you the reservation deposit amount and Geodata's official account details.</p></>)}<Button type="button" onClick={next} className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">Continue</Button></div>) : (<form onSubmit={handleSubmit} className="space-y-3"><div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm text-gray-700">{mortgage ? `MREIF mortgage: est. loan ${ngn(loan)}, est. ${ngn(monthly)} a month over ${years} years.` : plan === "outright" ? `Pay in full: ${ngn(discounted)} after the 5% discount.` : `Instalments: ${ngn(deposit)} deposit, ${ngn(price - deposit)} within 12 months.`}</div>{!isAuthenticated && (<><Input placeholder="Full name *" value={form.name} onChange={(e) => set("name", e.target.value)} /><Input placeholder="Email address *" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /><Input placeholder="Phone number (with country code) *" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></>)}<Textarea placeholder="Anything we should know? (optional)" rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} />{mortgage && <div className="text-xs text-gray-600 rounded-xl border border-gray-100 p-3"><p className="font-medium text-gray-800 mb-1">Have these ready</p>Valid ID, 6 months of bank statements, recent payslips or business records, and your RSA statement.</div>}<label className="flex items-start gap-2 text-xs text-gray-600"><input type="checkbox" checked={form.agree} onChange={(e) => set("agree", e.target.checked)} className="mt-0.5" />I understand Geodata will only ever ask me to pay into its official company account.</label><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button><Button type="submit" disabled={loading} className="flex-[2] bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{loading ? "Sending..." : mortgage ? "Submit application" : "Send reservation request"}</Button></div></form>)}</div>)}</DialogContent></Dialog>); }

// ──────────── GEODATA LIVE INSPECT™ banner ─────────────
// Presents the 3-mode product concept: Live Property Inspection (existing
// live-session system), Interactive 360°/VR Tour (this milestone), and Live
// Construction Inspection (same live-session system, inspectionType =
// "construction" — surfaced here just as a mode card, not a new system).
// Each mode card only becomes actionable when its own feature toggle is ON
// and, for live inspection modes, the visitor can request one regardless of
// whether a specific session already exists (mirrors "Request Live
// Inspection" elsewhere on this page).
function LiveInspectBanner({
  propertyId,
  hasTour,
  onStartTour,
}: {
  propertyId: Id<"properties"> | undefined;
  hasTour: boolean;
  onStartTour: () => void;
}) {
  const liveStatus = useQuery(api.liveInspections.getFeatureStatus, {});
  const tourStatus = useQuery(api.propertyTours.getFeatureStatus, {});
  const liveEnabled = liveStatus?.enabled === true;
  const tourEnabled = tourStatus?.enabled === true && hasTour;
  const [requestType, setRequestType] = useState<"property" | "construction" | null>(null);

  if (!liveEnabled && !tourEnabled) return null;

  const modes = [
    {
      key: "live_property",
      icon: Video,
      title: "Live Property Inspection",
      desc: "Guided real-time inspection with a Geodata officer.",
      active: liveEnabled,
      cta: "Request Live Inspection",
      onClick: () => setRequestType("property"),
    },
    {
      key: "tour_360",
      icon: Orbit,
      title: "Interactive 360°/VR Tour",
      desc: "Self-guided immersive property exploration.",
      active: tourEnabled,
      cta: "Start 360° Tour",
      onClick: onStartTour,
    },
    {
      key: "live_construction",
      icon: HardHat,
      title: "Live Construction Inspection",
      desc: "Real-time construction progress inspection.",
      active: liveEnabled,
      cta: "Request Live Inspection",
      onClick: () => setRequestType("construction"),
    },
  ];

  return (
    <div className="mb-8 rounded-3xl bg-gradient-to-br from-[#0B1730] to-[#0B4DBB] p-6 sm:p-8 text-white">
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.2em] text-blue-300 uppercase mb-1">Geodata Live Inspect™</p>
        <h2 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
          See it. Ask about it. Explore it. Decide with confidence.
        </h2>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {modes.filter((m) => m.active).map((mode) => (
          <div
            key={mode.key}
            className={cn(
              "rounded-2xl p-4 border transition-colors",
              mode.active ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10 opacity-60"
            )}
          >
            <mode.icon size={22} className="text-blue-300 mb-2" />
            <p className="font-semibold text-sm">{mode.title}</p>
            <p className="text-xs text-white/70 mt-1 mb-3">{mode.desc}</p>
            {mode.active ? (
              <Button size="sm" onClick={mode.onClick} className="h-7 text-xs bg-white text-[#0B4DBB] hover:bg-blue-50 cursor-pointer w-full">
                {mode.cta}
              </Button>
            ) : (
              <span className="text-[10px] text-white/50 font-medium">Currently unavailable</span>
            )}
          </div>
        ))}
      </div>

      <RequestLiveInspectionDialog
        open={requestType !== null}
        onClose={() => setRequestType(null)}
        propertyId={propertyId}
        inspectionType={requestType ?? "property"}
      />
    </div>
  );
}

// ──────────── Main Page ─────────────
// ─── Floor plan and live site photos (Southern Bridge City typologies) ───────
function PropertyFloorPlan({ title, estate, only }: { title: string; estate?: string | null; only?: "plan" | "site" }) {
  const [zoom, setZoom] = useState<string | null>(null);
  if (!estate || !/southern\s*bridge/i.test(estate)) return null;
const plan = only === "site" ? undefined : SBC_FLOOR_PLANS.find((p) => p.match.test(title));
const site = only === "plan" ? undefined : SBC_SITE_UPDATES.find((u) => u.match.test(title));
  if (!plan && !site) return null;
  return (
    <>
      {plan && (
        <div className="gd-floorplan bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-2">Floor plan</div>
          <div className="text-2xl text-gray-900 mb-1" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{plan.name}</div>
          <div className="text-sm text-gray-500 mb-5">{plan.note}</div>
          <button type="button" onClick={() => setZoom(plan.src)} className="block w-full bg-[#fafaf7] border border-gray-100 cursor-zoom-in">
            <img src={plan.src} alt={`${plan.name} floor plan`} loading="lazy" className="w-full h-auto" />
          </button>
          <div className="text-xs text-gray-400 mt-3">Click to enlarge. Architectural reference; final layouts are confirmed in the sale documents.</div>
        </div>
      )}
      {site && (
        <div className="gd-sitephotos bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-2">Live from site · {site.date}</div>
          <div className="text-2xl text-gray-900 mb-5" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Where construction stands.</div>
          <div className="grid grid-cols-2 gap-3">
            {site.photos.map((src, i) => (
              <button key={src} type="button" onClick={() => setZoom(src)} className="block overflow-hidden cursor-zoom-in">
                <img src={src} alt={`${site.typology}, site photo ${i + 1}`} loading="lazy" className="w-full aspect-[4/3] object-cover" />
              </button>
            ))}
          </div>
          <Link to="/updates" className="inline-block mt-5 text-xs uppercase tracking-[0.15em] font-medium text-gray-900 hover:text-[#a93340]">
            All site updates &rarr;
          </Link>
        </div>
      )}
      {zoom && (
        <button type="button" onClick={() => setZoom(null)} className="fixed inset-0 z-[100] bg-[#0a1628]/90 flex items-center justify-center p-6 cursor-zoom-out" aria-label="Close image">
          <img src={zoom} alt="" className="max-h-full max-w-full object-contain bg-white" />
        </button>
      )}
    </>
  );
}

// ─── Construction progress timeline (ported from the editorial site) ─────────
// Shows only when the property's estate has a public development page in admin.
const PROGRESS_STAGES = ["Launch", "Structure", "Finishing", "Handover"];

function estateSlug(estate: string): string {
  return estate.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function PropertyProgress({ estate }: { estate?: string | null }) {
  const data = useQuery(api.developments.getPublicEstate, estate ? { slug: estateSlug(estate) } : "skip");
  if (!estate || !data || data.buildingTypes.length === 0) return null;
  const pct = data.overallPercent;
  const current = data.deliveredCount === data.buildingTypes.length ? 3 : pct >= 60 ? 2 : pct >= 25 ? 1 : 0;
  return (
    <div className="gd-progress bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-2">Construction progress</div>
      <div className="text-2xl text-gray-900 mb-6" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        {current === 3 ? "Delivered." : `On site, ${pct}% complete.`}
      </div>
      <div className="relative h-px bg-gray-200 mb-4">
        <div className="absolute left-0 -top-px h-[3px] bg-[#0a1628]" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-4 text-[11px] uppercase tracking-[0.15em]">
        {PROGRESS_STAGES.map((s, i) => (
          <span key={s} className={i <= current ? "text-gray-900" : "text-gray-400"}>
            {s}
          </span>
        ))}
      </div>
      <Link to={`/${data.estate.slug === "southern-bridge-city" ? "southern-bridge-city" : `development/${data.estate.slug}`}`} className="inline-block mt-6 text-xs uppercase tracking-[0.15em] font-medium text-gray-900 hover:text-[#a93340]">
        Full development status &rarr;
      </Link>
    </div>
  );
}
function PropertyHeroVideo({ src, poster }: { src: string; poster?: string }) { const ref = useRef<HTMLVideoElement>(null); const [muted, setMuted] = useState(false); useEffect(() => { const v = ref.current; if (!v) return; v.muted = false; v.play().catch(() => { v.muted = true; setMuted(true); v.play().catch(() => {}); }); }, [src]); return (<div className="absolute inset-0 z-10 bg-black" onClick={(e) => e.stopPropagation()}><video ref={ref} src={src} poster={poster} className="w-full h-full object-contain" playsInline controls preload="auto" onVolumeChange={(e) => setMuted(e.currentTarget.muted)} />{muted && (<button type="button" onClick={() => { const v = ref.current; if (!v) return; v.muted = false; setMuted(false); v.play().catch(() => {}); }} className="absolute top-4 right-4 bg-white text-[#0a1628] text-xs font-semibold uppercase tracking-[0.15em] px-4 py-2.5 rounded-full shadow-lg">Turn on sound</button>)}</div>); }
export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "amenities" | "payment" | "nearby">("overview");
  const [showQR, setShowQR] = useState(false);
  const [generatingBrochure, setGeneratingBrochure] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [purchaseIntent, setPurchaseIntent] = useState<"outright" | "mortgage" | null>(null);
  const { isSaved, toggle: toggleWishlist } = useWishlist();

  // Referral tracking
  const refCode = searchParams.get("ref") ?? "";
  const partnerInfo = useQuery(
    api.partners.getPartnerByCode,
    refCode ? { code: refCode } : "skip"
  );
  const trackClick = useMutation(api.partners.trackReferralClick);
  const trackedRef = { current: false };
  useEffect(() => {
    if (!refCode || !id || trackedRef.current) return;
    trackedRef.current = true;
    void trackClick({ referralCode: refCode, resourceType: "property", resourceId: id, resourceTitle: "Property" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refCode, id]);

  const contact = useContactInfo();

  const propertyData = useQuery(
    api.properties.getById,
    id ? { id: id as Id<"properties"> } : "skip"
  );

  const allPropertiesData = useQuery(api.properties.listAll);

  // GEODATA LIVE INSPECT™ — Interactive 360°/VR Tour: only offer the entry
  // point when the feature is ON and a published tour actually exists for
  // this property (both checked server-side; the query itself returns null
  // for either case, so a single lookup covers both conditions).
  const publishedTour = useQuery(
    api.propertyTours.getPublishedTourForProperty,
    id ? { propertyId: id as Id<"properties"> } : "skip"
  );
  const hasTour = !!publishedTour && publishedTour.scenes.length > 0;

  // Signed-in client's existing engagement with this property (open lead or
  // in-progress transaction) — used to relabel the Buy Outright/Buy With
  // Mortgage buttons instead of prompting them to start over.
  const { isAuthenticated } = useConvexAuth();
  const purchaseEngagement = useQuery(
    api.sales.getActivePurchaseEngagement,
    isAuthenticated && id ? { propertyId: id as Id<"properties"> } : "skip"
  );

  // SEO — computed before the loading return so hooks stay unconditional.
  // Falls back to a generic title/description while propertyData is loading or null.
  const seoTitle = propertyData
    ? propertyData.seoTitle || `${propertyData.title} | ${formatPrice(propertyData.price)} – Geodata World`
    : "Property Details | Geodata World Services";
  const seoDescription = propertyData
    ? propertyData.seoDescription || `${propertyData.title} located in ${propertyData.location}, ${propertyData.state}. Listed at ${formatPrice(propertyData.price)}. View full details, photos, and pricing on Geodata World Services.`
    : "View property details, photos, and pricing on Geodata World Services Limited.";
  useSeo({
    title: seoTitle,
    description: seoDescription,
    canonicalPath: id ? `/properties/${id}` : "/properties",
  });

  useJsonLd(
    "ld-property",
    propertyData
      ? {
          "@context": "https://schema.org",
          "@type": ["Residence", "Product"],
          name: propertyData.title,
          url: `https://geodata.com.ng/properties/${id}`,
          offers: propertyData.price
            ? { "@type": "Offer", price: propertyData.price, priceCurrency: "NGN", availability: "https://schema.org/InStock", url: `https://geodata.com.ng/properties/${id}` }
            : undefined,
          description: propertyData.description,
          image: propertyData.featuredImage
            ? [propertyData.featuredImage, ...(propertyData.images ?? [])]
            : propertyData.images,
          address: {
            "@type": "PostalAddress",
            addressLocality: propertyData.location,
            addressRegion: propertyData.state,
            addressCountry: "NG",
          },
        }
      : null
  );

  // Show skeleton while loading
  if (propertyData === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-10 space-y-6">
          <Skeleton className="h-[480px] w-full rounded-3xl" />
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-80" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Use demo data if no property found
  const p = propertyData ?? {
    _id: id as Id<"properties">,
    title: "Royal Gardens Estate, Abuja",
    description: "A premium residential estate nestled in the heart of Gwarimpa, Abuja. This stunning property features world-class finishes, spacious living areas, and a beautifully landscaped garden. Ideal for families seeking comfort, security, and prestige in Nigeria's capital city.",
    price: 45_000_000,
    priceType: "outright",
    propertyType: "residential",
    status: "available",
    location: "Gwarimpa",
    state: "Abuja",
    lga: "Abuja Municipal",
    estate: "Royal Gardens Estate",
    bedrooms: 4,
    bathrooms: 3,
    landSize: "500 sqm",
    images: FALLBACK_IMAGES,
    featuredImage: FALLBACK_IMAGES[0],
    amenities: DEMO_AMENITIES,
    featured: true,
    views: 124,
    mapLat: 9.057853,
    mapLng: 7.399722,
  };

  // Always put featuredImage first in the gallery so uploaded images show correctly
  const primaryImage = p.featuredImage || FALLBACK_IMAGES[0];
  const rawImages = p.images?.length > 0 ? p.images : FALLBACK_IMAGES;
  const images = rawImages[0] === primaryImage ? rawImages : [primaryImage, ...rawImages.filter(i => i !== primaryImage)];
  const status = STATUS_CONFIG[p.status?.toLowerCase()] ?? { label: p.status, className: "bg-gray-100 text-gray-700" };

  const handleShare = () => {
    const ogUrl = `${CONVEX_SITE_URL}/og/property?id=${p._id}`;
    navigator.clipboard.writeText(ogUrl).catch(() => {});
    toast.success("Link copied to clipboard!");
  };

  const handleBrochure = async () => {
    setGeneratingBrochure(true);
    const otherProps = (allPropertiesData ?? [])
      .filter(op => op._id !== p._id)
      .map(op => ({
        _id: op._id,
        title: op.title,
        price: op.price,
        priceType: op.priceType,
        propertyType: op.propertyType,
        location: op.location,
        state: op.state,
        bedrooms: op.bedrooms,
        bathrooms: op.bathrooms,
        landSize: op.landSize,
        featuredImage: op.featuredImage,
      }));
    try {
      await generatePropertyBrochure({
        _id: p._id,
        title: p.title,
        description: p.description,
        price: p.price,
        priceType: p.priceType,
        propertyType: p.propertyType,
        status: p.status,
        location: p.location,
        state: p.state,
        lga: p.lga,
        estate: p.estate,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        landSize: p.landSize,
        featuredImage: images[0],
        images: images,
        amenities: p.amenities?.length > 0 ? p.amenities : [],
        otherProperties: otherProps,
        contact: {
          primaryPhone: contact.primaryPhone,
          primaryEmail: contact.primaryEmail,
          offices: contact.offices.map(o => ({ city: o.city, address: o.address })),
        },
      });
      toast.success("Brochure downloaded!");
    } catch {
      toast.error("Couldn't generate the brochure. Please try again.");
    } finally {
      setGeneratingBrochure(false);
    }
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "amenities", label: "Amenities" },
    { key: "payment", label: "Payment Plan" },
    { key: "nearby", label: "Nearby" },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="hover:text-[var(--brand)] transition-colors flex items-center gap-1">
            <Home size={13} /> Home
          </Link>
          <ChevronRight size={13} />
          <Link to="/properties" className="hover:text-[var(--brand)] transition-colors">Properties</Link>
          <ChevronRight size={13} />
          <span className="text-gray-800 font-medium line-clamp-1">{p.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8">
        {/* Back button */}
        <Link to="/properties" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--brand)] transition-colors mb-5">
          <ArrowLeft size={15} /> Back to Listings
        </Link>

        {/* ── Main Gallery ── */}
<div className="grid grid-cols-4 grid-rows-2 gap-2 h-[calc((100vw-2rem)*0.5625)] sm:h-[500px] rounded-3xl overflow-hidden mb-8">
          {/* Main image */}
          <div
className="col-span-4 row-span-2 relative cursor-pointer group"
            onClick={() => setLightboxIdx(0)}
          >
            <img src={images[0]} alt={p.title} className="w-full h-full object-cover group-hover:brightness-90 transition-all" />
            {(() => { const v = SBC_VIDEOS.find((x) => x.match.test(p.title)); return v && /southern\s*bridge/i.test(p.estate ?? "") ? <PropertyHeroVideo src={v.src} poster={images[0]} /> : null; })()}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/20 backdrop-blur-sm rounded-full w-14 h-14 flex items-center justify-center">
                <PlayCircle size={28} className="text-white" />
              </div>
            </div>
          </div>
          {/* Thumbnail grid */}
          {images.slice(1, 1).map((img, i) => (
            <div
              key={i}
              className="relative cursor-pointer group overflow-hidden hidden sm:block"
              onClick={() => setLightboxIdx(i + 1)}
            >
              <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              {i === 3 && images.length > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xl">
                  +{images.length - 5}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* View all photos button */}
        <div className="flex flex-wrap gap-3 mb-8 -mt-4">
          <Button
            variant="secondary"
            size="sm"
            className="border border-gray-200 gap-1.5 text-xs"
            onClick={() => setLightboxIdx(0)}
          >
            <PlayCircle size={14} /> View All {images.length} Photos
          </Button>
          <Button variant="secondary" size="sm" className="border border-gray-200 gap-1.5 text-xs" onClick={handleShare}>
            <Share2 size={14} /> Share
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className={cn("border gap-1.5 text-xs", isSaved(p._id) ? "border-red-200 bg-red-50 text-red-500" : "border-gray-200")}
            onClick={() => toggleWishlist(p._id, p.title)}
          >
            <Heart size={14} className={cn(isSaved(p._id) && "fill-current")} /> {isSaved(p._id) ? "Saved" : "Save"}
          </Button>
          <Button variant="secondary" size="sm" className="border border-gray-200 gap-1.5 text-xs" onClick={() => setShowQR(true)}>
            <QrCode size={14} /> QR Code
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="border border-gray-200 gap-1.5 text-xs"
            onClick={handleBrochure}
            disabled={generatingBrochure}
          >
            <Download size={14} /> {generatingBrochure ? "Generating…" : "Brochure"}
          </Button>
        </div>

        {/* ── GEODATA LIVE INSPECT™ — 3-mode banner ── */}


        {/* ── Content Grid ── */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Quick Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-wrap gap-2 mb-3">
<span className="text-[10px] uppercase tracking-[0.2em] text-[#0a1628] bg-[#f4f2ec] px-2.5 py-1">{status.label}</span>
<span className="text-[10px] uppercase tracking-[0.2em] text-[#5c6b7e] border border-[#e5e0d5] px-2.5 py-1">{p.propertyType}</span>

              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {p.title}
              </h1>
<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-500 text-sm mb-4">
                <MapPin size={14} className="text-[var(--brand)]" />
                <span>{p.location}, {p.state}</span>
                {p.estate && <span className="text-gray-400">• {p.estate}</span>}
                {p.lga && <span className="text-gray-400">• {p.lga} LGA</span>}
              </div>
<div className="flex flex-wrap gap-5 text-sm text-[#5c6b7e] mb-4 pb-4 border-b border-[#e5e0d5]">
                {p.bedrooms != null && (
<span className="flex items-center gap-1.5">
                    <BedDouble size={15} className="text-[var(--brand)]" /> {p.bedrooms} Bedrooms
                  </span>
                )}
                {p.bathrooms != null && (
<span className="flex items-center gap-1.5">
                    <Bath size={15} className="text-[var(--brand)]" /> {p.bathrooms} Bathrooms
                  </span>
                )}
                {p.landSize && (
<span className="flex items-center gap-1.5">
                    <Expand size={15} className="text-[var(--brand)]" /> {p.landSize}
                  </span>
                )}
              </div>
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Price</div>
                  <div className="text-3xl font-bold text-[var(--brand)]" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {formatPrice(p.price)}
                  </div>
                  <FxEquivalents naira={p.price} variant="chips" showNote className="pt-1.5" />
                  <div className="text-xs text-gray-400 capitalize mt-0.5">{p.priceType} basis</div>
                </div>
                {purchaseEngagement ? (
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge className="bg-amber-100 text-amber-700 border-0 gap-1.5 px-2.5 py-1">
                      <CheckCircle size={13} /> You already have a request in progress
                    </Badge>
<Button className="rounded-none bg-transparent border border-[#0a1628]/20 hover:border-[#0a1628] hover:bg-transparent text-[#0a1628] text-xs uppercase tracking-[0.12em] gap-2" asChild>
                      <a href="#callback"><MessageSquare size={15} /> Continue with Your Agent</a>
                    </Button>
                  </div>
                ) : (
<div className="grid grid-cols-1 w-full sm:w-auto sm:flex sm:flex-wrap gap-2">
<Button onClick={() => setPurchaseIntent("outright")} className="rounded-none bg-[#0a1628] hover:bg-[#0f2547] text-white text-xs uppercase tracking-[0.12em] gap-2 cursor-pointer">
                      <Banknote size={15} /> Buy Outright
                    </Button>
<Button onClick={() => setPurchaseIntent("mortgage")} className="rounded-none bg-transparent border border-[#0a1628] hover:bg-[#0a1628] hover:text-white text-[#0a1628] text-xs uppercase tracking-[0.12em] gap-2 cursor-pointer">
                      <Landmark size={15} /> Buy With Mortgage
                    </Button>
<Button className="rounded-none bg-transparent border border-[#0a1628]/20 hover:border-[#0a1628] hover:bg-transparent text-[#0a1628] text-xs uppercase tracking-[0.12em] gap-2" asChild>
                      <a href="#callback"><MessageSquare size={15} /> Callback</a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
<PropertyFloorPlan title={p.title} estate={p.estate} only="site" />
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
<div className="flex border-b border-gray-100 overflow-x-auto [scrollbar-width:none]">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                      activeTab === tab.key
                        ? "border-[var(--brand)] text-[var(--brand)] bg-blue-50/50"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeTab === "overview" && (
                    <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <style>{`
                        .property-prose { color: #4B5563; font-size: 0.875rem; line-height: 1.75; }
                        .property-prose h1 { font-family: 'Playfair Display', serif; font-size: 1.35rem; font-weight: 700; color: #111; margin: 1.25rem 0 0.5rem; }
                        .property-prose h2 { font-family: 'Playfair Display', serif; font-size: 1.15rem; font-weight: 700; color: #111; margin: 1.1rem 0 0.45rem; }
                        .property-prose h3 { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: #111; margin: 1rem 0 0.4rem; }
                        .property-prose p { margin: 0 0 0.85rem; }
                        .property-prose ul { margin: 0 0 0.85rem 1.25rem; list-style: disc; }
                        .property-prose ol { margin: 0 0 0.85rem 1.25rem; list-style: decimal; }
                        .property-prose li { margin-bottom: 0.3rem; }
                        .property-prose blockquote { border-left: 3px solid var(--brand); padding: 0.4rem 0 0.4rem 0.85rem; margin: 0.85rem 0; font-style: italic; color: #4B5563; background: #f9fafb; border-radius: 0 0.4rem 0.4rem 0; }
                        .property-prose a { color: var(--brand); text-decoration: underline; }
                        .property-prose strong { font-weight: 700; color: #111; }
                      `}</style>
                      {p.description ? (
                        <div className="property-prose" dangerouslySetInnerHTML={{ __html: ensureHtml(p.description) }} />
                      ) : (
                        <p className="text-gray-600 leading-relaxed text-sm">
                          A premium property by Geodata World Services Limited. Contact our team for a full description, virtual tour, and site visit arrangement.
                        </p>
                      )}
                      <div className="mt-6 grid sm:grid-cols-2 gap-4">
                        {[
                          { label: "Property Type", value: p.propertyType },
                          { label: "Status", value: p.status.replace("_", " ") },
                          { label: "State", value: p.state },
                          { label: "LGA", value: p.lga },
                          { label: "Estate", value: p.estate ?? "—" },
                          { label: "Price Type", value: p.priceType },
                          ...(p.bedrooms != null ? [{ label: "Bedrooms", value: String(p.bedrooms) }] : []),
                          ...(p.bathrooms != null ? [{ label: "Bathrooms", value: String(p.bathrooms) }] : []),
                          ...(p.landSize ? [{ label: "Land Size", value: p.landSize }] : []),
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between py-2 border-b border-gray-50">
                            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">{item.label}</span>
                            <span className="text-sm text-gray-800 font-medium capitalize">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "amenities" && (
                    <motion.div key="amenities" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Property Amenities</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {(p.amenities?.length > 0 ? p.amenities : DEMO_AMENITIES).map((amenity) => {
                          const Icon = AMENITY_ICONS[amenity.toLowerCase()] ?? Building2;
                          return (
                            <div key={amenity} className="flex items-center gap-2.5 bg-blue-50/60 rounded-xl p-3 border border-blue-100/50">
                              <div className="w-8 h-8 bg-[var(--brand)]/10 rounded-lg flex items-center justify-center shrink-0">
                                <Icon size={16} className="text-[var(--brand)]" />
                              </div>
                              <span className="text-sm text-gray-700 font-medium">{amenity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "payment" && (
                    <motion.div key="payment" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <h3 className="font-bold text-gray-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Flexible Payment Plan</h3>
                      <p className="text-sm text-gray-500 mb-1">Total price: <strong className="text-[var(--brand)]">{formatPrice(p.price)}</strong></p>
                      <FxEquivalents naira={p.price} className="mb-5" />
                      <div className="space-y-3">
                        {PAYMENT_PLAN.map((item, i) => (
                          <motion.div
                            key={item.step}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100"
                          >
                            <div className="w-10 h-10 rounded-full bg-[var(--brand)] text-white text-sm font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 text-sm">{item.step}</div>
                              <div className="text-xs text-gray-500">{item.note}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-[var(--brand)]" style={{ fontFamily: "'Playfair Display', serif" }}>{item.percent}</div>
                              <div className="text-xs text-gray-400">{formatPrice(p.price * (parseInt(item.percent) / 100))}</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      <div className="mt-4 p-4 bg-[var(--brand)]/5 rounded-xl border border-[var(--brand)]/10">
                        <p className="text-xs text-gray-600">
<strong className="text-[var(--brand)]">Note:</strong> Outright payment qualifies for a 5% discount. The mortgage option is a long-term home loan from the MOFI Real Estate Investment Fund (MREIF), backed by the Federal Government and offered through participating banks. Age 21 to 60 at loan end, up to 25% of RSA usable for equity. Open to Nigerians at home and in the diaspora with a satisfactory credit history. Contact our sales team for a personalized payment schedule.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "nearby" && (
                    <motion.div key="nearby" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Nearby Points of Interest</h3>
                      <div className="grid sm:grid-cols-2 gap-5">
                        {NEARBY_POIS.map((poi) => (
                          <div key={poi.label} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 bg-[var(--brand)]/10 rounded-lg flex items-center justify-center">
                                <poi.icon size={16} className="text-[var(--brand)]" />
                              </div>
                              <h4 className="font-semibold text-gray-800 text-sm">{poi.label}</h4>
                            </div>
                            <ul className="space-y-1.5">
                              {poi.items.map((item) => (
                                <li key={item} className="text-xs text-gray-600 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]/40 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

<PropertyFloorPlan title={p.title} estate={p.estate} only="plan" />

            <PropertyProgress estate={p.estate} />

            {/* Google Map */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Location Map</h3>
              </div>
              <div className="h-64">
                <StyledMap lat={p.mapLat ?? 9.057853} lng={p.mapLng ?? 7.399722} zoom={16} pin fallbackSrc={`https://maps.google.com/maps?q=${p.mapLat ?? 9.057853},${p.mapLng ?? 7.399722}&z=16&output=embed&t=h`} title="Property Location" className="h-full w-full" />
              </div>
            </div>
          </div>

          {/* Right: Sticky Sidebar */}
          <div className="space-y-5">
            {/* Price card */}
            <div className="bg-[var(--brand)] rounded-2xl p-6 text-white">
              <div className="text-blue-200 text-xs uppercase tracking-wide mb-1">Listed Price</div>
              <div className="text-3xl font-bold mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>
                {formatPrice(p.price)}
              </div>
              <FxEquivalents naira={p.price} variant="onDark" showNote className="pb-1.5 text-sm" />
              <div className="text-blue-200 text-xs capitalize">{p.priceType} • {p.propertyType}</div>
              <div className="mt-4 pt-4 border-t border-white/20 text-xs text-blue-100 space-y-1">
                <div className="flex justify-between"><span>Property ID</span><span className="font-mono font-medium">GWS-{id?.slice(-6).toUpperCase()}</span></div>
<div className="flex justify-between"><span>Developer</span><span>Geodata World Services Ltd.</span></div><div className="flex justify-between"><span>Title and approvals</span><span>Available on request</span></div></div>
            </div>

            {/* Request Callback */}
            <div id="callback" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Phone size={18} className="text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Request Callback</h3>
              </div>
              <InquiryForm propertyId={propertyData?._id} type="callback" />
            </div>

            {/* Agent Contact — shows partner phone if referred */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              {partnerInfo ? (
                <>
                  {/* Partner referral banner */}
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                    <Handshake size={14} className="text-amber-600 shrink-0" />
                    <span className="text-xs text-amber-800 font-medium">
                      Referred by <strong>{partnerInfo.fullName}</strong>
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Your Partner Contact</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-lg">
                      {partnerInfo.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{partnerInfo.fullName}</div>
                      <div className="text-xs text-amber-600 font-medium">Geodata Partner Agent</div>
                    </div>
                    <div className="ml-auto">
                      <Badge className="bg-amber-100 text-amber-700 text-xs border-0">Partner</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <a href={`tel:${partnerInfo.phone}`} className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-[var(--brand)] transition-colors p-2.5 rounded-lg hover:bg-blue-50">
                      <Phone size={15} className="text-[var(--brand)]" /> {partnerInfo.phone}
                    </a>
                    {partnerInfo.whatsapp && (
                      <a href={`https://wa.me/${partnerInfo.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-emerald-600 hover:text-emerald-700 transition-colors p-2.5 rounded-lg hover:bg-emerald-50">
                        <MessageSquare size={15} /> WhatsApp Partner
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Contact Agent</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--brand)] flex items-center justify-center text-white font-bold text-lg">G</div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">Geodata Sales Team</div>
                      <div className="text-xs text-gray-500">Verified Agent</div>
                    </div>
                    <div className="ml-auto">
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs border-0">Online</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <a href={`tel:${contact.primaryPhone}`} className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-[var(--brand)] transition-colors p-2.5 rounded-lg hover:bg-blue-50">
                      <Phone size={15} className="text-[var(--brand)]" /> {contact.primaryPhone}
                    </a>
                    <a href={`mailto:${contact.primaryEmail}`} className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-[var(--brand)] transition-colors p-2.5 rounded-lg hover:bg-blue-50">
                      <Mail size={15} className="text-[var(--brand)]" /> {contact.primaryEmail}
                    </a>
                    {contact.whatsappNumber && (
                      <a href={`https://wa.me/${contact.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-emerald-600 hover:text-emerald-700 transition-colors p-2.5 rounded-lg hover:bg-emerald-50">
                        <MessageSquare size={15} /> WhatsApp Now
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* QR Verification */}
            <button
              onClick={() => setShowQR(true)}
              className="w-full bg-gray-50 rounded-2xl p-5 border border-gray-100 text-center hover:border-[var(--brand)]/30 hover:bg-blue-50/40 transition-colors cursor-pointer"
            >
              <QrCode size={36} className="text-[var(--brand)] mx-auto mb-2" />
              <h4 className="font-semibold text-gray-800 text-sm mb-1">Property Verification</h4>
              <p className="text-xs text-gray-500 mb-3">Tap to view and scan this property's QR code</p>
              <div className="w-28 h-28 bg-white rounded-xl border border-gray-200 mx-auto flex items-center justify-center">
                <QrCode size={40} className="text-gray-300" />
              </div>
              <p className="text-xs text-[var(--brand)] mt-3 font-medium">GWS-{p._id.slice(-8).toUpperCase()}</p>
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <Lightbox
            images={images}
            index={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
            onPrev={() => setLightboxIdx((i) => ((i ?? 0) - 1 + images.length) % images.length)}
            onNext={() => setLightboxIdx((i) => ((i ?? 0) + 1) % images.length)}
          />
        )}
      </AnimatePresence>

      {/* QR Modal */}
      {showQR && (
        <PropertyQRModal
          qrData={`${CONVEX_SITE_URL}/og/property?id=${p._id}`}
          propertyId={p._id}
          onClose={() => setShowQR(false)}
        />
      )}

      {/* 360°/VR Tour Modal — second mode of GEODATA LIVE INSPECT™ */}
      <AnimatePresence>
        {showTour && id && (
          <PropertyTourModal
            propertyId={id as Id<"properties">}
            onClose={() => setShowTour(false)}
            onRequestLiveInspection={() => {
              setShowTour(false);
              document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        )}
      </AnimatePresence>

      {/* Buy Outright / Buy With Mortgage dialog */}
      {purchaseIntent && (
        <PurchaseIntentDialog
          open={!!purchaseIntent}
          onClose={() => setPurchaseIntent(null)}
propertyId={p._id} price={p.price} propertyTitle={p.title}
          financePreference={purchaseIntent}
        />
      )}

      <Footer />
      <WhatsAppButton />
    </div>
  );
}