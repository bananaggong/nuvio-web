import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo";

export const alt = "누비오 - 결이 맞는 사람과 함께 떠나는 로컬 여행";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

const nuvioWordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 164.87 54.87"><g><path d="M81.52,27.2c.59-3.51,1.22-7.01,2.16-10.44.23-.86.51-1.71.79-2.55.27-.81.63-1.65.76-2.49.17-1.12.04-2.36-.74-3.24-.47-.53-1.12-.85-1.81-.99-1.73-.36-3.44.72-4.06,2.37-2.07,5.59-3.45,12.14-4.52,18.08v.02c-13.77.47-57.92,1.99-57.95,2-1.79.05-3.21,1.55-3.16,3.34.05,1.79,1.54,3.2,3.33,3.16l15.49-.53c1.68-.04,3.3-.11,4.88-.14,2.24-.04,3.74-.4,5.82,1.48,2.18,1.98,1.45,9.39.69,12.96-.43,2.02.47,3.9,2.42,4.5,1.83.56,4.03-.51,4.54-2.63,1.14-4.71,1.61-12.32-.6-16.78l24.01-.83v.03c-.08,8.34,3.72,15.57,12.46,15.71,5.23-.21,10.04-3.18,12.49-7.79,1.77-3.33,1.49-7.03-.68-10.06-4.14-5.16-9.89-5.19-16.33-5.17ZM92.26,38.86c-1.18,2.47-3.66,3.93-6.27,4.13-4.24,0-5.25-4.59-5.14-8.59,3.85.14,8.4-.42,10.92,1.92.63.58.96,1.55.49,2.53Z" fill="#fe701e"/><path d="M162.01,40.29c-6.88-1.02-13.75-.97-20.85-.87,1.71-3.43,2.68-8.62.66-11.82-.75-1.33-2.35-1.86-3.86-1.32-1.16.41-2.71,1.81-2.4,3.31,1.02,4.91-1.55,9.86-6.62,10.8l-4.71.87c-1.85.34-2.89,2.25-2.64,3.96.29,1.94,1.77,2.98,3.7,3.15,2.21.2,4.05-.66,6.2-.95,9.88-1.29,19.78-.94,29.66-.16,1.95.15,3.41-1.37,3.68-3.01.27-1.65-.86-3.68-2.82-3.97Z" fill="#fe701e"/><path d="M44.05,25.95c4.37-.33,8.71-.79,12.84-1.94,2.01-.56,2.84-2.89,2.37-4.39-.7-2.2-2.63-2.94-4.73-2.44-4.69,1.11-11.89,2.19-16.32,1.19-1.43-.32-2.16-1.41-2.31-2.81-.28-2.65.12-5.3.66-7.9.47-2.21,1.51-5.46-.73-7.04-.3-.21-.64-.38-.99-.48-1.54-.43-3.09.14-3.87,1.4-.99,1.58-1.17,3.4-1.59,5.47-.66,3.24-1.01,6.44-.6,9.69.98,7.69,7.98,9.8,15.28,9.25Z" fill="#fe701e"/><path d="M114.55,5.86c-2.37.22-3.45,2.57-3.24,5.04.01.15.03.3.05.45-.92,9.58-2.23,19.08-4.09,28.62l-.67,4.57c-.28,1.94,1.24,3.47,2.98,3.73,1.71.26,3.61-.73,3.97-2.68l2.18-11.88,1.22-8.09,1.46-13.43c.14-1.27.16-2.42-.05-3.55-.32-1.78-1.98-2.95-3.81-2.78Z" fill="#fe701e"/><path d="M133.45,22.19c3.92,2.26,8.82,1.84,12.27-.94,2.42-1.94,3.62-4.81,3.45-7.91-.15-2.73-1.56-5.48-3.93-7.14-2.15-1.51-4.12-1.2-6.37-.43-4.4-.48-8.37,3.55-9.24,7.75-.71,3.42.63,6.83,3.82,8.67ZM139.32,12.52c.78.06,1.46.27,2.2.14.79.95.59,2.52-.76,3.27-1.01.56-3.24.87-3.87-.34-.63-1.23,1.2-3.17,2.43-3.08Z" fill="#fe701e"/><path d="M101.55,6.34c-1.85-.19-3.53,1.03-3.82,3.09l-1.09,7.6c-.31,2.19-.76,4.22-1.38,6.32-.56,1.89.63,3.81,2.31,4.36,4.75,1.55,5.7-5.76,6.3-10.49l.88-6.93c.27-2.14-1.17-3.73-3.2-3.94Z" fill="#fe701e"/><circle cx="4.3" cy="33.99" r="4.3" fill="#fe701e"/></g></svg>`;

export default function Image() {
  const logoUrl = `data:image/svg+xml;utf8,${encodeURIComponent(nuvioWordmarkSvg)}`;

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#fffaf7",
          color: "#4b3328",
          display: "flex",
          fontFamily: "Arial, Helvetica, sans-serif",
          height: "100%",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#fe701e",
            borderRadius: 999,
            height: 420,
            opacity: 0.08,
            position: "absolute",
            right: -120,
            top: -150,
            width: 420,
          }}
        />
        <div
          style={{
            background: "#fe701e",
            borderRadius: 999,
            bottom: -180,
            height: 360,
            left: -120,
            opacity: 0.08,
            position: "absolute",
            width: 360,
          }}
        />
        <div
          style={{
            background: "#ffffff",
            border: "2px solid #ffd9c4",
            borderRadius: 38,
            boxShadow: "0 28px 80px rgba(75, 51, 40, 0.12)",
            display: "flex",
            flexDirection: "column",
            height: 488,
            justifyContent: "space-between",
            padding: "58px 66px",
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
            {/* next/og renders this server-side into the social preview image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="누비오"
              height={84}
              src={logoUrl}
              style={{
                objectFit: "contain",
              }}
              width={174}
            />
            <div
              style={{
                alignItems: "center",
                background: "#fff2ea",
                border: "1px solid #ffd0b7",
                borderRadius: 999,
                color: "#fe701e",
                display: "flex",
                fontSize: 24,
                fontWeight: 800,
                height: 56,
                padding: "0 24px",
              }}
            >
              Local Travel
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 70,
                fontWeight: 900,
                letterSpacing: 0,
                lineHeight: 1.12,
              }}
            >
              <span>결이 맞는 사람과 함께</span>
              <span>떠나는 로컬 여행</span>
            </div>
            <div
              style={{
                color: "#7a6a61",
                fontSize: 28,
                fontWeight: 600,
                lineHeight: 1.45,
                maxWidth: 860,
              }}
            >
              취향이 닿는 지역 프로그램을 찾고, 신청하고, 다시 떠날 준비를 시작하세요.
            </div>
          </div>
          <div
            style={{
              alignItems: "center",
              color: "#9d8d84",
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              justifyContent: "space-between",
            }}
          >
            <span>{siteConfig.url.replace(/^https?:\/\//u, "")}</span>
            <span>nuvio.kr</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
