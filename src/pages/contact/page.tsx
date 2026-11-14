import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Navbar from "../home/_components/Navbar.tsx";
import Footer from "../home/_components/Footer.tsx";
import WhatsAppButton from "../home/_components/WhatsAppButton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";import { StyledMap } from "@/pages/home/RealEstateLandingPage.tsx";import { InstagramLogo, FacebookLogo, YoutubeLogo } from "@phosphor-icons/react";

const serif = { fontFamily: "'GD Caslon', Georgia, 'Times New Roman', serif", fontWeight: 400 };
const eyebrow = "text-[11px] tracking-[0.22em] uppercase text-[#5c6b7e]";
const fieldLabel = "block text-[11px] tracking-[0.22em] uppercase text-[#5c6b7e]";
const fieldInput = "mt-3 w-full bg-transparent border-0 border-b border-[#0a1628]/25 pb-3 text-base text-[#0a1628] placeholder:text-[#5c6b7e]/60 focus:outline-none focus:border-[#0a1628]";

const INTERESTS = [
  { key: "property", label: "Specific property" },
  { key: "visit", label: "Schedule a visit" },
  { key: "mortgage", label: "MREIF mortgage" },
  { key: "investment", label: "Investment opportunity" },
  { key: "partnership", label: "Sales partnership" },
  { key: "other", label: "Other" },
];

const DIRECTIONS = "https://www.google.com/maps/dir/" + "/9.047605395407187,7.4136454589349094";

export default function ContactPage() {
  const createInquiry = useMutation(api.inquiries.create);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [type, setType] = useState("property");

  useSeo({
    title: "Contact Geodata World Services",
    description:
      "Speak to the Geodata World Services sales team about Southern Bridge City, MREIF mortgage qualification, or a private viewing at our Idu sales pavilion in Abuja.",
    canonicalPath: "/contact",
  });

  const set = (k: "name" | "email" | "phone" | "message") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.message) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const interest = INTERESTS.find((i) => i.key === type);
      await createInquiry({ ...form, type, subject: interest ? interest.label : undefined });
      setDone(true);
    } catch {
      toast.error("Something went wrong. Please try again or call us directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf7] text-[#0a1628]">
      <Navbar />

      <section className="pt-40 pb-24 md:pt-48 md:pb-32">
        <div className="max-w-7xl mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-16 lg:gap-24">
          <div>
<p className={eyebrow}>Get in touch</p>
            <h1 style={serif} className="mt-6 text-[clamp(3.5rem,10vw,7rem)] leading-[1] tracking-tight">Hello.</h1>
            <p className="mt-10 text-lg leading-relaxed text-[#1c2b40] max-w-lg">
Thinking about buying a home, investing, or just have a question? We would love to hear from you.
            </p>
            <p className="mt-6 text-lg leading-relaxed text-[#1c2b40] max-w-lg">
A real person on our team will reply within one working day. If it is urgent, please call us.
            </p>

            <div className="mt-14 pt-8 border-t border-[#e5e0d5] max-w-lg space-y-10">
              <div>
<p className={eyebrow}>Sales office</p>
                <p className="mt-4 text-[15px] leading-relaxed text-[#1c2b40]">
                  Plot 93, 94, 95 B10 Cadastral Zone
                  <br />
                  Utako, Dakibiyu 900108
                  <br />
                  Federal Capital Territory, Abuja
                </p>
                <p className="mt-4 text-sm text-[#5c6b7e]">
                  Mon to Sat, 9:00 AM to 6:00 PM
                  <br />
                  Sunday by appointment
                </p>
              </div>
              <div>
                <p className={eyebrow}>Direct</p>
                <p className="mt-4 text-[15px] leading-relaxed">
                  <a href="tel:+2347047620492" className="hover:text-[#d44455] transition-colors">+234 704 762 0492</a>
                  <br />
                  <a href="mailto:hello@geodata.com.ng" className="hover:text-[#d44455] transition-colors">hello@geodata.com.ng</a>
                </p>
</div><div><p className={eyebrow}>Follow us</p><div className="mt-4 flex items-center gap-3"><a href="https://www.instagram.com/geodataworldservicesltd/" target="_blank" rel="noopener noreferrer" aria-label="Geodata on Instagram" title="Instagram: @geodataworldservicesltd" className="w-11 h-11 rounded-full border border-[#0a1628]/20 flex items-center justify-center text-[#0a1628] hover:bg-[#0a1628] hover:text-white transition-colors"><InstagramLogo size={20} /></a><a href="https://www.facebook.com/GWCommsNG/" target="_blank" rel="noopener noreferrer" aria-label="Geodata on Facebook" title="Facebook: GWCommsNG" className="w-11 h-11 rounded-full border border-[#0a1628]/20 flex items-center justify-center text-[#0a1628] hover:bg-[#0a1628] hover:text-white transition-colors"><FacebookLogo size={20} /></a><a href="https://www.youtube.com/@geodataworldservicesltd" target="_blank" rel="noopener noreferrer" aria-label="Geodata on YouTube" title="YouTube: @geodataworldservicesltd" className="w-11 h-11 rounded-full border border-[#0a1628]/20 flex items-center justify-center text-[#0a1628] hover:bg-[#0a1628] hover:text-white transition-colors"><YoutubeLogo size={20} /></a></div></div>
            </div>
          </div>

          <div className="bg-[#f4f2ec] border border-[#e5e0d5] p-8 md:p-12 self-start">
            {done ? (
              <div className="py-16 text-center">
                <CheckCircle className="w-10 h-10 mx-auto text-[#d44455]" />
                <h2 style={serif} className="mt-6 text-3xl">Thank you.</h2>
                <p className="mt-4 text-[#1c2b40] max-w-sm mx-auto">
                  Your message has been received. A member of our team will reply within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-9">
                <div>
                  <label className={fieldLabel} htmlFor="c-name">Full name</label>
                  <input id="c-name" className={fieldInput} placeholder="Your name" value={form.name} onChange={set("name")} />
                </div>
                <div className="grid sm:grid-cols-2 gap-9">
                  <div>
                    <label className={fieldLabel} htmlFor="c-email">Email</label>
                    <input id="c-email" type="email" className={fieldInput} placeholder="you@example.com" value={form.email} onChange={set("email")} />
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="c-phone">Phone</label>
                    <input id="c-phone" type="tel" className={fieldInput} placeholder="+234" value={form.phone} onChange={set("phone")} />
                  </div>
                </div>
                <div>
                  <p className={fieldLabel}>What are you interested in?</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {INTERESTS.map((i) => (
                      <button
                        key={i.key}
                        type="button"
                        onClick={() => setType(i.key)}
                        className={
                          "px-4 py-2.5 text-[11px] tracking-[0.18em] uppercase border transition-colors " +
                          (type === i.key ? "bg-[#0a1628] text-[#fafaf7] border-[#0a1628]" : "bg-transparent text-[#0a1628] border-[#0a1628]/20 hover:border-[#0a1628]")
                        }
                      >
                        {i.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="c-msg">Message</label>
                  <textarea
                    id="c-msg"
                    rows={5}
                    className="mt-3 w-full bg-transparent border border-[#0a1628]/20 p-4 text-base placeholder:text-[#5c6b7e]/60 focus:outline-none focus:border-[#0a1628]"
                    placeholder="Tell us a little about what you're looking for..."
                    value={form.message}
                    onChange={set("message")}
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
<p className="text-sm text-[#5c6b7e]">We reply to every message within one working day.</p>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 bg-[#0a1628] text-[#fafaf7] px-7 py-4 text-xs tracking-[0.2em] uppercase hover:bg-[#1c2b40] transition-colors disabled:opacity-60"
                  >
                    {loading ? "Sending" : "Send message"} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 border-t border-[#e5e0d5]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 grid md:grid-cols-2 gap-12 items-end">
          <div>
            <p className={eyebrow}>Find us</p>
            <h2 style={serif} className="mt-5 text-4xl md:text-6xl leading-[1.05]">Our office.</h2>
          </div>
          <div>
            <p className={eyebrow}>Geodata World Services</p>
            <p className="mt-4 text-[15px] leading-relaxed text-[#1c2b40]">
              Plot 93, Cadastral Zone B10
              <br />
              Dakibiyu, FCT Abuja
            </p>
            <p className="mt-3 text-sm text-[#5c6b7e]">Mon to Sat · 9:00 AM to 6:00 PM</p>
            <a
              href={DIRECTIONS}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm tracking-[0.12em] uppercase border-b border-[#0a1628] pb-1"
            >
              Get directions <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-10 mt-12"><StyledMap lat={9.047605395407187} lng={7.4136454589349094} zoom={16} title="Geodata World Services office, Plot 93, Cadastral Zone B10, Dakibiyu, Abuja" fallbackSrc="https://maps.google.com/maps?q=9.047605,7.413645&z=16&output=embed" className="h-[420px] md:h-[520px] w-full" /></div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
