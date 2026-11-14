import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { FileText, Download, CheckCircle2, ShieldAlert, Printer } from "lucide-react";
import { toast } from "sonner";
import { generateEmploymentLetterPdf } from "./_lib/employment-letter-pdf.ts";

// ── Staff Portal — My Employment Letter ──────────────────────────────────────
// Shows the staff member's most recent employment letter (offer,
// confirmation, promotion, or contract renewal). They can review it, accept
// it electronically, and download/print a PDF copy at any time.

const LETTER_TITLE: Record<string, string> = {
  offer: "Offer Letter",
  confirmation: "Confirmation Letter",
  promotion: "Letter of Promotion",
  contract_renewal: "Contract Renewal",
};

export default function StaffEmploymentLetterPage() {
  const [accepting, setAccepting] = useState(false);
  const staff = useQuery(api.staffPortal.attendanceAndLeave.getMyStaffRecord, {});
  const letter = useQuery(api.staffLetters.getMyEmploymentLetter, staff ? { staffId: staff._id } : "skip");
  const acceptLetter = useMutation(api.staffLetters.acceptMyEmploymentLetter);

  if (staff === undefined || (staff && letter === undefined)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (staff === null) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia>
          <EmptyTitle>No staff profile linked</EmptyTitle>
          <EmptyDescription>Your account isn't linked to a staff profile yet. Contact HR to have one set up.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!letter) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>My Employment Letter</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and accept your employment terms</p>
        </div>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><FileText /></EmptyMedia>
            <EmptyTitle>No letter yet</EmptyTitle>
            <EmptyDescription>HR hasn't generated an employment letter for you yet. Check back soon or contact HR.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const employmentTypeLabel = letter.employmentType.replace("_", " ");
  const pdfData = {
    letterType: letter.letterType,
    fullName: staff.fullName,
    position: letter.position,
    department: letter.department,
    startDate: letter.startDate,
    employmentType: letter.employmentType,
    salary: letter.salary,
    gradeLevel: letter.gradeLevel,
    probationMonths: letter.probationMonths,
    reportingManager: letter.reportingManager,
    additionalTerms: letter.additionalTerms,
    status: letter.status,
    acceptedAt: letter.acceptedAt,
    issuedDate: new Date(letter._creationTime).toISOString(),
  };

  const handleDownload = () => {
    const doc = generateEmploymentLetterPdf(pdfData);
    doc.save(`${LETTER_TITLE[letter.letterType] ?? "employment-letter"}.pdf`.replace(/\s+/g, "-").toLowerCase());
  };

  const handlePrint = () => {
    const doc = generateEmploymentLetterPdf(pdfData);
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptLetter({ id: letter._id });
      toast.success("Letter accepted!");
    } catch {
      toast.error("Failed to accept letter");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>My Employment Letter</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and accept your employment terms</p>
        </div>
        <Badge className={`text-xs border-0 capitalize ${letter.status === "accepted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
          {letter.status === "accepted" ? "Accepted" : "Pending your review"}
        </Badge>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="text-center border-b border-gray-100 pb-6">
          <div className="text-[var(--brand)] font-bold text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>GEODATA WORLD SERVICES LIMITED</div>
          <div className="text-xs text-gray-400 mt-1">Nigeria's Premier Real Estate Company</div>
          <div className="mt-4 text-base font-bold text-gray-900 uppercase tracking-wide">{LETTER_TITLE[letter.letterType] ?? "Employment Letter"}</div>
        </div>

        <div className="text-sm text-gray-700 leading-relaxed space-y-3">
          <p>Dear {staff.fullName.split(" ")[0]},</p>
          {letter.letterType === "offer" && (
            <p>We are pleased to offer you employment with Geodata World Services Limited as <strong>{letter.position}</strong> in the <strong>{letter.department}</strong> department, on a {employmentTypeLabel} basis, effective {new Date(letter.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.</p>
          )}
          {letter.letterType === "confirmation" && (
            <p>We are pleased to confirm your appointment as <strong>{letter.position}</strong> in the <strong>{letter.department}</strong> department, following the successful completion of your probationary period.</p>
          )}
          {letter.letterType === "promotion" && (
            <p>We are pleased to inform you of your promotion to <strong>{letter.position}</strong> in the <strong>{letter.department}</strong> department, effective {new Date(letter.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.</p>
          )}
          {letter.letterType === "contract_renewal" && (
            <p>This letter confirms the renewal of your contract as <strong>{letter.position}</strong> in the <strong>{letter.department}</strong> department, effective {new Date(letter.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          {[
            ["Position", letter.position],
            ["Department", letter.department],
            ["Employment Type", employmentTypeLabel.charAt(0).toUpperCase() + employmentTypeLabel.slice(1)],
            ["Start Date", new Date(letter.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
            ...(letter.gradeLevel ? [["Grade Level", letter.gradeLevel]] : []),
            ...(letter.salary ? [["Monthly Salary", `₦${letter.salary.toLocaleString()}`]] : []),
            ...(letter.probationMonths ? [["Probation Period", `${letter.probationMonths} month(s)`]] : []),
            ...(letter.reportingManager ? [["Reporting Manager", letter.reportingManager]] : []),
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-sm py-1">
              <span className="text-gray-400">{label}</span>
              <span className="font-medium text-gray-800">{value}</span>
            </div>
          ))}
        </div>

        {letter.additionalTerms && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Additional Terms</div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{letter.additionalTerms}</p>
          </div>
        )}

        {letter.status === "accepted" && letter.acceptedAt && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 size={16} className="shrink-0" />
            Accepted electronically on {new Date(letter.acceptedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {letter.status !== "accepted" && (
            <Button onClick={handleAccept} disabled={accepting} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2">
              <CheckCircle2 size={15} /> {accepting ? "Accepting..." : "Accept Letter"}
            </Button>
          )}
          <Button onClick={handleDownload} className="bg-blue-50 hover:bg-blue-100 text-[var(--brand)] gap-2">
            <Download size={15} /> Download PDF
          </Button>
          <Button onClick={handlePrint} className="bg-gray-100 hover:bg-gray-200 text-gray-700 gap-2">
            <Printer size={15} /> Print
          </Button>
        </div>
      </div>
    </div>
  );
}
