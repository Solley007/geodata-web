import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import {
  ArrowLeft, Video, Orbit, Users, ShieldCheck, ToggleRight, ListChecks,
  Wrench, Download, Lock, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils.ts";

type GuideSection = {
  icon: React.ElementType;
  heading: string;
  adminOnly?: boolean;
  paragraphs?: string[];
  bullets?: string[];
};

const SECTIONS: GuideSection[] = [
  {
    icon: Video,
    heading: "What is GEODATA LIVE INSPECT\u2122?",
    paragraphs: [
      "GEODATA LIVE INSPECT\u2122 is built directly into the existing Properties, CRM, Documents, and Tasks modules \u2014 there is no separate system to learn. It offers three modes from the same property record:",
    ],
    bullets: [
      "Live Property Inspection \u2014 a scheduled, real-time video walkthrough between an officer and a client or prospect.",
      "Interactive 360\u00b0/VR Tour \u2014 a self-guided panoramic tour clients can explore on their own, any time.",
      "Live Construction Inspection \u2014 the same live video system, used for construction/site progress reviews.",
    ],
  },
  {
    icon: Users,
    heading: "Who can access it",
    paragraphs: [
      "Access is permission-based, not automatic. Being an admin, being on a property's team, or partnering with GRBS/other external parties does NOT grant access by itself. Every action is individually permission-gated, and every grant is recorded in the Audit Log.",
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
    icon: ShieldCheck,
    heading: "Granting access",
    adminOnly: true,
    paragraphs: [
      "Permissions are granted per role from Users & Roles \u2192 Permissions. There is no default access \u2014 every role starts with none of these permissions until an administrator explicitly grants them.",
    ],
    bullets: [
      "Go to Users & Roles \u2192 Permissions tab.",
      "Select the role you want to update (e.g. Manager, Officer, Staff).",
      "Tick the specific live_inspection.* and/or property_tour.* permissions that role should have, then save.",
      "The change applies immediately and is written to the Audit Log with who made it and when.",
    ],
  },
  {
    icon: ToggleRight,
    heading: "Turning the feature on or off",
    adminOnly: true,
    paragraphs: [
      "Both modes have independent toggles so they can be enabled separately: Live Virtual Inspection and 360\u00b0/VR Tour. Toggling requires the Manage permission and every change is audited.",
    ],
    bullets: [
      "Both toggles live in Settings \u2192 Access Control.",
      "When a toggle is off, related navigation and actions are hidden app-wide, but existing records and history remain intact and visible to authorized administrators and auditors.",
    ],
  },
  {
    icon: ListChecks,
    heading: "Scheduling and running a Live Inspection",
    bullets: [
      "Open the property in Properties, then choose Schedule Live Inspection (or open Live Virtual Inspection directly).",
      "Pick the inspection type: Property, Estate/Location, or Construction, then set the date/time and assign an officer.",
      "The session moves through statuses: Draft \u2192 Requested \u2192 Scheduled \u2192 Confirmed \u2192 Live \u2192 Completed (or Cancelled / No Show / Rescheduled).",
      "During the session, officers can capture snapshots and write notes. Internal notes are never shown to the client \u2014 only notes explicitly marked client-visible appear on their side.",
      "On completion, generate the inspection report and file supporting documents in the shared Vault.",
    ],
  },
  {
    icon: Orbit,
    heading: "Managing a 360\u00b0/VR Tour",
    bullets: [
      "Open a property and choose Manage 360\u00b0 Tour.",
      "Create a tour and add scenes, each backed by a genuine 360\u00b0 equirectangular panoramic image.",
      "Name each scene, set navigation hotspots linking scenes together, and add optional info hotspots.",
      "Publish the tour once ready \u2014 unpublished tours are not visible to visitors.",
      "Visitors flow through: Explore \u2192 Move between locations \u2192 Inspect rooms/info \u2192 Request a Live Inspection if they want a real walkthrough.",
    ],
  },
  {
    icon: Wrench,
    heading: "Troubleshooting",
    bullets: [
      "\"Access Denied\" screen \u2014 you do not yet have the required permission. Administrators can grant it from Users & Roles \u2192 Permissions; everyone else should ask their administrator.",
      "Feature missing from navigation entirely \u2014 the feature toggle is off. Ask an administrator to enable it from Settings \u2192 Access Control.",
      "Can't find a past inspection \u2014 records are preserved even while the feature is off. Authorized administrators and auditors can still view history.",
    ],
  },
];

export default function LiveInspectionGuide() {
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";
  const generatePdf = useAction(api.guides.generateLiveInspectionGuidePdf);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { pdf, filename } = await generatePdf({ audience: "staff" });
      const link = document.createElement("a");
      link.href = pdf;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Guide downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link to="/admin/live-inspections" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={14} /> Back to Live Virtual Inspection
      </Link>

      <div className="bg-[var(--brand)] rounded-2xl p-6 text-white flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-blue-200" />
            <span className="text-xs text-blue-200 font-medium">GEODATA WORLD SERVICES LTD</span>
          </div>
          <h1 className="text-xl font-bold">GEODATA LIVE INSPECT{"\u2122"} User Guide</h1>
          <p className="text-blue-100 text-sm mt-1">Staff & administrator guide to Live Virtual Inspection and 360{"\u00b0"}/VR Tours.</p>
        </div>
        <Button onClick={handleDownload} disabled={downloading} className="gap-1.5 cursor-pointer bg-white text-[var(--brand)] hover:bg-blue-50 shrink-0">
          {downloading ? <Spinner className="h-4 w-4" /> : <Download size={14} />}
          {downloading ? "Preparing PDF..." : "Download Branded PDF"}
        </Button>
      </div>

      <div className="space-y-4">
        {SECTIONS.filter((s) => !s.adminOnly || isAdmin).map((section) => (
          <div key={section.heading} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[var(--brand)] flex items-center justify-center shrink-0">
                  <section.icon size={15} />
                </div>
                <h2 className="font-bold text-gray-900 text-sm">{section.heading}</h2>
              </div>
              {section.adminOnly && (
                <Badge className={cn("text-[10px] border-0 gap-1 shrink-0", "bg-amber-100 text-amber-700")}>
                  <Lock size={10} /> Admin Only
                </Badge>
              )}
            </div>
            {section.paragraphs?.map((p, i) => (
              <p key={i} className="text-sm text-gray-600 mb-2 leading-relaxed">{p}</p>
            ))}
            {section.bullets && (
              <ul className="space-y-1.5 mt-1">
                {section.bullets.map((b, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] mt-1.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center">
        <p className="text-xs text-gray-400">
          Looking for the client-facing version? Clients can view their own simplified guide from the Client Portal's Support section.
        </p>
      </div>
    </div>
  );
}
