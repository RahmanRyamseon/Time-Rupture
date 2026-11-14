/**
 * Arabic + transliteration normalisation shared by the client search, the API
 * and (mirrored in SQL as public.normalize_ar) the database.
 */
const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g;

export function normalizeArabic(input: string): string {
  return input
    .normalize("NFKC")
    .replace(TASHKEEL, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function normalize(input: string): string {
  return normalizeArabic(input.toLowerCase())
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip common Arabic clitics so "العود", "بالعود" and "عود" meet. */
export function stemToken(token: string): string {
  if (/^[؀-ۿ]+$/.test(token)) {
    for (const p of ["وال", "بال", "كال", "فال", "لل", "ال"]) {
      if (token.startsWith(p) && token.length - p.length >= 2) return token.slice(p.length);
    }
  }
  return token;
}

export function tokenize(input: string): string[] {
  return normalize(input)
    .split(" ")
    .filter(Boolean)
    .map(stemToken);
}

/**
 * Transliteration / synonym groups. Every member of a group expands to the whole
 * group, so "oudh", "ood", "عود" and "agarwood" all find the same entries.
 */
export const SYNONYM_GROUPS: string[][] = [
  ["عود", "oud", "oudh", "ood", "aoud", "oodh", "agarwood", "aloeswood", "اود"],
  ["دهن", "dehn", "dahn", "dhn", "dhan", "dehnal", "dahnal", "دهن"],
  ["بخور", "bakhoor", "bukhoor", "bakhour", "bakhur", "bukhur", "bakhoor", "incense"],
  ["مخلط", "مخلطات", "mukhallat", "mukhalat", "mukhalath", "mukhallath"],
  ["مسك", "musk", "misk"],
  ["ورد", "rose", "ward", "warda", "wardh"],
  ["طايف", "طايفي", "taif", "taifi", "taify"],
  ["كمبودي", "cambodi", "cambodian", "combodi", "kambodi", "cambodia"],
  ["هندي", "hindi", "indian", "india", "assam", "اسام"],
  ["ماليزي", "malaysian", "malaysia"],
  ["تايلندي", "thai", "thailand", "trat"],
  ["اندونيسي", "indonesian", "indonesia", "kalimantan", "كاليمانتان", "merauke", "ميراوكي"],
  ["فيتنامي", "vietnamese", "vietnam"],
  ["لاوسي", "laotian", "laos", "lao"],
  ["عنبر", "amber", "anbar"],
  ["زعفران", "saffron", "zafaran"],
  ["صندل", "sandalwood", "sandal"],
  ["مبخره", "مجمره", "mabkhara", "mubkhar", "mijmara", "majmara", "censer"],
  ["توله", "tola", "tolah"],
  ["عتيق", "معتق", "ateeq", "ateek", "moattaq", "muattaq", "aged"],
].map((g) => g.map((t) => stemToken(normalize(t))));

const SYNONYM_INDEX = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) for (const t of group) SYNONYM_INDEX.set(t, group);

export function expandToken(token: string): string[] {
  return SYNONYM_INDEX.get(token) ?? [token];
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Turn any title into a URL slug: keeps Arabic letters, drops diacritics and tatweel. */
export function slugify(input: string): string {
  return input
    .normalize("NFKC")
    .replace(TASHKEEL, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
