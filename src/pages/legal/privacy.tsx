import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link } from "react-router-dom";
import Navbar from "../home/_components/Navbar.tsx";
import Footer from "../home/_components/Footer.tsx";
import WhatsAppButton from "../home/_components/WhatsAppButton.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";

const DEFAULT_CONTENT = `
<h2>Introduction</h2>
<p>Geodata World Services Limited ("we", "our", or "us") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.</p>

<h2>Information We Collect</h2>
<p>We may collect information about you in a variety of ways including:</p>
<ul>
<li><strong>Personal Data:</strong> Name, email address, phone number, and postal address provided when you make an inquiry, register, or contact us.</li>
<li><strong>Transaction Data:</strong> Details about transactions you carry out through our platform and services.</li>
<li><strong>Technical Data:</strong> Internet Protocol (IP) address, browser type and version, time zone setting, browser plug-in types, operating system and platform.</li>
</ul>

<h2>How We Use Your Information</h2>
<p>We use the information we collect or receive to:</p>
<ul>
<li>Facilitate the creation and management of your account</li>
<li>Process property inquiries and transactions</li>
<li>Send you property listings, market updates, and promotional material (with your consent)</li>
<li>Improve and personalise your experience on our platform</li>
<li>Comply with applicable laws and regulations</li>
</ul>

<h2>Sharing Your Information</h2>
<p>We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating our website and conducting our business, provided they agree to keep this information confidential.</p>

<h2>Data Security</h2>
<p>We implement a variety of security measures to maintain the safety of your personal information. Your information is stored on secure servers and is accessible only to authorised personnel.</p>

<h2>Your Rights</h2>
<p>You have the right to access, correct, or delete your personal data at any time. To exercise these rights, please contact us at <a href="mailto:hello@geodata.com.ng">hello@geodata.com.ng</a>.</p>

<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact us at: <strong>Geodata World Services Limited, Abuja, Nigeria.</strong></p>

<p><em>Last updated: January 2025</em></p>
`;

export default function PrivacyPage() {
  const raw = useQuery(api.cms.getSiteSettings, { key: "privacy" });

  const html = raw ?? DEFAULT_CONTENT;

  useSeo({
    title: "Privacy Policy | Geodata World Services",
    description: "How Geodata World Services Limited collects, uses, and protects your personal information when you visit our website or use our services.",
    canonicalPath: "/privacy",
  });

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <div className="bg-[var(--brand)] py-14 px-6 sm:px-10 lg:px-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-blue-200 text-sm mb-3">
            <Link to="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-white">Privacy Policy</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Privacy Policy
          </h1>
          <p className="text-blue-100 text-sm">How we collect, use, and protect your personal information.</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16">
        {raw === undefined ? (
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className={i % 3 === 0 ? "h-7 w-48" : "h-4 w-full"} />)}
          </div>
        ) : (
          <div
            className="prose prose-gray max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-[var(--brand)] prose-strong:text-gray-800"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
