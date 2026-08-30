import type { MerchantCategory } from "@/lib/types";

export const MERCHANT_CATEGORIES: MerchantCategory[] = [
  {
    id: "groceries",
    nameEn: "Groceries",
    nameAr: "بقالة",
    icon: "🛒",
    commonMerchants: ["Lulu Hypermarket", "Carrefour", "Al Jazira", "Mega Mart"],
  },
  {
    id: "dining",
    nameEn: "Dining",
    nameAr: "مطاعم",
    icon: "🍽️",
    commonMerchants: ["Talabat", "Jahez", "Restaurants", "Cafes"],
  },
  {
    id: "fuel",
    nameEn: "Fuel",
    nameAr: "وقود",
    icon: "⛽",
    commonMerchants: ["Bapco", "Oil City"],
  },
  {
    id: "online",
    nameEn: "Online Shopping",
    nameAr: "تسوق إلكتروني",
    icon: "🛍️",
    commonMerchants: ["Amazon.sa", "noon", "Shein", "iHerb"],
  },
  {
    id: "travel",
    nameEn: "Travel",
    nameAr: "سفر",
    icon: "✈️",
    commonMerchants: ["Gulf Air", "Booking.com", "Airlines", "Hotels"],
  },
  {
    id: "education",
    nameEn: "Education",
    nameAr: "تعليم",
    icon: "🎓",
    commonMerchants: ["School fees", "University tuition"],
  },
  {
    id: "utilities",
    nameEn: "Utilities",
    nameAr: "فواتير",
    icon: "💡",
    commonMerchants: ["EWA", "Batelco", "STC Bahrain", "Zain"],
  },
  {
    id: "healthcare",
    nameEn: "Healthcare",
    nameAr: "صحة",
    icon: "🏥",
    commonMerchants: ["Pharmacies", "Clinics", "Hospitals"],
  },
  {
    id: "other",
    nameEn: "Everything Else",
    nameAr: "أخرى",
    icon: "💳",
    commonMerchants: [],
  },
];

export const categoryById = (id: string) =>
  MERCHANT_CATEGORIES.find((c) => c.id === id) ?? MERCHANT_CATEGORIES[MERCHANT_CATEGORIES.length - 1];
