import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Speak with our sales team about Southern Bridge City, MREIF mortgage qualification, or schedule a private viewing at our Idu sales pavilion. We respond within one business day.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Geodata",
    description:
      "Speak with our team about Southern Bridge City or schedule a sales pavilion visit. We respond within one business day.",
    url: "/contact",
    images: [
      {
        url: `/api/og?eyebrow=${encodeURIComponent("Begin a conversation")}&title=${encodeURIComponent("Hello.")}&subtitle=${encodeURIComponent("A member of our team responds personally to every enquiry within one business day.")}`,
        width: 1200,
        height: 630,
        alt: "Contact Geodata World Services",
      },
    ],
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
