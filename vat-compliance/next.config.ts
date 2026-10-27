import type { NextConfig } from "next";

// Only loaded/rendered when NEXT_PUBLIC_ADSENSE_CLIENT_ID is set (see
// src/components/AdSlot.tsx) — these origins sit inert in the CSP otherwise.
const ADSENSE_ORIGINS = [
  "https://pagead2.googlesyndication.com",
  "https://tpc.googlesyndication.com",
  "https://googleads.g.doubleclick.net",
].join(" ");

const csp = [
  "default-src 'self'",
  // next/font self-hosts IBM Plex Sans/Mono at build time, so no external
  // font origin needs to be allowlisted here.
  `script-src 'self' 'unsafe-inline' ${ADSENSE_ORIGINS}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${ADSENSE_ORIGINS}`,
  "font-src 'self'",
  `connect-src 'self' ${ADSENSE_ORIGINS}`,
  `frame-src ${ADSENSE_ORIGINS}`,
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
