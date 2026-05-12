import type { Metadata } from "next";
import MortgageHero from "@/components/mortgage/MortgageHero";
import MortgageHowItWorks from "@/components/mortgage/MortgageHowItWorks";
import MortgageCalculator from "@/components/mortgage/MortgageCalculator";
import MortgageEligibilityFaq from "@/components/mortgage/MortgageEligibilityFaq";
import SectionErrorBoundary from "@/components/shared/SectionErrorBoundary";

export const metadata: Metadata = {
  title: "MREIF Mortgage — 9.75% Fixed for 20 Years",
  description:
    "Through the Ministry of Finance Real Estate Investment Fund (MREIF), Geodata residences qualify for fixed-rate mortgage financing at 9.75% for up to 20 years. Backed by ARM Investment Managers and Federal Mortgage Bank of Nigeria.",
  alternates: { canonical: "/mortgage" },
  openGraph: {
    title: "MREIF Mortgage — 9.75% Fixed for 20 Years",
    description:
      "Fixed-rate mortgage financing for Geodata residences. Naira denominated. 10% minimum equity. Backed by ARM Investment Managers.",
    url: "/mortgage",
    images: [
      {
        url: `/api/og?eyebrow=${encodeURIComponent("MREIF Mortgage")}&title=${encodeURIComponent("9.75% fixed. Twenty years.")}&subtitle=${encodeURIComponent("The most accessible premium home loan in Nigeria.")}`,
        width: 1200,
        height: 630,
        alt: "MREIF Mortgage — 9.75% Fixed for 20 Years",
      },
    ],
  },
};

export default function MortgagePage() {
  return (
    <>
      <MortgageHero />
      <MortgageHowItWorks />
      {/* Calculator has complex client state — guard against runtime errors
          so a calc bug doesn't take down the whole mortgage page */}
      <SectionErrorBoundary sectionName="MortgageCalculator">
        <MortgageCalculator />
      </SectionErrorBoundary>
      <MortgageEligibilityFaq />
    </>
  );
}
