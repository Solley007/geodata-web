// ---------------------------------------------------------------------------
// /api/og — programmatic Open Graph image generator
// ---------------------------------------------------------------------------
// Generates a branded 1200x630 share card on demand. Pages call this with
// query params:
//   /api/og?title=Some+Title&eyebrow=Properties&subtitle=Optional+subtitle
//
// What this gives us:
//   - Every page gets a beautiful share card automatically
//   - When content changes, the card stays in sync
//   - No design tool maintenance
//
// The look: dark navy background, generous Fraunces headline in cream,
// gold accent rule, GG cube mark in the corner, subtle texture.
// ---------------------------------------------------------------------------

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Sensible upper bounds — protects against weird URLs
const MAX_TITLE = 90;
const MAX_SUBTITLE = 200;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const title = (params.get("title") || "Premium real estate in Abuja").slice(0, MAX_TITLE);
    const eyebrow = (params.get("eyebrow") || "Geodata").slice(0, 50);
    const subtitle = (params.get("subtitle") || "").slice(0, MAX_SUBTITLE);

    // Fetch fonts from Google Fonts at edge — cached aggressively after first call
    const [frauncesData, dmSansData] = await Promise.all([
      fetchFont(
        "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,300&display=swap"
      ),
      fetchFont(
        "https://fonts.googleapis.com/css2?family=DM+Sans:wght@500&display=swap"
      ),
    ]);

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#0A1628",
            position: "relative",
            padding: "80px",
            fontFamily: "DM Sans",
          }}
        >
          {/* Subtle dot grid texture */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.06,
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #FAFAF7 1px, transparent 0)",
              backgroundSize: "32px 32px",
              display: "flex",
            }}
          />

          {/* Top — eyebrow + brand mark */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#C9A961",
                fontSize: 18,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              {eyebrow}
            </div>
            <div
              style={{
                display: "flex",
                color: "#FAFAF7",
                fontSize: 24,
                fontFamily: "Fraunces",
                fontWeight: 400,
              }}
            >
              GEODATA<span style={{ color: "#C9A961" }}>.</span>
            </div>
          </div>

          {/* Middle — title and subtitle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "relative",
              maxWidth: 1000,
            }}
          >
            <div
              style={{
                color: "#FAFAF7",
                fontSize: 84,
                fontFamily: "Fraunces",
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                display: "flex",
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div
                style={{
                  color: "rgba(250, 250, 247, 0.7)",
                  fontSize: 28,
                  marginTop: 28,
                  lineHeight: 1.4,
                  display: "flex",
                  maxWidth: 900,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          {/* Bottom — gold rule + meta */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 80,
                height: 2,
                background: "#C9A961",
                marginBottom: 20,
                display: "flex",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "rgba(250, 250, 247, 0.5)",
                fontSize: 16,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              <span>Real Estate · Investment · Infrastructure</span>
              <span>geodata.com.ng</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Fraunces",
            data: frauncesData,
            style: "normal",
            weight: 400,
          },
          {
            name: "DM Sans",
            data: dmSansData,
            style: "normal",
            weight: 500,
          },
        ],
      }
    );
  } catch (e) {
    console.error("OG image generation failed:", e);
    return new Response("Failed to generate image", { status: 500 });
  }
}

/**
 * Fetch a font file from Google Fonts CSS.
 * Google Fonts CSS contains @font-face rules with src URLs we can fetch.
 */
async function fetchFont(url: string): Promise<ArrayBuffer> {
  const css = await (
    await fetch(url, {
      headers: {
        // Important: Google Fonts serves different formats based on User-Agent
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    })
  ).text();

  const fontUrl = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
  if (!fontUrl) throw new Error("Font URL not found in CSS");

  return await (await fetch(fontUrl)).arrayBuffer();
}
