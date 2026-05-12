import type { Metadata, Viewport } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import Script from "next/script";
import SmoothScrollProvider from "@/lib/SmoothScrollProvider";
import Navbar from "@/components/nav/Navbar";
import Footer from "@/components/shared/Footer";
import NavigationProgress from "@/components/shared/NavigationProgress";
import { ThemeProvider, themeScript } from "@/lib/ThemeProvider";
import FloatingActions from "@/components/shared/FloatingActions";
import Preloader from "@/components/shared/Preloader";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const SITE_URL = "https://geodata.com.ng";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  // Templated title — pages override the part before "|"
  title: {
    default: "Geodata World Services — Premium Real Estate in Abuja",
    template: "%s | Geodata World Services",
  },
  description:
    "Geodata World Services Limited develops investment-grade real estate in Abuja, Nigeria. Discover Southern Bridge City — 320 MREIF-eligible homes with 9.75% fixed-rate mortgage financing.",

  applicationName: "Geodata",
  authors: [{ name: "Geodata World Services Limited", url: SITE_URL }],
  creator: "Geodata World Services Limited",
  publisher: "Geodata World Services Limited",
  generator: "Next.js",

  // Search engine guidance
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Default Open Graph (page-specific OGs override this)
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: SITE_URL,
    siteName: "Geodata World Services",
    title: "Geodata World Services — Premium Real Estate in Abuja",
    description:
      "320 MREIF-eligible residences at Southern Bridge City, Idu. 9.75% fixed mortgage for 20 years.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Geodata World Services",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Geodata World Services — Premium Real Estate in Abuja",
    description: "320 MREIF-eligible residences at Southern Bridge City, Idu.",
    images: ["/api/og"],
    creator: "@geodataworldservices",
  },

  // Favicon set — covers all the major browser/OS use cases
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/icon-180.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },

  manifest: "/manifest.json",

  // Verification placeholders — fill these in when you set up Search Console
  verification: {
    // google: "your-google-search-console-token",
    // other: { "facebook-domain-verification": ["..."] },
  },

  // Canonical URL gets set per-page via alternates.canonical
  alternates: {
    canonical: SITE_URL,
  },

  // Format detection — prevents iOS auto-linking phone numbers in unexpected places
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

// Theme color appears in mobile browser chrome (the bar around the viewport)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0F2547" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* Adobe Fonts (Typekit) — Adobe Caslon Pro
            precedence prop is React 18 / Next 14 syntax that hoists this
            <link> to <head> automatically without a manual head tag */}
        <link
          rel="stylesheet"
          href="https://use.typekit.net/cvg7jux.css"
          // @ts-ignore — precedence is a React 18 attribute not yet in TS types
          precedence="default"
        />
        {/* Runs before page paint — prevents dark/light mode flash on load */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <ThemeProvider>
          <Preloader />
          <SmoothScrollProvider>
            <NavigationProgress />
            <Navbar />
            <main className="overflow-x-hidden">{children}</main>
            <Footer />
            <FloatingActions />
          </SmoothScrollProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
