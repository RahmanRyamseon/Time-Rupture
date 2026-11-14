import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./ar.json";
import en from "./en.json";

const STORAGE_KEY = "em.lang";
export type Lang = "en" | "ar";

function initialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "ar") return saved;
  return navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function applyDirection(lang: string) {
  document.documentElement.lang = lang;
  document.documentElement.dir = i18n.dir(lang);
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initialLang(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});
applyDirection(i18n.language);
i18n.on("languageChanged", (lang) => {
  localStorage.setItem(STORAGE_KEY, lang);
  applyDirection(lang);
});

/** Western digits in both languages, as is usual in Gulf engineering documents. */
export function numberLocale(): string {
  return i18n.language === "ar" ? "ar-u-nu-latn" : "en";
}

export default i18n;
