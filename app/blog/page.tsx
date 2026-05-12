import type { Metadata } from "next";
import { getAllPostsMeta } from "@/lib/blog";
import BlogIndexClient from "./BlogIndexClient";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Notes on building, slowly. Construction updates, mortgage explainers, neighbourhood pieces, and occasional thoughts on the slow craft of building well.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Journal — Geodata World Services",
    description:
      "Construction updates, mortgage explainers, and notes on the slow craft of building well.",
    url: "/blog",
    type: "website",
    images: [
      {
        url: `/api/og?eyebrow=${encodeURIComponent("Journal")}&title=${encodeURIComponent("Notes on building, slowly.")}&subtitle=${encodeURIComponent("Construction updates, mortgage explainers, and the slow craft of building well.")}`,
        width: 1200,
        height: 630,
        alt: "Geodata Journal",
      },
    ],
  },
};

export default function BlogIndexPage() {
  const posts = getAllPostsMeta();
  return <BlogIndexClient posts={posts} />;
}
