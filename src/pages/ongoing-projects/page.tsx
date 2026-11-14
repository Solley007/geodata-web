import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { HardHat, MapPin, ArrowRight } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { useSeo } from "@/hooks/use-seo.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";
import { STATUS_LABEL } from "./_lib/status.ts";

// Public list of projects currently under construction. Only sites an admin
// has published appear; budget and spending are never sent to the browser.
export default function OngoingProjectsPage() {
  const projects = useQuery(api.construction.listPublicOngoing);

  useSeo({
    title: "Ongoing Projects – Construction Progress | Geodata",
    description: "Follow the progress of Geodata developments under construction, with dated photos and videos from site.",
    canonicalPath: "/ongoing-projects",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 sm:px-10 pt-28 pb-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--brand)] mb-2">Under construction</p>
        <h1 className="text-3xl lg:text-5xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Ongoing Projects</h1>
        <p className="text-muted-foreground max-w-2xl mb-10">See how our current developments are coming along, with photos and videos straight from site.</p>

        {projects === undefined ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
          </div>
        ) : projects.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><HardHat /></EmptyMedia>
              <EmptyTitle>No ongoing projects to show yet</EmptyTitle>
              <EmptyDescription>Please check back soon for progress updates from our sites.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p._id} to={`/ongoing-projects/${p._id}`} className="group bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                <div className="aspect-[16/10] bg-muted overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground"><HardHat size={36} /></div>
                  )}
                </div>
                <div className="p-5 space-y-3">
                  <h2 className="text-lg font-bold">{p.name}</h2>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin size={14} />{p.location}</p>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[var(--brand)]">{STATUS_LABEL[p.status] ?? p.status}</span>
                      <span className="font-semibold">{p.completionPercent}% complete</span>
                    </div>
                    <Progress value={p.completionPercent} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>{p.lastUpdate ? `Last update: ${p.lastUpdate}` : "No updates yet"}</span>
                    <span className="flex items-center gap-1 text-[var(--brand)] font-medium">View progress <ArrowRight size={13} /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
