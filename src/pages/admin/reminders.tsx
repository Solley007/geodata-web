import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion } from "motion/react";
import { Mail, Send, Bell, Users, TrendingUp, HardHat, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";

type ReminderType = "lead" | "commission" | "leave" | "site" | "custom";

const REMINDER_TYPES = [
  { id: "lead" as ReminderType, label: "Lead Follow-Up", icon: TrendingUp, color: "var(--brand)", desc: "Remind agents to follow up on stale leads" },
  { id: "commission" as ReminderType, label: "Commission Approval", icon: Bell, color: "#f59e0b", desc: "Nudge managers to approve pending commissions" },
  { id: "leave" as ReminderType, label: "Leave Approval", icon: Users, color: "#8b5cf6", desc: "Remind managers of pending leave requests" },
  { id: "site" as ReminderType, label: "Site Report Due", icon: HardHat, color: "#22c55e", desc: "Alert site managers to file daily reports" },
  { id: "custom" as ReminderType, label: "Custom Message", icon: Pencil, color: "#ec4899", desc: "Send a custom reminder to any email" },
];

export default function AdminReminders() {
  const [activeType, setActiveType] = useState<ReminderType | null>(null);
  const [loading, setLoading] = useState(false);

  // Data
  const leads = useQuery(api.sales.listLeads, { stage: undefined });
  const commissions = useQuery(api.sales.listCommissions, { status: "pending" });
  const leaves = useQuery(api.staff.listLeaveRequests, { status: "pending" });
  const sites = useQuery(api.construction.listSites, {});
  const users = useQuery(api.users.listAll);

  // Actions
  const sendSiteReminder = useAction(api.emails.sendSiteReportReminder);
  const sendCustom = useAction(api.emails.sendCustomReminder);

  // Forms
  const [leadForm, setLeadForm] = useState({ to: "", phone: "", agentName: "", leadName: "", stage: "", expectedCloseDate: "" });
  const [commForm, setCommForm] = useState({ to: "", phone: "", managerName: "", agentName: "", commissionAmount: "", saleAmount: "", transactionDate: "" });
  const [leaveForm, setLeaveForm] = useState({ to: "", phone: "", managerName: "", staffName: "", leaveType: "", startDate: "", endDate: "" });
  const [siteForm, setSiteForm] = useState({ to: "", phone: "", managerName: "", siteName: "", lastReportDate: "" });
  const [customForm, setCustomForm] = useState({ to: "", phone: "", subject: "", recipientName: "", message: "" });

  const handleLeadReminder = async () => {
    if (!leadForm.to || !leadForm.agentName || !leadForm.leadName) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      // We call sendSiteReportReminder action as a pattern; real implementation sends via backend
      // For lead reminders we call the public action via a workaround through sendCustom
      await sendCustom({
        to: leadForm.to,
        phone: leadForm.phone || undefined,
        subject: `Follow-up Reminder: ${leadForm.leadName} – ${leadForm.stage}`,
        recipientName: leadForm.agentName,
        message: `You have a pending follow-up for lead: ${leadForm.leadName}\nCurrent Stage: ${leadForm.stage}${leadForm.expectedCloseDate ? `\nExpected Close Date: ${leadForm.expectedCloseDate}` : ""}`,
      });
      toast.success("Lead follow-up reminder sent!");
      setActiveType(null);
    } catch { toast.error("Failed to send. Ensure sender email is verified in Emails tab."); }
    finally { setLoading(false); }
  };

  const handleCommReminder = async () => {
    if (!commForm.to || !commForm.managerName || !commForm.agentName) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      await sendCustom({
        to: commForm.to,
        phone: commForm.phone || undefined,
        subject: `Action Required: Commission Approval for ${commForm.agentName}`,
        recipientName: commForm.managerName,
        message: `A commission for ${commForm.agentName} is pending your approval.\n\nSale Amount: ₦${Number(commForm.saleAmount).toLocaleString()}\nCommission Due: ₦${Number(commForm.commissionAmount).toLocaleString()}\nTransaction Date: ${commForm.transactionDate}\n\nPlease log in to the ERP to approve.`,
      });
      toast.success("Commission approval reminder sent!");
      setActiveType(null);
    } catch { toast.error("Failed to send. Ensure sender email is verified in Emails tab."); }
    finally { setLoading(false); }
  };

  const handleLeaveReminder = async () => {
    if (!leaveForm.to || !leaveForm.managerName || !leaveForm.staffName) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      await sendCustom({
        to: leaveForm.to,
        phone: leaveForm.phone || undefined,
        subject: `Leave Request Pending: ${leaveForm.staffName}`,
        recipientName: leaveForm.managerName,
        message: `${leaveForm.staffName} has a pending ${leaveForm.leaveType} leave request.\n\nFrom: ${leaveForm.startDate}\nTo: ${leaveForm.endDate}\n\nPlease log in to the ERP to approve or reject.`,
      });
      toast.success("Leave approval reminder sent!");
      setActiveType(null);
    } catch { toast.error("Failed to send. Ensure sender email is verified in Emails tab."); }
    finally { setLoading(false); }
  };

  const handleSiteReminder = async () => {
    if (!siteForm.to || !siteForm.managerName || !siteForm.siteName) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      await sendSiteReminder({ to: siteForm.to, phone: siteForm.phone || undefined, managerName: siteForm.managerName, siteName: siteForm.siteName, lastReportDate: siteForm.lastReportDate || undefined });
      toast.success("Site report reminder sent!");
      setActiveType(null);
    } catch { toast.error("Failed to send. Ensure sender email is verified in Emails tab."); }
    finally { setLoading(false); }
  };

  const handleCustom = async () => {
    if (!customForm.to || !customForm.subject || !customForm.message) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      await sendCustom({ ...customForm, phone: customForm.phone || undefined });
      toast.success("Custom reminder sent!");
      setActiveType(null);
    } catch { toast.error("Failed to send. Ensure sender email is verified in Emails tab."); }
    finally { setLoading(false); }
  };

  const pendingLeads = leads?.filter((l) => !["won", "lost"].includes(l.stage)) ?? [];
  const pendingComms = commissions ?? [];
  const pendingLeaves = leaves ?? [];
  const activeSites = sites?.filter((s) => s.status === "active") ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Email Reminders</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send automated reminders to agents, staff, and managers</p>
      </div>

      {/* Info banner */}
      <div className="bg-[var(--brand)]/8 border border-[var(--brand)]/20 rounded-2xl p-4 flex items-start gap-3">
        <Mail size={18} className="text-[var(--brand)] mt-0.5 shrink-0" />
        <div className="text-sm text-[var(--brand)]">
          <span className="font-semibold">Setup required: </span>
          Verify your sender email in <strong>Emails → Verify email</strong> before sending. Use{" "}
          <code className="bg-[var(--brand)]/10 px-1 rounded text-xs">noreply@geodata.com.ng</code> or your own verified email.
        </div>
      </div>

      {/* Pending counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pipeline Leads", value: pendingLeads.length, color: "var(--brand)" },
          { label: "Pending Commissions", value: pendingComms.length, color: "#f59e0b" },
          { label: "Pending Leaves", value: pendingLeaves.length, color: "#8b5cf6" },
          { label: "Active Sites", value: activeSites.length, color: "#22c55e" },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: item.color }}>{item.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Reminder cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REMINDER_TYPES.map((type, i) => (
          <motion.div key={type.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: type.color + "18" }}>
                <type.icon size={18} style={{ color: type.color }} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-sm">{type.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{type.desc}</p>
              </div>
            </div>
            <Button onClick={() => setActiveType(type.id)}
              className="w-full h-8 text-sm gap-2 text-white"
              style={{ background: type.color }}>
              <Send size={13} /> Send Reminder
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Recent leads quick-send */}
      {pendingLeads.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Pipeline Leads – Quick Remind</h3>
            <Badge className="bg-[var(--brand)]/10 text-[var(--brand)] border-0 text-xs">{pendingLeads.length} leads</Badge>
          </div>
          <div className="divide-y divide-gray-50">
            {(pendingLeads.slice(0, 5)).map((lead) => {
              const agent = users?.find((u) => u._id === lead.assignedTo);
              return (
                <div key={lead._id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{lead.name}</div>
                    <div className="text-xs text-gray-400">{lead.stage} · {lead.phone}</div>
                  </div>
                  {agent && <div className="text-xs text-gray-500 hidden sm:block">{agent.name ?? agent.email}</div>}
                  <Button size="sm" className="h-7 text-xs bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/20 gap-1 shrink-0"
                    onClick={() => {
                      setLeadForm({ to: agent?.email ?? "", phone: agent?.phone ?? "", agentName: agent?.name ?? "", leadName: lead.name, stage: lead.stage, expectedCloseDate: lead.expectedCloseDate ?? "" });
                      setActiveType("lead");
                    }}>
                    <Mail size={11} /> Remind
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DIALOGS ── */}

      {/* Lead Reminder */}
      <Dialog open={activeType === "lead"} onOpenChange={() => setActiveType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Lead Follow-Up Reminder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Recipient Email *</Label><Input type="email" value={leadForm.to} onChange={(e) => setLeadForm((p) => ({ ...p, to: e.target.value }))} placeholder="agent@example.com" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">WhatsApp Number <span className="text-gray-400 font-normal">(optional)</span></Label><Input value={leadForm.phone} onChange={(e) => setLeadForm((p) => ({ ...p, phone: e.target.value }))} placeholder="2348012345678" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Agent Name *</Label><Input value={leadForm.agentName} onChange={(e) => setLeadForm((p) => ({ ...p, agentName: e.target.value }))} placeholder="John Adeyemi" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Lead Name *</Label><Input value={leadForm.leadName} onChange={(e) => setLeadForm((p) => ({ ...p, leadName: e.target.value }))} /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Stage</Label><Input value={leadForm.stage} onChange={(e) => setLeadForm((p) => ({ ...p, stage: e.target.value }))} placeholder="Qualified" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Expected Close Date</Label><Input type="date" value={leadForm.expectedCloseDate} onChange={(e) => setLeadForm((p) => ({ ...p, expectedCloseDate: e.target.value }))} /></div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button className="bg-gray-100 text-gray-700" onClick={() => setActiveType(null)}>Cancel</Button>
              <Button disabled={loading} className="bg-[var(--brand)] text-white gap-2" onClick={handleLeadReminder}><Send size={13} />{loading ? "Sending..." : "Send"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Commission Reminder */}
      <Dialog open={activeType === "commission"} onOpenChange={() => setActiveType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Commission Approval Reminder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Manager Email *</Label><Input type="email" value={commForm.to} onChange={(e) => setCommForm((p) => ({ ...p, to: e.target.value }))} placeholder="manager@example.com" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">WhatsApp Number <span className="text-gray-400 font-normal">(optional)</span></Label><Input value={commForm.phone} onChange={(e) => setCommForm((p) => ({ ...p, phone: e.target.value }))} placeholder="2348012345678" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Manager Name *</Label><Input value={commForm.managerName} onChange={(e) => setCommForm((p) => ({ ...p, managerName: e.target.value }))} /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Agent Name *</Label><Input value={commForm.agentName} onChange={(e) => setCommForm((p) => ({ ...p, agentName: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Sale Amount (₦)</Label><Input type="number" value={commForm.saleAmount} onChange={(e) => setCommForm((p) => ({ ...p, saleAmount: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">Commission (₦)</Label><Input type="number" value={commForm.commissionAmount} onChange={(e) => setCommForm((p) => ({ ...p, commissionAmount: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs font-semibold mb-1 block">Transaction Date</Label><Input type="date" value={commForm.transactionDate} onChange={(e) => setCommForm((p) => ({ ...p, transactionDate: e.target.value }))} /></div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button className="bg-gray-100 text-gray-700" onClick={() => setActiveType(null)}>Cancel</Button>
              <Button disabled={loading} className="bg-[#f59e0b] text-white gap-2" onClick={handleCommReminder}><Send size={13} />{loading ? "Sending..." : "Send"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Reminder */}
      <Dialog open={activeType === "leave"} onOpenChange={() => setActiveType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Leave Approval Reminder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Manager Email *</Label><Input type="email" value={leaveForm.to} onChange={(e) => setLeaveForm((p) => ({ ...p, to: e.target.value }))} placeholder="manager@example.com" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">WhatsApp Number <span className="text-gray-400 font-normal">(optional)</span></Label><Input value={leaveForm.phone} onChange={(e) => setLeaveForm((p) => ({ ...p, phone: e.target.value }))} placeholder="2348012345678" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Manager Name *</Label><Input value={leaveForm.managerName} onChange={(e) => setLeaveForm((p) => ({ ...p, managerName: e.target.value }))} /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Staff Name *</Label><Input value={leaveForm.staffName} onChange={(e) => setLeaveForm((p) => ({ ...p, staffName: e.target.value }))} /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Leave Type</Label><Input value={leaveForm.leaveType} onChange={(e) => setLeaveForm((p) => ({ ...p, leaveType: e.target.value }))} placeholder="Annual, Sick, etc." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold mb-1 block">Start Date</Label><Input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm((p) => ({ ...p, startDate: e.target.value }))} /></div>
              <div><Label className="text-xs font-semibold mb-1 block">End Date</Label><Input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm((p) => ({ ...p, endDate: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button className="bg-gray-100 text-gray-700" onClick={() => setActiveType(null)}>Cancel</Button>
              <Button disabled={loading} className="bg-[#8b5cf6] text-white gap-2" onClick={handleLeaveReminder}><Send size={13} />{loading ? "Sending..." : "Send"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Site Report Reminder */}
      <Dialog open={activeType === "site"} onOpenChange={() => setActiveType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Site Report Reminder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Manager Email *</Label><Input type="email" value={siteForm.to} onChange={(e) => setSiteForm((p) => ({ ...p, to: e.target.value }))} placeholder="pm@example.com" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">WhatsApp Number <span className="text-gray-400 font-normal">(optional)</span></Label><Input value={siteForm.phone} onChange={(e) => setSiteForm((p) => ({ ...p, phone: e.target.value }))} placeholder="2348012345678" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Manager Name *</Label><Input value={siteForm.managerName} onChange={(e) => setSiteForm((p) => ({ ...p, managerName: e.target.value }))} /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Site Name *</Label><Input value={siteForm.siteName} onChange={(e) => setSiteForm((p) => ({ ...p, siteName: e.target.value }))} placeholder="Or select from active sites below..." /></div>
            {activeSites.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeSites.map((s) => (
                  <button key={s._id} onClick={() => setSiteForm((p) => ({ ...p, siteName: s.name }))}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${siteForm.siteName === s.name ? "bg-[#22c55e] text-white border-[#22c55e]" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[#22c55e]/50"}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            <div><Label className="text-xs font-semibold mb-1 block">Last Report Date</Label><Input type="date" value={siteForm.lastReportDate} onChange={(e) => setSiteForm((p) => ({ ...p, lastReportDate: e.target.value }))} /></div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button className="bg-gray-100 text-gray-700" onClick={() => setActiveType(null)}>Cancel</Button>
              <Button disabled={loading} className="bg-[#22c55e] text-white gap-2" onClick={handleSiteReminder}><Send size={13} />{loading ? "Sending..." : "Send"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Reminder */}
      <Dialog open={activeType === "custom"} onOpenChange={() => setActiveType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Custom Reminder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold mb-1 block">Recipient Email *</Label><Input type="email" value={customForm.to} onChange={(e) => setCustomForm((p) => ({ ...p, to: e.target.value }))} placeholder="recipient@example.com" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">WhatsApp Number <span className="text-gray-400 font-normal">(optional)</span></Label><Input value={customForm.phone} onChange={(e) => setCustomForm((p) => ({ ...p, phone: e.target.value }))} placeholder="2348012345678" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Recipient Name</Label><Input value={customForm.recipientName} onChange={(e) => setCustomForm((p) => ({ ...p, recipientName: e.target.value }))} placeholder="John Adeyemi" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Subject *</Label><Input value={customForm.subject} onChange={(e) => setCustomForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Reminder: Action Required" /></div>
            <div><Label className="text-xs font-semibold mb-1 block">Message *</Label><Textarea value={customForm.message} onChange={(e) => setCustomForm((p) => ({ ...p, message: e.target.value }))} rows={4} className="resize-none text-sm" placeholder="Your reminder message..." /></div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button className="bg-gray-100 text-gray-700" onClick={() => setActiveType(null)}>Cancel</Button>
              <Button disabled={loading} className="bg-[#ec4899] text-white gap-2" onClick={handleCustom}><Send size={13} />{loading ? "Sending..." : "Send"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
