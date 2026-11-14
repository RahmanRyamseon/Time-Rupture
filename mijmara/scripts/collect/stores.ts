/** Official online stores collected by scripts/collect. Only houses' own stores — never resellers. */
export type Store = { key: string; houseId: string; host: string; platform: "shopify"; region: string };

export const STORES: Store[] = [
  { key: "swiss-arabian-uae", houseId: "swiss-arabian", host: "uae.swissarabian.com", platform: "shopify", region: "AE" },
  { key: "swiss-arabian-us", houseId: "swiss-arabian", host: "us.swissarabian.com", platform: "shopify", region: "US" },
  { key: "ajmal-in", houseId: "ajmal", host: "in.ajmal.com", platform: "shopify", region: "IN" },
  { key: "lattafa-us", houseId: "lattafa", host: "www.lattafa-usa.com", platform: "shopify", region: "US" },
  { key: "afnan-us", houseId: "afnan", host: "us.afnan.com", platform: "shopify", region: "US" },
  { key: "khadlaj", houseId: "khadlaj", host: "khadlaj-perfumes.com", platform: "shopify", region: "AE" },
  { key: "ibrahim-al-qurashi-us", houseId: "ibrahim-al-qurashi", host: "usaibrahimalqurashi.com", platform: "shopify", region: "US" },
  { key: "amouage", houseId: "amouage", host: "amouage.com", platform: "shopify", region: "INT" },
];

export const USER_AGENT = "MujamAlTeebResearch/1.0 (independent non-commercial encyclopedia; +https://mujam-alteeb.netlify.app/about)";
