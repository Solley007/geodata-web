import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { motion } from "motion/react";
import { Plus, Pencil, Trash2, UserCheck, Clock, Calendar, CheckCircle, XCircle, Users, Briefcase, Search, FileText, Download, Eye, X, LayoutGrid, List, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion.tsx";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { DocumentPreviewDialog } from "@/components/document-preview-dialog.tsx";
import { cn } from "@/lib/utils.ts";

const STAFF_PAGE_SIZE = 9;

const STATUS_COLOR: Record<string, string> = { active: "bg-green-100 text-green-700", inactive: "bg-gray-100 text-gray-500", suspended: "bg-red-100 text-red-600" };
const LEAVE_STATUS: Record<string, string> = { pending: "bg-yellow-100 text-yellow-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-600" };
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

const LETTER_TYPES: { value: string; label: string }[] = [
  { value: "offer", label: "Offer Letter" },
  { value: "confirmation", label: "Confirmation Letter" },
  { value: "promotion", label: "Promotion Letter" },
  { value: "contract_renewal", label: "Contract Renewal" },
];
const LETTER_TYPE_LABEL: Record<string, string> = Object.fromEntries(LETTER_TYPES.map((d) => [d.value, d.label]));

const GENDERS = ["male", "female"];
const MARITAL_STATUSES = ["single", "married", "divorced", "widowed"];
const NOK_RELATIONSHIPS = ["spouse", "parent", "sibling", "child", "other"];

type StaffForm = {
  fullName: string; email: string; phone: string; department: string; departmentId: string; jobTitle: string;
  staffId: string; employmentType: string; startDate: string; salary: string;
  status: string; address: string; emergencyContact: string; nin: string;
  bankAccount: string; bankName: string;
  avatarStorageId: Id<"_storage"> | null; avatarUrl: string;
  dateOfBirth: string; gender: string; maritalStatus: string; stateOfOrigin: string; lgaOfOrigin: string;
  gradeLevel: string; qualification: string; confirmationDate: string;
  pensionRsaPin: string; nhfNumber: string; nsitfNumber: string; tin: string;
  nextOfKinName: string; nextOfKinRelationship: string; nextOfKinPhone: string; nextOfKinAddress: string;
};

const emptyStaff: StaffForm = {
  fullName: "", email: "", phone: "", department: "", departmentId: "", jobTitle: "", staffId: "", employmentType: "full_time",
  startDate: new Date().toISOString().split("T")[0], salary: "", status: "active", address: "", emergencyContact: "",
  nin: "", bankAccount: "", bankName: "", avatarStorageId: null, avatarUrl: "",
  dateOfBirth: "", gender: "", maritalStatus: "", stateOfOrigin: "", lgaOfOrigin: "",
  gradeLevel: "", qualification: "", confirmationDate: "",
  pensionRsaPin: "", nhfNumber: "", nsitfNumber: "", tin: "",
  nextOfKinName: "", nextOfKinRelationship: "", nextOfKinPhone: "", nextOfKinAddress: "",
};

type PendingDocRow = { id: string; docType: string; customLabel: string };

const makeDocRow = (): PendingDocRow => ({ id: crypto.randomUUID(), docType: "certificate", customLabel: "" });

// ── Job Title picker — suggests titles from the IAM "Positions" org-chart
// list (same table used on the org chart & user assignments) so admins pick
// a consistent title instead of retyping it, while still allowing a
// one-off custom title by typing something that isn't in the list.
function JobTitleCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const positions = useQuery(api.iam.organization.listPositions, {});

  const titles = useMemo(() => {
    const active = (positions ?? []).filter((p) => p.status === "active");
    return Array.from(new Set(active.map((p) => p.title))).sort((a, b) => a.localeCompare(b));
  }, [positions]);

  const filtered = titles.filter((t) => t.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = titles.some((t) => t.toLowerCase() === search.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs cursor-pointer"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value || "Select or type a job title..."}</span>
          <ChevronsUpDown size={14} className="opacity-50 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or type a new title..." value={search} onValueChange={setSearch} />
          <CommandList>
            {positions === undefined ? (
              <div className="p-3 space-y-1.5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : (
              <>
                {filtered.length === 0 && !search.trim() && <CommandEmpty>No positions configured yet.</CommandEmpty>}
                <CommandGroup>
                  {filtered.map((t) => (
                    <CommandItem key={t} value={t} onSelect={() => { onChange(t); setOpen(false); }} className="cursor-pointer">
                      <Check size={14} className={cn(value === t ? "opacity-100" : "opacity-0")} />
                      {t}
                    </CommandItem>
                  ))}
                  {search.trim() && !exactMatch && (
                    <CommandItem value={search} onSelect={() => { onChange(search.trim()); setOpen(false); }} className="cursor-pointer">
                      <Plus size={14} /> Use &quot;{search.trim()}&quot;
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Credentials/documents section — repeatable rows so an admin can queue up
// several certificates at once, each with its own type, name, and upload
// button. Only usable once the staff profile exists (needs an id to attach
// documents to), so it only renders while editing.
function StaffDocumentsSection({ staffId }: { staffId: Id<"staffProfiles"> }) {
  const [rows, setRows] = useState<PendingDocRow[]>([makeDocRow()]);
  const [previewDoc, setPreviewDoc] = useState<{ fileUrl: string | null | undefined; fileName: string; title: string } | null>(null);
  const documents = useQuery(api.staff.listStaffDocuments, { staffId });
  const addDocument = useMutation(api.staff.addStaffDocument);
  const deleteDocument = useMutation(api.staff.deleteStaffDocument);

  const updateRow = (id: string, patch: Partial<PendingDocRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const removeRow = (id: string) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const needsName = (docType: string) => docType === "certificate" || docType === "other";

  return (
    <div className="border-t pt-4 space-y-3">
      <Label className="text-xs font-semibold block">Credentials &amp; Documents</Label>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center gap-2">
            <Select value={row.docType} onValueChange={(v) => updateRow(row.id, { docType: v })}>
              <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
            {needsName(row.docType) && (
              <Input
                value={row.customLabel}
                onChange={(e) => updateRow(row.id, { customLabel: e.target.value })}
                placeholder={row.docType === "other" ? "e.g. Professional License" : "e.g. B.Sc Computer Science"}
                className="w-48 h-8 text-xs"
              />
            )}
            <FileUploadButton
              label="Upload"
              mediaType="any"
              accept="image/*,.pdf,.doc,.docx"
              onUpload={async (storedId, _url, fileName) => {
                if (row.docType === "other" && !row.customLabel.trim()) {
                  toast.error("Enter a name for this document");
                  return;
                }
                try {
                  await addDocument({
                    staffId,
                    docType: row.docType,
                    customLabel: needsName(row.docType) && row.customLabel.trim() ? row.customLabel.trim() : undefined,
                    fileName: fileName ?? (row.customLabel.trim() || DOC_TYPE_LABEL[row.docType]),
                    storageId: storedId,
                  });
                  toast.success("Document added");
                  setRows((prev) => {
                    const rest = prev.filter((r) => r.id !== row.id);
                    return rest.length > 0 ? rest : [makeDocRow()];
                  });
                } catch {
                  toast.error("Failed to attach document");
                }
              }}
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Remove row"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setRows((prev) => [...prev, makeDocRow()])}
        className="h-7 text-xs gap-1"
      >
        <Plus size={12} /> Add Another Certificate
      </Button>
      {documents === undefined ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : documents.length === 0 ? (
        <p className="text-xs text-gray-400">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-1.5">
          {documents.map((d) => (
            <div key={d._id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <FileText size={14} className="text-[var(--brand)] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-800 truncate">{d.fileName}</div>
                <div className="text-[10px] text-gray-400">{d.customLabel ? `${d.customLabel} · ${DOC_TYPE_LABEL[d.docType] ?? d.docType}` : DOC_TYPE_LABEL[d.docType] ?? d.docType}</div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc({ fileUrl: d.fileUrl, fileName: d.fileName, title: d.customLabel || DOC_TYPE_LABEL[d.docType] || d.fileName })}
                className="text-gray-400 hover:text-[var(--brand)] transition-colors"
                title="Preview"
              >
                <Eye size={14} />
              </button>
              {d.fileUrl && (
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[var(--brand)] transition-colors" title="Download">
                  <Download size={14} />
                </a>
              )}
              <button
                type="button"
                onClick={async () => { try { await deleteDocument({ id: d._id }); toast.success("Document removed"); } catch { toast.error("Failed to remove"); } }}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Remove"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
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

// ── Employment letter section — set terms + generate a new letter, and show
// history (most recent first) with accepted/pending status. A new letter is
// only needed when terms change (promotion, renewal) — the staff member sees
// their most recent one in the portal and accepts it there.
function StaffLetterSection({ staffId, jobTitle, department, startDate, employmentType, salary, gradeLevel }: {
  staffId: Id<"staffProfiles">; jobTitle: string; department: string; startDate: string;
  employmentType: string; salary: string; gradeLevel: string;
}) {
  const [open, setOpen] = useState(false);
  const [letterType, setLetterType] = useState("offer");
  const [probationMonths, setProbationMonths] = useState("3");
  const [reportingManager, setReportingManager] = useState("");
  const [additionalTerms, setAdditionalTerms] = useState("");
  const [generating, setGenerating] = useState(false);

  const letters = useQuery(api.staffLetters.listStaffLetters, { staffId });
  const createLetter = useMutation(api.staffLetters.createEmploymentLetter);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await createLetter({
        staffId,
        letterType,
        position: jobTitle,
        department,
        startDate,
        employmentType,
        salary: salary ? Number(salary) : undefined,
        gradeLevel: gradeLevel || undefined,
        probationMonths: probationMonths ? Number(probationMonths) : undefined,
        reportingManager: reportingManager || undefined,
        additionalTerms: additionalTerms || undefined,
      });
      toast.success("Letter generated — the staff member can now view and accept it");
      setOpen(false);
      setReportingManager(""); setAdditionalTerms("");
    } catch {
      toast.error("Failed to generate letter");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border-t pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold block">Employment Letters</Label>
        <Button type="button" size="sm" className="h-7 text-xs bg-blue-50 hover:bg-blue-100 text-[var(--brand)]" onClick={() => setOpen((o) => !o)}>
          <FileText size={12} className="mr-1" /> {open ? "Cancel" : "New Letter"}
        </Button>
      </div>

      {open && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2.5">
          <div className="grid sm:grid-cols-2 gap-2.5">
            <div><Label className="text-xs font-semibold mb-1 block">Letter Type</Label>
              <Select value={letterType} onValueChange={setLetterType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{LETTER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Probation (months)</Label><Input type="number" className="h-8 text-xs" value={probationMonths} onChange={(e) => setProbationMonths(e.target.value)} /></div>
            <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Reporting Manager</Label><Input className="h-8 text-xs" value={reportingManager} onChange={(e) => setReportingManager(e.target.value)} placeholder="Name of direct supervisor" /></div>
            <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Additional Terms</Label><Textarea className="text-xs resize-none" rows={2} value={additionalTerms} onChange={(e) => setAdditionalTerms(e.target.value)} placeholder="Any extra clauses to include..." /></div>
          </div>
          <p className="text-[11px] text-gray-400">Position, department, start date, employment type, salary and grade level are pulled from this profile.</p>
          <Button type="button" size="sm" disabled={generating} onClick={handleGenerate} className="h-8 text-xs bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white w-full">
            {generating ? "Generating..." : "Generate Letter"}
          </Button>
        </div>
      )}

      {letters === undefined ? (
        <div className="space-y-2">{Array.from({ length: 1 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : letters.length === 0 ? (
        <p className="text-xs text-gray-400">No employment letters generated yet.</p>
      ) : (
        <div className="space-y-1.5">
          {letters.map((l) => (
            <div key={l._id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <FileText size={14} className="text-[var(--brand)] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-800 truncate">{LETTER_TYPE_LABEL[l.letterType] ?? l.letterType}</div>
                <div className="text-[10px] text-gray-400">{new Date(l._creationTime).toLocaleDateString()}</div>
              </div>
              <Badge className={`text-[10px] border-0 capitalize ${l.status === "accepted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{l.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminStaff() {
  const [tab, setTab] = useState<"staff" | "attendance" | "leave">("staff");
  const [deptFilter, setDeptFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [debouncedSearch] = useDebounce(search, 350);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<Id<"staffProfiles"> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"staffProfiles"> | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyStaff);
  const [loading, setLoading] = useState(false);
  const [attendDate, setAttendDate] = useState(new Date().toISOString().split("T")[0]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ staffId: "", leaveType: "annual", startDate: "", endDate: "", reason: "" });
  const [backfilling, setBackfilling] = useState(false);

  // Full unpaginated list — used for attendance/leave lookups & dropdowns
  const allStaff = useQuery(api.staff.listStaff, {});
  const stats = useQuery(api.staff.getStaffStats);
  const attendance = useQuery(api.staff.listAttendance, { date: attendDate });
  const leaves = useQuery(api.staff.listLeaveRequests, {});
  const departments = useQuery(api.iam.organization.listDepartments, {});
  const activeDepartments = (departments ?? []).filter((d) => d.status === "active");
  const departmentNames = activeDepartments.map((d) => d.name);
  const createStaff = useMutation(api.staff.createStaff);
  const updateStaff = useMutation(api.staff.updateStaff);
  const deleteStaff = useMutation(api.staff.deleteStaff);
  const markAttendance = useMutation(api.staff.markAttendance);
  const createLeave = useMutation(api.staff.createLeaveRequest);
  const updateLeave = useMutation(api.staff.updateLeaveStatus);
  const backfillLetters = useMutation(api.staffLetters.backfillMissingLetters);

  const {
    rows: staff,
    pageIndex: staffPageIndex,
    hasNextPage: staffHasNext,
    hasPrevPage: staffHasPrev,
    isLoading: staffLoading,
    nextPage: staffNextPage,
    prevPage: staffPrevPage,
    reset: resetStaffPage,
  } = useCursorPagination(
    api.staff.listStaffPaginated,
    { department: deptFilter !== "all" ? deptFilter : undefined, search: debouncedSearch || undefined },
    STAFF_PAGE_SIZE,
  );

  useEffect(() => {
    resetStaffPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, deptFilter]);

  const openEdit = (s: NonNullable<typeof staff>[0]) => {
    setForm({
      fullName: s.fullName, email: s.email, phone: s.phone, department: s.department, departmentId: s.departmentId ?? "", jobTitle: s.jobTitle,
      staffId: s.staffId, employmentType: s.employmentType, startDate: s.startDate, salary: s.salary ? String(s.salary) : "",
      status: s.status, address: s.address ?? "", emergencyContact: s.emergencyContact ?? "", nin: s.nin ?? "",
      bankAccount: s.bankAccount ?? "", bankName: s.bankName ?? "",
      avatarStorageId: s.avatarStorageId ?? null, avatarUrl: s.avatarUrl ?? "",
      dateOfBirth: s.dateOfBirth ?? "", gender: s.gender ?? "", maritalStatus: s.maritalStatus ?? "",
      stateOfOrigin: s.stateOfOrigin ?? "", lgaOfOrigin: s.lgaOfOrigin ?? "",
      gradeLevel: s.gradeLevel ?? "", qualification: s.qualification ?? "", confirmationDate: s.confirmationDate ?? "",
      pensionRsaPin: s.pensionRsaPin ?? "", nhfNumber: s.nhfNumber ?? "", nsitfNumber: s.nsitfNumber ?? "", tin: s.tin ?? "",
      nextOfKinName: s.nextOfKinName ?? "", nextOfKinRelationship: s.nextOfKinRelationship ?? "",
      nextOfKinPhone: s.nextOfKinPhone ?? "", nextOfKinAddress: s.nextOfKinAddress ?? "",
    });
    setEditId(s._id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.jobTitle || !form.department) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      const { avatarUrl: _avatarUrl, departmentId, staffId, ...rest } = form;
      const payload = {
        ...rest,
        departmentId: departmentId ? (departmentId as Id<"departments">) : undefined,
        salary: form.salary ? Number(form.salary) : undefined,
        address: form.address || undefined,
        emergencyContact: form.emergencyContact || undefined,
        nin: form.nin || undefined,
        bankAccount: form.bankAccount || undefined,
        bankName: form.bankName || undefined,
        avatarStorageId: form.avatarStorageId ?? undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        maritalStatus: form.maritalStatus || undefined,
        stateOfOrigin: form.stateOfOrigin || undefined,
        lgaOfOrigin: form.lgaOfOrigin || undefined,
        gradeLevel: form.gradeLevel || undefined,
        qualification: form.qualification || undefined,
        confirmationDate: form.confirmationDate || undefined,
        pensionRsaPin: form.pensionRsaPin || undefined,
        nhfNumber: form.nhfNumber || undefined,
        nsitfNumber: form.nsitfNumber || undefined,
        tin: form.tin || undefined,
        nextOfKinName: form.nextOfKinName || undefined,
        nextOfKinRelationship: form.nextOfKinRelationship || undefined,
        nextOfKinPhone: form.nextOfKinPhone || undefined,
        nextOfKinAddress: form.nextOfKinAddress || undefined,
      };
      if (editId) await updateStaff({ id: editId, ...payload });
      else await createStaff({ ...payload, staffId });
      toast.success(editId ? "Staff updated!" : "Staff added!");
      setShowForm(false); setEditId(null);
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  const handleAttendance = async (staffId: Id<"staffProfiles">, status: string) => {
    try { await markAttendance({ staffId, date: attendDate, status, checkIn: status === "present" ? "08:00" : undefined }); toast.success("Attendance marked"); }
    catch { toast.error("Failed"); }
  };

  const handleBackfillLetters = async () => {
    setBackfilling(true);
    try {
      const created = await backfillLetters({});
      toast.success(created > 0 ? `Generated ${created} retroactive letter(s)` : "All staff already have a letter");
    } catch {
      toast.error("Failed to generate retroactive letters");
    } finally {
      setBackfilling(false);
    }
  };

  const f = (k: keyof StaffForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Staff Management</h1>
          <p className="text-sm text-gray-500">Profiles, attendance, leave management</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleBackfillLetters} disabled={backfilling} className="bg-gray-100 hover:bg-gray-200 text-gray-700 gap-2 h-9 text-sm">
            <FileText size={14} /> {backfilling ? "Generating..." : "Backfill Letters"}
          </Button>
          <Button onClick={() => { setForm({ ...emptyStaff, department: departmentNames[0] ?? "", departmentId: activeDepartments[0]?._id ?? "" }); setEditId(null); setShowForm(true); }} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 h-9 text-sm">
            <Plus size={14} /> Add Staff
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Staff", value: stats.totalStaff, icon: Users, color: "var(--brand)" },
            { label: "Active", value: stats.activeStaff, icon: UserCheck, color: "#22c55e" },
            { label: "Present Today", value: stats.todayPresent, icon: CheckCircle, color: "#06b6d4" },
            { label: "Pending Leaves", value: stats.pendingLeaves, icon: Calendar, color: "#f59e0b" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{s.label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.color + "20" }}>
                  <s.icon size={15} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[["staff", "Staff Profiles"], ["attendance", "Attendance"], ["leave", "Leave Requests"]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v as typeof tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === v ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
        ))}
      </div>

      {/* Staff Profiles */}
      {tab === "staff" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <div className="relative w-56">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="pl-8 h-8 text-sm" />
              </div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-44 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departmentNames.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                title="Card view"
                className={cn("w-8 h-8 flex items-center justify-center transition-colors", viewMode === "card" ? "bg-[var(--brand)] text-white" : "bg-white text-gray-500 hover:text-[var(--brand)]")}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table view"
                className={cn("w-8 h-8 flex items-center justify-center transition-colors border-l border-gray-200", viewMode === "table" ? "bg-[var(--brand)] text-white" : "bg-white text-gray-500 hover:text-[var(--brand)]")}
              >
                <List size={14} />
              </button>
            </div>
          </div>
          {staffLoading ? <div className={viewMode === "card" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className={viewMode === "card" ? "h-40 w-full rounded-2xl" : "h-12 w-full rounded-lg"} />)}</div>
            : staff.length === 0 ? <div className="bg-white rounded-2xl py-12 text-center text-gray-400 text-sm border border-gray-100">No staff records. Add your first staff member.</div>
            : viewMode === "card" ? (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff.map((s, i) => (
                    <motion.div key={s._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--brand)] flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                          {s.avatarUrl ? (
                            <img src={s.avatarUrl} alt={s.fullName} className="w-full h-full object-cover" />
                          ) : (
                            s.fullName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 text-sm truncate">{s.fullName}</div>
                          <div className="text-xs text-gray-500 truncate">{s.jobTitle}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge className="text-[10px] border-0 bg-[var(--brand)]/10 text-[var(--brand)]">{s.department}</Badge>
                            <Badge className={`text-[10px] border-0 capitalize ${STATUS_COLOR[s.status] ?? "bg-gray-100 text-gray-500"}`}>{s.status}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1 mb-3">
                        <div className="flex justify-between"><span>Staff ID</span><span className="font-medium text-gray-700">{s.staffId}</span></div>
                        <div className="flex justify-between"><span>Employment</span><span className="font-medium text-gray-700 capitalize">{s.employmentType.replace("_", " ")}</span></div>
                        {s.salary && <div className="flex justify-between"><span>Salary</span><span className="font-medium text-gray-700">₦{s.salary.toLocaleString()}/mo</span></div>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-7 text-xs bg-blue-50 hover:bg-blue-100 text-[var(--brand)]" onClick={() => openEdit(s)}><Pencil size={11} className="mr-1" /> Edit</Button>
                        <Button size="sm" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 text-red-600" onClick={() => setDeleteId(s._id)}><Trash2 size={12} /></Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <TablePager pageIndex={staffPageIndex} hasNextPage={staffHasNext} hasPrevPage={staffHasPrev} onNext={staffNextPage} onPrev={staffPrevPage} />
              </>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Staff</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Department</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Staff ID</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Employment</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {staff.map((s) => (
                        <tr key={s._id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden">
                                {s.avatarUrl ? <img src={s.avatarUrl} alt={s.fullName} className="w-full h-full object-cover" /> : s.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">{s.fullName}</div>
                                <div className="text-xs text-gray-400 truncate">{s.jobTitle}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 hidden md:table-cell text-xs text-gray-600">{s.department}</td>
                          <td className="px-4 py-2.5 hidden lg:table-cell text-xs text-gray-600">{s.staffId}</td>
                          <td className="px-4 py-2.5 hidden lg:table-cell text-xs text-gray-600 capitalize">{s.employmentType.replace("_", " ")}</td>
                          <td className="px-4 py-2.5"><Badge className={`text-[10px] border-0 capitalize ${STATUS_COLOR[s.status] ?? "bg-gray-100 text-gray-500"}`}>{s.status}</Badge></td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" className="h-7 w-7 p-0 bg-blue-50 hover:bg-blue-100 text-[var(--brand)]" onClick={() => openEdit(s)}><Pencil size={12} /></Button>
                              <Button size="sm" className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 text-red-600" onClick={() => setDeleteId(s._id)}><Trash2 size={12} /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePager pageIndex={staffPageIndex} hasNextPage={staffHasNext} hasPrevPage={staffHasPrev} onNext={staffNextPage} onPrev={staffPrevPage} />
              </>
            )}
        </div>
      )}

      {/* Attendance */}
      {tab === "attendance" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input type="date" value={attendDate} onChange={(e) => setAttendDate(e.target.value)} className="w-44 h-9 text-sm" />
            <span className="text-sm text-gray-500">Mark attendance for this date</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {!allStaff ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              : allStaff.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm">No staff found</div>
              : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Staff</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Department</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Mark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allStaff.map((s) => {
                      const att = attendance?.find((a) => a.staffId === s._id);
                      return (
                        <tr key={s._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{s.fullName}</div>
                            <div className="text-xs text-gray-400">{s.jobTitle}</div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">{s.department}</td>
                          <td className="px-4 py-3">
                            {att ? <Badge className={`text-xs border-0 capitalize ${att.status === "present" ? "bg-green-100 text-green-700" : att.status === "late" ? "bg-yellow-100 text-yellow-700" : att.status === "half_day" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-600"}`}>{att.status.replace("_", " ")}</Badge>
                              : <span className="text-xs text-gray-400">Not marked</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {["present", "absent", "late", "half_day"].map((st) => (
                                <button key={st} onClick={() => handleAttendance(s._id, st)}
                                  className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${att?.status === st ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[var(--brand)]/50"}`}>
                                  {st.replace("_", " ")}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
        </div>
      )}

      {/* Leave Requests */}
      {tab === "leave" && (
        <div className="space-y-4">
          <Button onClick={() => setShowLeaveForm(true)} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2 h-9 text-sm">
            <Plus size={14} /> New Leave Request
          </Button>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {!leaves ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              : leaves.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm">No leave requests</div>
              : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Staff</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Dates</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leaves.map((l) => {
                      const staffMember = allStaff?.find((s) => s._id === l.staffId);
                      return (
                        <tr key={l._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{staffMember?.fullName ?? "Unknown"}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 capitalize">{l.leaveType}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{l.startDate} → {l.endDate}</td>
                          <td className="px-4 py-3">
                            <Badge className={`text-xs border-0 capitalize ${LEAVE_STATUS[l.status] ?? "bg-gray-100 text-gray-500"}`}>{l.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {l.status === "pending" && (
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" className="h-7 text-xs bg-green-50 hover:bg-green-100 text-green-700 gap-1" onClick={() => updateLeave({ id: l._id, status: "approved" })}><CheckCircle size={11} /> Approve</Button>
                                <Button size="sm" className="h-7 text-xs bg-red-50 hover:bg-red-100 text-red-600 gap-1" onClick={() => updateLeave({ id: l._id, status: "rejected" })}><XCircle size={11} /> Reject</Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
        </div>
      )}

      {/* Staff Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>{editId ? "Edit Staff" : "Add Staff Member"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Passport Photograph</Label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="Passport" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={22} className="text-gray-300" />
                  )}
                </div>
                <FileUploadButton
                  label={form.avatarUrl ? "Replace Photo" : "Upload Photo"}
                  mediaType="image"
                  currentStorageId={form.avatarStorageId}
                  onUpload={(storedId, url) => setForm((p) => ({ ...p, avatarStorageId: storedId, avatarUrl: url ?? "" }))}
                  onClear={form.avatarUrl ? () => setForm((p) => ({ ...p, avatarStorageId: null, avatarUrl: "" })) : undefined}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Full Name *</Label><Input value={form.fullName} onChange={(e) => f("fullName", e.target.value)} placeholder="Amaka Okonkwo" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Email *</Label><Input type="email" value={form.email} onChange={(e) => f("email", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Phone *</Label><Input value={form.phone} onChange={(e) => f("phone", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Job Title *</Label><JobTitleCombobox value={form.jobTitle} onChange={(v) => f("jobTitle", v)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Staff ID *</Label><Input value={form.staffId} onChange={(e) => f("staffId", e.target.value)} placeholder="GWS-001" /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Department *</Label>
                <Select
                  value={form.departmentId || undefined}
                  onValueChange={(v) => {
                    const dept = activeDepartments.find((d) => d._id === v);
                    setForm((p) => ({ ...p, departmentId: v, department: dept?.name ?? p.department }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                  <SelectContent>{activeDepartments.map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold mb-1 block">Employment Type</Label>
                <Select value={form.employmentType} onValueChange={(v) => f("employmentType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold mb-1 block">Status</Label>
                <Select value={form.status} onValueChange={(v) => f("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold mb-1 block">Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => f("startDate", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Monthly Salary (₦)</Label><Input type="number" value={form.salary} onChange={(e) => f("salary", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Bank Name</Label><Input value={form.bankName} onChange={(e) => f("bankName", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Account Number</Label><Input value={form.bankAccount} onChange={(e) => f("bankAccount", e.target.value)} /></div>
              <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Address</Label><Input value={form.address} onChange={(e) => f("address", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Emergency Contact</Label><Input value={form.emergencyContact} onChange={(e) => f("emergencyContact", e.target.value)} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">NIN</Label><Input value={form.nin} onChange={(e) => f("nin", e.target.value)} /></div>
            </div>

            <Accordion type="multiple" className="border rounded-xl px-3 -mt-1">
              <AccordionItem value="personal">
                <AccordionTrigger className="text-xs font-semibold">Personal Information</AccordionTrigger>
                <AccordionContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold mb-1 block">Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => f("dateOfBirth", e.target.value)} /></div>
                    <div><Label className="text-xs font-semibold mb-1 block">Gender</Label>
                      <Select value={form.gender || "none"} onValueChange={(v) => f("gender", v === "none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not specified</SelectItem>
                          {GENDERS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs font-semibold mb-1 block">Marital Status</Label>
                      <Select value={form.maritalStatus || "none"} onValueChange={(v) => f("maritalStatus", v === "none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not specified</SelectItem>
                          {MARITAL_STATUSES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs font-semibold mb-1 block">Qualification</Label><Input value={form.qualification} onChange={(e) => f("qualification", e.target.value)} placeholder="B.Sc. Estate Management" /></div>
                    <div><Label className="text-xs font-semibold mb-1 block">State of Origin</Label><Input value={form.stateOfOrigin} onChange={(e) => f("stateOfOrigin", e.target.value)} placeholder="Anambra" /></div>
                    <div><Label className="text-xs font-semibold mb-1 block">LGA of Origin</Label><Input value={form.lgaOfOrigin} onChange={(e) => f("lgaOfOrigin", e.target.value)} placeholder="Awka South" /></div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="employment">
                <AccordionTrigger className="text-xs font-semibold">Employment Details</AccordionTrigger>
                <AccordionContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold mb-1 block">Grade Level</Label><Input value={form.gradeLevel} onChange={(e) => f("gradeLevel", e.target.value)} placeholder="GL 10 Step 3" /></div>
                    <div><Label className="text-xs font-semibold mb-1 block">Confirmation Date</Label><Input type="date" value={form.confirmationDate} onChange={(e) => f("confirmationDate", e.target.value)} /></div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="statutory">
                <AccordionTrigger className="text-xs font-semibold">Statutory IDs</AccordionTrigger>
                <AccordionContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold mb-1 block">Pension RSA PIN</Label><Input value={form.pensionRsaPin} onChange={(e) => f("pensionRsaPin", e.target.value)} placeholder="PEN123456789012" /></div>
                    <div><Label className="text-xs font-semibold mb-1 block">NHF Number</Label><Input value={form.nhfNumber} onChange={(e) => f("nhfNumber", e.target.value)} /></div>
                    <div><Label className="text-xs font-semibold mb-1 block">NSITF Number</Label><Input value={form.nsitfNumber} onChange={(e) => f("nsitfNumber", e.target.value)} /></div>
                    <div><Label className="text-xs font-semibold mb-1 block">TIN</Label><Input value={form.tin} onChange={(e) => f("tin", e.target.value)} /></div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="nok">
                <AccordionTrigger className="text-xs font-semibold">Next of Kin</AccordionTrigger>
                <AccordionContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label className="text-xs font-semibold mb-1 block">Full Name</Label><Input value={form.nextOfKinName} onChange={(e) => f("nextOfKinName", e.target.value)} /></div>
                    <div><Label className="text-xs font-semibold mb-1 block">Relationship</Label>
                      <Select value={form.nextOfKinRelationship || "none"} onValueChange={(v) => f("nextOfKinRelationship", v === "none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not specified</SelectItem>
                          {NOK_RELATIONSHIPS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs font-semibold mb-1 block">Phone</Label><Input value={form.nextOfKinPhone} onChange={(e) => f("nextOfKinPhone", e.target.value)} /></div>
                    <div className="col-span-2"><Label className="text-xs font-semibold mb-1 block">Address</Label><Input value={form.nextOfKinAddress} onChange={(e) => f("nextOfKinAddress", e.target.value)} /></div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {editId && <StaffDocumentsSection staffId={editId} />}
            {editId && (
              <StaffLetterSection
                staffId={editId}
                jobTitle={form.jobTitle}
                department={form.department}
                startDate={form.startDate}
                employmentType={form.employmentType}
                salary={form.salary}
                gradeLevel={form.gradeLevel}
              />
            )}
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white">{loading ? "Saving..." : editId ? "Update" : "Add Staff"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Form Dialog */}
      <Dialog open={showLeaveForm} onOpenChange={setShowLeaveForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Staff Member</Label>
              <Select value={leaveForm.staffId} onValueChange={(v) => setLeaveForm((p) => ({ ...p, staffId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                <SelectContent>{allStaff?.map((s) => <SelectItem key={s._id} value={s._id}>{s.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Leave Type</Label>
              <Select value={leaveForm.leaveType} onValueChange={(v) => setLeaveForm((p) => ({ ...p, leaveType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["annual","sick","maternity","emergency","unpaid"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs font-semibold mb-1 block">Start Date</Label><Input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm((p) => ({ ...p, startDate: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">End Date</Label><Input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm((p) => ({ ...p, endDate: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Reason</Label><Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))} rows={2} className="resize-none text-sm" /></div>
            <div className="flex justify-end gap-3">
              <Button className="bg-gray-100 text-gray-700" onClick={() => setShowLeaveForm(false)}>Cancel</Button>
              <Button className="bg-[var(--brand)] text-white" onClick={async () => {
                if (!leaveForm.staffId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) { toast.error("All fields required"); return; }
                await createLeave({ staffId: leaveForm.staffId as Id<"staffProfiles">, leaveType: leaveForm.leaveType, startDate: leaveForm.startDate, endDate: leaveForm.endDate, reason: leaveForm.reason, status: "pending" });
                toast.success("Leave request submitted"); setShowLeaveForm(false);
              }}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove Staff Member?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">This staff record will be permanently deleted.</p>
          <div className="flex justify-end gap-3 mt-3">
            <Button className="bg-gray-100 text-gray-700" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={async () => { if (deleteId) { await deleteStaff({ id: deleteId }); setDeleteId(null); toast.success("Deleted"); } }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
