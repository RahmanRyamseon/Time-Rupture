/**
 * Hand-checked note dictionary. A listed note is kept only if it matches an alias here
 * (case-insensitive, exact after trimming) — no fuzzy guesses, no machine translation.
 * Fields: id, Arabic name, English name, aliases, character tag, Edwards sub-family.
 */
export type Edwards =
  | "citrus" | "water" | "green" | "aromatic" | "fruity" | "floral" | "soft-floral" | "floral-amber"
  | "soft-amber" | "amber" | "woody-amber" | "woods" | "mossy-woods" | "dry-woods";

export type DictNote = { id: string; ar: string; en: string; aliases: string[]; character: string; edwards: Edwards };

const n = (id: string, ar: string, en: string, character: string, edwards: Edwards, ...aliases: string[]): DictNote =>
  ({ id, ar, en, character, edwards, aliases: [en.toLowerCase(), ...aliases] });

export const NOTE_DICTIONARY: DictNote[] = [
  // Oud & woods
  n("oud", "العود", "Oud (agarwood)", "woody", "woods", "oud", "agarwood", "oud wood", "oudh", "agarwood (oud)", "oud oil", "aoud", "oud accord"),
  n("sandalwood", "خشب الصندل", "Sandalwood", "woody", "woods", "sandal", "sandal wood", "mysore sandalwood", "australian sandalwood"),
  n("cedarwood", "خشب الأرز", "Cedarwood", "woody", "woods", "cedar", "cedar wood", "virginia cedar", "atlas cedar"),
  n("vetiver", "نجيل الهند (الفيتيفر)", "Vetiver", "earthy", "woods", "haitian vetiver"),
  n("patchouli", "الباتشولي", "Patchouli", "earthy", "woods", "pachouli", "patchouli leaf", "indonesian patchouli"),
  n("woods", "الأخشاب", "Woody notes", "woody", "woods", "woody", "wood", "woody notes", "woods", "dry woods", "dry wood", "precious woods", "woody accords"),
  n("cashmere-wood", "خشب الكشمير", "Cashmere wood", "woody", "woody-amber", "cashmere", "cashmeran", "cashmere wood"),
  n("guaiac-wood", "خشب الغاياك", "Guaiac wood", "smoky", "woods", "guaiac", "guaiacwood"),
  n("birch", "البتولا", "Birch", "smoky", "dry-woods", "birch wood", "birchwood", "birch tar"),
  n("rosewood", "خشب الورد", "Rosewood", "woody", "woods", "brazilian rosewood", "rose wood"),
  n("pine", "الصنوبر", "Pine", "fresh", "aromatic", "pine tree", "pine needles"),
  n("cypress", "السرو", "Cypress", "fresh", "aromatic"),
  n("oak", "البلوط", "Oak", "woody", "woods", "oak wood"),
  n("akigalawood", "أكيغالاوود", "Akigalawood", "woody", "woods"),
  n("amberwood", "خشب العنبر", "Amberwood", "amber", "woody-amber", "amber wood", "ambery woods"),
  // Resins, ambers, balsams
  n("amber", "العنبر", "Amber", "amber", "amber", "dry amber", "sweet amber", "white amber", "ambery", "amber accord", "golden amber"),
  n("ambergris", "العنبر الرمادي", "Ambergris", "amber", "woody-amber", "ambergris accord"),
  n("ambroxan", "الأمبروكسان", "Ambroxan", "amber", "woody-amber", "ambrox", "ambrofix"),
  n("incense", "البخور", "Incense", "smoky", "amber", "incense accord"),
  n("frankincense", "اللبان", "Frankincense", "smoky", "amber", "olibanum", "omani frankincense"),
  n("myrrh", "المرّ", "Myrrh", "amber", "amber"),
  n("benzoin", "الجاوي (البنزوين)", "Benzoin", "amber", "soft-amber"),
  n("labdanum", "اللادن", "Labdanum", "amber", "amber", "cistus labdanum"),
  n("opoponax", "الأوبوباناكس", "Opoponax", "amber", "amber"),
  n("elemi", "الإليمي", "Elemi", "fresh", "amber"),
  n("tonka-bean", "حبوب التونكا", "Tonka bean", "sweet", "soft-amber", "tonka", "tonka beans"),
  n("vanilla", "الفانيليا", "Vanilla", "sweet", "soft-amber", "madagascar vanilla", "bourbon vanilla", "vanilla bean", "vanilla cream", "vanilla pod"),
  n("balsamic", "نفحات بلسمية", "Balsamic notes", "amber", "amber", "balsam", "balsams"),
  n("smoke", "الدخان", "Smoke", "smoky", "dry-woods", "smoky", "smoky notes"),
  // Musks & animalic
  n("musk", "المسك", "Musk", "musky", "soft-floral", "musky", "musks", "musk accord", "sensual musk", "clean musk"),
  n("white-musk", "المسك الأبيض", "White musk", "musky", "soft-floral", "white musks"),
  n("powdery-musk", "المسك البودري", "Powdery musk", "musky", "soft-floral"),
  n("leather", "الجلد", "Leather", "leather", "dry-woods", "suede", "leather accord", "gazelle's leather", "chamois"),
  n("tobacco", "التبغ", "Tobacco", "smoky", "dry-woods", "tobacco leaf", "tobacco leaves"),
  // Florals
  n("rose", "الورد", "Rose", "floral", "floral", "roses", "damask rose", "bulgarian rose", "turkish rose", "rose petals", "red rose", "rose absolute"),
  n("taif-rose", "الورد الطائفي", "Taif rose", "floral", "floral", "taif rose", "ward taifi"),
  n("jasmine", "الياسمين", "Jasmine", "floral", "floral", "jasmine sambac", "sambac jasmine", "jasmin", "arabian jasmine"),
  n("orange-blossom", "زهر البرتقال", "Orange blossom", "floral", "floral", "orange flower", "neroli"),
  n("iris", "السوسن", "Iris", "floral", "soft-floral", "orris", "iris flowers", "orris root"),
  n("violet", "البنفسج", "Violet", "floral", "soft-floral", "violets"),
  n("violet-leaf", "ورق البنفسج", "Violet leaf", "green", "green", "violet leaves"),
  n("peony", "الفاوانيا", "Peony", "floral", "floral", "peonies"),
  n("lily-of-the-valley", "زنبق الوادي", "Lily of the valley", "floral", "floral", "muguet"),
  n("lily", "الزنبق", "Lily", "floral", "floral", "white lily"),
  n("tuberose", "مسك الروم (التوبيروز)", "Tuberose", "floral", "floral-amber"),
  n("ylang-ylang", "الإيلنغ إيلنغ", "Ylang-ylang", "floral", "floral-amber", "ylang ylang"),
  n("gardenia", "الغاردينيا", "Gardenia", "floral", "floral"),
  n("heliotrope", "الهليوتروب", "Heliotrope", "floral", "soft-floral"),
  n("freesia", "الفريزيا", "Freesia", "floral", "floral"),
  n("magnolia", "الماغنوليا", "Magnolia", "floral", "floral"),
  n("orchid", "الأوركيد", "Orchid", "floral", "floral-amber"),
  n("geranium", "إبرة الراعي (الجيرانيوم)", "Geranium", "floral", "aromatic"),
  n("carnation", "القرنفل الزهري", "Carnation", "floral", "floral"),
  n("frangipani", "الفرانجيباني", "Frangipani", "floral", "floral-amber", "plumeria"),
  n("hyacinth", "الياقوتية (الهياسنث)", "Hyacinth", "floral", "floral"),
  n("lilac", "الليلك", "Lilac", "floral", "floral"),
  n("tulip", "التوليب", "Tulip", "floral", "floral"),
  n("cherry-blossom", "زهر الكرز", "Cherry blossom", "floral", "floral"),
  n("osmanthus", "الأوسمانثوس", "Osmanthus", "floral", "floral"),
  n("mimosa", "الميموزا", "Mimosa", "floral", "soft-floral"),
  n("white-flowers", "الأزهار البيضاء", "White flowers", "floral", "floral", "white floral", "white flower", "white florals"),
  n("floral", "نفحات زهرية", "Floral notes", "floral", "floral", "flowers", "floral notes", "floral accords"),
  n("lavender", "الخزامى (اللافندر)", "Lavender", "fresh", "aromatic", "lavandin", "french lavender"),
  n("immortelle", "الخالد (الإيمورتيل)", "Immortelle", "amber", "amber"),
  // Citrus & fresh
  n("bergamot", "البرغموت", "Bergamot", "fresh", "citrus", "calabrian bergamot", "italian bergamot"),
  n("lemon", "الليمون", "Lemon", "fresh", "citrus", "sicilian lemon"),
  n("lime", "الليم", "Lime", "fresh", "citrus"),
  n("mandarin", "اليوسفي", "Mandarin", "fresh", "citrus", "mandarin orange", "green mandarin"),
  n("orange", "البرتقال", "Orange", "fresh", "citrus", "bitter orange", "blood orange", "sweet orange"),
  n("grapefruit", "الجريب فروت", "Grapefruit", "fresh", "citrus", "pink grapefruit"),
  n("citrus", "الحمضيات", "Citrus", "fresh", "citrus", "citruses", "citrus notes"),
  n("yuzu", "اليوزو", "Yuzu", "fresh", "citrus"),
  n("lemongrass", "عشب الليمون", "Lemongrass", "fresh", "citrus"),
  n("aquatic", "نفحات مائية", "Aquatic notes", "fresh", "water", "sea notes", "marine notes", "aquatic", "sea salt", "ozonic notes"),
  n("green-notes", "نفحات خضراء", "Green notes", "green", "green", "green", "grass", "green leaves"),
  n("mint", "النعناع", "Mint", "fresh", "aromatic", "peppermint", "spearmint"),
  // Aromatics & spices
  n("saffron", "الزعفران", "Saffron", "spicy", "floral-amber"),
  n("cardamom", "الهيل", "Cardamom", "spicy", "aromatic", "cardamome"),
  n("cinnamon", "القرفة", "Cinnamon", "spicy", "amber"),
  n("pink-pepper", "الفلفل الوردي", "Pink pepper", "spicy", "aromatic", "pink peppercorn", "pink peppercorns"),
  n("black-pepper", "الفلفل الأسود", "Black pepper", "spicy", "aromatic", "pepper"),
  n("ginger", "الزنجبيل", "Ginger", "spicy", "aromatic"),
  n("nutmeg", "جوزة الطيب", "Nutmeg", "spicy", "amber"),
  n("clove", "القرنفل", "Clove", "spicy", "amber", "cloves"),
  n("spices", "البهارات", "Spices", "spicy", "amber", "spicy", "spicy notes", "warm spicy", "fresh spicy", "spice"),
  n("sage", "المريمية", "Sage", "fresh", "aromatic", "clary sage"),
  n("rosemary", "إكليل الجبل", "Rosemary", "fresh", "aromatic"),
  n("thyme", "الزعتر", "Thyme", "fresh", "aromatic"),
  n("basil", "الريحان", "Basil", "fresh", "aromatic"),
  n("coriander", "الكزبرة", "Coriander", "spicy", "aromatic"),
  n("juniper", "العرعر", "Juniper", "fresh", "aromatic", "juniper berry", "juniper berries"),
  n("pimento", "الفلفل الحلو (البيمنتو)", "Pimento", "spicy", "aromatic", "allspice"),
  n("davana", "الدافانا", "Davana", "fruity", "fruity"),
  n("oakmoss", "طحلب البلوط", "Oakmoss", "earthy", "mossy-woods", "oak moss", "moss"),
  // Fruits
  n("raspberry", "توت العليق", "Raspberry", "fruity", "fruity", "raspberries"),
  n("apple", "التفاح", "Apple", "fruity", "fruity", "green apple", "red apple", "granny smith"),
  n("pear", "الكمثرى", "Pear", "fruity", "fruity"),
  n("black-currant", "الكشمش الأسود", "Black currant", "fruity", "fruity", "blackcurrant", "cassis", "black currants"),
  n("red-currant", "الكشمش الأحمر", "Red currant", "fruity", "fruity"),
  n("pineapple", "الأناناس", "Pineapple", "fruity", "fruity"),
  n("peach", "الخوخ", "Peach", "fruity", "fruity", "white peach"),
  n("apricot", "المشمش", "Apricot", "fruity", "fruity"),
  n("plum", "البرقوق", "Plum", "fruity", "fruity", "plums"),
  n("cherry", "الكرز", "Cherry", "fruity", "fruity", "black cherry", "cherries", "cherry jam"),
  n("strawberry", "الفراولة", "Strawberry", "fruity", "fruity", "strawberries"),
  n("berries", "التوتيات", "Berries", "fruity", "fruity", "red berries", "blueberries", "blueberry", "wild berries"),
  n("lychee", "الليتشي", "Lychee", "fruity", "fruity", "litchi"),
  n("mango", "المانجو", "Mango", "fruity", "fruity"),
  n("passion-fruit", "فاكهة الآلام", "Passion fruit", "fruity", "fruity", "passionfruit"),
  n("coconut", "جوز الهند", "Coconut", "sweet", "soft-amber"),
  n("fig", "التين", "Fig", "fruity", "green", "fig leaf"),
  n("pomegranate", "الرمان", "Pomegranate", "fruity", "fruity"),
  n("rhubarb", "الراوند", "Rhubarb", "fruity", "fruity"),
  n("dates", "التمر", "Dates", "sweet", "fruity", "date"),
  n("melon", "الشمام", "Melon", "fruity", "fruity"),
  n("fruits", "نفحات فاكهية", "Fruity notes", "fruity", "fruity", "fruity", "fruits", "fruity notes", "tropical fruits", "fruity accords"),
  // Gourmand
  n("caramel", "الكراميل", "Caramel", "sweet", "soft-amber", "salted caramel", "toffee"),
  n("honey", "العسل", "Honey", "sweet", "soft-amber"),
  n("praline", "البرالين", "Praline", "sweet", "soft-amber"),
  n("chocolate", "الشوكولاتة", "Chocolate", "sweet", "soft-amber", "dark chocolate", "cacao", "cocoa"),
  n("coffee", "القهوة", "Coffee", "sweet", "amber", "arabic coffee"),
  n("almond", "اللوز", "Almond", "sweet", "soft-amber", "bitter almond"),
  n("milk", "الحليب", "Milk", "sweet", "soft-amber", "milky notes"),
  n("sugar", "السكر", "Sugar", "sweet", "soft-amber", "sweet", "sweet notes", "candy"),
  n("candy-floss", "غزل البنات", "Candy floss", "sweet", "soft-amber", "cotton candy"),
  n("pistachio", "الفستق", "Pistachio", "sweet", "soft-amber"),
  n("rum", "الروم", "Rum", "sweet", "amber", "cognac"),
  n("tea", "الشاي", "Tea", "green", "green", "black tea", "green tea"),
  n("powdery", "نفحات بودرية", "Powdery notes", "musky", "soft-floral", "powder", "powdery"),
  n("aldehydes", "الألدهيدات", "Aldehydes", "fresh", "soft-floral", "aldehyde"),
];

const INDEX = new Map<string, DictNote>();
for (const e of NOTE_DICTIONARY) for (const a of e.aliases) INDEX.set(a, e);

export function matchNote(raw: string): DictNote | undefined {
  const k = raw.toLowerCase().replace(/\s+/g, " ").replace(/^(and|with|of)\s+/, "").replace(/[.\s*–-]+$/, "").trim();
  return INDEX.get(k);
}

/** Edwards sub-families with Arabic names (structure per Michael Edwards' Fragrance Wheel). */
export const EDWARDS: { id: Edwards; ar: string; en: string; group: "fresh" | "floral" | "amber" | "woody" }[] = [
  { id: "citrus", ar: "حمضي", en: "Citrus", group: "fresh" },
  { id: "water", ar: "مائي", en: "Water", group: "fresh" },
  { id: "green", ar: "أخضر", en: "Green", group: "fresh" },
  { id: "aromatic", ar: "عطري عشبي", en: "Aromatic", group: "fresh" },
  { id: "fruity", ar: "فاكهي", en: "Fruity", group: "floral" },
  { id: "floral", ar: "زهري", en: "Floral", group: "floral" },
  { id: "soft-floral", ar: "زهري ناعم", en: "Soft Floral", group: "floral" },
  { id: "floral-amber", ar: "زهري عنبري", en: "Floral Amber", group: "floral" },
  { id: "soft-amber", ar: "عنبري ناعم", en: "Soft Amber", group: "amber" },
  { id: "amber", ar: "عنبري", en: "Amber", group: "amber" },
  { id: "woody-amber", ar: "خشبي عنبري", en: "Woody Amber", group: "amber" },
  { id: "woods", ar: "خشبي", en: "Woods", group: "woody" },
  { id: "mossy-woods", ar: "خشبي طحلبي", en: "Mossy Woods", group: "woody" },
  { id: "dry-woods", ar: "خشبي جاف", en: "Dry Woods", group: "woody" },
];
