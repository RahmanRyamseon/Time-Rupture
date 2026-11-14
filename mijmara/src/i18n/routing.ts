import { defineRouting } from "next-intl/routing";

/**
 * Internal route (folder name) -> public path per locale.
 * Arabic is the default locale and is served without a prefix.
 */
export const pathnames = {
  "/": "/",
  "/products": { ar: "/منتجات", en: "/products" },
  "/products/[slug]": { ar: "/منتجات/[slug]", en: "/products/[slug]" },
  "/products/[slug]/edit": { ar: "/منتجات/[slug]/تحرير", en: "/products/[slug]/edit" },
  "/products/[slug]/history": { ar: "/منتجات/[slug]/السجل", en: "/products/[slug]/history" },
  "/category/[slug]": { ar: "/تصنيف/[slug]", en: "/category/[slug]" },
  "/houses": { ar: "/دور-العطور", en: "/houses" },
  "/houses/[slug]": { ar: "/دور-العطور/[slug]", en: "/houses/[slug]" },
  "/houses/[slug]/edit": { ar: "/دور-العطور/[slug]/تحرير", en: "/houses/[slug]/edit" },
  "/houses/[slug]/history": { ar: "/دور-العطور/[slug]/السجل", en: "/houses/[slug]/history" },
  "/oud-origins": { ar: "/أصول-العود", en: "/oud-origins" },
  "/oud-origins/[slug]": { ar: "/أصول-العود/[slug]", en: "/oud-origins/[slug]" },
  "/oud-origins/[slug]/edit": { ar: "/أصول-العود/[slug]/تحرير", en: "/oud-origins/[slug]/edit" },
  "/oud-origins/[slug]/history": { ar: "/أصول-العود/[slug]/السجل", en: "/oud-origins/[slug]/history" },
  "/notes": { ar: "/المكونات", en: "/notes" },
  "/notes/[slug]": { ar: "/المكونات/[slug]", en: "/notes/[slug]" },
  "/notes/[slug]/edit": { ar: "/المكونات/[slug]/تحرير", en: "/notes/[slug]/edit" },
  "/notes/[slug]/history": { ar: "/المكونات/[slug]/السجل", en: "/notes/[slug]/history" },
  "/culture": { ar: "/الثقافة", en: "/culture" },
  "/culture/[slug]": { ar: "/الثقافة/[slug]", en: "/culture/[slug]" },
  "/culture/[slug]/edit": { ar: "/الثقافة/[slug]/تحرير", en: "/culture/[slug]/edit" },
  "/culture/[slug]/history": { ar: "/الثقافة/[slug]/السجل", en: "/culture/[slug]/history" },
  "/guides": { ar: "/أدلة", en: "/guides" },
  "/guides/[slug]": { ar: "/أدلة/[slug]", en: "/guides/[slug]" },
  "/guides/[slug]/edit": { ar: "/أدلة/[slug]/تحرير", en: "/guides/[slug]/edit" },
  "/guides/[slug]/history": { ar: "/أدلة/[slug]/السجل", en: "/guides/[slug]/history" },
  "/search": { ar: "/بحث", en: "/search" },
  "/compare": { ar: "/مقارنة", en: "/compare" },
  "/matcher": { ar: "/المرشد", en: "/matcher" },
  "/my-collection": { ar: "/مجموعتي", en: "/my-collection" },
  "/contribute": { ar: "/ساهم", en: "/contribute" },
  "/sign-in": { ar: "/دخول", en: "/sign-in" },
  "/account": { ar: "/حسابي", en: "/account" },
  "/settings": { ar: "/الإعدادات", en: "/settings" },
  "/moderation": { ar: "/الإشراف", en: "/moderation" },
  "/about": { ar: "/عن-الموسوعة", en: "/about" },
  "/contributing": { ar: "/دليل-المساهمة", en: "/contributing" },
  "/citation-policy": { ar: "/سياسة-المصادر", en: "/citation-policy" },
  "/image-policy": { ar: "/سياسة-الصور", en: "/image-policy" },
  "/privacy": { ar: "/الخصوصية", en: "/privacy" },
  "/terms": { ar: "/الشروط", en: "/terms" },
  "/methodology": { ar: "/المنهجية", en: "/methodology" },
  "/offline": "/offline",
} as const;

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "as-needed",
  localeDetection: false,
  pathnames,
  alternateLinks: false,
});

export type AppPathname = keyof typeof pathnames;
