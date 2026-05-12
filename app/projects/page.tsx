import type { Metadata } from "next";
import { PROJECTS } from "@/lib/projects-data";
import ProjectsListClient from "./ProjectsListClient";

export const metadata: Metadata = {
  title: "Projects",
  description: `${PROJECTS.length} projects across residential, commercial, institutional, and infrastructure work. Eighteen years of construction experience including federal government and Central Bank of Nigeria contracts.`,
  alternates: { canonical: "/projects" },
  openGraph: {
    title: "Projects — Geodata World Services",
    description: `${PROJECTS.length} projects across residential, commercial, institutional, and infrastructure work in Nigeria.`,
    url: "/projects",
    images: [
      {
        url: `/api/og?eyebrow=${encodeURIComponent("Projects")}&title=${encodeURIComponent("The body of work.")}&subtitle=${encodeURIComponent("Eighteen years of residential, commercial, institutional, and infrastructure work across Nigeria.")}`,
        width: 1200,
        height: 630,
        alt: "Geodata Projects",
      },
    ],
  },
};

export default function ProjectsListPage() {
  return <ProjectsListClient />;
}
