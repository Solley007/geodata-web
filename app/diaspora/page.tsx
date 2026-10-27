import type { Metadata } from "next";
import DiasporaHero from "@/components/diaspora/DiasporaHero";
import DiasporaSteps from "@/components/diaspora/DiasporaSteps";
import DiasporaAssurances from "@/components/diaspora/DiasporaAssurances";
import DiasporaFaq from "@/components/diaspora/DiasporaFaq";

export const metadata: Metadata = {
  title: "Buying from Abroad, Diaspora Buyers",
  description:
    "Buy a home in Abuja from anywhere in the world. Live video walkthroughs, direct dealings with the developer, published construction updates, and MREIF financing for eligible Nigerian citizens.",
  alternates: { canonical: "/diaspora" },
  openGraph: {
    title: "Buying from Abroad, Diaspora Buyers",
    description:
      "Tour on video, deal directly with the developer, and watch your Abuja home being built.",
    url: "/diaspora",
    images: [
      {
        url: `/api/og?eyebrow=${encodeURIComponent("For Nigerians abroad")}&title=${encodeURIComponent("A home in Abuja. Bought from anywhere.")}&subtitle=${encodeURIComponent("Live video walkthroughs. Direct from the developer.")}`,
        width: 1200,
        height: 630,
        alt: "Buying a Geodata home from abroad",
      },
    ],
  },
};

export default function DiasporaPage() {
  return (
    <>
      <DiasporaHero />
      <DiasporaSteps />
      <DiasporaAssurances />
      <DiasporaFaq />
    </>
  );
}
