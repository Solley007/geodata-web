import { permanentRedirect } from "next/navigation";

/**
 * The rent vs buy calculator now lives on the MREIF mortgage page.
 * Permanently redirect this legacy route so existing links and SEO carry over.
 */
export default function RentVsBuyPage() {
  permanentRedirect("/mortgage");
}
