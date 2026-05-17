"use client";

import { useEffect } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";

interface Props {
  /** Cal.com event link, e.g., "geodata/sbc-viewing" */
  calLink: string;
  /** Optional namespace to isolate this embed from others on the same page */
  namespace?: string;
}

/**
 * BookViewingEmbed — inline Cal.com calendar widget.
 * Styled to match Geodata brand (red accent, navy palette, Euclid Circular).
 * Use this for full booking pages. For a button that opens a popup, use BookViewingButton.
 */
export default function BookViewingEmbed({ calLink, namespace = "default" }: Props) {
  useEffect(() => {
    (async function init() {
      const cal = await getCalApi({ namespace });
      cal("ui", {
        theme: "auto",
        cssVarsPerTheme: {
          light: { "cal-brand": "#D44455" },
          dark:  { "cal-brand": "#D44455" },
        },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, [namespace]);

  return (
    <div className="border border-hairline dark:border-white/10 bg-bone dark:bg-navy-900 overflow-hidden">
      <Cal
        namespace={namespace}
        calLink={calLink}
        style={{ width: "100%", height: "100%", minHeight: "640px", overflow: "scroll" }}
        config={{ layout: "month_view" }}
      />
    </div>
  );
}
