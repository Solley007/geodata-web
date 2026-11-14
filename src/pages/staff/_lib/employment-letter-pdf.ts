import jsPDF from "jspdf";

// ── Employment letter PDF ────────────────────────────────────────────────
// Simple letterhead-style layout (no images) — reuses jsPDF the same way as
// the property brochure generator, but with a plain text letter body since
// employment letters don't need photos/tables.

const LETTER_TITLE: Record<string, string> = {
  offer: "OFFER OF EMPLOYMENT",
  confirmation: "CONFIRMATION OF EMPLOYMENT",
  promotion: "LETTER OF PROMOTION",
  contract_renewal: "CONTRACT RENEWAL",
};

export type EmploymentLetterData = {
  letterType: string;
  fullName: string;
  position: string;
  department: string;
  startDate: string;
  employmentType: string;
  salary?: number;
  gradeLevel?: string;
  probationMonths?: number;
  reportingManager?: string;
  additionalTerms?: string;
  status: string;
  acceptedAt?: string;
  issuedDate: string; // _creationTime formatted
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

export function generateEmploymentLetterPdf(data: EmploymentLetterData): jsPDF {
  const doc = new jsPDF();
  const PAGE_W = 210;
  const MARGIN = 20;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = 20;

  // Letterhead
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(11, 77, 187);
  doc.text("GEODATA WORLD SERVICES LIMITED", PAGE_W / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Nigeria's Premier Real Estate Company · www.geodata.com.ng", PAGE_W / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(11, 77, 187);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 12;

  // Title
  doc.setTextColor(23, 23, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(LETTER_TITLE[data.letterType] ?? "EMPLOYMENT LETTER", PAGE_W / 2, y, { align: "center" });
  y += 10;

  // Date + recipient
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(formatDate(data.issuedDate), MARGIN, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text(data.fullName, MARGIN, y);
  y += 8;

  const employmentTypeLabel = data.employmentType.replace("_", " ");
  const bodyParagraphs: string[] = [];

  if (data.letterType === "offer") {
    bodyParagraphs.push(
      `Dear ${data.fullName.split(" ")[0]},`,
      "",
      `We are pleased to offer you employment with Geodata World Services Limited as ${data.position} in the ${data.department} department, on a ${employmentTypeLabel} basis, effective ${formatDate(data.startDate)}.`,
    );
  } else if (data.letterType === "confirmation") {
    bodyParagraphs.push(
      `Dear ${data.fullName.split(" ")[0]},`,
      "",
      `We are pleased to confirm your appointment as ${data.position} in the ${data.department} department, following the successful completion of your probationary period.`,
    );
  } else if (data.letterType === "promotion") {
    bodyParagraphs.push(
      `Dear ${data.fullName.split(" ")[0]},`,
      "",
      `We are pleased to inform you of your promotion to ${data.position} in the ${data.department} department, effective ${formatDate(data.startDate)}.`,
    );
  } else {
    bodyParagraphs.push(
      `Dear ${data.fullName.split(" ")[0]},`,
      "",
      `This letter confirms the renewal of your contract as ${data.position} in the ${data.department} department, effective ${formatDate(data.startDate)}.`,
    );
  }

  bodyParagraphs.push("", "The key terms of your employment are as follows:");

  doc.setFont("helvetica", "normal");
  for (const para of bodyParagraphs) {
    const lines = doc.splitTextToSize(para, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5.5 + (para === "" ? 0 : 1);
  }
  y += 3;

  const terms: [string, string][] = [
    ["Position", data.position],
    ["Department", data.department],
    ["Employment Type", employmentTypeLabel.charAt(0).toUpperCase() + employmentTypeLabel.slice(1)],
    ["Start Date", formatDate(data.startDate)],
  ];
  if (data.gradeLevel) terms.push(["Grade Level", data.gradeLevel]);
  if (data.salary) terms.push(["Monthly Salary", `₦${data.salary.toLocaleString()}`]);
  if (data.probationMonths) terms.push(["Probation Period", `${data.probationMonths} month(s)`]);
  if (data.reportingManager) terms.push(["Reporting Manager", data.reportingManager]);

  doc.setFillColor(245, 247, 251);
  const tableY0 = y;
  const rowH = 7;
  doc.rect(MARGIN, tableY0, CONTENT_W, terms.length * rowH, "F");
  doc.setFontSize(10);
  terms.forEach(([label, value], i) => {
    const rowY = tableY0 + i * rowH + 5;
    doc.setFont("helvetica", "bold");
    doc.text(label, MARGIN + 4, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(value, MARGIN + 65, rowY);
  });
  y = tableY0 + terms.length * rowH + 10;

  if (data.additionalTerms) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Additional Terms", MARGIN, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.additionalTerms, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5.5 + 6;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const closing = doc.splitTextToSize(
    "This letter, together with our staff handbook and applicable policies, forms the basis of your employment with us. Please review the terms above carefully.",
    CONTENT_W,
  );
  doc.text(closing, MARGIN, y);
  y += closing.length * 5.5 + 10;

  doc.setFont("helvetica", "bold");
  doc.text("For: Geodata World Services Limited", MARGIN, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.text("Human Resources", MARGIN, y);
  y += 14;

  if (data.status === "accepted" && data.acceptedAt) {
    doc.setFillColor(230, 250, 237);
    doc.rect(MARGIN, y, CONTENT_W, 14, "F");
    doc.setTextColor(22, 130, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Accepted electronically by ${data.fullName} on ${new Date(data.acceptedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, MARGIN + 4, y + 9);
  }

  return doc;
}
