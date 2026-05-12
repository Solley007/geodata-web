import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // ---------------------------------------------------------------------
      // Brand color tokens — Geodata
      // Primary navy is the anchor. Warm gold is rare and intentional.
      // Never reach for raw hex in components — always use these tokens.
      // ---------------------------------------------------------------------
      colors: {
        navy: {
          950: "#0A1628", // ink — body text on light surfaces
          900: "#0F2547", // primary — backgrounds, headlines, CTAs
          800: "#142E58", // hover state for primary
          700: "#1E3A6E", // raised surfaces on dark
          100: "#E8ECF3", // soft tint for subtle dark elements on light
        },
        bone: {
          DEFAULT: "#FAFAF7", // surface — main canvas, breathing room
          50: "#FCFCFA",
          100: "#F4F2EC",
          200: "#E8E4D9",
        },
        gold: {
          DEFAULT: "#C9A961", // accent — emphasis only, never decoration
          dark: "#A88B47",
          soft: "#E5D4A8",
        },
        ink: {
          DEFAULT: "#0A1628",
          muted: "#5C6B7E", // secondary text
          faint: "#94A0B0", // captions, metadata
        },
        hairline: "#E5E0D5", // single divider color, used everywhere
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Adobe Caslon Pro — used ONLY for the GEODATA. wordmark in navbar and footer
        brand: ["adobe-caslon-pro", "Georgia", "serif"],
      },
      fontSize: {
        // Editorial scale — generous on desktop, disciplined on mobile
        // clamp(MIN, FLUID, MAX) — MIN must fit within ~320px viewport
        // "Reimagining" (longest hero word) at 2.25rem in Fraunces ≈ 257px
        // which fits comfortably in 327px available at 375px screen width
        "display-xl": ["clamp(2.25rem, 8vw, 5.5rem)", { lineHeight: "0.95", letterSpacing: "-0.03em" }],
        "display-lg": ["clamp(2rem, 6vw, 4.5rem)", { lineHeight: "1", letterSpacing: "-0.025em" }],
        "display-md": ["clamp(1.75rem, 4vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        eyebrow: ["0.6875rem", { lineHeight: "1.5", letterSpacing: "0.18em" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        eyebrow: "0.18em",
      },
      transitionTimingFunction: {
        // The two easings we'll use throughout — refined, not bouncy
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
        smooth: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      transitionDuration: {
        400: "400ms",
        600: "600ms",
        800: "800ms",
        1200: "1200ms",
      },
    },
  },
  plugins: [],
};

export default config;
