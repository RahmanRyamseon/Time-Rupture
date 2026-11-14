import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "معجم الطِّيب — موسوعة العود والعطور",
    short_name: "معجم الطِّيب",
    description: "موسوعة عربية مجتمعية مستقلة عن العود ودهن العود والمخلّطات والمسك ودهن الورد والبخور.",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0806",
    theme_color: "#120c09",
    categories: ["books", "education", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "بحث", url: "/%D8%A8%D8%AD%D8%AB" },
      { name: "المرشد", url: "/%D8%A7%D9%84%D9%85%D8%B1%D8%B4%D8%AF" },
      { name: "مجموعتي", url: "/%D9%85%D8%AC%D9%85%D9%88%D8%B9%D8%AA%D9%8A" },
    ],
  };
}
