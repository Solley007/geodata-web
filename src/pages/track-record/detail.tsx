import { useEffect, useRef, useState, type TouchEvent } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";
import { useSeo, useJsonLd } from "@/hooks/use-seo.ts";
import { calProps, useReveal, vimg } from "@/pages/home/RealEstateLandingPage.tsx";
import { getProjectBySlug, getRelatedProjects, projectPath, type Project } from "./page.tsx";

// /projects/:slug, ported from the Next.js site's project detail template.

/** Slugs the old track record pages used, mapped to the project slugs. */
const SLUG_ALIASES: Record<string, string> = {
  "southern-bridge-city-idu": "southern-bridge-city",
  "country-court-estate-abuja": "country-court-estate",
};

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

export default function ProjectDetailPage() {
  const { slug = "" } = useParams();
  const { pathname } = useLocation();
  const real = SLUG_ALIASES[slug] ?? slug;
  const project = getProjectBySlug(real);

  useSeo({
    title: project ? `${project.name}, ${project.location} | Geodata World Services` : "Project | Geodata World Services",
    description: project
      ? `${project.subtitle.replace(/[.\s]+$/, "")}. ${project.overview?.[0] ?? ""}`.replace(/\s+/g, " ").trim().replace(/^(.{0,157}[^ ]*).*$/, (_m, s: string) => (s.length < `${project.subtitle} ${project.overview?.[0] ?? ""}`.trim().length ? s.replace(/[ ,;:.\-]+$/, "") + "..." : s))
      : "Geodata World Services project.",
    canonicalPath: `/projects/${real}`,
  });

  useJsonLd(
    "ld-project",
    project
      ? {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://geodata.com.ng/" },
                { "@type": "ListItem", position: 2, name: "Projects", item: "https://geodata.com.ng/projects" },
                { "@type": "ListItem", position: 3, name: project.name, item: `https://geodata.com.ng/projects/${project.slug}` },
              ],
            },
            {
              "@type": "Project",
              name: project.name,
              description: project.subtitle,
              url: `https://geodata.com.ng/projects/${project.slug}`,
              image: project.coverImage,
              location: { "@type": "Place", name: project.location },
              sponsor: project.client ? { "@type": "Organization", name: project.client } : undefined,
              provider: { "@type": "Organization", name: "Geodata World Services Limited", url: "https://geodata.com.ng" },
            },
          ],
        }
      : null,
  );

  if (real === "southern-bridge-city") return <Navigate to="/southern-bridge-city" replace />;
  // Old /track-record/... links and old slugs land on the /projects page
  if (real !== slug || pathname.startsWith("/track-record")) return <Navigate to={`/projects/${real}`} replace />;
  if (!project) return <Navigate to="/projects" replace />;

  const related = getRelatedProjects(project.slug, project.category, 3);

  return (
    <div className="min-h-screen bg-bone">
      <Navbar />
      <main key={project.slug} data-v2>
        <ProjectHero project={project} />
        <ProjectKeyFacts project={project} />
        <ProjectOverview project={project} />{project.slug === "southern-bridge-estate" && <SbeUnits />}
{project.slug === "firs-office-programme" ? <FirsBeforeAfter project={project} /> : <ProjectGallery project={project} />}
        <section className="bg-navy-950 text-bone py-24 md:py-32 border-t border-bone/10">
          <div className="container-editorial">
            <div className="grid grid-cols-12 gap-12">
              <div className="col-span-12 lg:col-span-8">
                <p className="eyebrow !text-bone/60 mb-6">Considering working with us?</p>
                <h2 className="font-display text-display-md tracking-tightest leading-none font-light">Let's discuss your project.</h2>
                <p className="mt-8 max-w-xl text-lg text-bone/80 leading-relaxed">
                  Whether you're a private client, federal agency, or institutional investor, we'd be glad to talk through what we
                  can build together.
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                  <button
                    type="button"
                    {...calProps}
                    className="inline-flex items-center gap-3 bg-bone px-7 py-4 text-sm font-medium text-navy-950 hover:bg-coral-soft transition-colors duration-400 cursor-pointer"
                  >
                    Book a meeting <span aria-hidden>→</span>
                  </button>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-3 px-7 py-4 text-sm font-medium text-bone border-b border-bone hover:text-coral-soft hover:border-coral-soft transition-colors duration-400"
                  >
                    Get in touch
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        <RelatedProjects projects={related} />
      </main>
      <Footer />
    </div>
  );
}

function ProjectHero({ project }: { project: Project }) {
  const root = useRef<HTMLElement>(null);
  useReveal(root, [
    { sel: ".pdh-back", from: { y: 12 }, duration: 0.6, delay: 0.1, immediate: true },
    { sel: ".pdh-eyebrow", from: { y: 16 }, duration: 0.7, delay: 0.5, immediate: true },
    { sel: ".pdh-title", from: { y: 30 }, duration: 1.1, delay: 0.8, immediate: true },
    { sel: ".pdh-sub", from: { y: 16 }, duration: 0.8, delay: 1.3, immediate: true },
    { sel: ".pdh-meta", from: { y: 12 }, duration: 0.7, delay: 1.6, immediate: true },
    { sel: ".pdh-cover", from: { y: 30, scale: 1.02 }, duration: 1, delay: 1.8, immediate: true },
  ]);

  return (
<section ref={root} className="bg-bone flex flex-col max-md:!pt-0 max-md:!pb-4 md:!pt-10 md:!pb-6">
<div className="container-editorial w-full order-2 md:order-1 max-md:pt-5">
        <Link
          to="/projects"
className="pdh-back inline-flex items-center gap-2 text-xs uppercase tracking-eyebrow font-medium text-ink-muted hover:text-navy-900 transition-colors duration-300 mb-5 md:mb-6"
        >
          <span aria-hidden>←</span> All projects
        </Link>
        <div className="max-w-4xl">
<div className="pdh-eyebrow flex items-center gap-3 flex-wrap mb-3 md:mb-4">
            <span className="eyebrow">{project.category}</span>
            <span className="text-ink-faint">·</span>
            <span
              className={cx(
                "inline-flex items-center text-[11px] uppercase tracking-eyebrow font-medium",
                project.status === "Ongoing" ? "text-coral-dark" : "text-ink-muted",
              )}
            >
              {project.status === "Ongoing" && <span className="block h-1.5 w-1.5 rounded-full bg-coral mr-2 animate-pulse" />}
              {project.status}
            </span>
          </div>
<h1 className="pdh-title text-[2rem] md:text-6xl font-display text-navy-950 tracking-tightest leading-[1.05] font-light">{project.name}</h1>
<p className="pdh-sub mt-3 md:mt-4 text-base md:text-xl leading-relaxed text-ink max-w-3xl">{project.subtitle}</p>
<div className="pdh-meta mt-4 md:mt-5 flex items-center flex-wrap gap-x-8 gap-y-2 border-t border-hairline pt-3 md:pt-4">

            {project.client && (
              <p className="text-sm text-ink-muted">
                <span className="text-ink-faint">Client · </span>
                <span className="text-navy-950">{project.client}</span>
              </p>
            )}
            <p className="text-sm text-ink-faint">
              {project.completionYear ? `Completed ${project.completionYear}` : `Started ${project.year}`}
            </p>
          </div>
        </div>
      </div>
<div className="container-editorial max-md:!px-0 max-md:!max-w-none w-full order-1 md:order-2 md:mt-8">
<div className="pdh-cover relative aspect-square md:aspect-[16/9] overflow-hidden bg-navy-100">
          {project.heroVideoUrl ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              poster={vimg(project.heroVideoPoster ?? project.coverImage)}
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={project.heroVideoUrl} type="video/mp4" />
            </video>
          ) : (
            <img
              src={vimg(project.coverImage)}
              alt={`${project.name}, cover image showing ${project.location}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function ProjectKeyFacts({ project }: { project: Project }) {
  const root = useRef<HTMLElement>(null);
  useReveal(root, [
    { sel: ".pkf-rule-h", from: { scaleX: 0 }, duration: 1.2, start: 75, origin: "left center" },
    { sel: ".pkf-cell > *", from: { y: 16 }, duration: 0.8, stagger: 0.06, start: 75 },
  ]);

  return (
<section ref={root} className="bg-bone py-6 md:py-10 !py-6 md:!py-10">
      <div className="container-editorial">
<p className="eyebrow mb-4 md:mb-5">Project facts</p>
        <div className="pkf-rule-h h-px w-full bg-navy-950" />
        <div className="grid grid-cols-2 lg:grid-cols-3">
{project.keyFacts.filter((f) => !/^location$/i.test(f.label)).map((fact, i) => {
            const isLastInRow = (i + 1) % 3 === 0;
            const isTopRow = i < 3;
            return (
              <div
                key={fact.label}
                className={cx(
"pkf-cell py-4 md:py-6 px-2 lg:px-6",
                  !isLastInRow && "lg:border-r border-hairline",
                  isTopRow && "border-b border-hairline",
                  i % 2 === 0 && "border-r border-hairline lg:border-r",
                )}
              >
<p className="eyebrow text-ink-faint mb-1 md:mb-2">{fact.label}</p>
<p className="font-display text-2xl md:text-3xl text-navy-950 tracking-tightest leading-tight font-light">{fact.value}</p>
              </div>
            );
          })}
        </div>
        <div className="pkf-rule-h h-px w-full bg-navy-950" />
      </div>
    </section>
  );
}

function ProjectOverview({ project }: { project: Project }) {
  const root = useRef<HTMLElement>(null);
  useReveal(root, [{ sel: ".po-fade", from: { y: 24 }, duration: 0.9, stagger: 0.08, start: 80 }]);

  return (
<section ref={root} className="bg-bone py-10 md:py-16 !py-10 md:!py-16">
      <div className="container-editorial">
<div className="grid grid-cols-12 gap-6 lg:gap-12">
          <div className="col-span-12 lg:col-span-4">
<p className="po-fade eyebrow text-ink-faint mb-3 md:mb-6">Overview</p>
            <h2 className="po-fade font-display text-display-md text-navy-950 tracking-tightest leading-tight font-light">About this project.</h2>
          </div>
          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <div className="space-y-6">
              {project.overview.map((para, i) => (
                <p key={i} className="po-fade text-lg leading-relaxed text-ink">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectGallery({ project }: { project: Project }) {
  const root = useRef<HTMLElement>(null);
  const [idx, setIdx] = useState<number | null>(null);
  const n = project.gallery.length;
  useReveal(root, [{ sel: ".pg-fade", from: { y: 32 }, duration: 0.9, stagger: 0.08, start: 80 }]);

  const close = () => setIdx(null);
  const next = () => setIdx((i) => (i === null ? i : (i + 1) % n));
  const prev = () => setIdx((i) => (i === null ? i : (i - 1 + n) % n));

  // Keyboard controls and scroll lock while the lightbox is open
  useEffect(() => {
    if (idx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Touch swipe in the lightbox
  const touch = useRef({ x: 0, y: 0 });
  const swipe = {
    onTouchStart: (e: TouchEvent) => {
      touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    onTouchEnd: (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touch.current.x;
      const dy = e.changedTouches[0].clientY - touch.current.y;
      if (Math.abs(dy) > 80 || Math.abs(dx) < 50) return;
      if (dx < 0) next();
      else prev();
    },
  };

  if (n === 0) return null;

  return (
    <>
      <section ref={root} className="bg-bone-100 py-24 md:py-32">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-12 mb-16">
            <div className="col-span-12 lg:col-span-5">
              <p className="pg-fade eyebrow mb-6">Imagery</p>
              <h2 className="pg-fade font-display text-display-md text-navy-950 tracking-tightest font-light">The work, in light.</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {project.gallery.map((img, i) => {
              const ratio = i === 0 ? "aspect-[16/10] col-span-2" : i % 3 === 1 ? "aspect-[3/4]" : "aspect-[4/5]";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`pg-fade group relative overflow-hidden bg-navy-100 cursor-zoom-in ${ratio}`}
                >
                  <img
                    src={vimg(img.src)}
                    alt={img.alt}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-editorial group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/20 transition-colors duration-500 flex items-center justify-center">
                    <svg
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-bone"
                      viewBox="0 0 24 24"
                      width="28"
                      height="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="pg-fade mt-8 text-sm text-ink-faint">Photography and renders represent the project at various stages.</p>
        </div>
      </section>

      {idx !== null && (
        <div className="fixed inset-0 z-[100] bg-navy-950/95 flex items-center justify-center p-6 md:p-16" onClick={close}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="absolute top-4 right-4 z-20 h-12 w-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-bone transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <p className="absolute top-7 left-6 z-20 text-bone/50 text-xs uppercase tracking-widest">
            {idx + 1} <span className="text-bone/25">/</span> {n}
          </p>
          {n > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 flex items-center justify-center text-bone/60 hover:text-bone bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Previous"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 flex items-center justify-center text-bone/60 hover:text-bone bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Next"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}
          <div className="relative max-w-6xl w-full flex flex-col items-center touch-pan-y" onClick={(e) => e.stopPropagation()} {...swipe}>
            <img src={vimg(project.gallery[idx].src)} alt={project.gallery[idx].alt} className="max-w-full max-h-[80vh] object-contain" />
            {project.gallery[idx].alt && <p className="mt-5 text-bone/60 text-sm tracking-wide text-center">{project.gallery[idx].alt}</p>}
          </div>
          {n > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20 max-w-[90vw] overflow-x-auto scrollbar-hide">
              {project.gallery.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdx(i);
                  }}
                  className={cx(
                    "relative h-12 w-16 shrink-0 overflow-hidden transition-opacity duration-200 cursor-pointer",
                    i === idx ? "opacity-100 ring-1 ring-coral" : "opacity-40 hover:opacity-70",
                  )}
                >
                  <img src={vimg(img.src)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function RelatedProjects({ projects }: { projects: Project[] }) {
  const root = useRef<HTMLElement>(null);
  useReveal(root, [{ sel: ".rpr-fade", from: { y: 30 }, duration: 0.9, stagger: 0.08, start: 85 }]);
  if (projects.length === 0) return null;

  return (
    <section ref={root} className="bg-bone py-24 md:py-32 border-t border-hairline">
      <div className="container-editorial">
        <div className="rpr-fade flex items-end justify-between mb-16 flex-wrap gap-6">
          <div>
            <p className="eyebrow mb-4">More work</p>
            <h2 className="font-display text-display-md text-navy-950 tracking-tightest font-light">Related projects.</h2>
          </div>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 hover:text-coral-dark transition-colors duration-400 pb-2 border-b border-navy-900 hover:border-coral-dark"
          >
            View all projects <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
          {projects.map((p) => (
            <Link key={p.slug} to={projectPath(p.slug)} className="rpr-fade group block">
              <div className="relative aspect-[4/3] overflow-hidden bg-navy-100 mb-6">
                <img
                  src={vimg(p.coverImage)}
                  alt={`${p.name}, ${p.location}`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
                />
              </div>
              <p className="eyebrow text-ink-faint mb-3">
                {p.category} · {p.completionYear ? `Completed ${p.completionYear}` : "Ongoing"}
              </p>
              <h3 className="font-display text-2xl text-navy-950 leading-tight transition-transform duration-400 ease-editorial group-hover:translate-x-1">
                {p.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}


function SbeUnits() { const IMGB = "https://hercules-cdn.com/cdn-cgi/image/w=1400,q=80,format=auto/"; const U = [{ s: "Sold out", c: "bg-navy-950 text-bone", e: "", n: "6-Bedroom Terrace Duplex", d: "Twelve terraced family residences delivered and fully occupied.", img: "file_R4FjNzvS7ngTMoDrq4g7IXMt", t: "12", a: "", p: "" }, { s: "2 available", c: "bg-bone text-navy-950", e: "Phase one, completed", n: "6-Bedroom Semi-Detached", d: "Eight semi-detached residences fully built and finished. Two units remain for sale.", img: "file_aoQ2XjlUJgULi5JDSlw3oXFV", t: "8", a: "2", p: "From ₦650,000,000" }, { s: "Under construction", c: "bg-red-600 text-white", e: "Phase two, finishing stage", n: "6-Bedroom Semi-Detached", d: "Seven additional semi-detached residences currently in the finishing phase. Early access pricing available.", img: "file_MYa1kMpnSTyJuHvfL7CjSydI", t: "7", a: "7", p: "From ₦500,000,000" }]; return (<section className="bg-bone-100 py-20 md:py-28 border-t border-navy-950/10"><div className="container-editorial"><p className="eyebrow mb-6">Unit types</p><h2 className="font-display text-display-md tracking-tightest leading-none font-light">Three configurations across two phases.</h2><div className="mt-14 space-y-16">{U.map((u) => (<div key={u.n + u.e} className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center"><div className="md:col-span-7 relative"><img src={IMGB + u.img} alt={u.n} loading="lazy" className="w-full aspect-[4/3] object-cover" /><span className={"absolute top-4 left-4 px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase " + u.c}>{u.s}</span></div><div className="md:col-span-5">{u.e && <p className="eyebrow mb-3">{u.e}</p>}<h3 className="font-display text-3xl md:text-4xl font-light leading-tight">{u.n}</h3><p className="mt-4 text-navy-950/70 leading-relaxed">{u.d}</p><div className="mt-6 pt-4 border-t border-navy-950/10 text-sm space-y-2"><div className="flex justify-between"><span className="text-navy-950/60">Total units</span><span>{u.t}</span></div>{u.a && <div className="flex justify-between"><span className="text-navy-950/60">Available</span><span>{u.a}</span></div>}{u.p && <div className="flex justify-between pt-3 border-t border-navy-950/10"><span className="text-navy-950/60">From</span><span className="font-display text-xl">{u.p.replace("From ", "")}</span></div>}</div>{u.a && <Link to="/contact" className="mt-6 inline-flex items-center gap-3 bg-navy-950 text-bone px-6 py-3 text-sm">Enquire about this unit &rarr;</Link>}</div></div>))}</div><div className="mt-16 flex flex-wrap gap-6"><a href="https://www.google.com/maps/search/?api=1&query=9.0252,7.3685" target="_blank" rel="noreferrer" className="underline">Get directions on Google Maps</a><Link to="/contact" className="underline">Book a visit</Link></div></div></section>); }

function FirsBeforeAfter({ project }: { project: Project }) { const g = project.gallery; const Tile = ({ i, after, a }: { i: number; after: boolean; a: string }) => (<div className="relative overflow-hidden rounded-lg"><img src={g[i]?.src} alt={g[i]?.alt ?? ""} loading="lazy" className={cx("w-full object-cover", a)} /><span className={cx("absolute top-3 left-3 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] rounded", after ? "bg-[#c9a24b] text-[#0a1628]" : "bg-[#0a1628] text-white")}>{after ? "After" : "Before"}</span></div>); return (<section className="bg-bone py-20 md:py-28 border-t border-navy-950/10"><div className="container-editorial"><p className="eyebrow mb-6">Before and after</p><h2 className="font-display text-display-md tracking-tightest leading-none font-light">Two sites, renovated.</h2><div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-12"><div><h3 className="text-2xl font-medium text-navy-950">Retrofitting and renovation of FIRS office</h3><p className="mt-1 text-navy-950/70">No. 12 Sokode Crescent, Wuse Zone 5, Abuja</p><div className="mt-4 border-t-2 border-navy-950 pt-5 space-y-4"><Tile i={0} after={false} a="aspect-[16/7]" /><Tile i={1} after={true} a="aspect-[16/7]" /></div></div><div><h3 className="text-2xl font-medium text-navy-950">Remodelling of warehouse, FIRS Investigation and Enforcement Unit</h3><p className="mt-1 text-navy-950/70">Njamena Crescent, Wuse II, Abuja</p><div className="mt-4 border-t-2 border-navy-950 pt-5 grid grid-cols-2 gap-4"><Tile i={4} after={false} a="aspect-[7/6]" /><Tile i={3} after={true} a="aspect-[7/6]" /><Tile i={2} after={false} a="aspect-[7/6]" /><Tile i={5} after={true} a="aspect-[7/6]" /></div></div></div></div></section>); }