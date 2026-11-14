import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME}: attars & perfume oils`,
    short_name: SITE_NAME,
    description: "The open community encyclopedia of attars and perfume oils, built for Indian weather.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf6ee",
    theme_color: "#3b2414",
    lang: "en",
    dir: "ltr",
    categories: ["books", "reference", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Search", url: "/search", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Find your attar", url: "/finder", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My Shelf", url: "/shelf", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
