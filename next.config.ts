import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const supabaseImageHostname = getConfiguredHostname(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"} https://connect.facebook.net https://www.instagram.com https://dapi.kakao.com https://t1.kakaocdn.net https://t1.daumcdn.net`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https://images.unsplash.com https://upload.wikimedia.org https://cdn.imweb.me https://*.cdninstagram.com https://*.fbcdn.net https://*.supabase.co https://*.daumcdn.net https://*.kakaocdn.net https://ctt-image.kakao.com https://postcode.map.kakao.com",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self' https://*.supabase.co https://graph.facebook.com https://www.instagram.com https://dapi.kakao.com https://postcode.map.kakao.com https://postcode.map.daum.net",
  "frame-src 'self' https://www.youtube.com https://www.instagram.com https://web.facebook.com https://www.facebook.com https://postcode.map.kakao.com https://postcode.map.daum.net",
  "media-src 'self' https://*.cdninstagram.com https://*.fbcdn.net https://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        headers: securityHeaders,
        source: "/(.*)",
      },
    ];
  },
  images: {
    dangerouslyAllowLocalIP: false,
    maximumRedirects: 0,
    maximumResponseBody: 10 * 1024 * 1024,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "cdn.imweb.me",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
      ...(supabaseImageHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseImageHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

function getConfiguredHostname(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.hostname : undefined;
  } catch {
    return undefined;
  }
}

export default nextConfig;
