import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { Phone, Mail, MapPin, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";

export default function ContactSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const createInquiry = useMutation(api.inquiries.create);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.message) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await createInquiry({ ...form, type: "general" });
      toast.success("Message sent! We'll get back to you shortly.");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast.error("Failed to send. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section ref={ref} id="contact" className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="text-[var(--brand)] text-sm font-semibold tracking-widest uppercase block mb-3">
            Get In Touch
          </span>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            We&apos;re Here to Help You
          </h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Have questions about a property or ready to begin your investment journey? Our expert team is ready to assist.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="space-y-6 mb-10">
              {[
                { icon: Phone, label: "Phone", value: "(+234) 704 762 0492", href: "tel:+2347047620492" },
                { icon: Mail, label: "Email", value: "hello@geodata.com.ng", href: "mailto:hello@geodata.com.ng" },
                { icon: MapPin, label: "Head Office", value: "Southern Bridge Estate, Plot 93, Dakibiyu, FCT, Abuja", href: "#" },
                { icon: MessageCircle, label: "WhatsApp", value: "Chat with us on WhatsApp", href: "https://wa.me/2347047620492" },
              ].map((item) => (
                <a key={item.label} href={item.href} className="flex items-start gap-4 group">
                  <div className="w-11 h-11 bg-[var(--brand)]/10 group-hover:bg-[var(--brand)] rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300">
                    <item.icon size={18} className="text-[var(--brand)] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">{item.label}</div>
                    <div className="text-gray-800 text-sm group-hover:text-[var(--brand)] transition-colors">{item.value}</div>
                  </div>
                </a>
              ))}
            </div>

            {/* Map placeholder */}
            <div className="rounded-2xl overflow-hidden h-52 bg-gray-100 relative border border-gray-200">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126093.83272748246!2d7.399722!3d9.057853!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x104e745f4cd62fd9%3A0x53bd17b4a20ea12b!2sAbuja%2C%20Federal%20Capital%20Territory!5e0!3m2!1sen!2sng!4v1700000000000!5m2!1sen!2sng"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Geodata World Services Location"
              />
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-3xl p-8 border border-gray-100 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Send Us a Message
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Your Full Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="col-span-2 sm:col-span-1"
                />
                <Input
                  placeholder="example@gmail.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="col-span-2 sm:col-span-1"
                />
              </div>
              <Input
                placeholder="(+234) 704 762 0492"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Textarea
                placeholder="Tell us about your property requirements..."
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="resize-none"
              />
              <Button
                type="submit"
                className="w-full bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white gap-2"
                disabled={loading}
              >
                <Send size={16} />
                {loading ? "Sending..." : "Send Message"}
              </Button>
              <p className="text-xs text-gray-400 text-center">
                We typically respond within 2 business hours.
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
