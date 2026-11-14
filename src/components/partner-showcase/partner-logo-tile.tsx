import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { BadgeCheck } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";
import type { PartnerCategory } from "@/lib/partner-showcase.ts";

export type PublicPartner = {
  slug: string;
  featured: boolean;
  verified: boolean;
  displayName: string;
  tagline: string | null;
  country: string | null;
  category: PartnerCategory;
  logoUrl: string | null;
  logoLightUrl: string | null;
};

type Props = {
  partner: PublicPartner;
  /** "light" = white tile (homepage/directory), "dark" = navy tile (Diaspora) */
  tone?: "light" | "dark";
  /** Greyscale until hover — used in the scrolling strip */
  muted?: boolean;
  className?: string;
};

/** A clickable, equal-size logo tile linking to the partner's profile page. */
export default function PartnerLogoTile({ partner, tone = "light", muted, className }: Props) {
  const record = useMutation(api.partnerProfiles.recordShowcaseEvent);
  const dark = tone === "dark";
  // On dark tiles prefer the white logo; fall back to the colour logo on a light inset
  const src = dark ? (partner.logoLightUrl ?? partner.logoUrl) : (partner.logoUrl ?? partner.logoLightUrl);
  const needsInset = dark && !partner.logoLightUrl && !!partner.logoUrl;

  return (
    <Link
      to={`/partners/${partner.slug}`}
      onClick={() => void record({ slug: partner.slug, event: "logo_click" })}
      title={partner.displayName}
      className={cn(
        "group relative flex h-24 w-44 shrink-0 items-center justify-center rounded-2xl border p-4 transition-all duration-300 cursor-pointer",
        dark
          ? "border-white/10 bg-white/5 hover:border-amber-300/40 hover:bg-white/10"
          : "border-gray-100 bg-white shadow-sm hover:-translate-y-0.5 hover:border-[var(--brand)]/30 hover:shadow-md",
        className,
      )}
    >
      {partner.verified && (
        <BadgeCheck
          size={15}
          aria-label="Verified partner"
          className={cn("absolute right-2 top-2", dark ? "text-amber-300" : "text-[var(--brand)]")}
        />
      )}
      {src ? (
        <span className={cn("flex h-full w-full items-center justify-center", needsInset && "rounded-lg bg-white p-2")}>
          <img
            src={src}
            alt={`${partner.displayName} logo`}
            loading="lazy"
            className={cn(
              "max-h-12 max-w-full object-contain transition-all duration-300",
              muted && "opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0",
            )}
          />
        </span>
      ) : (
        <span className={cn("text-center text-sm font-semibold leading-tight", dark ? "text-white" : "text-gray-800")}>
          {partner.displayName}
        </span>
      )}
    </Link>
  );
}
