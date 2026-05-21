import type { Metadata } from "next";
import MortgageQuizClient from "./MortgageQuizClient";

export const metadata: Metadata = {
  title: "Affordability Quiz, MREIF Mortgages",
  description: "Find out what you can afford at Southern Bridge City in 30 seconds. Calculate your monthly payment under the MREIF 9.75% fixed-rate, 20-year programme.",
  alternates: { canonical: "/mortgage/quiz" },
  openGraph: {
    title: "What can you afford at Southern Bridge City?",
    description: "Take the 30-second MREIF affordability quiz to find your matched residence.",
    url: "/mortgage/quiz",
  },
};

export default function MortgageQuizPage() {
  return <MortgageQuizClient />;
}
