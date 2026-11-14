import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link } from "react-router-dom";
import Navbar from "../home/_components/Navbar.tsx";
import Footer from "../home/_components/Footer.tsx";
import WhatsAppButton from "../home/_components/WhatsAppButton.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useSeo } from "@/hooks/use-seo.ts";

const DEFAULT_CONTENT = `
<h2>Acceptance of Terms</h2>
<p>By accessing and using the Geodata World Services Limited website and services, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>

<h2>Use of Services</h2>
<p>You agree to use our services only for lawful purposes and in a manner that does not infringe the rights of others. You must not:</p>
<ul>
<li>Use our services for any fraudulent or illegal activity</li>
<li>Transmit any unsolicited or unauthorised advertising material</li>
<li>Attempt to gain unauthorised access to our systems</li>
<li>Reproduce or distribute any content from our website without written consent</li>
</ul>

<h2>Property Listings</h2>
<p>All property listings on our platform are provided for informational purposes. While we strive for accuracy, Geodata World Services Limited makes no representations or warranties regarding the completeness, accuracy, or reliability of any listing information. Prices and availability are subject to change without notice.</p>

<h2>Intellectual Property</h2>
<p>The content on this website, including text, graphics, logos, images, and software, is the property of Geodata World Services Limited and is protected by Nigerian and international copyright laws. You may not reproduce, modify, or distribute any content without our prior written permission.</p>

<h2>Limitation of Liability</h2>
<p>Geodata World Services Limited shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services. Our liability shall not exceed the amount paid by you for the specific service giving rise to the claim.</p>

<h2>Transactions and Payments</h2>
<p>All transactions conducted through Geodata World Services Limited are subject to our standard purchase agreement. We reserve the right to decline any transaction at our discretion. All payments are final and non-refundable unless otherwise specified in a written agreement.</p>

<h2>Dispute Resolution</h2>
<p>Any disputes arising from these terms shall be resolved through negotiation in good faith. If unresolved, disputes shall be submitted to arbitration under the rules of the Arbitration and Conciliation Act of Nigeria.</p>

<h2>Changes to Terms</h2>
<p>We reserve the right to modify these terms at any time. Continued use of our services after any changes constitutes your acceptance of the new terms.</p>

<h2>Contact Us</h2>
<p>For questions about these Terms of Service, contact us at: <a href="mailto:legal@geodata.com.ng">legal@geodata.com.ng</a></p>

<p><em>Last updated: January 2025</em></p>
`;

export default function TermsPage() {
  const raw = useQuery(api.cms.getSiteSettings, { key: "terms" });
  const html = raw ?? DEFAULT_CONTENT;

  useSeo({
    title: "Terms of Service | Geodata World Services",
    description: "Read the terms governing your use of Geodata World Services Limited's website, property listings, and real estate services.",
    canonicalPath: "/terms",
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
            <span className="text-white">Terms of Service</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Terms of Service
          </h1>
          <p className="text-blue-100 text-sm">Please read these terms carefully before using our services.</p>
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
