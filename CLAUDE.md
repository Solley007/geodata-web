# Geodata World Services website: migration handoff

Read this first. It is the context for moving geodata.com.ng off the Hercules platform (subscription overdue) to GitHub + Vercel, written at the end of a long editing session on 14 November 2026.

## Writing rule for this project

Never use em dashes in any copy, comments or messages for the owner (Suleiman). Use commas, colons, parentheses or separate sentences instead. Keep website copy plain, warm and human, not corporate.

## What was downloaded (Hercules Settings > Export)

1. **App code** (`.tar.gz`): the full source. Unpack it and use the unpacked folder as the repository root.
2. **Files library** (`.zip`): every photo and video from Hercules "Files & Media".
3. **Database export** (`.zip`, made 14 Nov 2026): Convex tables plus file storage (app uploads).

If the database zip is missing, the owner can re-download it from Hercules Settings > Export > Database > "Retry download" while the account still works.

## Stack

- React + Vite + TypeScript, react-router-dom, Tailwind v4, shadcn/ui, `motion` / `motion/react`, lucide-react, phosphor icons.
- Backend: **Convex** (production deployment `watchful-wombat-208`, `https://watchful-wombat-208.convex.cloud`, HTTP actions at `watchful-wombat-208.convex.site`). This is Hercules-managed and must be replaced with the owner's own Convex project.
- Package manager: pnpm (`pnpm-workspace.yaml` present).

## Migration plan (do in this order)

The owner already has a GitHub repo connected to Vercel (the older **Next.js** version of the site, deployed at `geodata-web-ruddy.vercel.app`). Reuse that repo and Vercel project, but on a **new branch**, because this Hercules export is a different app (Vite + React, not Next.js). Do not overwrite `main` or `features/wave-1` (the Production Branch) until the new version is verified.

1. **Repo, on a branch**:
   - Clone the existing repo (ask the owner for its URL if it is not already local) and tag the current state: `git tag nextjs-backup && git push origin nextjs-backup`.
   - `git checkout -b hercules-site`.
   - Remove the old files from the working tree but keep `.git` (for example `git rm -r -q .` then `git clean -fdx`), then copy the unpacked Hercules code into the repo root.
   - Make sure `.gitignore` covers `node_modules`, `dist`, `.env*`. Commit and `git push -u origin hercules-site`.
   - Add a `vercel.json` on this branch so Vercel builds it as Vite without changing the project-wide Next.js settings that `main` still uses:
     ```json
     {
       "framework": "vite",
       "installCommand": "pnpm install",
       "buildCommand": "pnpm build",
       "outputDirectory": "dist",
       "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
     }
     ```
   - Vercel will create a **Preview** deployment for the branch automatically. Add `VITE_CONVEX_URL` (and other env vars) in Vercel scoped to **Preview** first.
2. **Install and build locally**: `pnpm install`, then `pnpm build`. Fix anything that fails because of Hercules-only packages, scripts or env vars (see "Hercules dependencies" below).
3. **Own Convex project**: `npx convex dev` (log in, create a new project), then import data with `npx convex import --replace <database-export.zip>`. Check the tables (properties, inquiries, sales/purchase requests, users, settings, cms, partners, etc.) look right in the Convex dashboard.
4. **Env vars**: set `VITE_CONVEX_URL` to the new Convex URL locally and in Vercel. Also look for `VITE_GOOGLE_MAPS_API_KEY` (used by `StyledMap`, falls back to a plain embed without it) and any others listed in `vite-env.d.ts` or `.env*` examples.
5. **Images**: many images load from `https://hercules-cdn.com/file_...`. These may stop working when the subscription ends. Re-host the Files library (Cloudinary is already used for videos, account `drort9cs1`) and replace the URLs. In `src/pages/home/RealEstateLandingPage.tsx` there is a `V` map (filename to `file_...` id) plus `vimg()` and `CDN` used site-wide; updating that map and `CDN` handles a lot in one place. Also grep the whole repo for `hercules-cdn.com`.
6. **Auth**: replace the Hercules sign-in flow (look for `dev-preview-auth`, `auth.config.ts`, `src/pages/auth/Callback.tsx`, `Redirect.tsx`, any Hercules OIDC provider). Convex Auth or Clerk are good replacements. Admin pages (`/admin/*`) depend on this.
7. **Vercel go-live**: when the `hercules-site` preview works (homepage, properties, a listing, SBC page, mortgage, contact form, admin login), add the env vars for **Production** too, then merge `hercules-site` into `features/wave-1`. **Vercel's Production Branch is `features/wave-1`, not `main`** (the owner decided on 14 Nov 2026 to keep it that way). The `vercel.json` travels with it, so production builds as Vite. The old Next.js code stays recoverable from the `nextjs-wave-1-backup` tag (what production ran) and `nextjs-backup` (older `main`).
8. **Domain**: only when the production deployment is verified, point `geodata.com.ng` DNS to Vercel (add the domain in the Vercel project first). Resubmit the sitemap in Google Search Console afterwards.

## Phase 2: convert to Next.js (only after Phase 1 is live and stable)

Phase 1 above moves the site as it is (Vite + React). Once it is running on Vercel with the owner's own Convex project, convert it to **Next.js (App Router)** for per-page SEO and social previews, faster first load and image optimisation. Keep the Vite site live on `main` the whole time; do this work on a separate branch (`nextjs-v2`) and only switch production when it is complete and verified.

Two starting points; ask the owner which:

- **A. Port this Vite codebase to Next.js** (recommended if the old Next.js code is far behind). Create a Next.js app in the branch and move pages across.
- **B. Bring the improvements into the old Next.js repo** (the code saved under the `nextjs-backup` tag). This site was originally ported from it, so layouts may still match. Compare and carry over the content, features and fixes listed in this file.

Conversion checklist:

1. **Setup**: Next.js App Router, TypeScript, Tailwind v4 (reuse `src/index.css` tokens and the `html[data-site="public"]` overrides), shadcn/ui components copied over, `next/font` for the existing fonts.
2. **Routing**: map every route in `src/App.tsx` to `app/` folders (for example `/properties/[id]`, `/projects/[slug]`, `/southern-bridge-city`, `/mortgage`, `/updates`, `/faqs`, `/contact`, `/about`, `/services`, `/admin/*`). Keep the same URLs and existing redirects (`/mreif` to `/mortgage`, `/track-record` to `/projects`, `/blog/:slug` to `/news/:slug`) so Google rankings and shared links still work. Replace `react-router-dom` `Link`/`useParams`/`useLocation` with `next/link` and `next/navigation`.
3. **Convex**: use `convex/react` with a client `ConvexProvider` wrapper in the root layout. For public pages that matter for SEO (homepage, listings, projects), fetch data on the server with `fetchQuery` / `preloadQuery` from `convex/nextjs` so content and meta tags are in the HTML.
4. **SEO and previews**: replace the `useSeo` hook and `useJsonLd` with `generateMetadata` per page (title, description, Open Graph image from the listing's featured image). Add `app/sitemap.ts` and `app/robots.ts`. Keep the FAQPage JSON-LD on `/faqs`.
5. **Client-only parts**: mark interactive components with `"use client"` (Navbar mega menus and drawer, hero slider, `useReveal`/`motion` animations, mortgage calculator and quiz, reserve/mortgage dialog, maps, Cal.com booking, WhatsApp bar, admin pages). Anything touching `window`, `document` or `matchMedia` must stay client-side.
6. **Images and video**: use `next/image` for photos (configure `images.remotePatterns` for wherever the Files library is re-hosted, plus `res.cloudinary.com`). Keep `<video>` for Cloudinary videos and the YouTube embed.
7. **Auth and admin**: reuse whichever auth replaced Hercules in Phase 1 (Convex Auth or Clerk both support Next.js); protect `/admin` with middleware.
8. **Analytics and integrations**: GA tag `G-PS3LFR5890` via `next/script` (or `@next/third-parties`), Cal.com link `geodata/sbc-viewing`.
9. **Verify** at desktop and 390px mobile against the live Vite site, page by page, before switching production. Check shared-link previews with a link preview tool.
10. **Go live**: point Vercel's production branch at `nextjs-v2` (or merge it to `main`); remove the Phase 1 `vercel.json` Vite override since Vercel detects Next.js automatically.

## Hercules dependencies to find and remove/replace

Grep for: `hercules`, `__hercules`, `hercules-cdn.com`, `hercules-dev.com`, `dev-preview-auth`, `watchful-wombat-208`.

- `index.html` loads `/__hercules_visual_editor.js` (and possibly an iframe RPC script) in dev. Remove.
- Image CDN (see step 5).
- Auth (see step 6).
- Property share links use `https://watchful-wombat-208.convex.site/og/property?id=...` (in `src/pages/properties/_components/PropertyCard.tsx`); update to the new Convex site URL.
- Payments module exists (`geoPayments`, `paymentGateways`) but no provider is connected.

Keep: Google Analytics tag `G-PS3LFR5890` in `index.html`; Cal.com booking link `geodata/sbc-viewing` (`CAL_LINK`, `calProps`).

## Key files

- `src/App.tsx`: all routes. `/` renders `src/pages/Index.tsx`, which shows `RealEstateLandingPage` (or a Group directory page if a feature toggle is on).
- `src/pages/home/RealEstateLandingPage.tsx`: homepage (Hero slides, About, Developments strip, Stats, Featured homes, Image collage, Updates, MREIF, Services, Partner CTA). Also exports shared helpers (`vimg`, `useReveal`, `calProps`, `StyledMap`) and the redesign preview `HomeV2` (route `/home-v2`, not linked anywhere; owner has not decided whether to adopt it).
- `src/pages/home/_components/`: Navbar (TopBar, mega menus, mobile drawer, `SocialLinks`), Footer, WhatsAppButton (also the mobile sticky Call / WhatsApp / Book bar on listing and SBC pages).
- `src/pages/developments/page.tsx`: Southern Bridge City page, `MortgagePage` (`/mortgage`, `/mreif` redirects here), `UpdatesPage` (`/updates`), and shared data: `SBC_FLOOR_PLANS`, `SBC_SITE_UPDATES`, `SBC_VIDEOS`, `SBC_PLOTS`.
- `src/pages/properties/[id]/page.tsx`: listing page (hero video from `SBC_VIDEOS`, Live from site above tabs, floor plan, 2-step Reserve / Mortgage dialog).
- `src/pages/properties/_components/PropertyCard.tsx`: listing cards.
- `src/pages/track-record/page.tsx` (project data + Projects page) and `detail.tsx` (project detail page).
- `src/pages/services/faqs.tsx` (real FAQ page), `src/pages/contact/page.tsx`, `src/pages/about/page.tsx`, `src/pages/services/page.tsx`.
- `src/index.css`: global styles, mobile rules, `html[data-site="public"]` overrides.
- `convex/`: backend functions and schema.

## Content facts (keep consistent)

- Southern Bridge City (SBC), Idu, Abuja: 1,850+ homes, Phase 1 about 78% complete, 346 available. MREIF mortgage 9.75% fixed up to 20 years, 10% minimum deposit. 5% discount for outright payment.
- Prices: 2-bed flat N90M, 4-bed flats N130M, 4-bed terrace N150M, 4-bed semi N180M, 5-bed semi N220M, 6-bed terrace N220M.
- Listing videos (Cloudinary): 4-bed flats `4bof_Compressed_aejd6t.mp4`, 4-bed semi `4-BEDROOM_SEMI_2_Compressed_zanmsu.mp4`, 5-bed semi `4-BEDROOM_SEMI-DETACHED_2_Compressed_2_stjpwp.mp4`, 6-bed terrace `6-BEDROOM_TERRACE_Compressed_g9dplv.mp4`. No video yet for the 2-bed flats and 4-bed terrace.
- SBC page hero video: YouTube `eXc-gVe4nXU`. Homepage hero: `https://geodata-wsl.s3.us-east-1.amazonaws.com/Showcase.mp4`.
- Ize Hostel: Completed (completion year still unknown, page shows "Started 2025").
- Social: instagram.com/geodataworldservicesltd, facebook.com/GWCommsNG, youtube.com/@geodataworldservicesltd. Phone +234 704 762 0492, hello@geodata.com.ng, WhatsApp wa.me/2347047620492.
- Office: Plot 93, Cadastral Zone B10, Dakibiyu (Utako), Abuja. Contact page shows two slightly different versions of this address; unify it.

## Open items (not done yet)

- **Security (important before taking reservations online)**: several Convex public functions run without auth checks, including payment status updates (`gateway.updatePaymentStatus`), custom email sending, document generation, allocation mutations, open data reads, the verification lookup and role changes. Add auth/role checks, server-side validation, HTML sanitising and spam protection.
- Admin property form: the Description rich-text editor opens empty even when a description exists; typing in it replaces the saved text. Fix the editor's initial content loading.
- Size mismatches between listings and the SBC page (e.g. 4-bed flats 250 sqm vs 340 m2). Confirm correct values with the owner.
- "12 home types" claim vs 6 shown.
- Plot 7259 listed for two different homes in old data; unit counts removed from listing descriptions until confirmed.
- Mortgage calculator slider labels still say "Equity contribution" and "Mortgage tenor".
- Decide on `/home-v2` redesign (adopt or delete).
- Optional: self-host the SBC hero video (YouTube shows a play button on some iPhones).

## Working style the owner expects

- Make changes, verify them (desktop and 390px mobile), then report briefly.
- Ask before anything that changes live data or costs money.
- Plain, human wording on the site. No em dashes.
