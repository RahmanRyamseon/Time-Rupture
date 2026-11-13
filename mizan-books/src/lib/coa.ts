import type { Account, CategoryRule } from "./types";

/** Codes the posting logic depends on. */
export const SYS = {
  cash: "1000",
  bank: "1010",
  ar: "1100",
  vatIn: "1300",
  ap: "2000",
  vatOut: "2200",
  retained: "3300",
  openingEquity: "3900",
  sales: "4000",
  generalExpense: "6990",
  suspense: "9999",
} as const;

type Row = [string, string, string, Account["type"], Account["subtype"], Account["cf"], boolean?];

// IFRS for SMEs–style chart of accounts for GCC micro, small and medium enterprises.
const ROWS: Row[] = [
  ["1000", "Cash on hand", "النقد في الصندوق", "asset", "cash", "cash", true],
  ["1010", "Bank – current account", "البنك – الحساب الجاري", "asset", "cash", "cash", true],
  ["1100", "Accounts receivable (customers)", "الذمم المدينة (العملاء)", "asset", "current_asset", "operating", true],
  ["1150", "Prepayments & deposits", "مصروفات مدفوعة مقدماً وتأمينات", "asset", "current_asset", "operating"],
  ["1200", "Inventory", "المخزون", "asset", "current_asset", "operating"],
  ["1300", "VAT recoverable (input VAT)", "ضريبة القيمة المضافة على المشتريات (مدخلات)", "asset", "current_asset", "operating", true],
  ["1500", "Furniture, fixtures & equipment", "الأثاث والتجهيزات والمعدات", "asset", "non_current_asset", "investing"],
  ["1510", "Motor vehicles", "المركبات", "asset", "non_current_asset", "investing"],
  ["1550", "Accumulated depreciation", "مجمع الإهلاك", "asset", "contra_asset", "operating"],
  ["2000", "Accounts payable (suppliers)", "الذمم الدائنة (الموردون)", "liability", "current_liability", "operating", true],
  ["2100", "Accrued expenses", "مصروفات مستحقة", "liability", "current_liability", "operating"],
  ["2200", "VAT payable (output VAT)", "ضريبة القيمة المضافة على المبيعات (مخرجات)", "liability", "current_liability", "operating", true],
  ["2300", "Corporate tax / Zakat payable", "ضريبة الشركات / الزكاة المستحقة", "liability", "current_liability", "operating"],
  ["2400", "Short-term loans & credit cards", "قروض قصيرة الأجل وبطاقات ائتمان", "liability", "current_liability", "financing"],
  ["2450", "Due to owner / related parties", "مستحق للمالك / أطراف ذات علاقة", "liability", "current_liability", "financing"],
  ["2500", "End-of-service benefits provision", "مخصص مكافأة نهاية الخدمة", "liability", "non_current_liability", "operating"],
  ["2600", "Long-term loans", "قروض طويلة الأجل", "liability", "non_current_liability", "financing"],
  ["3000", "Share capital / owner's capital", "رأس المال", "equity", "equity", "financing"],
  ["3100", "Owner's drawings / dividends", "مسحوبات المالك / توزيعات أرباح", "equity", "equity", "financing"],
  ["3200", "Statutory reserve", "الاحتياطي القانوني", "equity", "equity", "financing"],
  ["3300", "Retained earnings", "الأرباح المحتجزة", "equity", "equity", "financing", true],
  ["3900", "Opening balance equity", "حقوق ملكية – أرصدة افتتاحية", "equity", "equity", "financing", true],
  ["4000", "Sales revenue", "إيرادات المبيعات", "revenue", "revenue", "none", true],
  ["4100", "Service revenue", "إيرادات الخدمات", "revenue", "revenue", "none"],
  ["4900", "Other income", "إيرادات أخرى", "revenue", "other_income", "none"],
  ["5000", "Cost of goods sold", "تكلفة البضاعة المباعة", "expense", "cogs", "none"],
  ["5100", "Direct costs & subcontractors", "تكاليف مباشرة ومقاولون من الباطن", "expense", "cogs", "none"],
  ["6000", "Salaries & wages", "الرواتب والأجور", "expense", "expense", "none"],
  ["6010", "Staff benefits & end-of-service", "مزايا الموظفين ومكافأة نهاية الخدمة", "expense", "expense", "none"],
  ["6020", "Visa, licence & government fees", "التأشيرات والرخص والرسوم الحكومية", "expense", "expense", "none"],
  ["6100", "Rent", "الإيجار", "expense", "expense", "none"],
  ["6200", "Electricity & water", "الكهرباء والمياه", "expense", "expense", "none"],
  ["6210", "Telephone & internet", "الهاتف والإنترنت", "expense", "expense", "none"],
  ["6300", "Transport, fuel & tolls", "النقل والوقود والرسوم", "expense", "expense", "none"],
  ["6400", "Office supplies & stationery", "اللوازم المكتبية والقرطاسية", "expense", "expense", "none"],
  ["6500", "Marketing & advertising", "التسويق والإعلان", "expense", "expense", "none"],
  ["6600", "Professional & legal fees", "الأتعاب المهنية والقانونية", "expense", "expense", "none"],
  ["6700", "Repairs & maintenance", "الإصلاح والصيانة", "expense", "expense", "none"],
  ["6800", "Insurance", "التأمين", "expense", "expense", "none"],
  ["6850", "Meals & entertainment", "الضيافة والوجبات", "expense", "expense", "none"],
  ["6860", "Software & subscriptions", "البرمجيات والاشتراكات", "expense", "expense", "none"],
  ["6900", "Depreciation", "الإهلاك", "expense", "expense", "none"],
  ["6950", "Bank charges & commissions", "الرسوم والعمولات البنكية", "expense", "expense", "none"],
  ["6990", "General & administrative expenses", "مصروفات عمومية وإدارية", "expense", "expense", "none", true],
  ["7000", "Finance costs (interest / profit)", "تكاليف التمويل", "expense", "finance_cost", "none"],
  ["8000", "Corporate tax / Zakat expense", "مصروف ضريبة الشركات / الزكاة", "expense", "tax", "none"],
  ["9999", "Suspense – to be classified", "حساب معلق – قيد التصنيف", "asset", "suspense", "operating", true],
];

export function defaultAccounts(): Account[] {
  return ROWS.map(([code, name, nameAr, type, subtype, cf, system]) => ({
    code, name, nameAr, type, subtype, cf, ...(system ? { system: true } : {}),
  }));
}

/**
 * Keyword → account rules for auto-classifying bank lines and suppliers.
 * Includes common GCC utilities, telcos, government portals and banks' fee wording.
 */
export function defaultRules(): CategoryRule[] {
  const r = (account: string, words: string[]) => words.map((keyword) => ({ keyword, account }));
  return [
    ...r("6000", ["salary", "salaries", "payroll", "wps", "wages", "رواتب", "راتب", "أجور"]),
    ...r("6010", ["gosi", "gpssa", "pasi", "sio ", "end of service", "gratuity", "التأمينات الاجتماعية", "مكافأة نهاية"]),
    ...r("6020", ["mohre", "qiwa", "absher", "muqeem", "lmra", "gdrfa", "icp ", "tasheel", "amer", "visa fee", "trade licen", "dedc", "ded ", "baladiya", "municipality", "chamber of commerce", "بلدية", "تأشيرة", "رخصة", "جوازات"]),
    ...r("6100", ["rent", "ejari", "lease", "إيجار", "ايجار"]),
    ...r("6200", ["dewa", "sewa", "addc", "aadc", "fewa", "etihad water", "kahramaa", "saudi electricity", " sec ", "nws", "ewa ", "mew ", "nama ", "كهرباء", "مياه"]),
    ...r("6210", ["etisalat", "e& ", "du ", "stc", "mobily", "zain", "ooredoo", "omantel", "batelco", "vodafone", "internet", "اتصالات", "زين", "موبايلي"]),
    ...r("6300", ["adnoc", "enoc", "eppco", "emarat", "aldrees", "petromin", "sasco", "naft", "fuel", "petrol", "salik", "darb", "careem", "uber", "taxi", "rta", "وقود", "بنزين"]),
    ...r("6400", ["stationery", "office supplies", "قرطاسية"]),
    ...r("6500", ["google ads", "facebk", "facebook", "meta ads", "instagram", "snapchat", "tiktok", "linkedin", "advert", "marketing", "إعلان"]),
    ...r("6600", ["audit", "legal", "lawyer", "consult", "accounting fee", "محاماة", "استشار", "تدقيق"]),
    ...r("6800", ["insurance", "takaful", "تأمين", "تكافل"]),
    ...r("6850", ["restaurant", "cafe", "coffee", "talabat", "deliveroo", "hungerstation", "jahez", "keeta", "مطعم"]),
    ...r("6860", ["microsoft", "google workspace", "gsuite", "zoho", "adobe", "aws", "amazon web", "openai", "anthropic", "subscription", "اشتراك"]),
    ...r("6950", ["bank charge", "service charge", "commission", "fee ", "fees", "charges", "vat on charges", "عمولة", "رسوم بنكية", "رسوم خدمة"]),
    ...r("7000", ["interest", "profit charge", "finance charge", "فائدة", "فوائد", "أرباح التمويل"]),
    ...r("2200", ["fta ", "federal tax", "zatca", "nbr ", "tax authority", "vat payment", "vat return", "ضريبة القيمة المضافة", "الزكاة والضريبة"]),
    ...r("1000", ["atm", "cash withdrawal", "cash deposit", "سحب نقدي", "صراف"]),
    ...r("4000", ["pos settlement", "card settlement", "network international", "magnati", "geidea", "mada settlement", "stripe", "checkout.com", "tap payments", "تسوية نقاط البيع"]),
    // Invoice line-item words (used when the supplier name alone doesn't tell).
    ...r("6400", ["toner", "printer paper", "a4 paper", "stationery", "pens", "envelopes", "cartridge", "ورق", "حبر"]),
    ...r("1500", ["laptop", "computer", "desktop pc", "monitor", "furniture", "office chair", "desk ", "air conditioner", "split ac", "حاسوب", "أثاث", "مكيف"]),
    ...r("1510", ["vehicle purchase", "car purchase", "pickup truck", "شراء سيارة"]),
    ...r("6700", ["repair", "maintenance", "spare parts", "servicing", "plumbing", "electrical work", "صيانة", "إصلاح", "قطع غيار"]),
    ...r("6300", ["diesel", "gasoline", "parking", "car rental", "courier", "aramex", "dhl", "fedex", "smsa", "shipping", "freight", "شحن", "توصيل"]),
    ...r("5000", ["goods for resale", "inventory purchase", "raw material", "stock purchase", "بضاعة", "مواد خام"]),
    ...r("6860", ["software", "licence fee", "license fee", "domain", "hosting", "cloud", "saas", "برنامج", "استضافة"]),
    ...r("6600", ["consultancy", "audit fee", "accounting services", "legal services", "pro services", "typing centre", "أتعاب", "خدمات قانونية"]),
    ...r("6500", ["printing of flyers", "brochure", "billboard", "promotion", "sponsorship", "طباعة إعلانات", "ترويج"]),
    ...r("6850", ["entertainment", "catering", "hospitality", "business lunch", "business dinner", "ضيافة"]),
    ...r("3100", ["drawings", "owner withdrawal", "dividend", "مسحوبات", "توزيعات"]),
    ...r("2400", ["credit card payment", "card payment", "loan installment", "loan repayment", "قسط", "سداد بطاقة"]),
  ];
}

/** Picks an account for a narration using rules (learned rules win), or null. */
export function classify(text: string, rules: CategoryRule[]): string | null {
  return classifyDetailed(text, rules)?.account ?? null;
}

/** Like classify, but also returns the rule that matched (to explain the choice). */
export function classifyDetailed(text: string, rules: CategoryRule[]): CategoryRule | null {
  const base = text.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF&.]+/g, " ").replace(/\s+/g, " ").trim();
  // Arabic attaches prefixes (ال، لل، و، ب، ف…) to words: add each word's bare form so
  // "للصيانة" also matches the keyword "صيانة".
  const bare = base.split(" ").map((w) => w.replace(/^(?:وال|بال|فال|كال|لل|ال|و|ب|ف|ل)(?=[\u0600-\u06FF]{3,})/, "")).join(" ");
  const t = ` ${base} ${bare !== base ? bare + " " : ""}`;
  // Keywords match from a word start; a trailing space in a keyword ("du ") also requires a word end.
  const hit = (k: string) => t.includes(` ${k.trim()}${k.endsWith(" ") ? " " : ""}`);
  const ordered = [...rules.filter((r) => r.learned), ...rules.filter((r) => !r.learned)];
  let best: CategoryRule | null = null;
  for (const r of ordered) {
    if (hit(r.keyword) && (!best || (r.learned && !best.learned) || (r.learned === best.learned && r.keyword.length > best.keyword.length))) {
      best = r;
    }
  }
  return best;
}

/** Derives a short, reusable keyword from a bank narration for a learned rule. */
export function learnKeyword(text: string): string | null {
  const cleaned = text
    .toLowerCase()
    .replace(/[0-9٠-٩]+/g, " ")
    .replace(/\b(pos|purchase|card|debit|credit|trf|transfer|ref|txn|no|ft|ibft|inward|outward|ae|sa|dubai|abu dhabi|riyadh|jeddah|doha|kuwait|manama|muscat)\b/g, " ")
    .replace(/[^a-z؀-ۿ& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((w) => w.length > 2);
  if (!words.length) return null;
  return words.slice(0, 2).join(" ");
}
