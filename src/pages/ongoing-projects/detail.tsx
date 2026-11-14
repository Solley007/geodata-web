import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { ArrowLeft, MapPin, Calendar, HardHat } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { useSeo } from "@/hooks/use-seo.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";
import { getEmbedUrl } from "@/components/track-record/track-record-utils.ts";
import { STATUS_LABEL } from "./_lib/status.ts";

export default function OngoingProjectDetailPage() {
  const { id = "" } = useParams();
  const data = useQuery(api.construction.getPublicOngoing, { id });

  useSeo({
    title: data ? `${data.site.name} – Construction Progress | Geodata` : "Construction Progress | Geodata",
    description: data
      ? `${data.site.name} in ${data.site.location} is ${data.site.completionPercent}% complete. See dated photos and videos from site.`
      : "Follow construction progress on a Geodata development.",
    canonicalPath: `/ongoing-projects/${id}`,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 sm:px-10 pt-28 pb-20">
        <Link to="/ongoing-projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[var(--brand)] mb-6">
          <ArrowLeft size={15} /> All ongoing projects
        </Link>

        {data === undefined ? (
          <div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-64 w-full rounded-2xl" /></div>
        ) : data === null ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><HardHat /></EmptyMedia>
              <EmptyTitle>Project not available</EmptyTitle>
              <EmptyDescription>This project may be finished or is not shown publicly right now.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent><Button asChild size="sm"><Link to="/ongoing-projects">See ongoing projects</Link></Button></EmptyContent>
          </Empty>
        ) : (
          <>
            <h1 className="text-3xl lg:text-5xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>{data.site.name}</h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground mb-6">
              <span className="flex items-center gap-1.5"><MapPin size={15} />{data.site.location}</span>
              <span className="flex items-center gap-1.5"><Calendar size={15} />Started {data.site.startDate}</span>
              {data.site.expectedEndDate && <span>Expected finish {data.site.expectedEndDate}</span>}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 mb-8">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-[var(--brand)]">{STATUS_LABEL[data.site.status] ?? data.site.status}</span>
                <span className="font-bold">{data.site.completionPercent}% complete</span>
              </div>
              <Progress value={data.site.completionPercent} />
            </div>

            {data.site.image && <img src={data.site.image} alt={data.site.name} className="w-full max-h-[480px] object-cover rounded-2xl mb-8" />}
            {data.site.description && <p className="text-lg leading-relaxed whitespace-pre-line mb-10">{data.site.description}</p>}

            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>Progress updates</h2>
            {data.updates.length === 0 ? (
              <p className="text-muted-foreground">No updates have been posted yet. Please check back soon.</p>
            ) : (
              <ol className="space-y-8 border-l-2 border-border pl-6">
                {data.updates.map((u) => (
                  <li key={u._id} className="relative">
                    <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-[var(--brand)]" />
                    <p className="text-sm font-semibold text-[var(--brand)] mb-1">{u.reportDate}</p>
                    <p className="leading-relaxed whitespace-pre-line">{u.workDone}</p>
                    {u.nextSteps && <p className="text-sm text-muted-foreground mt-2"><span className="font-medium">Next: </span>{u.nextSteps}</p>}
                    {u.photoUrls.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                        {u.photoUrls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] overflow-hidden rounded-xl bg-muted cursor-pointer">
                            <img src={url} alt={`${data.site.name} progress on ${u.reportDate}`} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                          </a>
                        ))}
                      </div>
                    )}
                    {u.videoItems.length > 0 && (
                      <div className="grid gap-3 md:grid-cols-2 mt-4">
                        {u.videoItems.map((vd, i) => {
                          const embed = getEmbedUrl(vd.link ?? undefined);
                          if (!embed && !vd.fileUrl) return null;
                          return (
                            <div key={vd.fileUrl ?? vd.link ?? i} className="aspect-video rounded-xl overflow-hidden bg-black">
                              {embed ? (
                                <iframe src={embed} title={`${data.site.name} video ${u.reportDate}`} className="w-full h-full" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
                              ) : (
                                <video src={vd.fileUrl ?? undefined} controls playsInline preload="metadata" className="w-full h-full object-contain" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
