import Link from "next/link";
import { COMPANY } from "@/lib/site-content";
import BookViewingButton from "@/components/shared/BookViewingButton";

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-bone pt-16 pb-10">
      <div className="container-editorial">

        {/* Top */}
        <div className="grid grid-cols-12 gap-12 pb-12 border-b border-bone/10">
          <div className="col-span-12 lg:col-span-7">
            <p className="eyebrow text-bone/60 mb-6">Schedule a private viewing</p>
            <h2 className="text-display-md font-display tracking-tightest leading-none">
              Visit Southern <br />Bridge City in person.
            </h2>
            <BookViewingButton
              calLink="geodata/sbc-viewing"
              className="mt-10 inline-flex items-center gap-3 bg-bone px-7 py-4 text-sm font-medium text-navy-950 hover:bg-accent-soft transition-colors duration-400"
            >
              Schedule visit <span aria-hidden>→</span>
            </BookViewingButton>
          </div>
        </div>

        {/* Middle */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-12 py-12">
          <div className="col-span-2 lg:col-span-4">
            {/* Crops the 4000×4000 PNG to its 2396×907 lockup (bbox starts at 665,1743). */}
            <div
              role="img"
              aria-label="Geodata World Services Limited"
              className="block w-full max-w-[240px] aspect-[2396/907] bg-no-repeat"
              style={{
                backgroundImage: "url(/geodata-full-logo-white.png)",
                backgroundSize: "166.94% auto",
                backgroundPosition: "41.46% 56.36%",
              }}
            />
          </div>

          <div>
            <p className="eyebrow text-bone/60 mb-5">Properties</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/properties" className="hover:text-accent transition-colors">All listings</Link></li>
              <li><Link href="/projects/southern-bridge-city" className="hover:text-accent transition-colors">Southern Bridge City</Link></li>
              <li><Link href="/properties?type=outright" className="hover:text-accent transition-colors">Buy outright</Link></li>
              <li><Link href="/mortgage" className="hover:text-accent transition-colors">MREIF mortgage</Link></li>
              <li><Link href="/diaspora" className="hover:text-accent transition-colors">Buying from abroad</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow text-bone/60 mb-5">Company</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/" className="hover:text-accent transition-colors">Home</Link></li>
              <li><Link href="/about" className="hover:text-accent transition-colors">About</Link></li>
              <li><Link href="/projects" className="hover:text-accent transition-colors">Projects</Link></li>
              <li><Link href="/updates" className="hover:text-accent transition-colors">Updates</Link></li>
              <li><Link href="/blog" className="hover:text-accent transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-3">
            <p className="eyebrow text-bone/60 mb-5">Contact</p>
            <p className="text-sm text-bone/80 leading-relaxed">
              {COMPANY.address.line1}<br />{COMPANY.address.line2}
            </p>
            <p className="mt-4 text-sm">
              <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="hover:text-accent transition-colors">{COMPANY.phone}</a>
            </p>
            <p className="text-sm">
              <a href={`mailto:${COMPANY.email}`} className="hover:text-accent transition-colors">{COMPANY.email}</a>
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
