import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { animate, inView, scroll, stagger } from "motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useSeo } from "@/hooks/use-seo.ts";
import { SBC_SITE_UPDATES, SBC_VIDEOS } from "@/pages/developments/page.tsx";
import Navbar from "./_components/Navbar.tsx";
import AboutSection from "./_components/AboutSection.tsx";
import ServicesSection from "./_components/ServicesSection.tsx";
import TestimonialsSection from "./_components/TestimonialsSection.tsx";
import PartnerCTASection from "./_components/PartnerCTASection.tsx";
import PartnersSection from "./_components/PartnersSection.tsx";
import TrustedPartnersStrip from "./_components/TrustedPartnersStrip.tsx";
import ContactSection from "./_components/ContactSection.tsx";
import Footer from "./_components/Footer.tsx";
import WhatsAppButton from "./_components/WhatsAppButton.tsx";
import PopNotification from "./_components/PopNotification.tsx";
import ComingSoon from "./_components/ComingSoon.tsx";

// ─────────────────────────────────────────────────────────────────────────────
// Shared kit for the public site (ported from the Next.js site)
//  - vimg(): maps the original /public image paths to the Hercules CDN copies
//  - useReveal(): scroll-triggered entrance animations (GSAP "from" equivalent)
//  - useScrub(): scroll-linked animations (GSAP ScrollTrigger scrub equivalent)
//  - useCounter(): number count-up when scrolled into view
//  - CAL_LINK / calProps: Cal.com booking pop-up
// ─────────────────────────────────────────────────────────────────────────────

const CDN = "https://hercules-cdn.com/";
// Uploaded copies of the original site's images, keyed by file name (Files & Media)
const V: Record<string, string> = {
  "Aerial-1.webp": "file_cZtLU2mOKjVYi5jbsteTRMAW",
  "Aerial-2.webp": "file_Dl8RCTaQnzZEROCsISu9OsPl",
  "Aerial-view-3.webp": "file_4kFFhHSrCkGMnCyvP3RkZZDR",
  "Cool.webp": "file_se8V55bQt68QWKFMMxxzgXa0",
  "DRONECC2.webp": "file_OvQyuyC90x3JwTKaqe5fwW5c",
  "DRONECC3.webp": "file_OQOCvukDiYl3BeUOuMf7SZLk",
  "DRONECC4.webp": "file_uJwKTZzL2jTFKqrSCey5Yu3H",
  "DRONECC5.webp": "file_zwHObgCYpp2q1Pt8YqTQHzV4",
  "DRONECC6.webp": "file_0qskw1Qp0b2oYXIgP2Hh1C2H",
  "DRONECC7.webp": "file_0X0T6BgOIfjR05taceGEg9xC",
  "DRONECC8.webp": "file_W4FNTlyxIzddCKfgS0yzT0OG",
  "Drone10.webp": "file_ukmUNNHq3nTSpgVlZmRfc56O",
  "SBC-poster.webp": "file_x5gqncvQqb9aj1ov3scmXVdj",
  "SBDrone2.webp": "file_PYK4bLPWjsDV6d8QBLxpRkeu",
  "SBDrone4.webp": "file_bHNZaRIqjn16LcnG9lFwDuQW",
  "SBDrone5.webp": "file_b1JQLZ366DpleeR88x0Ni3f8",
  "SBDrone6.webp": "file_J94btKsuTrf14E66lztLjkyy",
  "SBDrone7.webp": "file_SvzjpzFSjdbQOIL6hCEWJLHg",
  "SBDrone9.webp": "file_mE6Zqu8LBx6G7g27Z4llQc7R",
  "collage-1.webp": "file_g3Ht2dzHdoK4q3j0JDRTCzpF",
  "collage-2.webp": "file_Ej830JZ4zY7AHwXzARF4KzqX",
  "collage-3.webp": "file_GAKoiYkLZMj2TyL4Xm5Ksi5E",
  "collage-4.webp": "file_DJ5PczREpuFYrEy421Xa6XwP",
  "collage-5.webp": "file_qsBTIx0JhOzPYGTAdDH2sbSO",
  "construction-structure-cool-army-estate-1778773244315.webp": "file_rIL6wgzVWutzhSWd5UjlcMuP",
  "construction-structure-cool-army-estate-1778773244331.webp": "file_cvpvExbQbgj2l4f6X2DuBbvN",
  "firs-firs-office-during-renovation.webp": "file_xCrF1IOD962RZXwFMFf8qcSn",
  "firs-firs-office-renovation.webp": "file_iBm4QgK8tiZj55t1DFvHpTif",
  "firs-firs-warehouse-remodel.webp": "file_Q9Nj8fQ0weuLvzbzfps42zSy",
  "firs-glass-partitioning-tax-office.webp": "file_RwDCV88veMolWu1B1x7Kmvzo",
  "geodata-full-logo-white.png": "file_F2EJX6752cG5xkxzAvUU1uXN",
  "geodata-mark.png": "file_PRc6aBnrWNEealm9ciHt3yak",
  "ize-hostel-1-bed-view.webp": "file_4YYAGZk7oU1LOi0ZHrByqYfn",
  "ize-hostel-1-bed.webp": "file_cusfEC11zpF3rEZVq40nqf68",
  "ize-hostel-2-bed-view-1.webp": "file_hijuIXVrULSlbatI3HvrxR8J",
  "ize-hostel-2-bed-view.webp": "file_u1YoPFZY3hBFVEZAEPMMBZ5g",
  "ize-hostel-2-bed.webp": "file_NcGMCx48Wi4ZQ0WjaIUYQwgJ",
  "ize-hostel-3-bed-right-side.webp": "file_qEdB2oB2PguTzRPAau7aw849",
  "ize-hostel-3-bed-view.webp": "file_SShpZkDoVYPqGFybrtfRi0ea",
  "ize-hostel-3-bed.webp": "file_1HigtdWevGPw7fw1IpuzxQfl",
  "ize-hostel-3room-view.webp": "file_PSnWNHcuN8DZXeGjX6Wvrv0J",
  "ize-hostel-Air-conditioner.webp": "file_XHsNfebyKymtCcaXOBFVZ96g",
  "ize-hostel-Block-C-view.webp": "file_SWoYXlw4xujZUffyCekph4yt",
  "ize-hostel-Block-C.webp": "file_bwWtl6dFSuC63merkwaXjnyX",
  "ize-hostel-Block-d.webp": "file_qMtqm1HG6LUXsGlHrI5u7D54",
  "ize-hostel-Exterior.webp": "file_bXUZkjGORuYZV7Wc0kUVh0L1",
  "ize-hostel-block-a-sign.webp": "file_YNcQX8SBpr4J5eQyTAAEQUJf",
  "ize-hostel-block-b.webp": "file_sG6vD03iYJB8eNHvERQ1ARnG",
  "ize-hostel-block-c-d.webp": "file_0F2SiaTAkHZkuk5ZvZ15M7oM",
  "ize-hostel-common-area-exterior.webp": "file_ACdOqG2tt2JoRuhrBAzQu8fS",
  "ize-hostel-common-area-roof.webp": "file_rPsKp9hwSV1ppjlryrkskG0H",
  "ize-hostel-common-area-showing-pool.webp": "file_EUATEuJTaPblK7xT4iQQJLjp",
  "ize-hostel-common-area-space.webp": "file_agD7N05mGzCDad9uAwhLxnu9",
  "ize-hostel-common-area.webp": "file_mqRMApONulaePCwy03Ll4kd6",
  "ize-hostel-heater.webp": "file_i2ljP3u5PIgKfxoRw2JgrYrm",
  "ize-hostel-ping-pong.webp": "file_9tMfrIuROW8np1WTEIsmBj1K",
  "ize-hostel-pool.webp": "file_K0LxPOZv4GolY7D13fXyg8y4",
  "ize-hostel-shower.webp": "file_ADnz8IZfe6ceFHoX5Vv9t17d",
  "ize-hostel-stool.webp": "file_jJhSNmmKyaiqcezOZDk6OEmt",
  "ize-hostel-toilet.webp": "file_9TKYcOsB1QUDnFSSX2g5Tzyv",
  "ize-hostel-walk-area.webp": "file_KlAZOYjI8pcuN4AgiIMGBrg2",
  "ize-hostel-wardrobe-space.webp": "file_fWHZB4M6RRVMMz0oq78G5ZUR",
  "ize-hostel-wash.webp": "file_pzH6lCnQNlXizyn1B3V6Iqa8",
  "ize-hostel-washer.webp": "file_hOlT2aLTTF2HpAEiEO1EX3LD",
  "kogi-admin-block-construction.webp": "file_5pAeXayCgjxIjt65XX6FKGgP",
  "kogi-admin-block.webp": "file_mP0LTP3CuujKIUru8XXfL3r3",
  "kogi-asphalt-paver.webp": "file_Sd9rEMhAAY8nIp0FlaejKdvL",
  "kogi-bridge-approach-earthworks.webp": "file_3U3Ig8VpI4DDqWYMAKRExC4d",
  "kogi-completed-village-drainage.webp": "file_9DJHlrXlfR4tjEAhXtanz5V1",
  "kogi-freshly-paved-road.webp": "file_cMCQaJ6VhqqIoZxRkKODN5hK",
  "kogi-lockup-shop-row.webp": "file_PznY9iJcpR1oh7gG43u0CuKP",
  "kogi-market-foundation.webp": "file_Cu86GJTd3PgzZKbM4wlgQymF",
  "kogi-night-asphalt-crew.webp": "file_4Ae6QoBm2RwlrjBNRghK7Pda",
  "kogi-open-shed-a.webp": "file_vWq8tCwjvzKbDYxRIFpG51X3",
  "kogi-open-shed-b-1.webp": "file_JGQlOcOFaVrDh0wLNtFcdYlA",
  "kogi-processing-1.webp": "file_ZguEs3RCDvOMuJsmXrq4whvu",
  "kogi-road-inspection-officials.webp": "file_L83vD0SRuqArPGHAc5UTmlis",
  "kogi-road-roller.webp": "file_OJjuQodb5X2k3rqEwYBTCxXC",
  "kogi-warehouse.webp": "file_kTUI4ymThnw265HMgd1lHtAL",
  "mabushi-building-frame-aerial.webp": "file_Z3j1XllnDWzklrLHKgtIeTGS",
  "mabushi-roadside-building-aerial.webp": "file_RZVkUyXehiTmNLI9CEeT4yrJ",
  "mabushi-scaffolded-building-aerial.webp": "file_RvAgPS3fv1wz6oeO45ZRN770",
  "mreif-logo.png": "file_fREIKR9UGlSs9ERDMHPtdqOa",
  "properties-4-bed-semi-detached.webp": "file_WlDh4xcIezYvJLiGM7QThEkN",
  "properties-4-bed-terrace.webp": "file_HboSc5H0BTD179Pj0nvo4dKx",
  "properties-5-bed-semi-detached.webp": "file_D00wRg5gCDWK8Mk9Y5RZS4WV",
  "properties-6-bed-terrace.webp": "file_Q0I9buU5mzOQprOP4nJfzBYm",
  "properties-SBE-SBE-1.webp": "file_XfsSXK2HV0ZaMqh7cZrYjNxK",
  "properties-SBE-SBE-COMPLETE-2.webp": "file_cYdc3QKA30bf2Z8dSCsPrWWK",
  "properties-SBE-SBE-TERRACE.webp": "file_GNbMrxwZGfor8gOVoatUFfNO",
  "properties-SBE-SBE-VIEWS.webp": "file_6VBCfBpuMcmBAHu4CbWn7Msy",
  "properties-SBE-SBE0.webp": "file_mElyMb4xdvb19DZhHDhYsEJD",
  "properties-SBE-SBE7.webp": "file_ZyK13RyPVXM1F3hsnCvVcTZ0",
  "screenshot-1c73e349-6174-48ac-b4ba-3d63e4efe4de.png": "file_e7KK3CGY4Hh2d2MbKAkOU77w",
  "screenshot-2f1240d1-9474-4d22-9b25-676c386b2ea7.png": "file_URb0AvLNXdfQ1lS63iENSzFM",
  "screenshot-3b57e20b-d4c4-4006-ba73-224b2f3733c8.png": "file_ED2o7OxRgxshBgx7s1LPJkzU",
  "screenshot-4168f86b-a612-44d2-9c0c-bcacfb646714.png": "file_KxAQCHrV2LWKairiwEQ3gi70",
  "screenshot-446167df-66dd-44ba-aa72-122db1c5db4c.png": "file_VefDfuiii9dcyXb0z09Nyea0",
  "screenshot-4471682d-edd0-4d6b-99c3-a2e18c63e224.png": "file_0AYTyXPxWRPd0iv6jMEQ0GwM",
  "screenshot-4b856136-037c-41e5-bad4-825c798317c2.png": "file_uLnyiFZhFSjkLqFZ0id5Mkje",
  "screenshot-4c903050-ae6a-4b15-b1d0-27cd0c97457b.png": "file_7liKlkeIIveNFnrZpwWoeDT6",
  "screenshot-4f957df2-f3ce-45d2-8206-b83d2a220f70.png": "file_egrPt5hRCMizT1IPNy7Aff31",
  "screenshot-53dc9b68-b736-4603-8566-e0f342c07dba.png": "file_tc6fDraZrsbuAdlTiWvfTtA6",
  "screenshot-7a5d2c10-b58f-4df0-8621-0b91d184515a.png": "file_56tlO7OgRQtKLzQmfhUawdgY",
  "screenshot-7a7b2d57-441f-4985-87cd-05fda6d92c77.png": "file_zZye1g7RVopUFGugidPAywO8",
  "screenshot-7e42c38e-87ad-482f-9a92-96f806f66b13.png": "file_UPwJZ7F4Td6GIzb7UTNC5usg",
  "screenshot-89c1dd59-903d-4aea-9c4d-6d3c7a6c7e92.png": "file_FYZN6P6j7odNqTiEhZSvj7qb",
  "screenshot-8df0d188-7b68-4b48-9421-1f4803473c5b.png": "file_9f1UF301sLFFcV1ocVVIbOCy",
  "screenshot-964f7160-2fef-492d-a391-00bd28acf274.png": "file_r0NvdnKxmRhwx4lP6KpNgfGc",
  "screenshot-9fe41e95-2775-4329-bd1a-700162be5699.png": "file_3QjXnHCWW0i0BZlyH0qpzwoo",
  "screenshot-a01cd2b1-88e2-462a-b934-cfe7852ccf66.png": "file_7FJXexnFeSxtTkdOpaO673OD",
  "screenshot-a1b7e752-eb9f-4dd2-9c9e-b80caafbe48a.png": "file_c1xMU9qz9UanUPhcUBouHh37",
  "screenshot-a1f6925b-ad16-4d79-a592-5800ce22d837.png": "file_SiOsWPW5w3BT0N55RuUsCIzk",
  "screenshot-a22c05e6-9bfc-4ca4-955d-3a3ef6a67fdb.png": "file_u90n66DMAXULpC7p4aFYzjfP",
  "screenshot-a29b5223-5dbb-4c79-a115-4f7d7e5ea445.png": "file_Y6QiXjn7RQ91HGB7ldpgubE3",
  "screenshot-aa1f6de0-0910-4c9c-9fe5-b24e8ca24f33.png": "file_Qa5BxVCAdcl7ZlaeGovLpKYL",
  "screenshot-b06fda46-b9d4-4869-93de-9feca9c74c27.png": "file_paI64UTG0VeYgFpbp3m4iMe4",
  "screenshot-e0910bba-6388-4093-88a5-9e45b463ecad.png": "file_G5ALFpPbCmVD9K4WVngciPXQ",
  "screenshot-e5295923-a8c9-49ab-afbf-3587436c1fc6.png": "file_CWk5l0iy5iS1y7zCzUlBICPQ",
  "screenshot-fe5db242-8f26-4842-b757-b346d0b98d0b.png": "file_toX23xeIDi1RPm1LvMgT5CV5",
  "sil-sil-estate-access-road.webp": "file_YZiv493TPaWMDLVTLNOiyMBH",
  "sil-sil-estate-area-view.webp": "file_XFy1FwPGsYbIV5XD7SVfLPIc",
  "sil-sil-estate-bridge-construction.webp": "file_hawjbjer4cK0y4d529oAo84Q",
  "sil-sil-estate-construction-site.webp": "file_gXiSdniYJjhKHodgzQIemiYY",
  "sil-sil-estate-overview.webp": "file_ZyMONAO2W3PdpOAbl5Lew0Y3",
  "workers-geodata.webp": "file_31RfR5ziN0YgxjN3eCvBvB31",
};

/** Name an original /public image was uploaded under, e.g. "/ize-hostel/Exterior.JPG" → "ize-hostel-Exterior.webp". */
function uploadedName(path: string): string {
  const base = path
    .replace(/^\/+/, "")
    .replace(/[^A-Za-z0-9.-]+/g, "-")
    .replace(/\./g, "-")
    .replace(/-(jpg|jpeg|png|webp)$/i, "");
  const keepPng = /\.png$/i.test(path) && /(logo|mark)/i.test(path);
  return base + (keepPng ? ".png" : ".webp");
}

/** Original site image path → hosted copy. Unknown paths pass through. */
export function vimg(path: string): string {
  const id = V[uploadedName(path)];
  return id ? CDN + id : path;
}

/** Cal.com booking link used by every "Book a viewing" button. */
export const CAL_LINK = "geodata/sbc-viewing";
/** Spread onto any button or link to open the Cal.com booking pop-up. */
export const calProps = {
  "data-cal-link": CAL_LINK,
  "data-cal-config": '{"layout":"month_view"}',
} as const;

// GSAP easings expressed as cubic-bezier curves
export const EASE_OUT3: [number, number, number, number] = [0.215, 0.61, 0.355, 1]; // power3.out
export const EASE_OUT2: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]; // power2.out

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type From = { x?: number; y?: number; opacity?: number; scale?: number; scaleX?: number };
export type RevealSpec = {
  /** CSS selector inside the root, or "self" for the root element itself */
  sel: string;
  from: From;
  duration?: number;
  stagger?: number;
  delay?: number;
  /** Selector for the element that triggers the animation (default: root) */
  trigger?: string;
  /** Viewport position (percent from top) where the trigger fires, like GSAP "top 80%" */
  start?: number;
  /** Run on mount instead of on scroll (page headers) */
  immediate?: boolean;
  /** transform-origin for scaleX rules */
  origin?: string;
};

function keyframes(from: From, motionOk: boolean) {
  const k: Record<string, [number, number]> = { opacity: [from.opacity ?? 0, 1] };
  if (!motionOk) return k;
  if (from.x !== undefined) k.x = [from.x, 0];
  if (from.y !== undefined) k.y = [from.y, 0];
  if (from.scale !== undefined) k.scale = [from.scale, 1];
  if (from.scaleX !== undefined) {
    k.scaleX = [from.scaleX, 1];
    delete (k as Record<string, unknown>).opacity;
  }
  return k;
}

/** Scroll-triggered entrance animations, the equivalent of gsap.from + ScrollTrigger. */
export function useReveal(ref: RefObject<HTMLElement | null>, specs: RevealSpec[], deps: unknown[] = []) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const motionOk = !reduced();
    const stops: (() => void)[] = [];
    for (const s of specs) {
      const els = (s.sel === "self" ? [root] : Array.from(root.querySelectorAll<HTMLElement>(s.sel)));
      if (els.length === 0) continue;
      const kf = keyframes(s.from, motionOk);
      if (s.origin) els.forEach((el) => (el.style.transformOrigin = s.origin!));
      // Put elements in their "from" state straight away
      const initial: Record<string, number> = {};
      for (const [k, v] of Object.entries(kf)) initial[k] = v[0];
      animate(els, initial, { duration: 0 });
      const run = () =>
        animate(els, kf, {
          duration: motionOk ? s.duration ?? 0.9 : 0.4,
          ease: EASE_OUT3,
          delay: stagger(s.stagger ?? 0, { startDelay: s.delay ?? 0 }),
        });
      if (s.immediate) {
        run();
        continue;
      }
      const trigger = s.trigger ? root.querySelector(s.trigger) ?? root : root;
      const bottom = 100 - (s.start ?? 80);
      let stop: (() => void) | undefined;
      stop = inView(
        trigger,
        () => {
          run();
          stop?.();
        },
        { margin: `0px 0px -${bottom}% 0px` as never },
      );
      stops.push(() => stop?.());
    }
    return () => stops.forEach((f) => f());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Scroll-linked (scrubbed) animation of one element, like ScrollTrigger scrub. */
export function useScrub(
  ref: RefObject<HTMLElement | null>,
  build: (root: HTMLElement) => (() => void)[] | void,
  deps: unknown[] = [],
) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reduced()) return;
    const cleanups = build(root) || [];
    return () => cleanups.forEach((f) => f());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Helper for useScrub: animate `el` between keyframes as `target` crosses the viewport. */
export function scrubTo(
  el: Element,
  kf: Record<string, (number | string)[]>,
  target: Element,
  offset: [string, string] = ["start end", "end start"],
) {
  return scroll(animate(el, kf as never, { ease: "linear" }), { target, offset: offset as never });
}

/** Count-up numbers (elements with data-value) when they scroll into view. */
export function useCounter(ref: RefObject<HTMLElement | null>, selector = ".stat-number", duration = 2.2) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const stops: (() => void)[] = [];
    root.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      const target = parseFloat(node.dataset.value ?? "0");
      const decimals = parseInt(node.dataset.decimals ?? "0", 10); node.textContent = target.toFixed(decimals);
      if (reduced()) {
        node.textContent = target.toFixed(decimals);
        return;
      }
      let stop: (() => void) | undefined;
      stop = inView(
        node,
        () => {
          animate(0, target, {
            duration,
            ease: EASE_OUT2,
            onUpdate: (v) => (node.textContent = v.toFixed(decimals)),
          });
          stop?.();
        },
        { margin: "0px 0px -20% 0px" },
      );
      stops.push(() => stop?.());
    });
    return () => stops.forEach((f) => f());
  }, [ref, selector, duration]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero slideshow
// ─────────────────────────────────────────────────────────────────────────────

type HeroSlide = {
  type: "video" | "image";
  videoUrl?: string;
  videoPoster?: string;
  image?: string;
  eyebrow: string;
  headline: string;
  subheadline?: string;
  cta1?: { label: string; href: string };
  cta2?: { label: string; href: string };
  duration?: number;
};

const HERO_SLIDES: HeroSlide[] = [
  {
    type: "video",
    videoUrl: "https://geodata-wsl.s3.us-east-1.amazonaws.com/Showcase.mp4",
videoPoster: "https://hercules-cdn.com/file_Hrz0DYCfu4HHzAKLf0iGO40r",
    eyebrow: "Southern Bridge City, Phase One",
    headline: "A new\naddress\nfor Abuja.",
subheadline: "Homes from ₦90M at Idu, Abuja. Spread the cost over up to 20 years with a 9.75% fixed mortgage.",
    cta1: { label: "Explore residences", href: "/southern-bridge-city" },
    cta2: { label: "View construction progress", href: "/updates" },
    duration: 8000,
  },
  {
    type: "image",
    image: "/collage-2.jpg",
    eyebrow: "Southern Bridge Estate, Jabi, Abuja",
    headline: "Nine residences.\nReady now.",
subheadline: "Two ready to move into. Seven at finishing stage. All inside a gated estate in Jabi.",
    cta1: { label: "View available units", href: "/projects/southern-bridge-estate" },
  },
  { type: "image", image: "https://hercules-cdn.com/file_xDJ2uZYE9PtHFnFwfZ7sb5cX", eyebrow: "Country Court Estate, Abuja", headline: "Twenty-four homes.\nDelivered.", subheadline: "A mixed housing estate with full infrastructure, completed in 2022.", cta1: { label: "View the project", href: "/projects/country-court-estate" } }, { type: "image", image: "https://hercules-cdn.com/file_hzbEBxtKSk6rU7pzzbdU1GFj", eyebrow: "SIL Estate, Abuja", headline: "180+ homes.\nDelivered.", subheadline: "More than 180 residences with full estate infrastructure, completed in 2015.", cta1: { label: "View the project", href: "/projects/sil-estate" } },
  {
    type: "image",
    image: "/ize-hostel/Exterior.JPG",
    eyebrow: "Ize Hostel, Jabi, Abuja",
    headline: "Built for\nstudents.",
    subheadline:
      "23 rooms. 50 bed spaces. Designed around how students actually study, rest, and live, minutes from Nile and Baze.",
    cta1: { label: "Explore the hostel", href: "/projects/ize-hostel" },
  },
  {
    type: "image",
    image: "/Cool.png",
    eyebrow: "Cool Army Estate, Owerri, Imo State",
    headline: "Twenty homes.\nUnder way.",
    subheadline: "A 20-residence estate in Owerri, designed and being built by Geodata on behalf of Cool Real Estate.",
    cta1: { label: "See the estate", href: "/projects/cool-army-estate" },
  },
];

const DEFAULT_DURATION = 6000;

function Hero() {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const pausedAtRef = useRef(0);

  const slide = HERO_SLIDES[current];
  const total = HERO_SLIDES.length;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    startRef.current = Date.now() - pausedAtRef.current;
    const dur = slide.duration ?? DEFAULT_DURATION;
    timerRef.current = setInterval(() => {
      const p = Math.min(((Date.now() - startRef.current) / dur) * 100, 100);
      setProgress(p);
      if (p >= 100) {
        pausedAtRef.current = 0;
        setCurrent((c) => (c + 1) % total);
      }
    }, 50);
  }, [slide, total]);

  useEffect(() => {
    if (!paused) startTimer();
    else {
      if (timerRef.current) clearInterval(timerRef.current);
      pausedAtRef.current = Date.now() - startRef.current;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, startTimer]);

  useEffect(() => {
    setProgress(0);
    pausedAtRef.current = 0;
  }, [current]);

  // Text entrance on mount and on every slide change
  useLayoutEffect(() => {
    if (!textRef.current) return;
    const els = textRef.current.querySelectorAll(".slide-anim");
    if (reduced()) return;
    animate(els, { opacity: [0, 1], y: [24, 0] }, { duration: 0.7, delay: stagger(0.08, { startDelay: 0.1 }), ease: EASE_OUT3 });
  }, [current]);

  function goTo(i: number) {
    if (i === current) return;
    pausedAtRef.current = 0;
    setCurrent(i);
  }

  return (
    <section
      className="relative w-full md:h-svh md:min-h-[680px] bg-navy-950 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative w-full aspect-[4/3] md:absolute md:inset-0 md:aspect-auto md:h-full">
        {HERO_SLIDES.map((s, i) => (
          <SlideBackground key={i} slide={s} active={i === current} />
        ))}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-b from-navy-950/55 via-navy-950/40 to-navy-950/85 pointer-events-none z-[2]" />
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-navy-950/55 via-navy-950/20 to-transparent pointer-events-none z-[2]" />
      </div>

      <div className="relative z-10 container-editorial pt-6 pb-8 md:absolute md:inset-0 md:flex md:h-full md:flex-col md:justify-end md:pt-32 md:pb-24">
        <div ref={textRef} className="max-w-5xl">
          <p className="slide-anim eyebrow !text-white mb-2 md:mb-6">{slide.eyebrow}</p>
          <h1 className="text-[1.875rem] md:text-display-xl font-display text-bone tracking-tightest leading-[1.1] md:leading-none font-light">
            {slide.headline.split("\n").map((line, i) => (
              <span key={i} className="block overflow-hidden">
                <span className={`slide-anim block${i === 1 ? " italic font-light" : ""}`}>{line}</span>
              </span>
            ))}
          </h1>
          {slide.subheadline && (
            <p className="slide-anim mt-4 md:mt-8 max-w-xl text-sm md:text-lg text-bone/80 leading-relaxed">{slide.subheadline}</p>
          )}
          <div className="slide-anim mt-5 md:mt-10 flex flex-wrap items-center gap-4">
            {slide.cta1 && (
              <a
                href={slide.cta1.href}
                className="inline-flex items-center gap-3 bg-bone px-7 py-4 text-sm font-medium text-navy-900 hover:bg-coral-soft transition-colors duration-400"
              >
                {slide.cta1.label} <span aria-hidden>→</span>
              </a>
            )}
            {slide.cta2 && (
              <a
                href={slide.cta2.href}
                className="inline-flex items-center gap-3 border border-bone/30 px-7 py-4 text-sm font-medium text-bone backdrop-blur-sm hover:border-bone hover:bg-bone/10 transition-colors duration-400"
              >
                {slide.cta2.label}
              </a>
            )}
          </div>
        </div>

        <div className="mt-6 md:mt-14 flex items-center justify-end gap-8 border-t border-bone/15 pt-3 md:pt-6">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Slide ${i + 1}`}
                  className="group relative h-0.5 w-12 bg-bone/25 overflow-hidden cursor-pointer"
                >
                  {i === current ? (
                    <span className="absolute inset-y-0 left-0 bg-bone" style={{ width: `${progress}%` }} />
                  ) : i < current ? (
                    <span className="absolute inset-0 bg-bone/60" />
                  ) : null}
                </button>
              ))}
            </div>
            <p className="text-[11px] uppercase tracking-eyebrow text-bone/50 hidden md:block tabular-nums">
              {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => goTo((current - 1 + total) % total)}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center text-bone/60 hover:text-bone transition-colors opacity-0 hover:opacity-100 focus:opacity-100 cursor-pointer"
        aria-label="Previous slide"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => goTo((current + 1) % total)}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center text-bone/60 hover:text-bone transition-colors opacity-0 hover:opacity-100 focus:opacity-100 cursor-pointer"
        aria-label="Next slide"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </section>
  );
}

function SlideBackground({ slide, active }: { slide: HeroSlide; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else v.pause();
  }, [active]);

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-[1000ms] ease-in-out ${
        active ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
      }`}
    >
      {slide.type === "video" && slide.videoUrl ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          poster={slide.videoPoster ? vimg(slide.videoPoster) : undefined}
          preload="metadata"
className="absolute inset-0 h-full w-full object-cover object-[center_60%] md:object-center"
        >
          <source src={slide.videoUrl} type="video/mp4" />
        </video>
      ) : slide.image ? (
        <img
          src={vimg(slide.image)}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-[center_60%] md:object-center"
        />
      ) : null}
    </div>
  );
}


// "About Geodata" band with mission and vision, ported from the Next.js site's BriefAboutUs.
const ABOUT = {
manifesto: "We have been building homes in Nigeria since 2007.", mission: "We deliver trusted real estate services that prioritize client satisfaction, quality developments and long-term value guided by ethics, expertise and innovation. Our team approaches every project with meticulous planning, market insight and a commitment to excellence, ensuring that each development is both impactful and sustainable.", vision: "To create enduring homes and vibrant communities, built on integrity and high-quality standards, where people thrive and prosper.",
  values: ["Integrity", "Innovation", "Excellence", "Teamwork", "Exceptional quality", "Client-centric"],
};

function BriefAboutUs() {
  const root = useRef<HTMLElement>(null);
  useReveal(root, [
    { sel: ".about-fade", from: { y: 28 }, duration: 0.9, stagger: 0.08, start: 75 },
    { sel: ".about-rule", from: { scaleX: 0 }, duration: 1.2, start: 75, origin: "left center" },
  ]);

  return (
    <section ref={root} id="about" className="relative py-8 md:py-10 overflow-hidden">
      <img
        src={vimg("/workers-geodata.jpg")}
        alt="Geodata team reviewing construction drawings on site"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-navy-950/70" />

      <div className="relative z-10 container-editorial">
        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-4 about-fade">
            <p className="eyebrow !text-white mb-5">About Geodata</p>
            <div
              role="img"
              aria-label="Geodata World Services Limited"
              className="block w-full max-w-[300px] aspect-[2396/907] bg-no-repeat mb-6"
              style={{
                backgroundImage: `url(${vimg("/geodata-full-logo-white.png")})`,
                backgroundSize: "166.94% auto",
                backgroundPosition: "41.46% 56.36%",
              }}
            />
          </div>

          <div className="col-span-12 lg:col-span-8">
            <h2 className="about-fade text-display-lg font-display text-bone tracking-tightest leading-[1.05] mb-10 font-light">
              {ABOUT.manifesto}
            </h2>
            <div className="about-rule h-px w-full bg-bone/25 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="about-fade">
                <p className="eyebrow !text-white mb-5">Mission</p>
                <p className="text-lg leading-relaxed text-bone/80">{ABOUT.mission}</p>
              </div>
              <div className="about-fade">
                <p className="eyebrow !text-white mb-5">Vision</p>
                <p className="text-lg leading-relaxed text-bone/80">{ABOUT.vision}</p>
              </div>
            </div>
            <div className="about-fade mt-10 flex items-center gap-6 flex-wrap">
              <Link
                to="/about"
                className="inline-flex items-center gap-3 bg-bone px-7 py-4 text-sm font-medium text-navy-950 hover:bg-coral-soft transition-colors duration-400"
              >
                More about Geodata <span aria-hidden>→</span>
              </Link>
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 text-sm font-medium text-bone hover:text-coral-soft transition-colors duration-400 pb-1 border-b border-bone/40 hover:border-coral-soft"
              >
See our projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


// Homepage sections ported from the Next.js site:
//   DevelopmentsStrip (default export), FeaturedResidences, ImageCollage,
//   HomeUpdates and MreifSection.

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

/** Where a project slug from the old site lives on this site. */
function projectHref(slug: string) {
  return slug === "southern-bridge-city" ? "/southern-bridge-city" : `/projects/${slug}`;
}

// ─── Developments strip ──────────────────────────────────────────────────────

type SalesStatus = "Available" | "Limited" | "Sold Out" | "Selling Soon";

const DEVELOPMENTS: { slug: string; name: string; location: string; description: string; image: string; status?: SalesStatus }[] = [
  {
    slug: "southern-bridge-city",
    name: "Southern Bridge City",
    location: "Idu, Abuja",
    description: "1,850+ residences across 12 typologies. MREIF-eligible mortgages from 9.75% fixed.",
    image: "/SBC-poster.png",
    status: "Available",
  },
  {
    slug: "southern-bridge-estate",
    name: "Southern Bridge Estate",
    location: "Jabi, Abuja",
description: "27 semi-detached and terraced homes in a gated estate. 9 still available.",
    image: "/SBDrone4.webp",
status: "Limited",
  },
  {
    slug: "country-court-estate",
    name: "Country Court Estate",
    location: "Abuja",
    description: "24 homes across three typologies. Delivered, sold, fully occupied.",
    image: "https://hercules-cdn.com/file_xDJ2uZYE9PtHFnFwfZ7sb5cX",
    status: "Sold Out",
  },
  {
    slug: "ize-hostel",
    name: "Ize Hostel",
    location: "Jabi, Abuja",
    description: "23 rooms and 50 bed spaces, purpose-built for Nile and Baze students.",
    image: "/ize-hostel/Exterior.JPG",
status: "Delivered",
  },
  {
    slug: "cool-army-estate",
    name: "Cool Army Estate",
    location: "Owerri, Imo State",
    description: "20 residences across five typologies in Owerri. Built for Cool Real Estate.",
    image: "https://hercules-cdn.com/file_a0vz1fXHfhZ6aIknWcCC6HjK",
  },
];

function statusPillStyle(status: SalesStatus): string {
  const base = "inline-flex items-center px-3 py-1.5 backdrop-blur-sm";
  switch (status) {
    case "Available": case "Delivered": case "Ongoing":
      return cx(base, "bg-bone/95 text-navy-900");
    case "Limited":
      return cx(base, "bg-coral/95 text-bone");
    case "Selling Soon":
      return cx(base, "bg-navy-950/85 text-coral");
    case "Sold Out":
      return cx(base, "bg-navy-950/80 text-bone/70");
  }
}

function DevelopmentsStrip() {
  const root = useRef<HTMLElement>(null);
  useReveal(root, [
    { sel: ".dev-fade", from: { y: 24 }, duration: 0.9, stagger: 0.08, start: 80 },
    { sel: ".dev-card", from: { x: 60 }, duration: 1, stagger: 0.08, trigger: ".dev-track", start: 85 },
  ]);

  return (
    <section ref={root} className="bg-bone py-12 md:py-16 overflow-hidden">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-8 mb-16 items-end">
          <div className="col-span-12 lg:col-span-7">
            <p className="dev-fade eyebrow mb-6">Our developments</p>
<h2 className="dev-fade text-display-lg font-display text-navy-950 tracking-tightest font-light">Where we build.</h2>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:col-start-9">
            <p className="dev-fade text-lg leading-relaxed text-ink">
Southern Bridge City is our biggest project so far. Here is everything we are building now, and what we have already handed over.
            </p>
          </div>
        </div>
      </div>

      <div className="dev-track relative">
        <div className="overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory">
          <div className="flex gap-6 px-6 md:px-10 lg:pl-16 lg:pr-16">
            {DEVELOPMENTS.map((d) => (
              <Link
                key={d.slug}
                to={projectHref(d.slug)}
                className="dev-card group block shrink-0 snap-start w-[80vw] sm:w-[60vw] md:w-[44vw] lg:w-[28vw]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-navy-100 mb-5">
                  <img
                    src={vimg(d.image)}
                    alt={d.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover object-bottom transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
                  />
                  {d.status && (
                    <div className={cx("absolute top-5 left-5", statusPillStyle(d.status))}>
                      {(d.status === "Available" || d.status === "Limited") && (
                        <span className="block h-1.5 w-1.5 rounded-full bg-current mr-2 animate-pulse" />
                      )}
                      <span className="text-[10px] uppercase tracking-eyebrow font-medium">{d.status}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="eyebrow text-ink-faint mb-2">{d.location}</p>
                  <h3 className="font-display text-2xl text-navy-950 leading-tight transition-transform duration-400 ease-editorial group-hover:translate-x-1">
                    {d.name}
                  </h3>
                  <p className="mt-3 text-sm text-ink-muted leading-relaxed">{d.description}</p>
                </div>
              </Link>
            ))}

            <Link
              to="/projects"
              className="dev-card group flex shrink-0 snap-start w-[80vw] sm:w-[60vw] md:w-[44vw] lg:w-[28vw] items-center justify-center"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy-950 transition-colors duration-400 group-hover:bg-navy-900">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-bone p-8 text-center">
                  <p className="eyebrow !text-white mb-6">More work</p>
                  <p className="font-display text-3xl leading-tight mb-8">View the full portfolio</p>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-eyebrow font-medium border-b border-bone pb-1 transition-transform duration-500 ease-editorial group-hover:translate-x-2">
                    All projects <span aria-hidden>→</span>
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Featured residences (live listings from the admin) ──────────────────────

type Listing = {
  _id: string;
  title?: string;
  location?: string;
  state?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  landSize?: number | string;
  images?: string[];
  featuredImage?: string;
  status?: string;
};

function formatPrice(p: Listing) {
  if (!p.price) return "";
  const m = p.price / 1_000_000;
  return `₦${m >= 100 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M`;
}

function FeaturedResidences({ properties }: { properties: Listing[] | undefined }) {
  const root = useRef<HTMLElement>(null);
  const list = (properties ?? []).slice(0, 4);
  useReveal(root, [{ sel: ".property-card", from: { y: 60 }, duration: 1, stagger: 0.12, start: 75 }], [list.length]);
  if (properties !== undefined && list.length === 0) return null;

  return (
    <section ref={root} className="bg-bone py-16 md:py-24">
      <div className="container-editorial">
        <div className="flex items-end justify-between mb-20">
          <div className="max-w-xl">
            <p className="eyebrow mb-6">Southern Bridge City</p>
<h2 className="text-display-md font-display text-navy-950 tracking-tightest font-light">Homes you can buy today.</h2>
          </div>
          <Link
            to="/properties"
            className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-navy-900 hover:text-coral-dark transition-colors duration-400 pb-2 border-b border-navy-900 hover:border-coral-dark"
          >
            View all residences <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-20">
          {list.map((p, i) => {
            const img = p.featuredImage || p.images?.[0];
            const area = p.landSize;
            const status = (p.status ?? "available").replace(/_/g, " ");
            return (
              <Link key={p._id} to={`/properties/${p._id}`} className={cx("property-card group block", i % 2 === 1 && "md:translate-y-24")}>
                <div className="relative aspect-[4/5] overflow-hidden bg-navy-100 mb-6">
                  {img && (
                    <img
                      src={img}
                      alt={p.title ?? ""}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover object-bottom transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
                    />
                  )}
                  <div className="absolute top-6 left-6 inline-flex items-center px-3 py-1.5 bg-bone/90 backdrop-blur-sm">
                    <span className="text-[10px] uppercase tracking-eyebrow font-medium text-navy-900">{status}</span>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="eyebrow text-ink-faint mb-2">{[p.location, p.state].filter(Boolean).join(", ")}</p>
                    <h3 className="font-display text-3xl text-navy-950 leading-tight">{p.title}</h3>
                    <p className="mt-3 text-sm text-ink-muted">
                      {[
                        p.bedrooms ? `${p.bedrooms} bed` : null,
                        p.bathrooms ? `${p.bathrooms} bath` : null,
                        area ? `${area}${typeof area === "number" ? "m²" : ""}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <p className="font-display text-xl text-navy-900 whitespace-nowrap">{formatPrice(p)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Image collage ───────────────────────────────────────────────────────────

const PLATES = [
  { src: "/collage-1.jpg", alt: "Southern Bridge City, residential facade at dusk", pos: "center center", cls: "col-start-1 col-span-5 row-start-1 aspect-[4/3]", fromX: -120, fromY: 80 },
  { src: "/collage-2.jpg", alt: "Southern Bridge City, drone view of terrace houses and courtyard", pos: "center top", cls: "col-start-7 col-span-6 row-start-1 aspect-[5/4] mt-24", fromX: 120, fromY: 60 },
  { src: "/collage-3.jpg", alt: "Southern Bridge City, aerial view of development and surroundings", pos: "center top", cls: "col-start-3 col-span-5 row-start-2 aspect-[4/3] -mt-12", fromX: -60, fromY: 140 },
  { src: "/collage-4.jpg", alt: "Southern Bridge City, top-down aerial of completed residential blocks", pos: "center center", cls: "col-start-9 col-span-4 row-start-2 aspect-[4/3] mt-16", fromX: 80, fromY: 100 },
  { src: "/collage-5.jpg", alt: "Southern Bridge City, balcony and facade detail at golden hour", pos: "center center", cls: "col-start-2 col-span-9 row-start-3 aspect-[16/9] mt-20", fromX: 0, fromY: 200 },
  ];

function ImageCollage() {
  const root = useRef<HTMLElement>(null);
  useReveal(root, [{ sel: ".collage-text > *", from: { y: 40 }, duration: 1, stagger: 0.12, trigger: ".collage-text", start: 75 }]);
  // Plates travel in from off-screen at different speeds and lock into the grid,
  // while each photo keeps drifting inside its frame.
  useScrub(root, (el) => {
    const stops: (() => void)[] = [];
    el.querySelectorAll<HTMLElement>(".collage-plate").forEach((plate) => {
      const fx = parseFloat(plate.dataset.fromX ?? "0");
      const fy = parseFloat(plate.dataset.fromY ?? "0");
      stops.push(scrubTo(plate, { x: [fx, 0], y: [fy, 0], opacity: [0, 1], scale: [0.94, 1] }, plate, ["start end", "center center"]));
      const inner = plate.querySelector(".collage-inner");
      if (inner) stops.push(scrubTo(inner, { y: ["-8%", "8%"] }, plate));
    });
    return stops;
  });

  return (
    <section ref={root} className="relative bg-bone py-16 md:py-24 [overflow:clip]">
      <div className="container-editorial">
        <div className="collage-text grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-5">
            <p className="eyebrow mb-6">A study in restraint</p>
            <h2 className="text-display-lg font-display text-navy-950 tracking-tightest font-light">Built for the way life is actually lived.</h2>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:pt-6">
            <p className="text-lg leading-relaxed text-ink">
              Each residence is sized for use, not for show. Materials are specified for how they age. Floor plates are drawn
              for how a household actually moves through a day.
            </p>
            <p className="mt-6 text-lg leading-relaxed text-ink">
              The result is architecture that feels considered now, and will still feel considered in twenty years.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6 relative">
          {PLATES.map((p, i) => (
            <div
              key={i}
              className={`collage-plate relative overflow-hidden bg-navy-100 will-change-transform ${p.cls}`}
              data-from-x={p.fromX}
              data-from-y={p.fromY}
            >
              <div className="collage-inner absolute -inset-y-[8%] inset-x-0 will-change-transform">
                <img src={vimg(p.src)} alt={p.alt} loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: p.pos }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Latest site updates ─────────────────────────────────────────────────────

function HomeUpdates() {
  const root = useRef<HTMLElement>(null);
const recent = [...SBC_SITE_UPDATES].sort((a, b) => Number(SBC_VIDEOS.some((v) => v.match.test(b.typology))) - Number(SBC_VIDEOS.some((v) => v.match.test(a.typology)))).slice(0, 3);
  useReveal(root, [{ sel: ".upd-card", from: { y: 30 }, duration: 0.9, stagger: 0.08, start: 85 }]);
  if (recent.length === 0) return null;

  return (
    <section ref={root} className="bg-bone py-16 md:py-24 border-t border-hairline">
      <div className="container-editorial">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12 md:mb-16">
          <div>
            <p className="eyebrow text-ink-faint mb-3">From the sites</p>
            <h2 className="text-display-md md:text-display-lg font-display text-navy-950 tracking-tightest leading-[1.05] font-light">
See the progress for yourself.
            </h2>
          </div>
          <Link
            to="/updates"
            className="inline-flex items-center gap-2 text-sm font-medium text-navy-900 hover:text-coral-dark transition-colors pb-1 border-b border-navy-900 hover:border-coral-dark"
          >
            View all updates <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {recent.map((u) => (
<Link key={u.typology} to={(([[/6\s*-?\s*bed.*terrace/i, "jh7e5nntk2p65h4sxnya7krv2n8brvh3"], [/5\s*-?\s*bed.*semi/i, "jh71zezq02we1st1j0y48e87rh8bs4s9"], [/4\s*-?\s*bed.*semi/i, "jh7dy401qjzb82bfkyre15madx8brgnw"], [/4\s*-?\s*bed.*terrace/i, "jh797zwxy226ra4s7zmjf97d6s8bsn39"], [/4\s*-?\s*bed.*(block|flat)/i, "jh7fjcgcatevc7wfssq9kprby58bra1f"]] as [RegExp, string][]).find(([re]) => re.test(u.typology)) ?? [null, ""])[1] ? "/properties/" + (([[/6\s*-?\s*bed.*terrace/i, "jh7e5nntk2p65h4sxnya7krv2n8brvh3"], [/5\s*-?\s*bed.*semi/i, "jh71zezq02we1st1j0y48e87rh8bs4s9"], [/4\s*-?\s*bed.*semi/i, "jh7dy401qjzb82bfkyre15madx8brgnw"], [/4\s*-?\s*bed.*terrace/i, "jh797zwxy226ra4s7zmjf97d6s8bsn39"], [/4\s*-?\s*bed.*(block|flat)/i, "jh7fjcgcatevc7wfssq9kprby58bra1f"]] as [RegExp, string][]).find(([re]) => re.test(u.typology)) ?? [null, ""])[1] : "/updates"} className="upd-card group block">
              <div className="relative aspect-[4/3] overflow-hidden bg-navy-100 mb-5">
                <img
                  src={u.photos[0]}
                  alt={u.typology}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-1200 ease-editorial group-hover:scale-[1.04]"
                />
                {SBC_VIDEOS.filter((v) => v.match.test(u.typology)).map((v) => (<video key={v.src} src={v.src} muted loop autoPlay playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />))}
                <div className="absolute top-3 right-3 bg-bone/95 text-navy-950 text-[10px] uppercase tracking-widest px-2 py-1">
{SBC_VIDEOS.some((v) => v.match.test(u.typology)) ? "Video" : u.photos.length + " photos"}
                </div>
              </div>
              <p className="text-[11px] uppercase tracking-widest text-ink-faint mb-2">Southern Bridge City · {u.date}</p>
              <h3 className="text-lg md:text-xl font-display text-navy-950 leading-tight group-hover:text-coral-dark transition-colors duration-400">
                {u.typology}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── MREIF ───────────────────────────────────────────────────────────────────

const TERMS = [
  { label: "Interest rate", value: "9.75%", note: "Fixed, full tenor" },
  { label: "Tenor", value: "20 years", note: "Maximum" },
  { label: "Minimum equity", value: "10%", note: "Of property value" },
  { label: "Currency", value: "₦", note: "Naira denominated" },
];

function MreifSection() {
  const root = useRef<HTMLElement>(null);
  useReveal(root, [
    { sel: ".mreif-headline > *", from: { y: 30 }, duration: 1, stagger: 0.12, start: 75 },
    { sel: ".mreif-term", from: { y: 24 }, duration: 0.8, stagger: 0.08, trigger: ".mreif-terms", start: 80 },
  ]);

  return (
    <section ref={root} className="bg-bone-100 py-8 md:py-10 relative">
      <div className="container-editorial">
        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-8 mreif-headline">
            <div className="mb-4">
              <img
                src={vimg("/mreif-logo.png")}
                alt="MREIF, Ministry of Finance Incorporated Real Estate Investment Fund"
                width={96}
                height={96}
                className="h-24 w-24 object-contain"
              />
            </div>
            <p className="eyebrow mb-3">MREIF Mortgage Programme</p>
            <h2 className="text-display-lg font-display text-navy-950 tracking-tightest font-light">
Buy your home with a 20-year mortgage.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-ink max-w-2xl">
MREIF is a Federal Government home loan, offered through partner banks. Every Geodata home qualifies. You pay 10% upfront and spread the rest over up to 20 years, at a fixed 9.75%.
            </p>
          </div>
        </div>

        <div className="mreif-terms mt-10 grid grid-cols-2 lg:grid-cols-4 border-t border-hairline">
          {TERMS.map((t, i) => (
            <div
              key={t.label}
              className={cx(
                "mreif-term py-6 px-2",
                i !== TERMS.length - 1 && "lg:border-r border-hairline",
                i < 2 && "border-r border-hairline lg:border-r border-b lg:border-b-0",
              )}
            >
              <p className="eyebrow text-ink-faint mb-4">{t.label}</p>
              <p className="font-display text-5xl md:text-6xl text-navy-950 tracking-tightest leading-none font-light">{t.value}</p>
              <p className="mt-3 text-sm text-ink-muted">{t.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/mortgage#quiz"
            className="inline-flex items-center gap-3 bg-navy-900 px-7 py-4 text-sm font-medium text-bone hover:bg-navy-800 transition-colors duration-400"
          >
            Take the 30-second quiz <span aria-hidden>→</span>
          </Link>
          <Link
            to="/mortgage"
            className="inline-flex items-center gap-3 px-7 py-4 text-sm font-medium text-navy-900 border-b border-navy-900 hover:text-coral-dark hover:border-coral-dark transition-colors duration-400"
          >
            Learn about MREIF
          </Link>
        </div>
      </div>
    </section>
  );
}


// "By the numbers" band, ported from the Next.js site's StatsCounter.
const STATS = [
{ value: "19+", label: "Years building" },
  { value: "1850+", label: "Units in the masterplan" },
  { value: "12", label: "Projects delivered" },
  { value: "4+", label: "States built in" },
];

const STAT_ITEMS = STATS.map((s) => ({
  value: parseInt(s.value.replace(/\D/g, ""), 10) || 0,
  suffix: s.value.replace(/[0-9]/g, ""),
  label: s.label,
}));

function StatsCounter() {
  const root = useRef<HTMLElement>(null);
  useCounter(root);
  useReveal(root, [{ sel: ".stat-rule", from: { scaleX: 0 }, duration: 1.4, start: 75, origin: "left center" }]);

  return (
    <section ref={root} className="bg-navy-950 text-bone py-10 md:py-12 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(250,250,247,0.6) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="container-editorial relative">
        <div className="grid grid-cols-12 gap-12 mb-20">
          <div className="col-span-12 lg:col-span-5">
            <p className="eyebrow !text-white mb-6">By the numbers</p>
<h2 className="text-display-md font-display tracking-tightest font-light">Nineteen years of building.</h2>
          </div>
        </div>
        <div className="stat-rule h-px w-full bg-bone/15 mb-20" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-6">
          {STAT_ITEMS.map((s) => (
            <div key={s.label} className="border-l border-bone/15 pl-6">
              <p className="font-display text-6xl md:text-7xl tracking-tightest leading-none font-light">
                <span className="stat-number" data-value={s.value}>
                  0
                </span>
                {s.suffix && <span className="text-coral">{s.suffix}</span>}
              </p>
              <p className="mt-6 text-sm text-bone/70 leading-relaxed max-w-[220px]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The Real Estate homepage. Rendered at "/" (when the Corporate Directory toggle
// is OFF) and always at "/real-estate". Sections follow the Next.js site, then
// the admin-managed sections (Why Geodata, services, testimonials, partners,
// contact) follow.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_LAUNCH_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const DEFAULT_MESSAGE =
  "We're putting the finishing touches on something extraordinary. Nigeria's most trusted real estate platform is being upgraded, bigger, better, and built for you.";

type LandingLock = { enabled: boolean; launchDate: string; message: string };

function parseLandingLock(raw: string | null | undefined): LandingLock {
  if (!raw) return { enabled: false, launchDate: DEFAULT_LAUNCH_DATE, message: DEFAULT_MESSAGE };
  try {
    return { enabled: false, launchDate: DEFAULT_LAUNCH_DATE, message: DEFAULT_MESSAGE, ...(JSON.parse(raw) as Partial<LandingLock>) };
  } catch {
    return { enabled: false, launchDate: DEFAULT_LAUNCH_DATE, message: DEFAULT_MESSAGE };
  }
}

export default function RealEstateLandingPage({ canonicalPath = "/" }: { canonicalPath?: string }) {
  const featuredProperties = useQuery(api.properties.listFeatured);
  const rawLock = useQuery(api.cms.getSiteSettings, { key: "landing_lock" });

  useSeo({
    title: "Geodata World Services | Real Estate in Abuja",
    description:
      "Southern Bridge City, Idu, Abuja: 1,850+ homes, MREIF-eligible from ₦90M with a 9.75% fixed mortgage over 20 years. Real estate, investment and infrastructure.",
    canonicalPath,
  });

  if (rawLock === undefined) return null;
  const lock = parseLandingLock(rawLock);
  if (lock.enabled) return <ComingSoon launchDate={lock.launchDate} message={lock.message} />;

  return (
    <div className="min-h-screen bg-bone" data-v2>
      <Navbar />
<Hero /><BriefAboutUs /><DevelopmentsStrip /><StatsCounter /><FeaturedResidences properties={featuredProperties as never} /><HomeUpdates /><ImageCollage /><MreifSection /><ServicesSection />
      <PartnerCTASection />
      <TrustedPartnersStrip />

      <Footer />
      <WhatsAppButton />
      <PopNotification />
    </div>
  );
}



// --- Styled Google Map (Maps JavaScript API) --------------------------------
// Uses VITE_GOOGLE_MAPS_API_KEY. Without a key it falls back to the plain embed.
const GMAPS_KEY = ((import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();
let gmapsLoading: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  const w = window as unknown as { google?: { maps?: unknown }; __gdMapsReady?: () => void };
  if (w.google?.maps) return Promise.resolve();
  if (gmapsLoading) return gmapsLoading;
  gmapsLoading = new Promise<void>((resolve, reject) => {
    w.__gdMapsReady = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GMAPS_KEY)}&v=weekly&callback=__gdMapsReady`;
    s.async = true;
    s.onerror = () => {
      gmapsLoading = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(s);
  });
  return gmapsLoading;
}

const GD_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f4f2ec" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5c6b7e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#fafaf7" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#e5e0d5" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#ebe8de" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e5e0d5" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#efe3d6" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e5d3c1" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfd9e3" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#94a0b0" }] },
];

export function StyledMap({
  lat,
  lng,
  zoom = 16,
  pin = true,
  title = "Location map",
  fallbackSrc,
  className = "h-[420px] w-full",
}: {
  lat: number;
  lng: number;
  zoom?: number;
  pin?: boolean;
  title?: string;
  fallbackSrc: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const [failed, setFailed] = useState(!GMAPS_KEY);
  const [kind, setKind] = useState<"roadmap" | "hybrid">("roadmap");

  useEffect(() => {
    if (!GMAPS_KEY) return;
    let off = false;
    loadGoogleMaps()
      .then(() => {
        if (off || !box.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const g = (window as any).google.maps;
        const pos = { lat, lng };
        if (!mapRef.current) {
          mapRef.current = new g.Map(box.current, {
            center: pos,
            zoom,
            styles: GD_MAP_STYLE,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "cooperative",
            clickableIcons: false,
            backgroundColor: "#f4f2ec",
          });
        } else {
          mapRef.current.panTo(pos);
          mapRef.current.setZoom(zoom);
        }
        if (markerRef.current) markerRef.current.setMap(null);
        markerRef.current = pin
          ? new g.Marker({
              position: pos,
              map: mapRef.current,
              title,
              icon: {
                path: g.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: "#d44455",
                fillOpacity: 1,
                strokeColor: "#fafaf7",
                strokeWeight: 3,
              },
            })
          : null;
      })
      .catch(() => setFailed(true));
    return () => {
      off = true;
    };
  }, [lat, lng, zoom, pin, title]);

  useEffect(() => {
    if (mapRef.current) mapRef.current.setMapTypeId(kind);
  }, [kind]);

  if (failed) {
    return (
      <div className={`${className} overflow-hidden border border-[#e5e0d5] bg-[#f4f2ec]`}>
        <iframe src={fallbackSrc} title={title} loading="lazy" className="h-full w-full border-0" />
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden border border-[#e5e0d5] bg-[#f4f2ec]`}>
      <div ref={box} className="absolute inset-0" aria-label={title} />
      <div className="absolute left-3 top-3 z-10 inline-flex border border-[#e5e0d5] bg-[#fafaf7] text-[11px] uppercase tracking-[0.15em]">
        {(["roadmap", "hybrid"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`px-3 py-2 cursor-pointer transition-colors ${kind === k ? "bg-[#0a1628] text-[#fafaf7]" : "text-[#0a1628] hover:bg-[#f4f2ec]"}`}
          >
            {k === "roadmap" ? "Map" : "Satellite"}
          </button>
        ))}
      </div>
    </div>
  );
}


// ─── Redesigned homepage (preview at /home-v2) ───────────────────────────────
function v2Monthly(price: number) { const r = 0.0975 / 12; const m = (price * 0.9 * r) / (1 - Math.pow(1 + r, -240)); return m >= 1_000_000 ? "₦" + (m / 1_000_000).toFixed(2) + "M" : "₦" + Math.round(m / 1000) + "K"; }

function HeroV2() {
  const facts = [["From ₦90M", "2 to 6 bedroom homes"], ["9.75% fixed", "Mortgage rate for 20 years"], ["5% off", "When you pay outright"], ["19 years", "Building across Nigeria"]];
  return (
    <section className="relative bg-navy-950 text-bone overflow-hidden">
      <video autoPlay muted loop playsInline poster="https://hercules-cdn.com/file_Hrz0DYCfu4HHzAKLf0iGO40r" className="absolute inset-0 h-full w-full object-cover opacity-50"><source src="https://geodata-wsl.s3.us-east-1.amazonaws.com/Showcase.mp4" type="video/mp4" /></video>
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-navy-950/20" />
      <div className="relative container-editorial pt-20 md:pt-36 pb-8 md:pb-12">
        <p className="eyebrow !text-bone/70 mb-5">Building in Abuja since 2007</p>
        <h1 className="font-display font-light tracking-tightest leading-[1.02] text-5xl md:text-7xl lg:text-[88px] max-w-4xl">Find your home <em className="italic">in Abuja.</em></h1>
        <p className="mt-6 max-w-xl text-lg md:text-xl text-bone/80 leading-relaxed">Homes from ₦90M at Southern Bridge City, Idu. Pay outright, or spread the cost over 20 years at 9.75% fixed.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <a href="#homes" className="inline-flex items-center justify-center gap-2 bg-bone text-navy-950 px-7 py-4 text-sm font-medium hover:bg-white transition-colors">See homes and prices <span aria-hidden>→</span></a>
          <button type="button" {...calProps} className="inline-flex items-center justify-center border border-bone/40 px-7 py-4 text-sm font-medium hover:bg-bone/10 transition-colors cursor-pointer">Book a site visit</button>
        </div>
        <div className="mt-10 md:mt-20 grid grid-cols-2 md:grid-cols-4 border-t border-bone/20">
          {facts.map(([v, k]) => (<div key={k} className="pt-5 pr-4"><div className="font-display text-2xl md:text-3xl font-light tracking-tightest">{v}</div><div className="mt-1 text-xs md:text-sm text-bone/60">{k}</div></div>))}
        </div>
      </div>
    </section>
  );
}

function HomesV2({ properties }: { properties: Listing[] | undefined }) {
  const list = [...(properties ?? [])].sort((a, b) => (a.price ?? 0) - (b.price ?? 0)).slice(0, 6);
  if (properties !== undefined && list.length === 0) return null;
  return (
    <section id="homes" className="bg-bone py-14 md:py-24 scroll-mt-20">
      <div className="container-editorial">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-14">
          <div><p className="eyebrow mb-3">Southern Bridge City, Idu</p><h2 className="font-display font-light tracking-tightest text-4xl md:text-5xl text-navy-950">Choose your home.</h2></div>
          <Link to="/properties" className="text-sm font-medium text-navy-950 hover:text-coral-dark transition-colors">See all homes →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {list.map((p) => (
            <Link key={p._id} to={"/properties/" + p._id} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden bg-navy-100 mb-4">
                {(p.featuredImage || p.images?.[0]) && (<img src={p.featuredImage || p.images?.[0]} alt={p.title ?? ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />)}
                <div className="absolute bottom-0 left-0 bg-bone px-4 py-2 font-display text-xl text-navy-950">{formatPrice(p)}</div>
              </div>
              <h3 className="font-display text-xl text-navy-950 group-hover:text-coral-dark transition-colors">{p.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{[p.bedrooms ? p.bedrooms + " bed" : "", p.bathrooms ? p.bathrooms + " bath" : "", p.landSize ? String(p.landSize) : ""].filter(Boolean).join(" · ")}</p>
              {p.price ? (<p className="mt-3 pt-3 border-t border-hairline text-sm text-navy-950">About <span className="font-medium">{v2Monthly(p.price)}</span> a month with a mortgage</p>) : null}
            </Link>
          ))}
        </div>
        <p className="mt-8 text-xs text-ink-faint">Monthly figures are estimates: 10% deposit, 9.75% fixed over 20 years. The bank confirms your final figures.</p>
      </div>
    </section>
  );
}

function HowV2() {
  const steps = [["01", "Come and see it", "Book a site visit. We walk you through the estate, the homes and the progress on the ground."], ["02", "Choose how to pay", "Pay outright and get 5% off, or use the MREIF mortgage: a 10% deposit, then fixed monthly payments for up to 20 years."], ["03", "Get your documents", "You receive your allocation letter, and you can follow construction through our site updates until handover."]];
  return (
    <section className="bg-bone-100 py-14 md:py-24 border-y border-hairline">
      <div className="container-editorial">
        <p className="eyebrow mb-3">How buying works</p>
        <h2 className="font-display font-light tracking-tightest text-4xl md:text-5xl text-navy-950 mb-8 md:mb-14">Three steps to your keys.</h2>
        <div className="grid md:grid-cols-3 gap-8 md:gap-10">
          {steps.map(([n, t, d]) => (<div key={n} className="border-t border-navy-950 pt-5"><p className="text-sm text-coral-dark mb-3">{n}</p><h3 className="font-display text-2xl text-navy-950 mb-2">{t}</h3><p className="text-ink-muted leading-relaxed">{d}</p></div>))}
        </div>
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link to="/mortgage" className="inline-flex items-center justify-center bg-navy-950 text-bone px-7 py-4 text-sm font-medium hover:bg-navy-900 transition-colors">Work out your monthly payment</Link>
          <Link to="/faqs" className="inline-flex items-center justify-center border border-navy-950/25 text-navy-950 px-7 py-4 text-sm font-medium hover:border-navy-950 transition-colors">Read common questions</Link>
        </div>
      </div>
    </section>
  );
}

export function HomeV2() {
  const featuredProperties = useQuery(api.properties.listFeatured);
  useSeo({ title: "New homepage preview | Geodata World Services", description: "Preview of a redesigned Geodata homepage.", canonicalPath: "/home-v2" });
  return (
    <div className="min-h-screen bg-bone" data-v2>
      <Navbar />
      <HeroV2 /><HomesV2 properties={featuredProperties as never} /><HowV2 /><HomeUpdates /><DevelopmentsStrip />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
