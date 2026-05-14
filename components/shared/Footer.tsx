import Link from "next/link";
import Image from "next/image";
import { COMPANY } from "@/lib/site-content";

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-bone pt-16 pb-10">
      <div className="container-editorial">

        {/* Top */}
        <div className="grid grid-cols-12 gap-12 pb-12 border-b border-bone/10">
          <div className="col-span-12 lg:col-span-7">
            <p className="eyebrow text-bone/60 mb-6">Schedule a private viewing</p>
            <h2 className="text-display-md font-display tracking-tightest leading-none">
              Visit Southern <br />Bridge City <em className="font-light">in person.</em>
            </h2>
            <Link href="/contact" className="mt-10 inline-flex items-center gap-3 bg-bone px-7 py-4 text-sm font-medium text-navy-950 hover:bg-gold-soft transition-colors duration-400">
              Schedule visit <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* Middle */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-12 py-12">
          <div className="col-span-2 lg:col-span-4">
            <img
              src="/geodata-full-logo-white.png"
              alt="Geodata World Services Limited"
              width={260}
              height={99}
              className="h-auto w-auto max-w-[240px]"
            />
          </div>

          <div>
            <p className="eyebrow text-bone/60 mb-5">Properties</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/properties" className="hover:text-gold transition-colors">All listings</Link></li>
              <li><Link href="/projects/southern-bridge-city" className="hover:text-gold transition-colors">Southern Bridge City</Link></li>
              <li><Link href="/properties?type=outright" className="hover:text-gold transition-colors">Buy outright</Link></li>
              <li><Link href="/mortgage" className="hover:text-gold transition-colors">MREIF mortgage</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow text-bone/60 mb-5">Company</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/" className="hover:text-gold transition-colors">Home</Link></li>
              <li><Link href="/about" className="hover:text-gold transition-colors">About</Link></li>
              <li><Link href="/projects" className="hover:text-gold transition-colors">Projects</Link></li>
              <li><Link href="/updates" className="hover:text-gold transition-colors">Updates</Link></li>
              <li><Link href="/blog" className="hover:text-gold transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-gold transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-3">
            <p className="eyebrow text-bone/60 mb-5">Contact</p>
            <p className="text-sm text-bone/80 leading-relaxed">
              {COMPANY.address.line1}<br />{COMPANY.address.line2}
            </p>
            <p className="mt-4 text-sm">
              <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="hover:text-gold transition-colors">{COMPANY.phone}</a>
            </p>
            <p className="text-sm">
              <a href={`mailto:${COMPANY.email}`} className="hover:text-gold transition-colors">{COMPANY.email}</a>
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-bone/10 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-bone/40">
          <p>© {new Date().getFullYear()} Geodata World Services Limited. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-bone transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-bone transition-colors">Terms</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
