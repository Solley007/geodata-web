import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { BarChart3, Users, TrendingUp, CalendarClock, Briefcase, Home, Handshake, Building, ShieldCheck, Wallet, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

/**
 * Diaspora Investment & Property Platform analytics — read-time rollups over
 * the EXISTING leads/consultations/QR scans/transactions tables (never a
 * second analytics system). Mirrors the campaign/market comparison pattern
 * already used by Corporate Marketing's Pipeline Analytics screen.
 */

function fmtNaira(n: number): string {
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  scheduled: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-indigo-100 text-indigo-700",
  archived: "bg-red-100 text-red-600",
};

export default function DiasporaAnalyticsPanel() {
  const stats = useQuery(api.diaspora.analytics.getDashboardStats, {});
  const campaigns = useQuery(api.diaspora.analytics.getCampaignAnalytics, {});
  const markets = useQuery(api.diaspora.analytics.getMarketAnalytics, {});

  if (stats === undefined || campaigns === undefined || markets === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const summaryCards = [
    { label: "Total Diaspora Leads", value: String(stats.totalLeads), icon: Users },
    { label: "New Leads", value: String(stats.newLeads), icon: Users },
    { label: "Qualified Leads", value: String(stats.qualifiedLeads), icon: ShieldCheck },
    { label: "Active Opportunities", value: String(stats.activeOpportunities), icon: Briefcase },
    { label: "Consultations", value: String(stats.consultations), icon: CalendarClock },
    { label: "Property Enquiries", value: String(stats.propertyEnquiries), icon: Home },
    { label: "Investment Enquiries", value: String(stats.investmentEnquiries), icon: TrendingUp },
    { label: "Partnership Enquiries", value: String(stats.partnershipEnquiries), icon: Handshake },
    { label: "Corporate Enquiries", value: String(stats.corporateEnquiries), icon: Building },
    { label: "Referral Prospects", value: String(stats.referralProspects), icon: Users },
    { label: "Transactions", value: String(stats.transactions), icon: Wallet },
    { label: "Sales Value", value: fmtNaira(stats.salesValue), icon: Wallet },
    { label: "Conversion Rate", value: `${stats.conversionRatePercent}%`, icon: Percent },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-gray-900 flex items-center gap-2"><BarChart3 size={18} className="text-[var(--brand)]" /> Analytics</h2>
        <p className="text-sm text-gray-500 mt-0.5">Platform-wide performance plus campaign and market comparisons — every figure is a live rollup over the existing CRM.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {summaryCards.map((c) => (
            <div key={c.label} className="bg-gray-50 rounded-xl p-4">
              <c.icon size={15} className="text-[var(--brand)] mb-2" />
              <p className="text-xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Campaign Comparison</h3>
          <p className="text-sm text-gray-500 mt-0.5">QR scans, leads, consultations, opportunities, transactions and sales value, side by side.</p>
        </div>
        {campaigns.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><BarChart3 /></EmptyMedia>
              <EmptyTitle>No campaigns yet</EmptyTitle>
              <EmptyDescription>Create a campaign under the Campaigns tab to see its performance here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">QR Scans</th>
                  <th className="px-4 py-3 font-medium text-right">Leads</th>
                  <th className="px-4 py-3 font-medium text-right">Qualified</th>
                  <th className="px-4 py-3 font-medium text-right">Consultations</th>
                  <th className="px-4 py-3 font-medium text-right">Open Opps</th>
                  <th className="px-4 py-3 font-medium text-right">Transactions</th>
                  <th className="px-4 py-3 font-medium text-right">Sales Value</th>
                  <th className="px-6 py-3 font-medium text-right">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map((c) => (
                  <tr key={c.campaignId} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{c.campaignName}</p>
                      <p className="text-xs text-gray-400">{c.campaignCode}</p>
                    </td>
                    <td className="px-4 py-3"><Badge className={cn("text-xs", STATUS_COLOR[c.status])}>{c.status}</Badge></td>
                    <td className="px-4 py-3 text-right">{c.qrScans}</td>
                    <td className="px-4 py-3 text-right font-medium">{c.leads}</td>
                    <td className="px-4 py-3 text-right">{c.qualifiedLeads}</td>
                    <td className="px-4 py-3 text-right">{c.consultations}</td>
                    <td className="px-4 py-3 text-right">{c.opportunities}</td>
                    <td className="px-4 py-3 text-right">{c.transactions}</td>
                    <td className="px-4 py-3 text-right">{fmtNaira(c.salesValue)}</td>
                    <td className="px-6 py-3 text-right">{c.conversionRatePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Market Comparison</h3>
          <p className="text-sm text-gray-500 mt-0.5">Performance broken down by country — includes registered markets and any other country producing leads.</p>
        </div>
        {markets.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><BarChart3 /></EmptyMedia>
              <EmptyTitle>No market activity yet</EmptyTitle>
              <EmptyDescription>Once Diaspora leads start coming in, their countries will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium text-right">Leads</th>
                  <th className="px-4 py-3 font-medium text-right">Qualified</th>
                  <th className="px-4 py-3 font-medium text-right">Consultations</th>
                  <th className="px-4 py-3 font-medium text-right">Open Opps</th>
                  <th className="px-4 py-3 font-medium text-right">Transactions</th>
                  <th className="px-4 py-3 font-medium text-right">Sales Value</th>
                  <th className="px-6 py-3 font-medium text-right">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {markets.map((m) => (
                  <tr key={m.marketId ?? m.country} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{m.country}</p>
                      {!m.marketId && <p className="text-xs text-gray-400">Not yet registered as a market</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{m.leads}</td>
                    <td className="px-4 py-3 text-right">{m.qualifiedLeads}</td>
                    <td className="px-4 py-3 text-right">{m.consultations}</td>
                    <td className="px-4 py-3 text-right">{m.opportunities}</td>
                    <td className="px-4 py-3 text-right">{m.transactions}</td>
                    <td className="px-4 py-3 text-right">{fmtNaira(m.salesValue)}</td>
                    <td className="px-6 py-3 text-right">{m.conversionRatePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
