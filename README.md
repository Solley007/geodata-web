# Geodata World Services — Web

Editorial-luxury frontend for Geodata World Services Limited.
Next.js 14 (App Router) · TypeScript · Tailwind CSS · GSAP + ScrollTrigger · Lenis.

## What's built

| Route | Status | Notes |
|---|---|---|
| `/` | ✓ Phase 1 | Homepage — hero, scroll-locked image collage, stats counter, featured properties, MREIF section |
| `/properties/[slug]` | ✓ Phase 2 | Property detail — sticky sub-nav, spec grid, progress bar, scroll-spy ToC |
| `/properties` | ✓ Phase 3 | Listings — filterable grid of all residences |
| `/mortgage` | ✓ Phase 3 | MREIF programme page with interactive calculator + FAQs |
| `/contact` | ✓ Phase 3 | Editorial two-column contact form |
| `/blog` | ✓ Phase 4 | Journal index — featured post + filterable category grid |
| `/blog/[slug]` | ✓ Phase 4 | Markdown-rendered post with editorial typography, sticky meta, related posts |
| Mobile nav drawer | ✓ Phase 3 | Slides from right with full nav tree |
| Mobile section drawer | ✓ Phase 3 | Bottom sheet on property pages for jumping between sections |

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>. Try these routes:

- `/` — homepage
- `/properties` — listings
- `/properties/4-bed-semi-detached` — detail page
- `/mortgage` — MREIF page (try the calculator)
- `/contact` — contact form

## Brand system

| Token | Hex | Usage |
|---|---|---|
| `navy-950` | `#0A1628` | Ink/text on light surfaces |
| `navy-900` | `#0F2547` | Primary — backgrounds, CTAs, headlines |
| `bone` | `#FAFAF7` | Surface — main canvas |
| `bone-100` | `#F4F2EC` | Recessed surface |
| `gold` | `#C9A961` | Accent — emphasis only, never decoration |
| `hairline` | `#E5E0D5` | All dividers |

Two fonts:

- **Fraunces** — display serif, optical sizing tuned for editorial scale
- **DM Sans** — body and UI

All tokens are in `tailwind.config.ts`. Use semantic classes (`bg-navy-900`, `text-ink`) — never raw hex in components.

## Imagery — what to swap before launch

Search the codebase for `PLACEHOLDER`. Every spot is marked. You'll want to commission:

1. **Homepage hero** — drone shot of Southern Bridge City, Idu (`Hero.tsx`)
2. **Image collage** — 5 images: facade detail, interiors, street-level, master suite, aerial (`ImageCollage.tsx`)
3. **Featured properties** — 4 images, one per property type (`FeaturedProperties.tsx`)
4. **Mega menu** — 2 featured property images (`MegaMenu.tsx`)
5. **Property detail hero** — high-res hero image per property (`property-data.ts`)
6. **Property gallery** — 6 editorial shots per property (`property-data.ts`)
7. **Properties listing** — grid hero per property type (`properties-list.ts`)

Drop them into `/public/properties/` and update the `image` / `src` props.

## Mortgage calculator — verify before launch

`lib/mortgage.ts` has a `MREIF` config block at the top. Constants:

- Interest rate: 9.75% fixed
- Maximum tenor: 20 years
- Minimum equity: 10%

These are the publicly stated MREIF terms. **Verify with ARM Investment Managers** before launch:

- Whether there's a maximum loan size cap (₦50M is the figure in some MREIF documentation; we currently assume no cap)
- Whether the rate varies by income band
- Whether setup fees / stamp duty / insurance should be folded into the "true cost" line

The calculator is fully testable as-is — just adjust constants when you have authoritative figures.

## Contact form — wire to a backend

`components/contact/ContactForm.tsx` has a `handleSubmit` placeholder that simulates a network request. Replace with one of:

- **Resend + a Next.js API route** — best for full control, ~50 lines total
- **Formspree / Basin / Web3Forms** — drop-in, no backend needed
- **HubSpot / Pipedrive Forms API** — pushes directly into your CRM

The component contract stays the same. Just replace the body of `handleSubmit`.

## File structure

```
app/
├── layout.tsx                       Root layout, fonts, providers
├── page.tsx                         Homepage
├── globals.css                      Design tokens, base styles
├── properties/
│   ├── page.tsx                     Listings
│   └── [slug]/page.tsx              Property detail
├── mortgage/page.tsx                MREIF programme
└── contact/page.tsx                 Contact

components/
├── nav/
│   ├── Navbar.tsx                   Desktop nav + hamburger trigger
│   ├── MegaMenu.tsx                 Hover-triggered mega-menu
│   └── MobileNavDrawer.tsx          Right-side drawer
├── home/
│   ├── Hero.tsx
│   ├── ImageCollage.tsx
│   ├── StatsCounter.tsx
│   ├── FeaturedProperties.tsx
│   └── MreifSection.tsx
├── property/                        Property detail page
│   ├── PropertyHero.tsx
│   ├── StickySubNav.tsx             + mobile section drawer
│   ├── SpecGrid.tsx
│   ├── ProgressBar.tsx
│   ├── ScrollSpyContent.tsx         The masterpiece
│   └── PropertyEnquire.tsx
├── properties/                      Listings page
│   ├── PropertiesHeader.tsx
│   └── PropertyGrid.tsx
├── mortgage/                        MREIF page
│   ├── MortgageHero.tsx
│   ├── MortgageHowItWorks.tsx
│   ├── MortgageCalculator.tsx
│   └── MortgageEligibilityFaq.tsx
├── contact/
│   └── ContactForm.tsx
└── shared/
    ├── Footer.tsx
    └── animations/FadeUp.tsx

lib/
├── gsap.ts                          GSAP + ScrollTrigger registration
├── SmoothScrollProvider.tsx         Lenis ↔ ScrollTrigger bridge
├── ActiveSectionContext.tsx         Property-page active-section state
├── property-data.ts                 Single property record (sample)
├── properties-list.ts               All properties (listings page)
└── mortgage.ts                      Calculator math
```

## Animation philosophy

Motion punctuates, it doesn't perform. Two easings throughout:

- `power3.out` / `expo.out` — for entrances (decelerating)
- `cubic-bezier(0.22, 1, 0.36, 1)` — for hover states (editorial)

Lenis smooth-scroll is bridged into GSAP's ticker so ScrollTrigger fires against interpolated scroll, not native. This is the canonical pattern — without the bridge, animations desync on every scroll.

`gsap.context()` scopes selectors and gives automatic cleanup on unmount. Always used inside React components.

## Deferred to future phases

- About / company history page (needs proper imagery + brand storytelling)
- Investment-specific landing page (overlaps with MREIF — needs positioning conversation)
- Journal / blog (only valuable if actively published)
- Sales partner portal
- Allocation verification / revalidation
- Progress page with construction updates
- Dark mode pass (separate design exercise, not a switch flip)
- Real CMS hookup (Sanity / Payload / Contentful)
- Mapbox integration on property location section
- Real video walkthrough player
- Form submission backend (Resend / API route)

## Notes for future development

- The mega-menu uses hover. Add click/keyboard support before launch for a11y compliance.
- `useLayoutEffect` is used for all GSAP setup — gives correct measurements before paint.
- Lenis is configured with `syncTouch: false` so mobile uses native momentum.
- All scroll-triggered animations have `will-change` on transform/opacity targets.
- Property detail page uses React Context for the active section — both the sticky sub-nav and the scroll-spy ToC subscribe to the same source of truth.
- Contact form submission is currently a 1.2s simulated promise. Wire to a real backend before launch.
