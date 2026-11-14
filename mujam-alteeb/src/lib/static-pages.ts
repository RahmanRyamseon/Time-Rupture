import type { Bi } from "./types";

export type StaticPageKey = "about" | "contributing" | "citation-policy" | "image-policy" | "privacy" | "terms" | "methodology";

export const STATIC_PAGES: Record<StaticPageKey, { title: Bi; summary: Bi; body: Bi }> = {
  methodology: {
    title: { ar: "المنهجية ومصادر البيانات", en: "Methodology & data sources" },
    summary: { ar: "من أين تأتي بيانات معجم الطِّيب، وكيف تُعالج، وما الذي لا نفعله، وحدود ما نعرفه.", en: "Where Mu'jam al-Teeb's data comes from, how it is processed, what we deliberately do not do, and the limits of what we know." },
    body: {
      ar: `## 1. مصادر البيانات
- **المداخل المحرّرة يدوياً:** عدد محدود من المنتجات والدور وأصول العود والمكوّنات والمقالات، بحثناها من مصادر علنية (مواقع الدور الرسمية، ويكيبيديا، مجلة أرامكو وورلد، أدلة المختصين)، ولكل حقل مصدره.
- **كتالوجات المتاجر الرسمية للدور:** جمعنا آلياً المنتجات المنشورة على المتاجر الرسمية لثماني واجهات بيع تخص سبع دور: سويس أرابيان، وأجمل، ولطافة، وأفنان، وخدلج، وإبراهيم القرشي، وأمواج. يحترم الجامع ملف robots.txt لكل متجر، ويعرّف بنفسه، ويتمهّل بين الطلبات. نأخذ فقط ما تعلنه الدار: الاسم، والنفحات المعلنة صراحةً، والحجم، والتركيز، والفئة (رجالي/نسائي/للجنسين) إن ذُكرت، والسعر المعروض بتاريخه.
- **ما لا نستخدمه:** لا نجمع آلياً من قواعد بيانات المنافسين مثل Fragrantica وParfumo، لأن شروطها تمنع ذلك، ولأن هذه الموسوعة لا تنقل محتوى غيرها. تظهر تلك المواقع عندنا روابطَ مصادر فقط.

## 2. النصوص
- **لا نكتب الحقائق بالذكاء الاصطناعي.** أوصاف المنتجات المجمّعة جُمل قصيرة مركّبة آلياً من الحقول الموثّقة نفسها (التصنيف، والدار، والتركيز، والحجم، والنفحات المعلنة)، ولا تضيف معلومة غير موجودة في المصدر.
- **لا ننسخ نصوص المتاجر التسويقية.** نحفظ نسخة خام محلية للتحقق فقط، ولا تُنشر.
- النصوص العربية والإنجليزية تُكتب منفصلة من البيانات نفسها، وليست ترجمة آلية.

## 3. النفحات
تُقبل النفحة فقط إذا طابقت حرفياً مدخلاً في قاموس نفحات مُراجع يدوياً يضم أسماءها العربية، ولا نستعمل المطابقة التقريبية ولا الترجمة الآلية. إذا لم تنشر الدار نفحات صريحة («نفحات الافتتاحية/القلب/القاعدة»)، يبقى الحقل «لم يُوثَّق بعد». ولا نستخرج نفحات من النصوص الإنشائية.

## 4. العائلات العطرية
نستخدم تصنيف عجلة العطور لمايكل إدواردز (أربع عائلات رئيسية: المنعش، والزهري، والعنبري، والخشبي، وتحتها عائلات فرعية). يُنسب كل مدخل في قاموس النفحات إلى عائلة فرعية، وتُقدَّر عائلة المنتج من أكثر العائلات تكراراً بين نفحاته المعلنة، بشرط وجود ثلاث نفحات مطابقة على الأقل. **هذا تقدير من قائمة النفحات وليس قياساً**، ويظهر على صفحة كل منتج بهذه الصفة.

## 5. الأسعار
الأسعار المعروضة «مُبلَّغ عنها»: كما ظهرت على المتجر الرسمي في تاريخ الجمع، مع العملة والحجم والرابط. ليست عرض بيع، وقد تتغير.

## 6. الصور
لا ننقل صور الزجاجات من المتاجر. لا تظهر صورة إلا برفع مرخّص أو بإذن مكتوب من الدار، مع حفظ الترخيص والنسبة.

## 7. لا روابط تسويق
لا نستخدم روابط تسويق بالعمولة ولا أزرار شراء. الروابط إلى الدور تشير إلى صفحاتها الرسمية فقط، ولا تؤثر في ما ندرجه.

## 8. حدود معروفة
- نحو 81% من المنتجات المجمّعة بلا نفحات، لأن متاجر بعض الدور (مثل سويس أرابيان وأجمل وأمواج) لا تنشر قوائم نفحات صريحة.
- العائلة العطرية مقدّرة لنحو 18% من المنتجات فقط، للسبب نفسه.
- معظم أسماء المنتجات المجمّعة تبقى بحروفها اللاتينية كما تكتبها الدار؛ ولا نكتبها بالحروف العربية إلا إذا نشرت الدار الاسم العربي.
- دور كبرى تبيع عبر منصات أخرى (مثل الحرمين، والرصاصي، وعبد الصمد القرشي، والعربية للعود) ممثلة حالياً بمداخل محرّرة يدوياً فقط.
- الأداء (القوة والثبات والفوحان) يأتي من تصويت المجتمع فقط، ولا نقدّره آلياً.

## 9. التحديث
تُعاد جولة الجمع يدوياً. يذكر كل مصدر تاريخ الاطلاع عليه، ويُفضَّل دائماً تصحيح المجتمع الموثّق بمصدر.`,
      en: `## 1. Data sources
- **Hand-curated entries:** a smaller set of products, houses, oud origins, ingredients and articles researched from public sources (official house sites, Wikipedia, Saudi Aramco World, specialist guides), with a source for every field.
- **Official house store catalogues:** products published on eight official storefronts of seven houses — Swiss Arabian, Ajmal, Lattafa, Afnan, Khadlaj, Ibrahim Al Qurashi and Amouage — collected automatically. The collector honours each store's robots.txt, identifies itself and waits between requests. We keep only what the house publishes: name, explicitly listed notes, size, concentration, gender when stated, and the displayed price with its date.
- **What we do not use:** we do not scrape competitor databases such as Fragrantica or Parfumo — their terms forbid automated collection, and this encyclopedia does not republish other sites' content. Such sites appear here only as linked citations.

## 2. Text
- **No AI-written facts.** Descriptions of collected products are short sentences composed mechanically from the documented fields themselves (category, house, concentration, size, listed notes) and add nothing that is not in the source.
- **No copied marketing copy.** A raw local copy is kept for verification only and is never published.
- Arabic and English text are produced separately from the same data, not machine-translated.

## 3. Notes
A note is accepted only on an exact match with a hand-checked dictionary entry that carries its Arabic name — no fuzzy matching, no machine translation. If the house publishes no explicit note pyramid ("top / heart / base notes"), the field stays "not documented yet". We never mine notes from marketing prose.

## 4. Scent families
We use Michael Edwards' Fragrance Wheel (four main families — Fresh, Floral, Amber, Woody — with sub-families). Each dictionary note maps to a sub-family; a product's family is the most frequent sub-family among its listed notes, and only when at least three notes match. **It is an estimate from the note list, not a measurement**, and is labelled as such on every product page.

## 5. Prices
Prices are "reported": as shown on the official store on the collection date, with currency, size and link. They are not offers and may change.

## 6. Images
We do not copy bottle images from stores. An image appears only with a licensed upload or written permission from the house, with licence and credit stored.

## 7. No affiliate links
No affiliate links and no buy buttons. Links to houses point to their official pages only and do not influence what we list.

## 8. Known limitations
- About 81% of collected products have no notes, because some houses' stores (such as Swiss Arabian, Ajmal and Amouage) do not publish explicit note lists.
- A scent family is estimated for only about 18% of products, for the same reason.
- Most collected product names stay in Latin script as the house writes them; we use an Arabic name only when the house publishes one.
- Major houses that sell through other platforms (such as Al Haramain, Rasasi, Abdul Samad Al Qurashi and Arabian Oud) are currently represented by hand-curated entries only.
- Performance (strength, longevity, sillage) comes only from community votes; we do not estimate it.

## 9. Updates
Collection runs are triggered manually. Every source shows its access date, and documented community corrections are always preferred.`,
    },
  },
  about: {
    title: { ar: "عن معجم الطِّيب", en: "About Mu'jam al-Teeb" },
    summary: { ar: "موسوعة عربية مجتمعية مستقلة عن العود والطِّيب، لا تبيع شيئاً.", en: "An independent, Arabic-first community encyclopedia of oud and attar that sells nothing." },
    body: {
      ar: `## لماذا هذه الموسوعة؟
يكثر الكلام عن العود والطِّيب، ويقلّ التوثيق. أردنا مرجعاً عربياً يجمع ما يُعرف عن دهن العود والمخلّطات والمسك ودهن الورد والبخور، ويربط كل معلومة بمصدرها، حتى يحكم القارئ بنفسه.

## مبادئنا
- **لا معلومة بلا مصدر.** كل حقل يعرض مصدره، والحقل الذي لم يُوثّق يُكتب فيه: «لم يُوثَّق بعد — ساهم بإضافته».
- **لا بيع ولا تسويق.** لا أزرار شراء، ولا سلال، ولا روابط تسويق بالعمولة. نربط فقط بالمواقع الرسمية للدور.
- **لا أحكام على الأصالة** لمنتج بعينه إلا بمصدر موثّق.
- **نصوص أصلية.** نكتب بلغتنا، ونذكر المواقع الأخرى مصادرَ مرتبطة فقط.

## من نحن
معجم الطِّيب مشروع مجتمعي مستقل، غير تابع لأي علامة تجارية أو دار عطور. و«المعجم» هو الكتاب الجامع لمفردات الشيء وشرحها، و«الطِّيب» اسم العرب الجامع للعطر والبخور.`,
      en: `## Why this encyclopedia?
There is plenty of talk about oud and attar, and little documentation. We wanted an Arabic-first reference that gathers what is known about dehn al oud, mukhallat, musk, rose oils and bakhoor, and links every fact to its source so readers can judge for themselves.

## Principles
- **No fact without a source.** Every field shows its citation; undocumented fields say “Not documented yet — help add it”.
- **No selling, no marketing.** No buy buttons, carts or affiliate links. We link only to houses' official websites.
- **No authenticity verdicts** on a specific product without a documented source.
- **Original writing.** We write our own text and cite other sites only as linked sources.

## Who we are
Mu'jam al-Teeb is an independent community project, not affiliated with any brand or perfume house. A mu'jam is a lexicon, and al-teeb is the classical Arabic word for fragrance in all its forms — oils, incense and perfume.`,
    },
  },
  contributing: {
    title: { ar: "دليل المساهمة", en: "Contributing guide" },
    summary: { ar: "كيف تضيف أو تصحح معلومة، وما الذي يقبله المحررون.", en: "How to add or correct information, and what editors accept." },
    body: {
      ar: `## الأدوار
- **القارئ**: يتصفّح الموسوعة دون حساب.
- **المساهم**: يقترح تعديلات ومداخل، ويصوّت، ويكتب مراجعات، ويرفع صوراً مرخّصة.
- **المحرّر**: يراجع قائمة الإشراف ويعتمد التعديلات أو يرفضها.
- **المدير**: يدير الأدوار والإعدادات.

## خطوات التعديل
1. افتح صفحة المدخل واضغط «تحرير».
2. عدّل الحقول، وأرفق رابط مصدر علني لكل حقل غيّرته.
3. اكتب ملخصاً قصيراً للتعديل وأرسله.
4. يراجع المحرّرون التعديل؛ ويُحفظ كل إصدار كاملاً مع الفروق في سجل التعديلات.

## ما الذي نقبله؟
- معلومات منسوبة إلى مصادر علنية يمكن التحقق منها: مواقع الدور الرسمية، والموسوعات، والمقالات الصحفية والعلمية.
- الأسعار مقبولة فقط مع تاريخ الرصد ورابط المصدر، وتُعرض بوصفها «سعراً مُبلَّغاً عنه».

## ما الذي نرفضه؟
- منشأ أو درجة أو سعر من غير مصدر.
- أحكام بأن منتجاً بعينه أصلي أو مقلّد من غير مصدر موثّق.
- نسخ نصوص المواقع الأخرى حرفياً؛ اكتب بأسلوبك وأرفق الرابط.`,
      en: `## Roles
- **Reader**: browses without an account.
- **Contributor**: proposes edits and entries, votes, writes reviews and uploads licensed images.
- **Editor**: reviews the moderation queue and approves or rejects changes.
- **Admin**: manages roles and settings.

## How to edit
1. Open an entry and choose “Edit”.
2. Change fields and attach a public source URL for every field you changed.
3. Write a short edit summary and submit.
4. Editors review it; every version is stored in full, with a diff, in the history.

## What we accept
- Information attributed to verifiable public sources: official house sites, encyclopedias, press and scientific articles.
- Prices only with an observation date and a source link, shown as “reported prices”.

## What we reject
- Origins, grades or prices without a source.
- Claims that a specific product is genuine or counterfeit without a documented source.
- Copying other sites' text verbatim — write in your own words and link the source.`,
    },
  },
  "citation-policy": {
    title: { ar: "سياسة المصادر", en: "Citation policy" },
    summary: { ar: "كيف نوثّق المعلومات ونعرض مصادرها.", en: "How information is documented and sources are shown." },
    body: {
      ar: `## المصدر لكل حقل
تُربط المصادر بالحقول لا بالصفحة كلها: منشأ المنتج له مصدره، ونفحاته لها مصدرها، وسعره له مصدره وتاريخه.

## ترتيب الموثوقية
1. الموقع الرسمي للدار (لبيانات المنتج كالحجم والنفحات المعلنة).
2. الموسوعات والمراجع العلمية والصحفية (للتاريخ والنبات والكيمياء).
3. أدلة المختصين المنشورة (لأوصاف الرائحة)، مع نسبة الوصف إلى قائله.

## «بحاجة إلى مصدر»
يستطيع أي مساهم أن يضع علامة «بحاجة إلى مصدر» على حقل، فتصل إلى المحررين في قائمة الإشراف.

## المنافسون والمواقع الأخرى
تظهر المواقع الأخرى روابطَ مصادر فقط، ولا ننقل نصوصها.`,
      en: `## A source per field
Citations attach to fields, not whole pages: a product's origin has its source, its notes theirs, and its price its own source and date.

## Order of reliability
1. The house's official website (for product data such as size and declared notes).
2. Encyclopedias and scientific or press references (for history, botany and chemistry).
3. Published specialist guides (for scent descriptions), attributed to their author.

## “Citation needed”
Any contributor can flag a field as “citation needed”; flags reach editors in the moderation queue.

## Other sites
Other sites, including competitors, appear only as linked sources; we do not reproduce their text.`,
    },
  },
  "image-policy": {
    title: { ar: "سياسة الصور", en: "Image policy" },
    summary: { ar: "صور مرخّصة فقط، مع الترخيص والنسبة لكل صورة.", en: "Licensed images only, with licence and credit stored for each." },
    body: {
      ar: `## ما نقبله
- صور التقطتها بنفسك (عمل خاص).
- صور بتراخيص المشاع الإبداعي المتوافقة (CC BY، CC BY-SA، CC0) مع ذكر المصدر.
- صور بإذن مكتوب من الدار.

## ما نرفضه
- صور منسوخة من المتاجر أو مواقع الدور دون إذن.
- صور تحمل علامات مائية لجهات أخرى.

## التخزين والمراجعة
يُحفظ لكل صورة ترخيصها ونسبتها ورابط مصدرها، ولا تظهر إلا بعد اعتماد محرّر.`,
      en: `## What we accept
- Photos you took yourself (own work).
- Images under compatible Creative Commons licences (CC BY, CC BY-SA, CC0), with the source credited.
- Images with written permission from the house.

## What we reject
- Images copied from shops or house websites without permission.
- Images carrying third-party watermarks.

## Storage and review
Each image stores its licence, credit and source URL, and appears only after an editor approves it.`,
    },
  },
  privacy: {
    title: { ar: "الخصوصية", en: "Privacy" },
    summary: { ar: "ما نجمعه وما لا نجمعه.", en: "What we collect and what we do not." },
    body: {
      ar: `## دون حساب
يمكنك تصفّح الموسوعة كاملة دون حساب. تُحفظ «مجموعتي» وقائمة المقارنة وإعداد الأرقام على جهازك فقط.

## مع حساب
عند تسجيل الدخول نحفظ بريدك الإلكتروني، واسم المستخدم، وتعديلاتك وتصويتك ومراجعاتك ورفوف مجموعتك، لتشغيل هذه الميزات. لا نبيع البيانات ولا نعرض إعلانات.

## المرشد
عند استخدام المرشد تُرسل اختياراتك (المناسبة والموسم والطابع والقوة) مع بيانات المنتجات إلى خدمة الذكاء الاصطناعي لترتيب الاقتراحات، دون أي بيانات شخصية.

## الحذف
يمكنك طلب حذف حسابك وبياناتك في أي وقت.`,
      en: `## Without an account
You can browse the whole encyclopedia without an account. My Collection, the compare list and the numerals setting are stored on your device only.

## With an account
When you sign in we store your email, username, edits, votes, reviews and collection shelves to run those features. We do not sell data or show ads.

## Matcher
When you use the matcher, your choices (occasion, season, character, strength) and product data are sent to an AI service to rank suggestions — no personal data is included.

## Deletion
You can ask for your account and data to be deleted at any time.`,
    },
  },
  terms: {
    title: { ar: "الشروط", en: "Terms" },
    summary: { ar: "شروط استخدام الموسوعة والمساهمة فيها.", en: "Terms for using and contributing to the encyclopedia." },
    body: {
      ar: `## طبيعة المحتوى
المحتوى مرجعي ومعرفي، وليس نصيحة شراء أو شهادة بأصالة منتج. الأسعار المعروضة مُبلَّغ عنها في تاريخ محدد وقد تتغير.

## المساهمات
بإرسال مساهمة تؤكد أنها من كتابتك أو منسوبة إلى مصدرها، وأنك تملك حق نشر أي صورة ترفعها.

## العلامات التجارية
أسماء الدور والمنتجات ملك لأصحابها، وتُذكر لأغراض التعريف فقط. معجم الطِّيب غير تابعة لأي منها.`,
      en: `## Nature of the content
Content is for reference and education — not purchase advice or a certificate of authenticity. Prices shown are reported on a stated date and may change.

## Contributions
By submitting a contribution you confirm it is your own writing or attributed to its source, and that you have the right to publish any image you upload.

## Trademarks
House and product names belong to their owners and are used for identification only. Mu'jam al-Teeb is not affiliated with any of them.`,
    },
  },
};
