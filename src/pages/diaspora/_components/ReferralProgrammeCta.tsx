import { Link } from "react-router-dom";
import { TrendingUp, Users, Shield, Handshake, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

const PERKS = [
  { icon: TrendingUp, title: "Earn Commission", desc: "On every verified referral that converts to a sale — rate set by Geodata on approval." },
  { icon: Users, title: "Your Own Referral Code", desc: "Every lead you send is tracked automatically once approved." },
  { icon: Shield, title: "One Application, One Pipeline", desc: "The same partner programme used by referrers across Nigeria — no separate Diaspora system." },
];

/**
 * Diaspora "Refer" programme never builds a second referral engine — it
 * simply explains the EXISTING partner programme and links into the
 * existing `/partner/apply` form, carrying the campaign code (`?ref=CODE`)
 * through so the resulting `partnerApplications` row stays attributable.
 */
export default function ReferralProgrammeCta({ registrationOpen, campaignCode }: { registrationOpen: boolean; campaignCode: string | null }) {
  if (!registrationOpen) {
    return (
      <div id="register" className="max-w-2xl mx-auto text-center py-4">
        <p className="text-gray-500 text-sm">The Referral &amp; Sales Partner programme is currently closed to new applicants. Please check back soon.</p>
      </div>
    );
  }

  return (
    <div id="register" className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
          <Handshake size={22} className="text-violet-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Become a Referral &amp; Sales Partner</h3>
          <p className="text-sm text-gray-500 mt-1">Apply once — your application joins the same partner pipeline our sales team already manages, wherever in the world you're referring from.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-7">
        {PERKS.map((p) => (
          <div key={p.title} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
            <p.icon size={18} className="text-violet-600 mb-2" />
            <p className="font-semibold text-gray-800 text-sm">{p.title}</p>
            <p className="text-gray-500 text-xs mt-0.5">{p.desc}</p>
          </div>
        ))}
      </div>

      <Button size="lg" className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2" asChild>
        <Link to={`/partner/apply${campaignCode ? `?ref=${campaignCode}` : ""}`}>
          Apply to Become a Partner <ArrowRight size={16} />
        </Link>
      </Button>
    </div>
  );
}
