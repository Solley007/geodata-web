import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils.ts";

const LOGO = "/media/file_hqjYSAKlVBBRqljHrAkEnfVn.png";

const SECTIONS = [
  { label: "Our Businesses", href: "#businesses" },
  { label: "About the Group", href: "#about" },
  { label: "Sustainability", href: "#sustainability" },
];

export default function GroupHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const goTo = (href: string) => {
    setOpen(false);
    if (window.location.pathname === "/group" || window.location.pathname === "/") {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/group${href}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#01378D]/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 h-16 lg:h-20 flex items-center justify-between">
        <Link to="/group" className="flex items-center gap-3 shrink-0">
          <img src={LOGO} alt="Geodata Group" className="h-9 lg:h-11 w-auto" />
          <div className="hidden sm:block">
            <div className="text-[#01378D] font-bold text-sm leading-tight tracking-wide uppercase">Geodata World</div>
            <div className="text-[#111111]/50 text-[11px] leading-tight tracking-widest uppercase">Corporate Directory</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Corporate sections">
          {SECTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => goTo(s.href)}
              className="px-4 py-2 text-sm font-medium text-[#111111]/70 hover:text-[#01378D] transition-colors cursor-pointer"
            >
              {s.label}
            </button>
          ))}
          <Link
            to="/real-estate"
            className="ml-2 px-4 py-2 text-sm font-semibold rounded-full bg-[#01378D] text-white hover:bg-[#01378D]/85 transition-colors"
          >
            Visit Real Estate Site
          </Link>
        </nav>

        <button
          className="lg:hidden p-2 text-[#01378D] cursor-pointer"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn("lg:hidden overflow-hidden border-t border-[#01378D]/10 bg-white")}
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => goTo(s.href)}
                  className="text-left px-2 py-2.5 text-sm font-medium text-[#111111]/70 hover:text-[#01378D] transition-colors cursor-pointer"
                >
                  {s.label}
                </button>
              ))}
              <Link
                to="/real-estate"
                onClick={() => setOpen(false)}
                className="mt-2 text-center px-4 py-2.5 text-sm font-semibold rounded-full bg-[#01378D] text-white"
              >
                Visit Real Estate Site
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
