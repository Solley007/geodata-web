// Shared content for the IAM/RBAC/Organisation User Guide, used by both the
// in-app Guide tab (GuideTab.tsx) and the downloadable PDF (generateGuidePdf.ts).
// Keeping this in one place means the two views never drift out of sync.

export type GuideSection = {
  title: string;
  summary: string;
  points: string[];
};

export const GUIDE_INTRO =
  "This guide explains the enterprise Identity & Access Management (IAM) system added to Users & Roles. " +
  "It replaces nothing — every page, module, and account you already use still works exactly as before. " +
  "This system adds an extra, optional layer on top: a configurable organisation chart, precise roles and " +
  "permissions, approval authority, and a dashboard that adapts to who is looking at it.";

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "1. What changed, and what didn't",
    summary: "Everything you already use continues to work. This is an addition, not a replacement.",
    points: [
      "All existing admin pages (Properties, Estates, Sales, Staff, Finance, and every other module) are unchanged.",
      "Every existing staff account keeps its current access. Nothing was reset or reassigned automatically.",
      "The new system lives inside Users & Roles, under new tabs: Roles, Permissions, Organisation, Assignments, Approvals & SoD, Temp Access, and Strategic Partners.",
      "A person only sees the new personalised dashboard once an administrator explicitly assigns them a role in the Assignments tab. Until then, they see the same dashboard they always have.",
    ],
  },
  {
    title: "2. The 12 system roles",
    summary: "A system role decides what someone can do. It is separate from their job title.",
    points: [
      "Super Administrator — full enterprise-wide control, including this IAM system itself.",
      "System Administrator — manages technical configuration and user accounts.",
      "Shareholder — read-only visibility into enterprise-wide performance.",
      "Board Member and Board Committee Member — governance-level visibility and approval authority.",
      "MD/CEO — full operational and enterprise visibility, plus top-level approvals.",
      "Director — leads a directorate; approves within their remit.",
      "Manager/Head of Unit — leads a department or unit; day-to-day approvals for their team.",
      "Officer and Staff — day-to-day operational access to their own work and tasks.",
      "Auditor — read-only access to compliance and audit information, with no financial figures.",
      "External/Restricted User — the most limited access, for people outside the organisation (see Strategic Partners).",
      "Important: a person's job title (e.g. \"Head of Legal\") is just a label. Their system role is what actually controls what they can see and do — the two are set independently.",
    ],
  },
  {
    title: "3. The organisation structure",
    summary: "Geodata's directorates, departments, units, and positions are configurable data — not fixed code.",
    points: [
      "The organisation is built from four levels: Directorates → Departments → Units → Positions.",
      "The five starting directorates are: Project Development & Delivery, Finance & Investment, Commercial & Customer Experience, Legal/Company Secretariat & Compliance, and Corporate Services & Technology.",
      "Administrators can rename, add, move, or retire any directorate, department, unit, or position at any time from the Organisation tab — no code changes needed.",
      "Every structural change is recorded with a date, reason, and who made it, so there is always a history of how the organisation has evolved.",
      "Moving a department shows a preview of who and what will be affected before the change is confirmed.",
    ],
  },
  {
    title: "4. Assigning someone to the organisation",
    summary: "Use the Assignments tab to place a person in the org chart and give them a system role.",
    points: [
      "Go to Users & Roles → Assignments, choose the person, then set their directorate/department/unit/position, job title, and system role.",
      "Each person has one primary assignment at a time. Assigning a new primary automatically ends the previous one and keeps it in the history.",
      "A person's system role here is what determines their dashboard and permissions — assigning them is what \"switches on\" the new personalised experience for them.",
      "Data scopes can also be set (e.g. \"own records only\", \"my department\", \"enterprise-wide\") to control exactly how much data a person's queries can see.",
      "The Add/Edit User dialog in Users & Roles now includes the same directorate/department/unit/position pickers, so a person's org placement can be set in one step alongside their system role and job title.",
    ],
  },
  {
    title: "5. Permissions and approval authority",
    summary: "Permissions control access to features. Approval authority controls who can sign off on specific decisions.",
    points: [
      "The Permissions tab lets administrators grant or revoke access to specific modules and actions for each role, or override it for an individual user.",
      "Approval authority is never assumed from a job title or role — it must be explicitly granted per approval type (e.g. large discounts, refunds, contract sign-off) in Approvals & SoD.",
      "Segregation of Duties (SoD) rules prevent one person from holding two conflicting responsibilities at once (e.g. the person who creates a payment cannot also approve it).",
      "All approval decisions continue to flow through the existing Tasks & Approvals workflow you already use — this system only adds the authority check behind it.",
    ],
  },
  {
    title: "7. Department-scoped data visibility",
    summary: "Beyond dashboards, the underlying data lists (clients, leads, tasks, approvals, transactions, KYC, finance, payment receipts) are now filtered by who is looking.",
    points: [
      "Once a person has an active role assignment, the records they see in these modules are automatically limited to their own directorate or department, based on the default scope for their role.",
      "Super Administrator, System Administrator, MD/CEO, and Shareholder continue to see everything enterprise-wide, as they need full visibility.",
      "Board Member and Board Committee Member see governance-wide data; Auditor sees audit-wide data — neither is limited to a single department.",
      "Director sees every record within their whole directorate. Manager/Head of Unit and Officer see records within their own department. Staff and External/Restricted Users see only records assigned to or created by them.",
      "This applies to the record owner (e.g. the staff member a client, lead, or task is assigned to) — no data was moved or duplicated to make this work.",
      "An administrator can still override the default scope for an individual person from the Assignments tab if a specific exception is needed (e.g. wider visibility for one Manager).",
      "This is enforced on the server for every request, not just hidden in the interface, so it cannot be bypassed.",
    ],
  },
  {
    title: "8. Temporary access, delegation & reviews",
    summary: "Grant short-term access or hand off approvals while someone is away, safely and with an expiry.",
    points: [
      "Temporary Access grants a time-boxed permission or scope that automatically expires — useful for covering leave or a short project.",
      "Approval Delegation lets one person's approval authority be temporarily handed to someone else (e.g. a Director going on leave delegating to a Deputy) for a set period.",
      "Access Reviews let administrators periodically confirm that each person's access is still appropriate, with a record of who reviewed it and when.",
      "Expired temporary access and delegations are automatically cleaned up so nothing is left active by accident.",
    ],
  },
  {
    title: "9. The dashboard, personalised by role",
    summary: "One dashboard engine, eight configurable views — not eight separate apps to maintain.",
    points: [
      "Once a person has an active role assignment, their admin dashboard automatically shows the right information for their role: Shareholder, Board, MD/CEO, Director, Manager, Officer/Staff, Auditor, or External/Restricted.",
      "Shareholders and Board members see enterprise-wide performance and governance summaries, without operational clutter.",
      "Auditors see compliance and audit figures only — never financial figures.",
      "Officers and Staff see their own tasks and approvals.",
      "Anyone without an assignment yet keeps seeing the original dashboard exactly as before.",
    ],
  },
  {
    title: "10. External Strategic Partner Engagements",
    summary: "For advisory relationships with outside organisations (e.g. GRBS) — never a permanent staff role.",
    points: [
      "Strategic Partners tracks time-bound advisory or functional relationships with external organisations.",
      "A partner engagement is never given a place in the organisation chart, and is never a reporting relationship — only an \"advisory/functional\" alignment to a directorate, department, unit, project, or programme.",
      "Every engagement has a lifecycle: Draft → Pending Approval → Active → Suspended/Expired/Terminated/Completed, and requires approval before it can go Active.",
      "Time-bound engagements must have an end date, and the system automatically flags or expires ones that run past it.",
    ],
  },
  {
    title: "11. Audit log & security",
    summary: "Every significant change made in this system is recorded automatically.",
    points: [
      "Role, permission, organisation, assignment, approval authority, temporary access, delegation, and partner engagement changes are all written to the same Audit Log used across the rest of the platform.",
      "Access is denied by default — a person can only do something once it has been explicitly granted to them, never assumed.",
      "All checks happen on the server, so this cannot be bypassed from the browser.",
    ],
  },
];
