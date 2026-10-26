export interface StateInfo {
  name: string;
  slug: string;
  officialPortal: string;
}

export const INDIAN_STATES: StateInfo[] = [
  { name: "Andhra Pradesh", slug: "andhra-pradesh", officialPortal: "https://ap.gov.in" },
  { name: "Arunachal Pradesh", slug: "arunachal-pradesh", officialPortal: "https://arunachalpradesh.gov.in" },
  { name: "Assam", slug: "assam", officialPortal: "https://assam.gov.in" },
  { name: "Bihar", slug: "bihar", officialPortal: "https://state.bihar.gov.in" },
  { name: "Chhattisgarh", slug: "chhattisgarh", officialPortal: "https://cg.gov.in" },
  { name: "Goa", slug: "goa", officialPortal: "https://goa.gov.in" },
  { name: "Gujarat", slug: "gujarat", officialPortal: "https://gujaratindia.gov.in" },
  { name: "Haryana", slug: "haryana", officialPortal: "https://haryana.gov.in" },
  { name: "Himachal Pradesh", slug: "himachal-pradesh", officialPortal: "https://himachal.nic.in" },
  { name: "Jharkhand", slug: "jharkhand", officialPortal: "https://jharkhand.gov.in" },
  { name: "Karnataka", slug: "karnataka", officialPortal: "https://karnataka.gov.in" },
  { name: "Kerala", slug: "kerala", officialPortal: "https://kerala.gov.in" },
  { name: "Madhya Pradesh", slug: "madhya-pradesh", officialPortal: "https://mp.gov.in" },
  { name: "Maharashtra", slug: "maharashtra", officialPortal: "https://maharashtra.gov.in" },
  { name: "Manipur", slug: "manipur", officialPortal: "https://manipur.gov.in" },
  { name: "Meghalaya", slug: "meghalaya", officialPortal: "https://meghalaya.gov.in" },
  { name: "Mizoram", slug: "mizoram", officialPortal: "https://mizoram.gov.in" },
  { name: "Nagaland", slug: "nagaland", officialPortal: "https://nagaland.gov.in" },
  { name: "Odisha", slug: "odisha", officialPortal: "https://odisha.gov.in" },
  { name: "Punjab", slug: "punjab", officialPortal: "https://punjab.gov.in" },
  { name: "Rajasthan", slug: "rajasthan", officialPortal: "https://rajasthan.gov.in" },
  { name: "Sikkim", slug: "sikkim", officialPortal: "https://sikkim.gov.in" },
  { name: "Tamil Nadu", slug: "tamil-nadu", officialPortal: "https://tn.gov.in" },
  { name: "Telangana", slug: "telangana", officialPortal: "https://telangana.gov.in" },
  { name: "Tripura", slug: "tripura", officialPortal: "https://tripura.gov.in" },
  { name: "Uttar Pradesh", slug: "uttar-pradesh", officialPortal: "https://up.gov.in" },
  { name: "Uttarakhand", slug: "uttarakhand", officialPortal: "https://uk.gov.in" },
  { name: "West Bengal", slug: "west-bengal", officialPortal: "https://wb.gov.in" },
  { name: "Delhi", slug: "delhi", officialPortal: "https://delhi.gov.in" },
  { name: "Jammu and Kashmir", slug: "jammu-and-kashmir", officialPortal: "https://jk.gov.in" },
  { name: "Ladakh", slug: "ladakh", officialPortal: "https://ladakh.gov.in" },
  { name: "Puducherry", slug: "puducherry", officialPortal: "https://py.gov.in" },
  { name: "Chandigarh", slug: "chandigarh", officialPortal: "https://chandigarh.gov.in" },
  { name: "Andaman and Nicobar Islands", slug: "andaman-and-nicobar-islands", officialPortal: "https://andaman.gov.in" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", slug: "dnh-and-dd", officialPortal: "https://ddd.gov.in" },
  { name: "Lakshadweep", slug: "lakshadweep", officialPortal: "https://lakshadweep.gov.in" },
];

export function slugToStateName(slug: string): string | undefined {
  return INDIAN_STATES.find((s) => s.slug === slug)?.name;
}

export function stateNameToSlug(name: string): string | undefined {
  return INDIAN_STATES.find((s) => s.name === name)?.slug;
}
