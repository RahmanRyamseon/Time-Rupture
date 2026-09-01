export interface Country {
  id: string;
  name: string;
  flag: string;
  available: boolean;
}

// The six GCC markets from the product spec's go-to-market plan — Bahrain first.
export const COUNTRIES: Country[] = [
  { id: "bahrain", name: "Bahrain", flag: "🇧🇭", available: true },
  { id: "uae", name: "UAE", flag: "🇦🇪", available: false },
  { id: "saudi", name: "Saudi Arabia", flag: "🇸🇦", available: false },
  { id: "qatar", name: "Qatar", flag: "🇶🇦", available: false },
  { id: "kuwait", name: "Kuwait", flag: "🇰🇼", available: false },
  { id: "oman", name: "Oman", flag: "🇴🇲", available: false },
];

export const countryById = (id: string) => COUNTRIES.find((c) => c.id === id);
