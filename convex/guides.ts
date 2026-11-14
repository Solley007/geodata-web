"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { jsPDF } from "jspdf";

const COMPANY_NAME = "GEODATA WORLD SERVICES LTD";
const COMPANY_WEBSITE = "www.geodata.com.ng";
const LOGO_URL = "https://geodata.com.ng/media/file_H25zOEAam397jDXmMYnonPoJ.png";
const BRAND_BLUE: [number, number, number] = [11, 77, 187];
const BRAND_BLACK: [number, number, number] = [17, 17, 17];
const LIGHT_BLUE: [number, number, number] = [230, 238, 255];
const PAGE_WIDTH = 210;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type GuideSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  adminOnly?: boolean;
};

type GuideDoc = {
  audience: "staff" | "client";
  title: string;
  subtitle: string;
  sections: GuideSection[];
};

async function fetchLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}

function addCoverPage(doc: jsPDF, logo: string | null, title: string, subtitle: string): void {
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, PAGE_WIDTH, 297, "F");

  if (logo) {
    const logoSize = 34;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(PAGE_WIDTH / 2 - logoSize / 2 - 4, 60, logoSize + 8, logoSize + 8, 4, 4, "F");
    doc.addImage(logo, "PNG", PAGE_WIDTH / 2 - logoSize / 2, 64, logoSize, logoSize);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_NAME, PAGE_WIDTH / 2, 115, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_WEBSITE, PAGE_WIDTH / 2, 122, { align: "center" });

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(title, PAGE_WIDTH / 2, 155, { align: "center", maxWidth: CONTENT_WIDTH });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, PAGE_WIDTH / 2, 168, { align: "center", maxWidth: CONTENT_WIDTH - 30 });

  doc.setFontSize(9);
  doc.setTextColor(220, 230, 250);
  doc.text(`Generated ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}`, PAGE_WIDTH / 2, 265, { align: "center" });
  doc.text("GEODATA LIVE INSPECT\u2122", PAGE_WIDTH / 2, 272, { align: "center" });
}

function addPageHeader(doc: jsPDF, logo: string | null, docTitle: string): void {
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, PAGE_WIDTH, 20, "F");
  if (logo) {
    doc.addImage(logo, "PNG", MARGIN, 3.5, 13, 13);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_NAME, MARGIN + (logo ? 17 : 0), 9);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_WEBSITE, MARGIN + (logo ? 17 : 0), 14.5);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(docTitle, PAGE_WIDTH - MARGIN, 12, { align: "right" });
}

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(...LIGHT_BLUE);
  doc.rect(0, pageHeight - 14, PAGE_WIDTH, 14, "F");
  doc.setTextColor(...BRAND_BLUE);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(`${COMPANY_NAME}  \u00b7  ${COMPANY_WEBSITE}`, MARGIN, pageHeight - 5.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH - MARGIN, pageHeight - 5.5, { align: "right" });
}

function renderGuide(doc: jsPDF, logo: string | null, guide: GuideDoc): void {
  addCoverPage(doc, logo, guide.title, guide.subtitle);

  let y = 0;
  const startNewPage = () => {
    doc.addPage();
    y = 30;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > 280) startNewPage();
  };

  doc.addPage();
  y = 30;

  for (const section of guide.sections) {
    ensureSpace(14);
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(MARGIN, y - 5, 3, 7, "F");
    doc.setTextColor(...BRAND_BLACK);
    doc.setFontSize(12.5);
    doc.setFont("helvetica", "bold");
    doc.text(section.heading, MARGIN + 6, y);
    if (section.adminOnly) {
      const badgeText = "ADMIN ONLY";
      doc.setFontSize(7);
      const badgeWidth = doc.getTextWidth(badgeText) + 5;
      doc.setFillColor(255, 236, 179);
      doc.roundedRect(PAGE_WIDTH - MARGIN - badgeWidth, y - 4.5, badgeWidth, 5.5, 1.5, 1.5, "F");
      doc.setTextColor(146, 96, 0);
      doc.setFont("helvetica", "bold");
      doc.text(badgeText, PAGE_WIDTH - MARGIN - badgeWidth / 2, y - 0.8, { align: "center" });
    }
    y += 7;

    doc.setTextColor(...BRAND_BLACK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);

    for (const para of section.paragraphs ?? []) {
      const lines: string[] = doc.splitTextToSize(para, CONTENT_WIDTH);
      ensureSpace(lines.length * 5 + 2);
      doc.text(lines, MARGIN, y);
      y += lines.length * 5 + 3;
    }

    for (const bullet of section.bullets ?? []) {
      const lines: string[] = doc.splitTextToSize(bullet, CONTENT_WIDTH - 6);
      ensureSpace(lines.length * 5 + 2);
      doc.setFillColor(...BRAND_BLUE);
      doc.circle(MARGIN + 1.3, y - 1.6, 1, "F");
      doc.text(lines, MARGIN + 5, y);
      y += lines.length * 5 + 2.5;
    }

    y += 4;
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    addPageHeader(doc, logo, guide.title);
    addPageFooter(doc, p - 1, totalPages - 1);
  }
}

// ─── Staff/Admin guide content ─────────────────────────────────────
function staffGuide(): GuideDoc {
  return {
    audience: "staff",
    title: "GEODATA LIVE INSPECT\u2122 User Guide",
    subtitle: "Live Virtual Inspection & 360\u00b0/VR Tour \u2014 Staff & Administrator Guide",
    sections: [
      {
        heading: "1. What is GEODATA LIVE INSPECT\u2122?",
        paragraphs: [
          "GEODATA LIVE INSPECT\u2122 is an integrated inspection experience built directly into the existing Properties, CRM, Documents, and Tasks modules. It offers three modes from the same property record:",
        ],
        bullets: [
          "Live Property Inspection \u2014 a scheduled, real-time video walkthrough between an officer and a client or prospect.",
          "Interactive 360\u00b0/VR Tour \u2014 a self-guided panoramic tour clients can explore on their own, any time.",
          "Live Construction Inspection \u2014 the same live video system, used for construction/site progress reviews.",
        ],
      },
      {
        heading: "2. Who can access it",
        paragraphs: [
          "Access is permission-based, not automatic. Being an admin, being on a property's team, or partnering with GRBS/other external parties does NOT grant access by itself. Every action below is individually permission-gated and every grant is recorded in the Audit Log.",
        ],
        bullets: [
          "View Live Inspections / View 360\u00b0 Tours \u2014 required just to open these screens.",
          "Create / Schedule \u2014 required to open a new inspection request or book a session.",
          "Start / Join \u2014 required to enter the live video session as host or participant.",
          "Manage \u2014 required to change the feature toggle, reassign officers, or edit settings.",
          "Capture / Note \u2014 required to take snapshots or write internal notes during a session.",
          "Complete / Report / Export \u2014 required to close out a session and generate/download its report.",
          "Tour Edit / Publish / Delete \u2014 required to manage 360\u00b0 scenes, hotspots, and publish status.",
        ],
      },
      {
        heading: "3. Granting access (Administrators)",
        adminOnly: true,
        paragraphs: [
          "Permissions are granted per role from Users & Roles \u2192 Permissions. There is no default access \u2014 every role starts with none of the Live Inspection or 360\u00b0 Tour permissions until an administrator explicitly grants them.",
        ],
        bullets: [
          "Go to Admin \u2192 Users & Roles \u2192 Permissions tab.",
          "Select the role you want to update (e.g. Manager, Officer, Staff).",
          "Tick the specific live_inspection.* and/or property_tour.* permissions that role should have.",
          "Save. The change applies immediately and is written to the Audit Log with who made it and when.",
        ],
      },
      {
        heading: "4. Turning the feature on or off",
        adminOnly: true,
        paragraphs: [
          "Both modes have independent toggles so they can be enabled separately: Live Virtual Inspection and 360\u00b0/VR Tour. Toggling is itself permission-controlled (requires the Manage permission) and every change is audited.",
        ],
        bullets: [
          "Live Virtual Inspection toggle: Admin \u2192 Settings \u2192 Access Control.",
          "360\u00b0/VR Tour toggle: same Settings \u2192 Access Control screen, separate switch.",
          "When a toggle is off, the related navigation and actions are hidden app-wide, but existing records and history remain intact and visible to authorized administrators and auditors.",
        ],
      },
      {
        heading: "5. Scheduling and running a Live Inspection",
        paragraphs: [
          "Live Inspections are reused directly from the property record \u2014 there is no separate database of properties for this feature.",
        ],
        bullets: [
          "Open the property in Admin \u2192 Properties, then choose Schedule Live Inspection (or open Admin \u2192 Live Virtual Inspection directly).",
          "Pick the inspection type: Property, Estate/Location, or Construction.",
          "Set the date/time and assign the officer who will host the session.",
          "The session moves through statuses: Draft \u2192 Requested \u2192 Scheduled \u2192 Confirmed \u2192 Live \u2192 Completed (or Cancelled / No Show / Rescheduled).",
          "During the live video session, officers can capture snapshots and write notes. Internal notes are never shown to the client \u2014 only notes explicitly marked client-visible appear on their side.",
          "On completion, generate the inspection report (reuses the existing PDF/document system) and file supporting documents in the shared Vault.",
        ],
      },
      {
        heading: "6. Managing a 360\u00b0/VR Tour",
        paragraphs: [
          "Tours are managed from inside the Properties module \u2014 open a property and choose Manage 360\u00b0 Tour.",
        ],
        bullets: [
          "Create a tour and add scenes, each backed by a genuine 360\u00b0 equirectangular panoramic image.",
          "Name each scene (room or location) and set navigation hotspots linking scenes together.",
          "Add optional info hotspots with descriptions, floor info, or exterior/estate context.",
          "Publish the tour once ready \u2014 unpublished tours are not visible to visitors.",
          "Visitors flow through: Explore \u2192 Move between locations \u2192 Inspect rooms/info \u2192 Request a Live Inspection if they want a real-time walkthrough.",
        ],
      },
      {
        heading: "7. Troubleshooting",
        bullets: [
          "\"Access Denied\" screen \u2014 you do not yet have the required permission. Administrators can grant it from Users & Roles \u2192 Permissions; everyone else should ask their administrator.",
          "Feature appears missing from navigation entirely \u2014 the feature toggle is off. Ask an administrator to enable it from Settings \u2192 Access Control.",
          "Can't find a past inspection \u2014 records are preserved even while the feature is off. Authorized administrators and auditors can still view history.",
        ],
      },
    ],
  };
}

// ─── Client-facing guide content ───────────────────────────────────
function clientGuide(): GuideDoc {
  return {
    audience: "client",
    title: "GEODATA LIVE INSPECT\u2122 Guide",
    subtitle: "How to explore properties and request a live virtual inspection",
    sections: [
      {
        heading: "1. What is GEODATA LIVE INSPECT\u2122?",
        paragraphs: [
          "GEODATA LIVE INSPECT\u2122 lets you explore a property from anywhere and, if you want a closer look, request a real-time video walkthrough with one of our officers.",
        ],
      },
      {
        heading: "2. Taking a self-guided 360\u00b0/VR Tour",
        bullets: [
          "Open any property listing that shows a \"Start 360\u00b0 Tour\" button.",
          "Explore freely \u2014 move between rooms and locations, look around each space, and view info hotspots for extra details.",
          "No booking or officer is needed for this \u2014 it is available any time, at your own pace.",
        ],
      },
      {
        heading: "3. Requesting a Live Inspection",
        paragraphs: [
          "If you would like a real-time walkthrough with a member of our team, request a Live Inspection directly from the property page.",
        ],
        bullets: [
          "Click \"Request Live Inspection\" on the property page.",
          "Choose your preferred date and time; our team will confirm the session.",
          "At the scheduled time, join the session from your Client Portal under Live Inspections.",
          "You can ask questions and request specific areas be shown during the live video call.",
          "After the session, you may receive a summary report of what was covered.",
        ],
      },
      {
        heading: "4. Privacy note",
        paragraphs: [
          "Some notes officers take during a session are for internal use only and are never shared with you. Only information explicitly intended for you \u2014 such as approved snapshots and summary notes \u2014 will appear in your portal.",
        ],
      },
      {
        heading: "5. Need help?",
        paragraphs: [
          `If you have any trouble accessing a tour or joining a session, contact our support team from the Support section of your Client Portal, or visit ${COMPANY_WEBSITE}.`,
        ],
      },
    ],
  };
}

export const generateLiveInspectionGuidePdf = action({
  args: { audience: v.union(v.literal("staff"), v.literal("client")) },
  handler: async (_ctx, args): Promise<{ pdf: string; filename: string }> => {
    const logo = await fetchLogoDataUrl();
    const doc = new jsPDF();
    const guide = args.audience === "staff" ? staffGuide() : clientGuide();
    renderGuide(doc, logo, guide);
    const pdfBase64 = doc.output("dataurlstring");
    const filename = args.audience === "staff"
      ? "geodata-live-inspect-staff-guide.pdf"
      : "geodata-live-inspect-client-guide.pdf";
    return { pdf: pdfBase64, filename };
  },
});
