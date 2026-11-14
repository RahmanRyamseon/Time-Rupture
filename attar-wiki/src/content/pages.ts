/**
 * Editorial pages. Original text written for this project; no factual claims
 * about specific attars, houses or prices.
 * Each page has English Markdown and an optional Hindi version.
 */
export const STATIC_PAGES = {
  about: {
    title: { en: "About this wiki", hi: "इस विकी के बारे में" },
    en: `## What this is

{{name}} is an open, community-written encyclopedia of attars and perfume oils, made for readers in India and South Asia. Each page sets out what is known about an attar, a distiller, an ingredient, a region or a technique, and says plainly where something is **not yet documented**.

## What this is not

- **Not a shop.** Nothing is sold here. There are no carts, offers or affiliate links. Prices appear only as *reported price ranges*, with the date and source.
- **Not affiliated with any brand.** Houses and retailers do not pay for, review or approve pages. Official websites are linked as references.
- **Not a review aggregator with a single score.** Community votes on longevity, sillage and weather performance are shown as averages with the number of votes and the full distribution.

## How information gets here

1. Editors import a first set of entries from vetted spreadsheets, each with sources.
2. Anyone who signs in can suggest edits. Suggestions go into a moderation queue.
3. Editors check sources and approve or reject each suggestion. Every change is kept in the page history with a full snapshot and a diff.

## Our rules

- **Never invent facts.** If something is not documented, the page says so.
- **Write in your own words.** Do not copy text from fragrance databases, brand sites or retailers. Link to them as sources.
- **Cite your sources.** Unsourced claims are flagged with *needs citation*.
- **Respect image rights.** Only upload your own photos or images with a stated license or written permission.

## Safety

Perfume oils are concentrated and can irritate skin. Patch-test any oil on a small area of skin before using it, and stop if irritation occurs.`,
    hi: `## यह क्या है

{{name}} इत्र और परफ़्यूम ऑयल का एक खुला, समुदाय द्वारा लिखा गया विश्वकोश है, जो भारत और दक्षिण एशिया के पाठकों के लिए बनाया गया है। हर पेज बताता है कि किसी इत्र, डिस्टिलर, सामग्री, क्षेत्र या विधि के बारे में क्या पता है, और साफ़ बताता है कि क्या **अभी दर्ज नहीं** है।

## यह क्या नहीं है

- **दुकान नहीं।** यहाँ कुछ नहीं बिकता। क़ीमतें केवल *बताई गई क़ीमत* के रूप में, तारीख़ और स्रोत के साथ दिखती हैं।
- **किसी ब्रांड से जुड़ा नहीं।** घराने या विक्रेता पेजों के लिए भुगतान या अनुमोदन नहीं करते।
- **एक अंक वाला रिव्यू नहीं।** समुदाय के वोट औसत, वोटों की संख्या और पूरे वितरण के साथ दिखाए जाते हैं।

## हमारे नियम

- **तथ्य कभी न गढ़ें।** जो दर्ज नहीं है, पेज वही बताता है।
- **अपने शब्दों में लिखें।** दूसरी साइटों से पाठ कॉपी न करें; उन्हें स्रोत के रूप में लिंक करें।
- **स्रोत दें।** बिना स्रोत वाली जानकारी पर *स्रोत चाहिए* का निशान लगता है।
- **चित्रों के अधिकारों का सम्मान करें।**

## सुरक्षा

परफ़्यूम ऑयल गाढ़े होते हैं और त्वचा में जलन कर सकते हैं। इस्तेमाल से पहले पैच-टेस्ट करें।`,
  },
  contribute: {
    title: { en: "How to contribute", hi: "योगदान कैसे दें" },
    en: `## Start small

The quickest way to help is to fill a gap marked **Not yet documented, help add it** or **needs citation**. Open the page, choose **Suggest an edit**, change only what you can source, and explain your change in the edit summary.

## Good sources

- Official house or distiller websites (for founding year, city, product names)
- Books, academic papers and government publications (for history, botany and methods)
- News reports and interviews

Fragrance databases and retailer pages may be cited for *what they report*, but never copy their text.

## Notes pyramids

Add notes only when a source lists them, and add a citation for the **Notes** field. If sources disagree, say so in the description and cite both.

## Prices

Report a price only from something you saw yourself or from a public listing. Include the volume, the date, and where you saw it. Prices are informational and are never offers.

## Votes and reviews

Vote on longevity, sillage and weather performance from your own experience. Reviews should describe how an attar smelled and performed on you. Do not include links, prices or advertising.

## Images

Upload only:

- your own photos (you release them under CC BY-SA 4.0), or
- images with a CC0, CC BY or CC BY-SA license (credit the author and link the source), or
- brand images you have **written permission** to use (describe the permission).

Editors check every image before it appears.`,
    hi: `## छोटी शुरुआत करें

सबसे आसान मदद है **अभी दर्ज नहीं है** या **स्रोत चाहिए** वाली कमियों को भरना। पेज खोलें, **संपादन सुझाएँ** चुनें, केवल वही बदलें जिसका स्रोत आपके पास है, और सारांश में बताएँ कि क्या बदला।

## अच्छे स्रोत

- घरानों की आधिकारिक वेबसाइट
- किताबें, शोध-पत्र और सरकारी प्रकाशन
- समाचार और इंटरव्यू

फ़्रेग्रेंस डेटाबेस और विक्रेताओं के पेज स्रोत के रूप में दिए जा सकते हैं, पर उनका पाठ कभी कॉपी न करें।

## क़ीमतें

केवल वही क़ीमत बताएँ जो आपने ख़ुद देखी हो या सार्वजनिक सूची में हो, मात्रा, तारीख़ और स्थान के साथ।

## चित्र

केवल अपनी तस्वीरें, खुले लाइसेंस वाले चित्र, या लिखित अनुमति वाले ब्रांड चित्र अपलोड करें।`,
  },
  privacy: {
    title: { en: "Privacy", hi: "गोपनीयता" },
    en: `## What we store

- **Account:** your email address (for sign-in only), display name and optional city.
- **Contributions:** edit suggestions, votes, reviews and shelf items you create.
- **Page views:** a daily counter per page. It does not record who viewed the page, your IP address or any cookie.

## What we do not do

- We do not sell or share personal data.
- We do not run advertising or third-party tracking scripts.

## Your choices

You can edit or delete your reviews and votes at any time, and you can ask an administrator to delete your account. Your public edit history stays attributed to your display name unless you ask for it to be anonymised.

## Offline storage

The app stores pages you have read and your shelf on your device so they work offline. Clearing site data in your browser removes them.`,
    hi: `## हम क्या रखते हैं

- **खाता:** आपका ईमेल (केवल साइन इन के लिए), दिखने वाला नाम और वैकल्पिक शहर।
- **योगदान:** आपके संपादन सुझाव, वोट, समीक्षाएँ और शेल्फ़।
- **पेज व्यू:** हर पेज के लिए एक दैनिक गिनती। इसमें यह दर्ज नहीं होता कि पेज किसने देखा।

## हम क्या नहीं करते

- हम व्यक्तिगत डेटा नहीं बेचते या साझा नहीं करते।
- हम विज्ञापन या थर्ड-पार्टी ट्रैकिंग नहीं चलाते।`,
  },
  terms: {
    title: { en: "Terms of use", hi: "उपयोग की शर्तें" },
    en: `## Content

Text on this wiki is written by contributors. By submitting text you confirm it is your own writing and agree that it may be published and edited by others on this site. Images carry the license shown under each image.

## No advice, no sales

Information here is for reference only. It is not medical, dermatological or purchasing advice. Nothing on this site is an offer to sell. Always patch-test perfume oils before use.

## Trademarks

Brand and house names belong to their owners and are used only to identify products. This wiki is independent and not affiliated with any brand.

## Conduct

Do not post spam, advertising, abuse, copied text or personal information about others. Editors may remove content and suspend accounts that break these rules.

## Corrections and takedowns

If you believe a page is inaccurate or infringes your rights, suggest an edit or contact the site administrators with details.`,
    hi: `## सामग्री

इस विकी का पाठ योगदानकर्ताओं ने लिखा है। पाठ जमा करके आप पुष्टि करते हैं कि यह आपका अपना लेखन है।

## कोई सलाह या बिक्री नहीं

यहाँ की जानकारी केवल संदर्भ के लिए है। यह चिकित्सा या ख़रीदारी की सलाह नहीं है। इस्तेमाल से पहले पैच-टेस्ट करें।

## ट्रेडमार्क

ब्रांड और घरानों के नाम उनके मालिकों के हैं। यह विकी स्वतंत्र है और किसी ब्रांड से जुड़ा नहीं है।`,
  },
} as const;

export type StaticPageKey = keyof typeof STATIC_PAGES;
