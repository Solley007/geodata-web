import { motion } from "motion/react";
import { ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useContactInfo } from "@/hooks/use-contact-info.ts";

export default function GroupCTA() {
  const contact = useContactInfo();

  return (
    <section className="py-20 bg-white border-t border-[#01378D]/8">
      <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden bg-[#01378D] p-8 lg:p-14 text-center"
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)", backgroundSize: "32px 32px" }}
          />
          <div className="relative z-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Ready to Build With Geodata Group?
            </h2>
            <p className="text-white/75 text-sm sm:text-base max-w-xl mx-auto mb-8">
              Whether you&apos;re looking for a home, a partner, or a supplier — one of our
              businesses is ready to work with you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#01378D] font-semibold text-sm px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
              >
                Contact the Group <ArrowRight size={16} />
              </Link>
              <a
                href={`tel:${contact.primaryPhone}`}
                className="inline-flex items-center justify-center gap-2 bg-white/15 text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-white/25 transition-colors border border-white/30 cursor-pointer"
              >
                <Phone size={15} /> {contact.primaryPhone}
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
