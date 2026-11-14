import type { Bi } from "./types";

export type StaticPageKey = "about" | "contributing" | "citation-policy" | "image-policy" | "privacy" | "terms";

export const STATIC_PAGES: Record<StaticPageKey, { title: Bi; summary: Bi; body: Bi }> = {
  about: {
    title: { ar: "عن مِجمَرة", en: "About Mijmara" },
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
مِجمَرة مشروع مجتمعي مستقل، غير تابع لأي علامة تجارية أو دار عطور. اسمها مأخوذ من المجمرة، أي المبخرة التي يُدار بها البخور في المجالس.`,
      en: `## Why this encyclopedia?
There is plenty of talk about oud and attar, and little documentation. We wanted an Arabic-first reference that gathers what is known about dehn al oud, mukhallat, musk, rose oils and bakhoor, and links every fact to its source so readers can judge for themselves.

## Principles
- **No fact without a source.** Every field shows its citation; undocumented fields say “Not documented yet — help add it”.
- **No selling, no marketing.** No buy buttons, carts or affiliate links. We link only to houses' official websites.
- **No authenticity verdicts** on a specific product without a documented source.
- **Original writing.** We write our own text and cite other sites only as linked sources.

## Who we are
Mijmara is an independent community project, not affiliated with any brand or perfume house. It is named after the mijmara — the incense burner passed around the majlis.`,
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
أسماء الدور والمنتجات ملك لأصحابها، وتُذكر لأغراض التعريف فقط. مِجمَرة غير تابعة لأي منها.`,
      en: `## Nature of the content
Content is for reference and education — not purchase advice or a certificate of authenticity. Prices shown are reported on a stated date and may change.

## Contributions
By submitting a contribution you confirm it is your own writing or attributed to its source, and that you have the right to publish any image you upload.

## Trademarks
House and product names belong to their owners and are used for identification only. Mijmara is not affiliated with any of them.`,
    },
  },
};
