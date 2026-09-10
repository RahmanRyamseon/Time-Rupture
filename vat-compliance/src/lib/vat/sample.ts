// Illustrative AP/AR rows for the "Load sample" buttons, shaped identically
// to what parseWorkbook() would produce from a real .xlsx.

export interface SampleRow {
  invoice: string;
  date: string;
  party: string;
  trn: string;
  description: string;
  net: number;
  vat: number;
  gross: number;
  country: string;
  currency: string;
}

export const SAMPLE_AP: SampleRow[] = [
  { invoice: "AP-1001", date: "2026-08-04", party: "Gulf Office Supplies WLL", trn: "1023456789012", description: "Printer toner and stationery", net: 420, vat: 42, gross: 462, country: "Bahrain", currency: "BHD" },
  { invoice: "AP-1002", date: "2026-08-06", party: "Al Manar Catering Co.", trn: "1099887766001", description: "Client hospitality catering", net: 300, vat: 30, gross: 330, country: "Bahrain", currency: "BHD" },
  { invoice: "AP-1003", date: "2026-08-09", party: "Riyadh Freight Ltd.", trn: "3011122233044", description: "Freight forwarding — imported machinery parts", net: 5000, vat: 0, gross: 5000, country: "Saudi Arabia", currency: "BHD" },
  { invoice: "AP-1004", date: "2026-08-11", party: "Manama Grocers", trn: "1044556677088", description: "Rice and flour for staff pantry", net: 150, vat: 0, gross: 150, country: "Bahrain", currency: "BHD" },
  { invoice: "AP-1005", date: "2026-08-15", party: "Unregistered Vendor", trn: "", description: "Consulting services", net: 800, vat: 80, gross: 880, country: "Bahrain", currency: "BHD" },
  { invoice: "AP-1006", date: "2026-08-18", party: "Gulf Office Supplies WLL", trn: "1023456789012", description: "Printer toner and stationery", net: 420, vat: 42, gross: 462, country: "Bahrain", currency: "BHD" },
  { invoice: "AP-1007", date: "2026-07-29", party: "Bahrain IT Services", trn: "1055667788099", description: "Server hosting — August", net: 600, vat: 55, gross: 655, country: "Bahrain", currency: "BHD" },
];

export const SAMPLE_AR: SampleRow[] = [
  { invoice: "AR-2001", date: "2026-08-03", party: "Falcon Trading Co.", trn: "1077889900011", description: "Consulting services rendered", net: 2000, vat: 200, gross: 2200, country: "Bahrain", currency: "BHD" },
  { invoice: "AR-2002", date: "2026-08-07", party: "Doha Retail Group", trn: "2088990011022", description: "Software licence — export supply", net: 1500, vat: 0, gross: 1500, country: "Qatar", currency: "BHD" },
  { invoice: "AR-2003", date: "2026-08-10", party: "Individual Customer", trn: "", description: "Retail sale — walk-in", net: 90, vat: 9, gross: 99, country: "Bahrain", currency: "BHD" },
  { invoice: "AR-2004", date: "2026-08-14", party: "Dubai Holdings", trn: "5099001122033", description: "Advisory fee — export, VAT charged in error", net: 3000, vat: 300, gross: 3300, country: "UAE", currency: "BHD" },
  { invoice: "AR-2005", date: "2026-08-20", party: "Falcon Trading Co.", trn: "1077889900011", description: "Consulting services rendered", net: 2000, vat: 200, gross: 2200, country: "Bahrain", currency: "BHD" },
];
