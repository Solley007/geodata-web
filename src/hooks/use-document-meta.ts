import { useSeo } from "./use-seo.ts";

/**
 * Sets the document title, meta description and a self-referencing canonical
 * URL for the lifetime of a page. Thin wrapper over `useSeo` so Diaspora
 * programme/campaign pages never inherit the homepage canonical.
 */
export function useDocumentMeta(title: string, description?: string): void {
  useSeo({ title, description });
}
