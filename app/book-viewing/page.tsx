import type { Metadata } from "next";
import BookViewingClient from "./BookViewingClient";

export const metadata: Metadata = {
  title: "Reserve a viewing — Southern Bridge City & Southern Bridge Estate",
  description: "Book a one-hour site tour at Southern Bridge City or Southern Bridge Estate in Idu, Abuja. Available Monday to Saturday.",
  alternates: { canonical: "/book-viewing" },
  openGraph: {
    title: "Reserve a viewing — Geodata",
    description: "Pick a time. Tour Southern Bridge City or Southern Bridge Estate in person.",
    url: "/book-viewing",
  },
};

export default function BookViewingPage() {
  return <BookViewingClient />;
}
