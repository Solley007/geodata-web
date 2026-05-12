import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-bone pt-32 pb-12">
      <div className="container-editorial">
        {/* Top — large statement */}
        <div className="grid grid-cols-12 gap-12 pb-20 border-b border-bone/10">
          <div className="col-span-12 lg:col-span-7">
            <p className="eyebrow text-bone/60 mb-6">Schedule a private viewing</p>
            <h2 className="text-display-md font-display tracking-tightest leading-none">
              Visit Southern <br />
              Bridge City <em className="font-light">in person.</em>
            </h2>
            <Link
              href="/contact"
              className="mt-12 inline-flex items-center gap-3 bg-bone dark:bg-navy-950 px-7 py-4 text-sm font-medium text-navy-950 dark:text-bone hover:bg-gold-soft transition-colors duration-400"
            >
              Schedule visit
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* Middle — link columns */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-12 py-20">
          <div className="col-span-2 lg:col-span-4">
            <Image
              src="/geodata-mark.png"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 mb-4"
              aria-hidden="true"
            />
            <p className="font-brand text-2xl tracking-tight">
              GEODATA<span className="text-gold">.</span>
            </p>
            <p className="mt-2 text-sm text-bone/60">
              World Services Limited
            </p>
            <p className="mt-8 text-sm text-bone/70 leading-relaxed max-w-xs">
              Real Estate · Investment · Infrastructure
            </p>
            <p className="mt-2 text-xs text-bone/50">RC 688927 · CAC Registered</p>
          </div>

          <div>
            <p className="eyebrow text-bone/60 mb-5">Properties</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/properties" className="hover:text-gold transition-colors">All listings</Link></li>
              <li><Link href="/properties/southern-bridge-city" className="hover:text-gold transition-colors">Southern Bridge City</Link></li>
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
              <li><Link href="/blog" className="hover:text-gold transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-gold transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-3">
            <p className="eyebrow text-bone/60 mb-5">Contact</p>
            <p className="text-sm text-bone/80 leading-relaxed">
              Plot 93, 94, 95 B10 Cadastral Zone<br />
              Utako, Dakibiyu 900108<br />
              Federal Capital Territory, Abuja
            </p>
            <p className="mt-5 text-sm">
              <a href="tel:+2347047620492" className="hover:text-gold transition-colors break-words">
                +234 704 762 0492
              </a>
            </p>
            <p className="text-sm">
              <a href="mailto:hello@geodata.com.ng" className="hover:text-gold transition-colors break-words">
                hello@geodata.com.ng
              </a>
            </p>
          </div>
        </div>

        {/* Bottom — fine print + payment notice */}
        <div className="border-t border-bone/10 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-bone/50">
          <p>© 2026 Geodata World Services Limited. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-bone transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-bone transition-colors">Terms</Link>
          </div>
        </div>

        <p className="mt-8 pt-6 border-t border-bone/10 text-[11px] text-bone/40 leading-relaxed">
          Payment notice: please make all payments directly to Geodata World Services
          Limited official accounts only. Geodata World Services Limited is not liable
          for any payments made to unauthorised persons.
        </p>
      </div>
    </footer>
  );
}
