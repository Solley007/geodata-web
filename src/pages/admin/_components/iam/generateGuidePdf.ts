import jsPDF from "jspdf";
import { GUIDE_INTRO, GUIDE_SECTIONS } from "./guideContent.ts";

const PAGE_WIDTH = 210;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PAGE_HEIGHT = 297;
const BOTTOM_MARGIN = 20;
const LOGO_URL = "/geodata-logo.png";

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch(LOGO_URL);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Generates the "Enterprise IAM, RBAC & Organisation" user guide as a
// downloadable, branded PDF. Content is sourced from guideContent.ts so the
// in-app Guide tab and this PDF never drift out of sync.
export async function generateGuidePdf(): Promise<void> {
  const doc = new jsPDF();
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - BOTTOM_MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // Cover header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PAGE_WIDTH, 42, "F");

  const logoDataUrl = await loadLogoDataUrl();
  const textStartX = logoDataUrl ? MARGIN + 28 : MARGIN;
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", MARGIN, 8, 24, 24);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Geodata World Services Limited", textStartX, 20);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Enterprise IAM, RBAC & Organisation — User Guide", textStartX, 30);
  doc.setFontSize(9);
  doc.text("www.geodata.com.ng", textStartX, 37);

  y = 54;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  const introLines = doc.splitTextToSize(GUIDE_INTRO, CONTENT_WIDTH);
  doc.text(introLines, MARGIN, y);
  y += introLines.length * 5 + 8;

  for (const section of GUIDE_SECTIONS) {
    ensureSpace(20);
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN - 2, y - 5, CONTENT_WIDTH + 4, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(section.title, MARGIN, y);
    y += 9;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    const summaryLines = doc.splitTextToSize(section.summary, CONTENT_WIDTH);
    ensureSpace(summaryLines.length * 4.5 + 4);
    doc.text(summaryLines, MARGIN, y);
    y += summaryLines.length * 4.5 + 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    for (const point of section.points) {
      const lines = doc.splitTextToSize(point, CONTENT_WIDTH - 6);
      ensureSpace(lines.length * 4.6 + 2);
      doc.text("\u2022", MARGIN, y);
      doc.text(lines, MARGIN + 5, y);
      y += lines.length * 4.6 + 2;
    }
    y += 5;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Geodata World Services Limited — Internal Use`, MARGIN, PAGE_HEIGHT - 10);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN - 20, PAGE_HEIGHT - 10);
  }

  doc.save("geodata-iam-user-guide.pdf");
}
