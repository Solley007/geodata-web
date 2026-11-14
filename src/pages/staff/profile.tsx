import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { DocumentPreviewDialog } from "@/components/document-preview-dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { FileText, Download, Eye, X, UserRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Staff Portal — My Profile ────────────────────────────────────────────────
// Self-service passport photo + credentials upload for the signed-in staff
// member. Reuses the same staffProfiles/staffDocuments backend as the admin
// Staff Management page — a staff member can only ever touch their own
// linked record (enforced server-side in convex/staff.ts).

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "nin_slip", label: "NIN Slip" },
  { value: "certificate", label: "Certificate" },
  { value: "cv", label: "CV / Resume" },
  { value: "contract", label: "Contract" },
  { value: "certificate_of_service", label: "Certificate of Service" },
  { value: "reference_letter", label: "Reference Letter" },
  { value: "other", label: "Other" },
];
const DOC_TYPE_LABEL: Record<string, string> = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));

// Read-only — HR-managed data. Staff can view their own record here but edits
// go through Staff Management so HR keeps a single source of truth.
function formatDate(value: string | undefined) {
  if (!value) return "—";
  try { return format(new Date(value), "d MMM yyyy"); } catch { return value; }
}

function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right">{value || "—"}</span>
    </div>
  );
}

export default function StaffProfilePage() {
  const [docType, setDocType] = useState("certificate");
  const [customLabel, setCustomLabel] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{ fileUrl: string | null | undefined; fileName: string; title: string } | null>(null);
  const staff = useQuery(api.staffPortal.attendanceAndLeave.getMyStaffRecord, {});
  const documents = useQuery(api.staff.listStaffDocuments, staff ? { staffId: staff._id } : "skip");
  const updateMyAvatar = useMutation(api.staff.updateMyAvatar);
  const addDocument = useMutation(api.staff.addStaffDocument);
  const deleteDocument = useMutation(api.staff.deleteStaffDocument);

  if (staff === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Update your passport photograph and upload your credentials</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Passport Photograph</h2>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
            {staff.avatarUrl ? (
              <img src={staff.avatarUrl} alt={staff.fullName} className="w-full h-full object-cover" />
            ) : (
              <UserRound size={28} className="text-gray-300" />
            )}
          </div>
          <FileUploadButton
            label={staff.avatarUrl ? "Replace Photo" : "Upload Photo"}
            mediaType="image"
            currentStorageId={staff.avatarStorageId ?? null}
            onUpload={async (storedId) => {
              try {
                await updateMyAvatar({ staffId: staff._id, avatarStorageId: storedId });
                toast.success("Photo updated");
              } catch {
                toast.error("Failed to update photo");
              }
            }}
            onClear={staff.avatarUrl ? async () => {
              try {
                await updateMyAvatar({ staffId: staff._id, avatarStorageId: null });
                toast.success("Photo removed");
              } catch {
                toast.error("Failed to remove photo");
              }
            } : undefined}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Employment Details</h2>
        <div className="divide-y divide-gray-50">
          <InfoRow label="Staff ID" value={staff.staffId} />
          <InfoRow label="Job Title" value={staff.jobTitle} />
          <InfoRow label="Department" value={staff.department} />
          <InfoRow label="Employment Type" value={staff.employmentType?.replace("_", " ")} />
          <InfoRow label="Grade Level" value={staff.gradeLevel} />
          <InfoRow label="Start Date" value={formatDate(staff.startDate)} />
          <InfoRow label="Confirmation Date" value={staff.confirmationDate ? formatDate(staff.confirmationDate) : undefined} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Personal Information</h2>
          <div className="divide-y divide-gray-50">
            <InfoRow label="Date of Birth" value={staff.dateOfBirth ? formatDate(staff.dateOfBirth) : undefined} />
            <InfoRow label="Gender" value={staff.gender} />
            <InfoRow label="Marital Status" value={staff.maritalStatus} />
            <InfoRow label="Qualification" value={staff.qualification} />
            <InfoRow label="State of Origin" value={staff.stateOfOrigin} />
            <InfoRow label="LGA of Origin" value={staff.lgaOfOrigin} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Statutory IDs</h2>
          <div className="divide-y divide-gray-50">
            <InfoRow label="NIN" value={staff.nin} />
            <InfoRow label="Pension RSA PIN" value={staff.pensionRsaPin} />
            <InfoRow label="NHF Number" value={staff.nhfNumber} />
            <InfoRow label="NSITF Number" value={staff.nsitfNumber} />
            <InfoRow label="TIN" value={staff.tin} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Next of Kin</h2>
        <div className="divide-y divide-gray-50">
          <InfoRow label="Full Name" value={staff.nextOfKinName} />
          <InfoRow label="Relationship" value={staff.nextOfKinRelationship} />
          <InfoRow label="Phone" value={staff.nextOfKinPhone} />
          <InfoRow label="Address" value={staff.nextOfKinAddress} />
        </div>
      </div>

      <p className="text-xs text-gray-400 -mt-2">
        Employment, personal, and statutory details are managed by HR. Contact HR to update any incorrect information.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Credentials &amp; Documents</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="w-52 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
          {(docType === "certificate" || docType === "other") && (
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder={docType === "other" ? "e.g. Professional License" : "e.g. B.Sc Computer Science"}
              className="w-52 h-9 text-sm rounded-md border border-gray-200 px-3"
            />
          )}
          <FileUploadButton
            label="Upload Document"
            mediaType="any"
            accept="image/*,.pdf,.doc,.docx"
            onUpload={async (storedId, _url, fileName) => {
              if (docType === "other" && !customLabel.trim()) {
                toast.error("Enter a name for this document");
                return;
              }
              try {
                await addDocument({
                  staffId: staff._id,
                  docType,
                  customLabel: customLabel.trim() || undefined,
                  fileName: fileName ?? (customLabel.trim() || DOC_TYPE_LABEL[docType]),
                  storageId: storedId,
                });
                toast.success("Document added");
                setCustomLabel("");
              } catch {
                toast.error("Failed to attach document");
              }
            }}
          />
        </div>

        {documents === undefined ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-gray-400">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {documents.map((d) => (
              <div key={d._id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                <FileText size={15} className="text-[var(--brand)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{d.fileName}</div>
                  <div className="text-xs text-gray-400">{d.customLabel ? `${d.customLabel} · ${DOC_TYPE_LABEL[d.docType] ?? d.docType}` : DOC_TYPE_LABEL[d.docType] ?? d.docType}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewDoc({ fileUrl: d.fileUrl, fileName: d.fileName, title: d.customLabel || DOC_TYPE_LABEL[d.docType] || d.fileName })}
                  className="text-gray-400 hover:text-[var(--brand)] transition-colors"
                  title="Preview"
                >
                  <Eye size={15} />
                </button>
                {d.fileUrl && (
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[var(--brand)] transition-colors" title="Download">
                    <Download size={15} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={async () => { try { await deleteDocument({ id: d._id }); toast.success("Document removed"); } catch { toast.error("Failed to remove"); } }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <DocumentPreviewDialog
        open={!!previewDoc}
        onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
        fileUrl={previewDoc?.fileUrl}
        fileName={previewDoc?.fileName ?? ""}
        title={previewDoc?.title}
      />
    </div>
  );
}
