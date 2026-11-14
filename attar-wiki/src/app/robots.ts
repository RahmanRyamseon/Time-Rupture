import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Block indexing of previews on Vercel (VERCEL_ENV) and Netlify (CONTEXT).
  const isProd = process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === "production"
    : process.env.CONTEXT
      ? process.env.CONTEXT === "production"
      : true;
  if (!isProd) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/moderate", "/hi/moderate", "/account", "/hi/account", "/shelf", "/hi/shelf", "/sign-in", "/hi/sign-in", "/*/edit", "/new/", "/hi/new/", "/*/history"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
