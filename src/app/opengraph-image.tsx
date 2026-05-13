import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo";

export const alt = "NUVIO - travel grants and local stay programs";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#ffffff",
          color: "#0f172a",
          display: "flex",
          fontFamily: "Arial, Helvetica, sans-serif",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "2px solid #dbe7e2",
            borderRadius: 36,
            display: "flex",
            flexDirection: "column",
            gap: 28,
            height: 500,
            justifyContent: "space-between",
            padding: 56,
            width: 1040,
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div
              style={{
                color: "#0f766e",
                fontSize: 68,
                fontWeight: 900,
                letterSpacing: 0,
              }}
            >
              NUVIO
            </div>
            <div
              style={{
                background: "#ecfdf5",
                borderRadius: 18,
                color: "#047857",
                fontSize: 24,
                fontWeight: 800,
                padding: "14px 22px",
              }}
            >
              Local Stay Platform
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 64,
                fontWeight: 900,
                letterSpacing: 0,
                lineHeight: 1.05,
              }}
            >
              <span>Discover travel grants,</span>
              <span>workations, and local stays.</span>
            </div>
            <div
              style={{
                color: "#475569",
                fontSize: 28,
                lineHeight: 1.35,
                maxWidth: 820,
              }}
            >
              {siteConfig.url.replace(/^https?:\/\//u, "")}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
