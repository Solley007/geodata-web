import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ConvexError } from "convex/values";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircle2, Users, TrendingUp, Shield, Handshake,
  ChevronRight, ArrowRight, Star, Phone, Mail, MapPin, User, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import Navbar from "@/pages/home/_components/Navbar.tsx";
import Footer from "@/pages/home/_components/Footer.tsx";

const schema = z.object({
  partnerType: z.enum(["individual", "company"]),
  fullName: z.string().min(2, "Full name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(8, "Phone number required"),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  motivation: z.string().min(30, "Please provide at least 30 characters"),
  experience: z.string().optional(),
  howHeard: z.string().optional(),
  companyName: z.string().optional(),
  rcNumber: z.string().optional(),
  companyWebsite: z.string().optional(),
  contactRole: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankAccountName: z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.partnerType === "company" && (d.companyName ?? "").trim().length < 2) {
    ctx.addIssue({ code: "custom", path: ["companyName"], message: "Company name required" });
  }
});
type FormData = z.infer<typeof schema>;

const PARTNER_TYPE_OPTIONS = [
  { value: "individual", label: "Individual", desc: "Refer as yourself", icon: User },
  { value: "company", label: "Company", desc: "Refer as a registered business", icon: Building2 },
] as const;

const PERKS = [
  { icon: TrendingUp, title: "Earn Up to 10% Commission", desc: "On every verified referral that converts to a sale." },
  { icon: Users, title: "Exclusive Promo Materials", desc: "Access branded flyers, property links, and shareable content." },
  { icon: Shield, title: "Your Own Referral Code", desc: "Every lead you send has your phone number visible — they contact you first." },
  { icon: Handshake, title: "Real-Time Dashboard", desc: "Track your referrals, earnings, and commission status live." },
];

const STEPS = [
  { num: "01", title: "Submit Application", desc: "Fill this form — takes 3 minutes." },
  { num: "02", title: "Review & Approval", desc: "Our team reviews and responds within 24 hours." },
  { num: "03", title: "Get Your Code", desc: "Receive your referral code and dashboard access." },
  { num: "04", title: "Start Earning", desc: "Share properties and watch your commissions grow." },
];

export default function PartnerApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const submitApplication = useMutation(api.partners.submitApplication);
  const [searchParams] = useSearchParams();
  const campaignCode = searchParams.get("ref") ?? undefined;

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { partnerType: "individual" },
  });
  const partnerType = watch("partnerType");
  const isCompany = partnerType === "company";

  const onSubmit = async (data: FormData) => {
    // Individual applicants never send company fields, even if typed then switched back
    const payload = isCompany
      ? data
      : { ...data, companyName: undefined, rcNumber: undefined, companyWebsite: undefined, contactRole: undefined };
    try {
      await submitApplication({ ...payload, campaignCode });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ConvexError) {
        const e = err.data as { message: string };
        toast.error(e.message);
      } else {
        toast.error("Submission failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-[var(--brand)] text-white py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <Star size={14} fill="currentColor" />
              Partner Program
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Earn While You Refer
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Join the Geodata World Partner Program and earn industry-leading commissions by connecting people with their dream properties.
            </p>
          </motion.div>
        </div>
      </section>

      {submitted ? (
        <section className="flex-1 flex items-center justify-center py-24 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full text-center"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              Application Received!
            </h2>
            <p className="text-gray-500 mb-8 text-lg">
              Thank you for applying. Our team will review your application and respond within <strong>24 hours</strong> via email or WhatsApp.
            </p>
            <div className="bg-blue-50 rounded-2xl p-6 mb-8 text-left space-y-3">
              <p className="text-sm font-semibold text-[var(--brand)] uppercase tracking-wide">What happens next</p>
              {STEPS.slice(1).map((s) => (
                <div key={s.num} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-[var(--brand)] text-white text-xs font-bold flex items-center justify-center shrink-0">{s.num}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                    <p className="text-gray-500 text-xs">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/">
              <Button className="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white cursor-pointer">
                Back to Homepage <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </motion.div>
        </section>
      ) : (
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-16 grid lg:grid-cols-5 gap-12">

          {/* LEFT: Perks & Steps */}
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                Why Partner With Us?
              </h2>
              <div className="space-y-4">
                {PERKS.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <p.icon size={20} className="text-[var(--brand)]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{p.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{p.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                How It Works
              </h2>
              <div className="relative space-y-0">
                {STEPS.map((s, i) => (
                  <div key={s.num} className="flex gap-4 relative">
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-full bg-[var(--brand)] text-white text-xs font-bold flex items-center justify-center shrink-0 z-10">
                        {s.num}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="w-0.5 bg-blue-200 flex-1 my-1" style={{ minHeight: 32 }} />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact us box */}
            <div className="bg-[var(--brand)] rounded-2xl p-6 text-white">
              <p className="font-semibold mb-3">Need to speak with us first?</p>
              <div className="space-y-2 text-sm text-blue-100">
                <div className="flex items-center gap-2"><Phone size={14} /><span>(+234) 704 762 0492</span></div>
                <div className="flex items-center gap-2"><Mail size={14} /><span>hello@geodata.com.ng</span></div>
                <div className="flex items-center gap-2"><MapPin size={14} /><span>Southern Bridge Estate, Abuja</span></div>
              </div>
            </div>
          </div>

          {/* RIGHT: Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                Partner Application
              </h2>
              <p className="text-gray-500 text-sm mb-8">Fill in your details accurately — all fields marked * are required.</p>

              {campaignCode && (
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-2.5 text-xs text-violet-700 mb-6">
                  Applying via campaign <strong>{campaignCode}</strong> — this will be noted on your application.
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5">
                  <Label>I am applying as *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {PARTNER_TYPE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setValue("partnerType", o.value, { shouldValidate: true })}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                          partnerType === o.value ? "border-[var(--brand)] bg-blue-50 ring-1 ring-[var(--brand)]" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <o.icon size={20} className={partnerType === o.value ? "text-[var(--brand)]" : "text-gray-400"} />
                        <span>
                          <span className="block text-sm font-semibold text-gray-900">{o.label}</span>
                          <span className="block text-xs text-gray-500">{o.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {isCompany && (
                  <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Company details</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Company Name *</Label>
                        <Input {...register("companyName")} placeholder="Adeyemi Realty Ltd" />
                        {errors.companyName && <p className="text-red-500 text-xs">{errors.companyName.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>CAC / RC Number</Label>
                        <Input {...register("rcNumber")} placeholder="RC 1234567" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Company Website</Label>
                        <Input {...register("companyWebsite")} placeholder="https://example.com" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Your Role / Position</Label>
                        <Input {...register("contactRole")} placeholder="Managing Director" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>{isCompany ? "Contact Person *" : "Full Name *"}</Label>
                    <Input {...register("fullName")} placeholder="John Adeyemi" />
                    {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email Address *</Label>
                    <Input {...register("email")} placeholder="john@example.com" type="email" />
                    {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Phone Number *</Label>
                    <Input {...register("phone")} placeholder="+234 800 000 0000" />
                    {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp Number</Label>
                    <Input {...register("whatsapp")} placeholder="+234 800 000 0000 (if different)" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>{isCompany ? "Company Address" : "Residential Address"}</Label>
                    <Input {...register("address")} placeholder="Street, City, State" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Input {...register("country")} placeholder="e.g. Belgium, Nigeria" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Commission Payment Account</Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isCompany ? "Use the company's account — commissions are paid to the business." : "Optional — you can also add this later from your dashboard."}
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Input {...register("bankName")} placeholder="Bank name" aria-label="Bank name" />
                    <Input {...register("bankAccount")} placeholder="Account number" aria-label="Account number" />
                    <Input {...register("bankAccountName")} placeholder={isCompany ? "Account name (company)" : "Account name"} aria-label="Account name" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>How did you hear about us?</Label>
                  <Select onValueChange={(v) => setValue("howHeard", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="referral">Referred by someone</SelectItem>
                      <SelectItem value="website">Geodata Website</SelectItem>
                      <SelectItem value="event">Event / Exhibition</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Real Estate / Sales Experience</Label>
                  <Textarea
                    {...register("experience")}
                    placeholder="Tell us about your experience (optional) — e.g. years in real estate, types of properties sold, etc."
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Why do you want to become a Geodata Partner? *</Label>
                  <Textarea
                    {...register("motivation")}
                    placeholder="Tell us what motivates you and how you plan to refer clients to us (min. 30 characters)..."
                    rows={4}
                  />
                  {errors.motivation && <p className="text-red-500 text-xs">{errors.motivation.message}</p>}
                </div>

                <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-600">
                  <strong className="text-gray-800">By submitting this form,</strong> you agree that Geodata World Services may contact you regarding your application and partner activities. Your information will be kept confidential.
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-base font-semibold cursor-pointer"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                  <ChevronRight size={18} className="ml-1" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
