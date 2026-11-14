import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Navbar from "../home/_components/Navbar.tsx";
import Footer from "../home/_components/Footer.tsx";
import WhatsAppButton from "../home/_components/WhatsAppButton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";

const serif = { fontFamily: "'GD Caslon', Georgia, 'Times New Roman', serif", fontWeight: 400 };
const eyebrow = "text-[11px] tracking-[0.22em] uppercase text-[#5c6b7e]";

const STATS = [
  { n: "19", plus: false, l: "Years active" },
  { n: "500", plus: true, l: "Units delivered" },
{ n: "80", plus: true, l: "Specialists on our team" },
{ n: "11", plus: false, l: "Regulators we are registered with" },
];

const VALUES = ["Integrity", "Innovation", "Excellence", "Teamwork", "Exceptional quality", "Client-centric"];

const WORK = [
  { year: "2025", status: "Ongoing", title: "Ize Hostel", place: "Abuja, FCT", desc: "A 23-room purpose-built student hostel in Abuja", meta: "23 rooms · 50 bed spaces · student housing" },
  { year: "2024", status: "Ongoing", title: "Southern Bridge City", place: "Idu, Abuja", desc: "A 1850+ -unit residential development in Idu, Abuja", meta: "321 units · five housing typologies · M&E infrastructure" },
  { year: "2024", status: "Ongoing", title: "Cool Army Estate", place: "Owerri, Imo State", desc: "A 20-residence mixed-typology estate in Owerri, Imo State", meta: "20 residences · five housing typologies" },
  { year: "2024", status: "Ongoing", title: "Mabushi Shopping Complex", place: "Mabushi District, Abuja", desc: "Six-storey commercial development in Abuja", meta: "Six-storey commercial complex" },
  { year: "2024", status: "Ongoing", title: "Kogi RAAMP Rural Roads", place: "Kogi State", desc: "World Bank-funded upgrade of 33.56 km of rural roads in Kogi State", meta: "33.56 km rural roads · Lots 1 and 2" },
  { year: "2025", status: "", title: "Southern Bridge Estate", place: "Jabi, Abuja", desc: "27-unit residential development in Jabi, Abuja", meta: "27 units · full infrastructure" },
  { year: "2022", status: "", title: "Country Court Estate", place: "Abuja, FCT", desc: "24-unit mixed housing development in Abuja", meta: "24 units · mixed housing types · full infrastructure" },
  { year: "2018", status: "Completed", title: "Kashere Bungalows", place: "Kashere, Gombe State", desc: "Construction of 20 units of 3-bedroom bungalows with BQ", meta: "20 units · Federal Government" },
  { year: "2018", status: "Completed", title: "FIRS office programme", place: "Abuja, FCT", desc: "Retrofitting, renovation and remodelling of Federal Inland Revenue Service facilities", meta: "Two sites · before and after works" },
  { year: "2015", status: "", title: "SIL Estate", place: "Abuja, FCT", desc: "180+ unit residential development", meta: "180+ units" },
];

const CLIENTS = [
  { name: "Central Bank of Nigeria", count: "6 projects" },
  { name: "Federal Inland Revenue Service", count: "5 projects" },
  { name: "Federal Ministries and Universities", count: "4 projects" },
];

const LEADERS = [
  { pre: "Engr.", name: "Usman Dauda Abere", role: "Managing Director and Chief Executive" },
  { pre: "", name: "Farida Yunusa Abere", role: "Deputy Managing Director" },
  { pre: "Engr.", name: "Owuda Aminu Salihu", role: "Director of Operations" },
  { pre: "", name: "Habib Uba", role: "Administration and Welfare Manager" },
  { pre: "", name: "Garba Okeke Chamber", role: "Company Secretary and Legal Counsel" },
];

const COMPLIANCE = [
  ["Corporate Affairs Commission", "RC 688927"],

  ["Bureau of Public Procurement", "Registered"],
  ["FIRS", "Tax clearance current"],
  ["PENCOM", "Compliant"],
  ["ITF", "Registered"],
  ["NSITF", "Registered"],
  ["FRCN", "Registered"],
  ["NHIS", "Compliant"],
  ["VAT registration", "Active"],
  ["Statutory life insurance", "In place"],
];

export default function AboutPage() {
  useSeo({
    title: "About Geodata World Services | Building since 2007",
    description:
      "Geodata World Services Limited has been developing homes, commercial buildings and infrastructure across Nigeria since 2007. Meet the team, see our work and our regulatory standing.",
    canonicalPath: "/about",
  });

  return (
    <div className="min-h-screen bg-[#fafaf7] text-[#0a1628]">
      <Navbar />

      <section className="bg-[#fafaf7] pt-40 pb-24 md:pt-48 md:pb-32">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <h1 style={serif} className="text-[clamp(3rem,9vw,7.5rem)] leading-[0.98] tracking-tight">
Building with care,
            <br />
            <em className="font-normal">since 2007.</em>
          </h1>
          <div className="mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-y-10">
            {STATS.map((s) => (
              <div key={s.l} className="border-l border-[#0a1628]/25 pl-5 pr-4">
                <div style={serif} className="text-4xl md:text-5xl">
                  {s.n}
                  {s.plus && <span className="text-[#d44455]">+</span>}
                </div>
                <div className={"mt-3 " + eyebrow}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fafaf7] py-24 md:py-40 border-t border-[#e5e0d5]">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className={eyebrow}>Who we are</p>
<h2 style={serif} className="mt-5 text-4xl md:text-6xl leading-[1.05]">What we stand for.</h2>
          <div className="mt-16 grid md:grid-cols-2 gap-12 md:gap-20">
            <div>
              <p className={eyebrow}>Mission</p>
              <p className="mt-4 text-lg leading-relaxed text-[#1c2b40]">
                We deliver trusted real estate services that prioritize client satisfaction, quality developments and long-term value guided by ethics, expertise and innovation. Our team approaches every project with meticulous planning, market insight and a commitment to excellence, ensuring that each development is both impactful and sustainable.
              </p>
            </div>
            <div>
              <p className={eyebrow}>Vision</p>
              <p className="mt-4 text-lg leading-relaxed text-[#1c2b40]">
                To create enduring homes and vibrant communities, built on integrity and high-quality standards, where people thrive and prosper.
              </p>
            </div>
          </div>
          <div className="mt-16 pt-10 border-t border-[#e5e0d5]">
            <p className={eyebrow}>Core values</p>
            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
              {VALUES.map((v) => (
                <span key={v} style={serif} className="text-2xl md:text-3xl">{v}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fafaf7] py-24 md:py-40 border-t border-[#e5e0d5]">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <p className={eyebrow}>The work</p>
<h2 style={serif} className="mt-5 text-4xl md:text-6xl leading-[1.05]">Our work.</h2>
              <p className="mt-6 text-lg leading-relaxed text-[#1c2b40]">
Homes, commercial buildings and roads we have built across Nigeria, and some we are building now.
              </p>
            </div>
            <Link to="/projects" className="inline-flex items-center gap-2 text-sm tracking-[0.12em] uppercase border-b border-[#0a1628] pb-1 self-start md:self-auto">
              View full portfolio <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#e5e0d5] border border-[#e5e0d5]">
            {WORK.map((w) => (
              <Link key={w.title} to="/projects" className="group bg-[#fafaf7] p-7 md:p-8 flex flex-col hover:bg-white transition-colors">
                <div className="flex items-center justify-between text-[11px] tracking-[0.2em] uppercase text-[#5c6b7e]">
                  <span>{w.year}</span>
                  <span className={w.status === "Ongoing" ? "text-[#d44455]" : ""}>{w.status}</span>
                </div>
                <h3 style={serif} className="mt-8 text-2xl md:text-3xl leading-tight">{w.title}</h3>
                <p className="mt-2 text-sm text-[#5c6b7e]">{w.place}</p>
                <p className="mt-5 text-[15px] leading-relaxed text-[#1c2b40]">{w.desc}</p>
                <p className="mt-4 text-xs tracking-wide text-[#5c6b7e]">{w.meta}</p>
                <ArrowRight className="mt-6 w-5 h-5 text-[#d44455] transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0a1628] text-[#fafaf7] py-24 md:py-40">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="text-[11px] tracking-[0.22em] uppercase text-[#fafaf7]/60">Institutional clients</p>
<h2 style={serif} className="mt-5 text-4xl md:text-6xl leading-[1.05] max-w-4xl">Trusted by some of Nigeria's most careful clients.</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#fafaf7]/75 max-w-2xl">
Federal agencies and institutions that have trusted us with renovation, construction and infrastructure work.
          </p>
          <div className="mt-16 grid md:grid-cols-3 gap-10 border-t border-[#fafaf7]/20 pt-10">
            {CLIENTS.map((c) => (
              <div key={c.name}>
                <div style={serif} className="text-2xl md:text-3xl leading-snug">{c.name}</div>
                <div className="mt-3 text-[11px] tracking-[0.2em] uppercase text-[#fafaf7]/60">{c.count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="bg-[#f4f2ec] py-24 md:py-40">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className={eyebrow}>Leadership</p>
<h2 style={serif} className="mt-5 text-4xl md:text-6xl leading-[1.05]">The people behind Geodata.</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#1c2b40] max-w-3xl">
Our leaders have spent decades in engineering, property development, finance and public projects. Behind them is a team of more than 80 specialists covering every part of construction.
          </p>
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {LEADERS.map((p) => (
              <div key={p.name} className="border-t border-[#0a1628] pt-5">
                <div className="h-4 text-[11px] tracking-[0.2em] uppercase text-[#d44455]">{p.pre}</div>
                <div style={serif} className="mt-1 text-2xl md:text-3xl leading-snug">{p.name}</div>
                <div className="mt-2 text-sm text-[#5c6b7e]">{p.role}</div>
              </div>
            ))}
          </div>
          <p className="mt-16 text-sm text-[#5c6b7e] max-w-3xl">
If you would like a full list of our technical team, from architects and engineers to surveyors, just ask and we will send you our capability statement.
          </p>
        </div>
      </section>

      <section className="bg-[#fafaf7] py-24 md:py-40">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className={eyebrow}>Compliance</p>
<h2 style={serif} className="mt-5 text-4xl md:text-6xl leading-[1.05]">Fully registered and accountable.</h2>
          <p className="mt-6 text-lg leading-relaxed text-[#1c2b40] max-w-3xl">
We are registered with, and up to date with, every Nigerian body that oversees property development, construction, employment, tax and financial reporting.
          </p>
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#e5e0d5] border border-[#e5e0d5]">
            {COMPLIANCE.map(([k, v]) => (
              <div key={k} className="bg-[#fafaf7] p-6">
                <div className="text-[11px] tracking-[0.2em] uppercase text-[#5c6b7e]">{k}</div>
                <div style={serif} className="mt-2 text-xl">{v}</div>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm text-[#5c6b7e]">Audited accounts and tax clearance certificates are available on request.</p>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
