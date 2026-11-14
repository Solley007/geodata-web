import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { TrendingUp, Eye, MessageSquare, Building2 } from "lucide-react";

export default function AdminAnalytics() {
  const stats = useQuery(api.admin.getDashboardStats);

  const monthlyData = [
    { month: "Feb", inquiries: 12, properties: 3 },
    { month: "Mar", inquiries: 19, properties: 5 },
    { month: "Apr", inquiries: 14, properties: 4 },
    { month: "May", inquiries: 24, properties: 7 },
    { month: "Jun", inquiries: 31, properties: 6 },
    { month: "Jul", inquiries: stats?.totalInquiries ?? 20, properties: stats?.totalProperties ?? 5 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Analytics</h1>
        <p className="text-sm text-gray-500">Performance overview and trends</p>
      </div>

      {!stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Listings", value: stats.totalProperties, icon: Building2, color: "var(--brand)" },
              { label: "Available", value: stats.availableProperties, icon: TrendingUp, color: "#22c55e" },
              { label: "New Inquiries", value: stats.newInquiries, icon: MessageSquare, color: "#f59e0b" },
              { label: "Total Views", value: "—", icon: Eye, color: "#8b5cf6" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{s.label}</span>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.color + "1a" }}>
                    <s.icon size={15} style={{ color: s.color }} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Monthly Inquiries Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="inquiries" stroke="var(--brand)" strokeWidth={2.5} dot={{ fill: "var(--brand)", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Properties by Type</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.propertiesByType} barSize={28}>
                  <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--brand)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm lg:col-span-2">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Inquiry Status Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "New / Pending", value: stats.newInquiries, color: "#ef4444" },
                  { label: "Contacted", value: stats.totalInquiries - stats.newInquiries, color: "#f59e0b" },
                  { label: "Resolved", value: 0, color: "#22c55e" },
                ].map((item) => (
                  <div key={item.label} className="text-center p-4 rounded-2xl border border-gray-100">
                    <div className="text-3xl font-bold mb-1" style={{ color: item.color, fontFamily: "'Playfair Display', serif" }}>{item.value}</div>
                    <div className="text-xs text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
