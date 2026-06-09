/**
 * Save as: app/rent-vs-buy/page.tsx
 */
import type { Metadata } from "next";
import RentVsBuyClient from "./RentVsBuyClient";

export const metadata: Metadata = {
  title: "Rent vs Buy in Abuja — Geodata World Services",
  description:
    "Abuja rent is paid annually upfront and rises every year. An MREIF mortgage at 9.75% fixed is a flat payment that builds equity. See the numbers side by side.",
};

export default function RentVsBuyPage() {
  return (
    <main className="bg-bone dark:bg-navy-950 min-h-screen">
      <section className="container-editorial pt-40 pb-20 md:pb-28">
        <p className="eyebrow text-navy-900/60 dark:text-bone/60 mb-6">
          The honest comparison
        </p>
        <h1 className="font-display text-4xl md:text-6xl text-navy-950 dark:text-bone mb-6">
          What does renting actually cost you?
        </h1>
        <p className="max-w-2xl text-lg text-navy-900/70 dark:text-bone/70 mb-16">
          Abuja rent is paid a year upfront and rises every renewal. An MREIF
          mortgage is a flat monthly payment, fixed for 20 years, on a home you
          own. Most people have never seen the two side by side. Adjust the
          numbers below to match your situation.
        </p>
        <RentVsBuyClient />
      </section>
    </main>
  );
}
