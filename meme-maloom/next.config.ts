import type { NextConfig } from "next";

// Third-party embed widgets (YouTube, Tenor, X/Instagram) load their own
// scripts/frames from these origins — see src/lib/embeds.ts for the same
// allowlist used to validate embed URLs before they ever reach the page.
const EMBED_SCRIPT_ORIGINS = [
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
  "https://tenor.com",
  "https://platform.twitter.com",
  "https://www.instagram.com",
].join(" ");
const EMBED_FRAME_ORIGINS = [
  "https://www.youtube-nocookie.com",
  "https://tenor.com",
  "https://platform.twitter.com",
  "https://www.instagram.com",
].join(" ");

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${EMBED_SCRIPT_ORIGINS}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  `frame-src 'self' ${EMBED_FRAME_ORIGINS}`,
  `connect-src 'self' ${EMBED_SCRIPT_ORIGINS}`,
  "font-src 'self' data:",
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
