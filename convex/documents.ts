"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

const COMPANY_NAME = "GEODATA WORLD SERVICES LTD";
const COMPANY_ADDRESS = "No. 12 Independence Avenue, Abuja, FCT, Nigeria";
const COMPANY_PHONE = "+234 800 000 0000";
const COMPANY_EMAIL = "info@geodata.com.ng";
const COMPANY_WEBSITE = "www.geodata.com.ng";
const BRAND_BLUE: [number, number, number] = [11, 77, 187];
const BRAND_BLACK: [number, number, number] = [17, 17, 17];
const LIGHT_BLUE: [number, number, number] = [230, 238, 255];

// ─── Helpers ─────────────────────────────────────────────────────
function addHeader(doc: jsPDF, title: string, subtitle?: string): number {
  // Blue header bar
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, 210, 32, "F");

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_NAME, 14, 13);

  // Contact info
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY_ADDRESS}  |  ${COMPANY_PHONE}  |  ${COMPANY_EMAIL}`, 14, 20);
  doc.text(COMPANY_WEBSITE, 14, 26);

  // Document title
  doc.setFillColor(...BRAND_BLACK);
  doc.rect(0, 32, 210, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), 105, 40, { align: "center" });

  if (subtitle) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 105, 47, { align: "center" });
    return 56;
  }
  return 50;
}

function addFooter(doc: jsPDF, pageNum: number): void {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(...LIGHT_BLUE);
  doc.rect(0, pageHeight - 18, 210, 18, "F");
  doc.setTextColor(...BRAND_BLUE);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(
    "This document is legally binding and property of GEODATA WORLD SERVICES LTD. Any alteration renders it void.",
    105,
    pageHeight - 10,
    { align: "center" }
  );
  doc.text(`Page ${pageNum}`, 196, pageHeight - 4, { align: "right" });
}

function addWatermark(doc: jsPDF): void {
  doc.setTextColor(200, 210, 230);
  doc.setFontSize(52);
  doc.setFont("helvetica", "bold");
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  doc.text("GEODATA", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 45,
  });
  doc.setTextColor(0, 0, 0);
}

async function addQR(doc: jsPDF, data: string, x: number, y: number, size: number): Promise<void> {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, { width: 120, margin: 1 });
    doc.addImage(qrDataUrl, "PNG", x, y, size, size);
  } catch {
    // If QR fails, draw placeholder
    doc.setDrawColor(...BRAND_BLUE);
    doc.rect(x, y, size, size);
    doc.setFontSize(6);
    doc.text("QR", x + size / 2, y + size / 2, { align: "center" });
  }
}

function infoRow(doc: jsPDF, label: string, value: string, x: number, y: number): void {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND_BLUE);
  doc.text(label + ":", x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND_BLACK);
  doc.text(value, x + 40, y);
}

// ─── Input types ─────────────────────────────────────────────────
const allocationDocArgs = {
  allocationNumber: v.string(),
  clientName: v.string(),
  clientPhone: v.string(),
  clientEmail: v.string(),
  clientAddress: v.string(),
  estateName: v.string(),
  estateLocation: v.string(),
  plotNumber: v.string(),
  plotSize: v.string(),
  purchasePrice: v.number(),
  allocatedDate: v.string(),
  paymentType: v.string(),
  qrData: v.string(),
};

type AllocDoc = {
  allocationNumber: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  estateName: string;
  estateLocation: string;
  plotNumber: string;
  plotSize: string;
  purchasePrice: number;
  allocatedDate: string;
  paymentType: string;
  qrData: string;
};

// ─── 1. Offer Letter ─────────────────────────────────────────────
export const generateOfferLetter = action({
  args: allocationDocArgs,
  handler: async (_ctx, args: AllocDoc): Promise<string> => {
    const doc = new jsPDF();
    let y = addHeader(doc, "LETTER OF OFFER");
    addWatermark(doc);

    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND_BLACK);
    const dateStr = new Date(args.allocatedDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
    doc.text(`Date: ${dateStr}`, 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TO:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(args.clientName.toUpperCase(), 14, y); y += 5;
    doc.text(args.clientAddress, 14, y, { maxWidth: 100 }); y += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_BLUE);
    doc.text(`RE: OFFER OF PLOT ${args.plotNumber} — ${args.estateName.toUpperCase()}`, 14, y); y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_BLACK);
    const body = `We are pleased to offer you a plot of land at ${args.estateName}, located at ${args.estateLocation}. The terms and details of this offer are as follows:`;
    const lines = doc.splitTextToSize(body, 182);
    doc.text(lines, 14, y); y += lines.length * 5 + 4;

    // Details box
    doc.setFillColor(...LIGHT_BLUE);
    doc.roundedRect(14, y, 182, 52, 3, 3, "F");
    y += 8;
    infoRow(doc, "Allocation No", args.allocationNumber, 18, y); y += 7;
    infoRow(doc, "Plot No", args.plotNumber, 18, y); y += 7;
    infoRow(doc, "Estate", args.estateName, 18, y); y += 7;
    infoRow(doc, "Plot Size", args.plotSize, 18, y); y += 7;
    infoRow(doc, "Purchase Price", `₦${args.purchasePrice.toLocaleString()}`, 18, y); y += 7;
    infoRow(doc, "Payment Type", args.paymentType.charAt(0).toUpperCase() + args.paymentType.slice(1), 18, y); y += 12;

    const acceptance = `This offer is valid for 30 days from the date above. Kindly indicate your acceptance by signing and returning a copy of this letter along with the initial deposit of ₦${Math.round(args.purchasePrice * 0.1).toLocaleString()}. We look forward to welcoming you as a valued landowner at ${args.estateName}.`;
    const accLines = doc.splitTextToSize(acceptance, 182);
    doc.text(accLines, 14, y); y += accLines.length * 5 + 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Yours faithfully,", 14, y); y += 12;
    doc.line(14, y, 70, y); y += 4;
    doc.text("Authorized Signatory", 14, y); y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(COMPANY_NAME, 14, y); y += 14;

    doc.text("Client Acceptance Signature: ___________________________    Date: ____________", 14, y);

    // QR
    await addQR(doc, args.qrData, 156, y - 26, 30);
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text("Scan to verify", 171, y + 6, { align: "center" });

    addFooter(doc, 1);
    return doc.output("datauristring");
  },
});

// ─── 2. Allocation Letter ─────────────────────────────────────────
export const generateAllocationLetter = action({
  args: allocationDocArgs,
  handler: async (_ctx, args: AllocDoc): Promise<string> => {
    const doc = new jsPDF();
    let y = addHeader(doc, "ALLOCATION LETTER", `Ref: ${args.allocationNumber}`);
    addWatermark(doc);

    y += 6;
    const dateStr = new Date(args.allocatedDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...BRAND_BLACK);
    doc.text(`Date: ${dateStr}`, 14, y); y += 8;

    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("TO:", 14, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(args.clientName.toUpperCase(), 14, y); y += 5;
    doc.text(args.clientAddress, 14, y, { maxWidth: 100 }); y += 14;

    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...BRAND_BLUE);
    doc.text("NOTIFICATION OF PLOT ALLOCATION", 105, y, { align: "center" }); y += 10;

    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BRAND_BLACK);
    const intro = `This is to formally notify you that a plot of land has been allocated to you in our ${args.estateName} estate. The details of your allocation are recorded below for your reference and records.`;
    const introLines = doc.splitTextToSize(intro, 182);
    doc.text(introLines, 14, y); y += introLines.length * 5 + 6;

    // Allocation details table
    autoTable(doc, {
      startY: y,
      head: [["Field", "Details"]],
      body: [
        ["Allocation Number", args.allocationNumber],
        ["Client Name", args.clientName],
        ["Plot Number", args.plotNumber],
        ["Estate", args.estateName],
        ["Location", args.estateLocation],
        ["Plot Size", args.plotSize],
        ["Purchase Price", `₦${args.purchasePrice.toLocaleString()}`],
        ["Payment Type", args.paymentType.charAt(0).toUpperCase() + args.paymentType.slice(1)],
        ["Allocation Date", dateStr],
      ],
      theme: "grid",
      headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    y = finalY;

    const terms = "This allocation is subject to full payment of the purchase price and compliance with all estate rules and regulations issued by GEODATA WORLD SERVICES LTD. Failure to comply may result in revocation of this allocation.";
    const termLines = doc.splitTextToSize(terms, 182);
    doc.text(termLines, 14, y); y += termLines.length * 5 + 12;

    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("For: " + COMPANY_NAME, 14, y); y += 12;
    doc.line(14, y, 70, y); y += 4;
    doc.text("Managing Director / CEO", 14, y);

    await addQR(doc, args.qrData, 156, y - 28, 30);
    doc.setFontSize(6); doc.setTextColor(100, 100, 100);
    doc.text("Scan to verify", 171, y + 4, { align: "center" });

    addFooter(doc, 1);
    return doc.output("datauristring");
  },
});

// ─── 3. Receipt ──────────────────────────────────────────────────
export const generateReceipt = action({
  args: { ...allocationDocArgs, amountPaid: v.number(), receiptNumber: v.string(), paymentMethod: v.optional(v.string()) },
  handler: async (_ctx, args): Promise<string> => {
    const doc = new jsPDF();
    let y = addHeader(doc, "OFFICIAL RECEIPT", `Receipt No: ${args.receiptNumber}`);
    addWatermark(doc);

    y += 6;
    const dateStr = new Date(args.allocatedDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });

    // Receipt stamp
    doc.setFillColor(220, 240, 220);
    doc.roundedRect(130, y - 4, 66, 20, 3, 3, "F");
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 120, 0);
    doc.text("RECEIVED", 163, y + 5, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(dateStr, 163, y + 12, { align: "center" });

    doc.setTextColor(...BRAND_BLACK);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Received from: `, 14, y + 2); doc.setFont("helvetica", "bold"); doc.text(args.clientName, 50, y + 2);
    doc.setFont("helvetica", "normal");
    doc.text(`Address: ${args.clientAddress}`, 14, y + 9, { maxWidth: 110 });
    y += 28;

    // Big amount display
    doc.setFillColor(...BRAND_BLUE);
    doc.roundedRect(14, y, 182, 20, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("AMOUNT PAID", 14 + 8, y + 9);
    doc.setFontSize(16);
    doc.text(`₦${args.amountPaid.toLocaleString()}`, 196, y + 9, { align: "right" });
    y += 28;

    doc.setTextColor(...BRAND_BLACK);
    autoTable(doc, {
      startY: y,
      head: [["Description", "Details"]],
      body: [
        ["Allocation Number", args.allocationNumber],
        ["Plot Number", args.plotNumber],
        ["Estate", args.estateName],
        ["Plot Size", args.plotSize],
        ["Total Purchase Price", `₦${args.purchasePrice.toLocaleString()}`],
        ["Amount Paid", `₦${args.amountPaid.toLocaleString()}`],
        ["Balance", `₦${Math.max(0, args.purchasePrice - args.amountPaid).toLocaleString()}`],
        ["Payment Method", args.paymentMethod ?? "Bank Transfer"],
        ["Payment Type", args.paymentType.charAt(0).toUpperCase() + args.paymentType.slice(1)],
      ],
      theme: "striped",
      headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    y = finalY;

    doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text("This is an official receipt of payment. Please keep this document safe.", 14, y); y += 12;

    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...BRAND_BLACK);
    doc.text("Authorized by: " + COMPANY_NAME, 14, y); y += 10;
    doc.line(14, y, 70, y); y += 4;
    doc.text("Accounts Department", 14, y);

    await addQR(doc, args.qrData, 156, y - 24, 28);
    doc.setFontSize(6); doc.setTextColor(100, 100, 100);
    doc.text("Verify receipt", 170, y + 6, { align: "center" });

    addFooter(doc, 1);
    return doc.output("datauristring");
  },
});

// ─── 4. Invoice ──────────────────────────────────────────────────
export const generateInvoicePDF = action({
  args: { ...allocationDocArgs, invoiceNumber: v.string(), dueDate: v.string(), items: v.array(v.object({ description: v.string(), amount: v.number() })) },
  handler: async (_ctx, args): Promise<string> => {
    const doc = new jsPDF();
    let y = addHeader(doc, "INVOICE", `Invoice No: ${args.invoiceNumber}`);
    addWatermark(doc);

    y += 6;
    const dateStr = new Date(args.allocatedDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
    const dueStr = new Date(args.dueDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });

    // Bill to / Bill from
    doc.setFillColor(245, 247, 255);
    doc.rect(14, y, 85, 36, "F");
    doc.setFillColor(...LIGHT_BLUE);
    doc.rect(111, y, 85, 36, "F");

    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...BRAND_BLUE);
    doc.text("BILL TO:", 18, y + 6); doc.text("BILL FROM:", 115, y + 6);

    doc.setFont("helvetica", "normal"); doc.setTextColor(...BRAND_BLACK); doc.setFontSize(8.5);
    doc.text(args.clientName, 18, y + 12);
    doc.text(args.clientPhone, 18, y + 18);
    doc.text(doc.splitTextToSize(args.clientAddress, 75), 18, y + 24);

    doc.text(COMPANY_NAME, 115, y + 12);
    doc.text(COMPANY_PHONE, 115, y + 18);
    doc.text(doc.splitTextToSize(COMPANY_ADDRESS, 75), 115, y + 24);

    y += 44;
    doc.setFontSize(8.5);
    doc.text(`Invoice Date: ${dateStr}`, 14, y);
    doc.text(`Due Date: ${dueStr}`, 105, y);
    y += 8;

    const total = args.items.reduce((s, i) => s + i.amount, 0);
    autoTable(doc, {
      startY: y,
      head: [["#", "Description", "Amount (₦)"]],
      body: [
        ...args.items.map((item, idx) => [(idx + 1).toString(), item.description, `₦${item.amount.toLocaleString()}`]),
        ["", "TOTAL", `₦${total.toLocaleString()}`],
      ],
      theme: "grid",
      headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 12 }, 2: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });

    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    y = finalY;

    doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 100, 100);
    doc.text("Payment should be made to GEODATA WORLD SERVICES LTD. Please quote the invoice number on all transfers.", 14, y, { maxWidth: 140 });

    await addQR(doc, args.qrData, 164, y, 28);
    doc.setFontSize(6);
    doc.text("Scan to verify", 178, y + 30, { align: "center" });

    addFooter(doc, 1);
    return doc.output("datauristring");
  },
});

// ─── 5. Sales Contract ───────────────────────────────────────────
export const generateContract = action({
  args: allocationDocArgs,
  handler: async (_ctx, args: AllocDoc): Promise<string> => {
    const doc = new jsPDF();
    let y = addHeader(doc, "CONTRACT OF SALE");
    addWatermark(doc);

    y += 6;
    const dateStr = new Date(args.allocatedDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...BRAND_BLACK);

    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...BRAND_BLUE);
    doc.text("PARTIES TO THIS CONTRACT", 105, y, { align: "center" }); y += 8;

    doc.setFillColor(245, 247, 255);
    doc.rect(14, y, 182, 28, "F");
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...BRAND_BLACK);
    doc.text("VENDOR:", 18, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(`${COMPANY_NAME}, ${COMPANY_ADDRESS}`, 18, y + 12, { maxWidth: 170 });
    doc.setFont("helvetica", "bold");
    doc.text("PURCHASER:", 18, y + 20);
    doc.setFont("helvetica", "normal");
    doc.text(`${args.clientName}, ${args.clientAddress}`, 18, y + 26, { maxWidth: 170 });
    y += 36;

    const clauses = [
      ["1. SUBJECT MATTER", `The Vendor agrees to sell and the Purchaser agrees to buy Plot ${args.plotNumber} (${args.plotSize}) situated at ${args.estateName}, ${args.estateLocation}.`],
      ["2. PURCHASE PRICE", `The agreed purchase price for the plot is ₦${args.purchasePrice.toLocaleString()} (${numberToWords(args.purchasePrice)} Naira only), payable as ${args.paymentType}.`],
      ["3. TITLE & OWNERSHIP", "The Vendor warrants that it has good and marketable title to the said land and is lawfully empowered to sell same. Title shall pass to the Purchaser upon receipt of full payment."],
      ["4. SURVEY & DOCUMENTATION", "The Vendor shall provide a Survey Plan, Allocation Letter, and Deed of Assignment upon full payment."],
      ["5. DEFAULT", "In the event of default by the Purchaser for more than 60 days, this contract may be terminated and the Vendor reserves the right to resell the plot. Administrative charges may apply."],
      ["6. GOVERNING LAW", "This contract is governed by the laws of the Federal Republic of Nigeria."],
    ];

    for (const [title, text] of clauses) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...BRAND_BLUE);
      doc.text(title, 14, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setTextColor(...BRAND_BLACK);
      const lines = doc.splitTextToSize(text, 182);
      doc.text(lines, 14, y); y += lines.length * 4.5 + 5;
    }

    y += 4;
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
    doc.text("IN WITNESS WHEREOF the parties have executed this Contract on " + dateStr, 14, y); y += 12;

    doc.text("VENDOR:", 14, y); doc.text("PURCHASER:", 110, y); y += 14;
    doc.line(14, y, 80, y); doc.line(110, y, 176, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(COMPANY_NAME, 14, y); doc.text(args.clientName, 110, y); y += 4;
    doc.text("Authorized Signatory", 14, y); doc.text("Purchaser", 110, y);

    await addQR(doc, args.qrData, 82, y - 28, 24);

    addFooter(doc, 1);
    return doc.output("datauristring");
  },
});

// ─── 6. Deed of Assignment ───────────────────────────────────────
export const generateDeed = action({
  args: { ...allocationDocArgs, witnessName: v.optional(v.string()) },
  handler: async (_ctx, args): Promise<string> => {
    const doc = new jsPDF();
    let y = addHeader(doc, "DEED OF ASSIGNMENT");
    addWatermark(doc);

    y += 6;
    const dateStr = new Date(args.allocatedDate).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...BRAND_BLACK);

    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...BRAND_BLUE);
    doc.text("THIS DEED OF ASSIGNMENT", 105, y, { align: "center" }); y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...BRAND_BLACK);
    doc.text(`is made this ${dateStr}`, 105, y, { align: "center" }); y += 10;

    const recital = `BETWEEN ${COMPANY_NAME} (hereinafter called "the Assignor") of the one part AND ${args.clientName.toUpperCase()} of ${args.clientAddress} (hereinafter called "the Assignee") of the other part.`;
    const recLines = doc.splitTextToSize(recital, 182);
    doc.text(recLines, 14, y); y += recLines.length * 4.5 + 8;

    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...BRAND_BLUE);
    doc.text("RECITALS", 14, y); y += 6;

    const recitals = [
      `A. The Assignor is the registered owner of the land at ${args.estateName}, ${args.estateLocation}.`,
      `B. The Assignor has agreed to assign Plot ${args.plotNumber} (${args.plotSize}) to the Assignee for the sum of ₦${args.purchasePrice.toLocaleString()}, which has been fully received.`,
      `C. The Assignee has fulfilled all conditions precedent to the execution of this Deed.`,
    ];

    doc.setFont("helvetica", "normal"); doc.setTextColor(...BRAND_BLACK);
    for (const r of recitals) {
      const rLines = doc.splitTextToSize(r, 182);
      doc.text(rLines, 14, y); y += rLines.length * 4.5 + 4;
    }

    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...BRAND_BLUE);
    doc.text("NOW THIS DEED WITNESSETH as follows:", 14, y); y += 6;

    const clauses2 = [
      "1. In consideration of the sum paid (receipt whereof the Assignor hereby acknowledges), the Assignor hereby assigns unto the Assignee ALL THAT piece of land with the right to build thereon.",
      "2. The Assignor covenants with the Assignee for quiet enjoyment of the assigned property.",
      "3. This assignment is subject to the payment of all ground rents, rates, charges, and levies that may be imposed on the property by any lawful authority.",
      "4. The Assignee shall not sub-divide, sell, or transfer this property without written consent from the Assignor during the encumbrance period.",
    ];

    for (const clause of clauses2) {
      doc.setFont("helvetica", "normal"); doc.setTextColor(...BRAND_BLACK);
      const lines = doc.splitTextToSize(clause, 182);
      doc.text(lines, 14, y); y += lines.length * 4.5 + 4;
    }

    y += 8;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("EXECUTED as a DEED by the parties on the date written above.", 14, y); y += 14;

    doc.text("ASSIGNOR:", 14, y); doc.text("ASSIGNEE:", 110, y); y += 14;
    doc.line(14, y, 80, y); doc.line(110, y, 176, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(COMPANY_NAME, 14, y); doc.text(args.clientName, 110, y); y += 4;
    if (args.witnessName) {
      doc.text(`Witness: ${args.witnessName}`, 14, y + 8);
    }

    await addQR(doc, args.qrData, 82, y - 24, 24);

    addFooter(doc, 1);
    return doc.output("datauristring");
  },
});

// ─── 7. QR Verification ──────────────────────────────────────────
export const verifyAllocationQR = action({
  args: { qrPayload: v.string() },
  handler: async (ctx, args): Promise<{ valid: boolean; data?: Record<string, string>; message: string }> => {
    try {
      const parsed: Record<string, string> = JSON.parse(args.qrPayload) as Record<string, string>;
      if (!parsed.allocationNumber || !parsed.issuer) {
        return { valid: false, message: "Invalid QR code format." };
      }
      if (parsed.issuer !== "GEODATA WORLD SERVICES") {
        return { valid: false, message: "QR code not issued by GEODATA WORLD SERVICES." };
      }
      return {
        valid: true,
        data: parsed,
        message: "Allocation verified successfully.",
      };
    } catch {
      return { valid: false, message: "Could not parse QR code." };
    }
  },
});

// ─── 8. Live Virtual Inspection Report ────────────────────────────
const inspectionReportArgs = {
  inspectionRef: v.string(),
  propertyTitle: v.optional(v.string()),
  estateName: v.optional(v.string()),
  clientName: v.string(),
  officerName: v.optional(v.string()),
  scheduledAt: v.optional(v.string()),
  durationSeconds: v.optional(v.number()),
  status: v.string(),
  checklistCompleted: v.number(),
  checklistTotal: v.number(),
  clientRequestedAreas: v.array(v.string()),
  approvedSnapshotCount: v.number(),
  clientVisibleNotes: v.array(v.string()),
  documentsPresented: v.array(v.string()),
  outcome: v.optional(v.string()),
  followUpRequired: v.optional(v.boolean()),
};

type InspectionReportArgs = {
  inspectionRef: string;
  propertyTitle?: string;
  estateName?: string;
  clientName: string;
  officerName?: string;
  scheduledAt?: string;
  durationSeconds?: number;
  status: string;
  checklistCompleted: number;
  checklistTotal: number;
  clientRequestedAreas: string[];
  approvedSnapshotCount: number;
  clientVisibleNotes: string[];
  documentsPresented: string[];
  outcome?: string;
  followUpRequired?: boolean;
};

export const generateInspectionReport = action({
  args: inspectionReportArgs,
  handler: async (_ctx, args: InspectionReportArgs): Promise<string> => {
    const doc = new jsPDF();
    let y = addHeader(doc, "LIVE VIRTUAL INSPECTION REPORT", args.inspectionRef);

    const durationLabel = args.durationSeconds
      ? `${Math.floor(args.durationSeconds / 60)} min ${args.durationSeconds % 60}s`
      : "N/A";
    const scheduledLabel = args.scheduledAt
      ? new Date(args.scheduledAt).toLocaleString("en-NG", { dateStyle: "long", timeStyle: "short" })
      : "N/A";

    y += 4;
    doc.setFillColor(...LIGHT_BLUE);
    doc.roundedRect(14, y, 182, 58, 3, 3, "F");
    y += 8;
    infoRow(doc, "Reference", args.inspectionRef, 18, y); y += 7;
    infoRow(doc, "Property / Estate", args.propertyTitle ?? args.estateName ?? "N/A", 18, y); y += 7;
    infoRow(doc, "Client", args.clientName, 18, y); y += 7;
    infoRow(doc, "Officer", args.officerName ?? "Unassigned", 18, y); y += 7;
    infoRow(doc, "Date & Time", scheduledLabel, 18, y); y += 7;
    infoRow(doc, "Duration", durationLabel, 18, y); y += 7;
    infoRow(doc, "Status", args.status.replace(/_/g, " ").toUpperCase(), 18, y); y += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_BLUE);
    doc.text("CHECKLIST COMPLETION", 14, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_BLACK);
    doc.text(`${args.checklistCompleted} of ${args.checklistTotal} items completed`, 14, y); y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_BLUE);
    doc.text("CLIENT VIEW REQUESTS", 14, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_BLACK);
    const areasText = args.clientRequestedAreas.length > 0
      ? args.clientRequestedAreas.map((a) => a.replace(/_/g, " ")).join(", ")
      : "No specific areas were requested.";
    const areasLines = doc.splitTextToSize(areasText, 182);
    doc.text(areasLines, 14, y); y += areasLines.length * 5 + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_BLUE);
    doc.text(`APPROVED SNAPSHOTS (${args.approvedSnapshotCount})`, 14, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_BLACK);
    doc.text(`${args.approvedSnapshotCount} client-visible snapshot(s) captured during this inspection.`, 14, y); y += 10;

    if (y > 220) { addFooter(doc, 1); doc.addPage(); y = 20; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_BLUE);
    doc.text("NOTES SHARED WITH CLIENT", 14, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_BLACK);
    if (args.clientVisibleNotes.length === 0) {
      doc.text("No client-visible notes were recorded.", 14, y); y += 8;
    } else {
      for (const note of args.clientVisibleNotes) {
        const lines = doc.splitTextToSize(`• ${note}`, 182);
        doc.text(lines, 14, y); y += lines.length * 5 + 2;
      }
      y += 4;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_BLUE);
    doc.text("DOCUMENTS PRESENTED", 14, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_BLACK);
    if (args.documentsPresented.length === 0) {
      doc.text("No documents were presented during this inspection.", 14, y); y += 8;
    } else {
      for (const title of args.documentsPresented) {
        doc.text(`• ${title}`, 14, y); y += 6;
      }
      y += 2;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_BLUE);
    doc.text("FOLLOW-UP & OUTCOME", 14, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_BLACK);
    doc.text(`Follow-up required: ${args.followUpRequired ? "Yes" : "No"}`, 14, y); y += 6;
    const outcomeLines = doc.splitTextToSize(`Outcome: ${args.outcome ?? "Not recorded."}`, 182);
    doc.text(outcomeLines, 14, y);

    addFooter(doc, doc.internal.pages.length - 1);
    return doc.output("datauristring");
  },
});

// ─── 9. Management Report ─────────────────────────────────────────
const reportSectionArg = v.object({
  label: v.string(),
  stats: v.array(v.object({ label: v.string(), value: v.string() })),
});

export const generateManagementReportPdf = action({
  args: {
    reportName: v.string(),
    runRef: v.string(),
    reportType: v.string(),
    periodLabel: v.optional(v.string()),
    generatedAt: v.string(),
    generatedByName: v.string(),
    approvalStatus: v.optional(v.string()),
    sections: v.array(reportSectionArg),
  },
  handler: async (_ctx, args): Promise<string> => {
    const doc = new jsPDF();
    let y = addHeader(doc, "MANAGEMENT REPORT", args.reportName);

    y += 4;
    doc.setFillColor(...LIGHT_BLUE);
    doc.roundedRect(14, y, 182, 34, 3, 3, "F");
    y += 8;
    infoRow(doc, "Report Reference", args.runRef, 18, y); y += 7;
    infoRow(doc, "Report Type", args.reportType.replace(/_/g, " ").toUpperCase(), 18, y); y += 7;
    infoRow(doc, "Period", args.periodLabel ?? "On demand", 18, y); y += 7;
    infoRow(doc, "Generated", `${new Date(args.generatedAt).toLocaleString("en-NG", { dateStyle: "long", timeStyle: "short" })} by ${args.generatedByName}`, 18, y);
    y += 16;

    if (args.approvalStatus) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_BLUE);
      doc.text(`APPROVAL STATUS: ${args.approvalStatus.replace(/_/g, " ").toUpperCase()}`, 14, y);
      y += 10;
    }

    for (const section of args.sections) {
      if (y > 240) { addFooter(doc, doc.internal.pages.length); doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...BRAND_BLUE);
      doc.text(section.label.toUpperCase(), 14, y); y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: section.stats.map((s) => [s.label, s.value]),
        theme: "grid",
        headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    const disclaimer = "This report is compiled exclusively from live, existing GEODATA WORLD SERVICES LIMITED operational data at the time of generation. No figure on this report is estimated, projected, or invented.";
    const discLines = doc.splitTextToSize(disclaimer, 182);
    if (y > 250) { addFooter(doc, doc.internal.pages.length); doc.addPage(); y = 20; }
    doc.text(discLines, 14, y);

    addFooter(doc, doc.internal.pages.length);
    return doc.output("datauristring");
  },
});

// ─── Helper: number to words (simplified) ────────────────────────
function numberToWords(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Billion`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Million`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} Thousand`;
  return n.toString();
}
