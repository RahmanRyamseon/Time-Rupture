"""
Writes the researched seed CSVs (seed/*.csv + seed/guides/*.md).
All text is original wording; every factual field carries a citation in citations.csv.
Sources were read on 2026-11-15. Re-run: python3 scripts/content/build_seed.py
"""
import csv, os, sys, re
sys.path.insert(0, os.path.dirname(__file__))
import products as PR

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "seed")
ACCESSED = "2026-11-15"

S = {  # source registry: key -> (url, title, publisher)
 "wp_attar": ("https://en.wikipedia.org/wiki/Attar", "Attar", "Wikipedia"),
 "wp_kannauj": ("https://en.wikipedia.org/wiki/Kannauj", "Kannauj", "Wikipedia"),
 "wp_kperfume": ("https://en.wikipedia.org/wiki/Kannauj_Perfume", "Kannauj Perfume", "Wikipedia"),
 "wp_vetiver": ("https://en.wikipedia.org/wiki/Chrysopogon_zizanioides", "Chrysopogon zizanioides (vetiver)", "Wikipedia"),
 "wp_kewra": ("https://en.wikipedia.org/wiki/Kewra", "Kewra", "Wikipedia"),
 "wp_pandanus": ("https://en.wikipedia.org/wiki/Pandanus_odorifer", "Pandanus odorifer", "Wikipedia"),
 "wp_sandal": ("https://en.wikipedia.org/wiki/Santalum_album", "Santalum album", "Wikipedia"),
 "wp_agarwood": ("https://en.wikipedia.org/wiki/Agarwood", "Agarwood", "Wikipedia"),
 "wp_rose": ("https://en.wikipedia.org/wiki/Rosa_%C3%97_damascena", "Rosa × damascena", "Wikipedia"),
 "wp_jasmine": ("https://en.wikipedia.org/wiki/Jasminum_sambac", "Jasminum sambac", "Wikipedia"),
 "wp_mysoresoap": ("https://en.wikipedia.org/wiki/Mysore_Sandal_Soap", "Mysore Sandal Soap", "Wikipedia"),
 "natgeo": ("https://www.nationalgeographic.com/travel/article/how-did-kannauj-become-a-perfume-capital", "How did Kannauj become the perfume capital of India?", "National Geographic"),
 "ka_degbhapka": ("https://kannaujattar.com/traditional-method-of-making-attars-using-hydrodistillation-deg-bhapka-method/", "Traditional Method of Making Attars Using Hydrodistillation (Deg & Bhapka Method)", "Kannauj Attar"),
 "ka_ruh": ("https://kannaujattar.com/what-is-ruh-difference-between-ruh-and-attar/", "What is Ruh? Difference Between Ruh and Attar", "Kannauj Attar"),
 "pv_explained": ("https://perfumevalleyworld.com/traditional-attars-explained/", "Traditional Attars Explained: Majmua, Mukhallat, Khus, Mitti and More", "Perfume Valley"),
 "gsj_story": ("https://gulabsinghjohrimal.co.in/", "Our Story: Over 2 centuries of aromatic excellence", "Gulabsingh Johrimal"),
 "gsj_blog": ("https://gulabsinghjohrimal.com/blog/gulabsingh-johrimal", "Gulabsingh Johrimal", "Gulabsingh Johrimal"),
 "fbh_ajmal": ("https://familybusinesshistories.org/spotlights/ajmal-perfumes/", "Ajmal Perfumes", "Family Business Histories"),
 "ajmal_about": ("https://uk.ajmal.com/pages/about-us", "About Us", "Ajmal Perfumes"),
 "mlr_indiamart": ("https://www.indiamart.com/mlr-perfumers/aboutus.html", "M.L. Ramnarain Perfumers: About Us", "IndiaMART"),
 "mlr_about": ("https://attarsindia.com/pages/about-us", "About us", "Attars India (M.L. Ramnarain Perfumers)"),
 "nod_nizam": ("https://thenodmag.com/content/nizam-attar-perfumes-hyderabad-charminar-shop", "This Hyderabad attar shop once served the Nizam. Now MPs drop by", "The Nod Mag"),
 "fraterworks_mitti": ("https://fraterworks.com/products/mitti-attar", "Mitti Attar", "Fraterworks"),
 "premiere_shamama": ("https://premierepeau.com/pages/glossary-terms/shamama-attar", "Shamama Attar in Perfumery", "Première Peau"),
 "rd_summer_newbie": ("https://www.reddit.com/r/DesiFragranceAddicts/comments/1bkr8m6/attar_newbie_here_need_suggestions_for_hot_humid/", "Attar newbie here. Need suggestions for hot & humid summers", "r/DesiFragranceAddicts (Reddit)"),
 "rd_recommend": ("https://www.reddit.com/r/DesiFragranceAddicts/comments/1st9wwk/need_attar_recommendation/", "need attar recommendation", "r/DesiFragranceAddicts (Reddit)"),
 "rd_mustbuy": ("https://www.reddit.com/r/perfumesthatfeellike/comments/1w9k59d/what_perfume_or_attar_is_a_musthave_from_india_im/", "What perfume or attar is a must-have from India?", "r/perfumesthatfeellike (Reddit)"),
 "tot_ruh": ("https://takeonethingoff.com/indian-single-material-attars-and-ruhs/", "Indian Single-Material Attars and Ruhs", "Take One Thing Off"),
 "rd_mitti_sucks": ("https://www.reddit.com/r/DesiFragranceAddicts/comments/1axxkiw/kannauj_mitti_attar_sucks/", "Kannauj Mitti Attar sucks", "r/DesiFragranceAddicts (Reddit)"),
}
S.update(PR.EXTRA_SOURCES)

citations = []
def cite(etype, slug, field, *keys):
    for k in keys:
        url, title, pub = S[k]
        citations.append({"entity_type": etype, "entity_slug": slug, "field_name": field, "url": url,
                          "title": title, "publisher": pub, "accessed_at": ACCESSED, "quote": ""})

def write(name, header, rows):
    with open(os.path.join(ROOT, name), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in header})

# ---------------------------------------------------------------- regions
regions = [
 dict(slug="kannauj", name="Kannauj", name_hi="कन्नौज", aliases="Kanauj|Kannoj|Perfume Capital of India", state="Uttar Pradesh",
      summary="A town on the Ganges plain in Uttar Pradesh, widely called India's perfume capital and the best-known centre of traditional attar distillation.",
      summary_hi="उत्तर प्रदेश में गंगा के मैदान का शहर, जिसे भारत की इत्र राजधानी कहा जाता है।",
      history="Kannauj has distilled attar for centuries, and its trade grew especially strong in the Mughal period. National Geographic notes that the town's attar tradition is more than 400 years old, older than the rise of Grasse in France as a perfume centre.\n\nThe town sits between Agra, Lucknow and Kanpur, all historic centres with a taste for fragrance, on alluvial Ganges soil that suits Damask rose, jasmine and vetiver. Demand for attar fell during British rule, and the cost of natural attar rose sharply after the Indian government restricted the sale of sandalwood in the late 1990s.\n\nIn 2014, Kannauj Perfume received a Geographical Indication (GI) tag, which protects the name for perfume made in the region.",
      specialities="- Rose attar and rose water from locally grown Damask rose\n- Mitti attar, distilled from baked clay to evoke the smell of first rain\n- Summer attars from jasmine and vetiver (khus); winter attars such as hina and musk\n- More than 200 distilleries, many still using the copper deg-bhapka stills",
      latitude="27.0510", longitude="79.9140"),
 dict(slug="old-delhi", name="Old Delhi (Dariba Kalan)", name_hi="पुरानी दिल्ली (दरीबा कलाँ)", aliases="Chandni Chowk|Dariba|Delhi", state="Delhi",
      summary="The walled city's bazaars, including Dariba Kalan off Chandni Chowk, have sold attar for generations and are home to some of India's oldest perfumeries.",
      history="Old Delhi's attar trade grew up in the bazaars of the Mughal capital. Gulabsingh Johrimal, one of India's oldest surviving perfumeries, was set up in Dariba Kalan in 1816, in the last years of Mughal rule.\n\nWikipedia's article on attar also names Delhi's Matia Mahal bazaar as a place where attar is traditionally sold.",
      specialities="- Long-established family perfumeries in Dariba Kalan and Chandni Chowk\n- Ruh and attar fragrances prepared over sandalwood",
      latitude="28.6562", longitude="77.2310"),
 dict(slug="hyderabad", name="Hyderabad", name_hi="हैदराबाद", aliases="Charminar|Old City Hyderabad", state="Telangana",
      summary="The old city around Charminar keeps an attar tradition that grew under the Nizams' patronage.",
      history="Attar is sold in shops around Charminar in Hyderabad's old city. Nizam Attar, near Charminar, traces its business to 1840. Its founder came from Kannauj in the mid-1800s to serve the Nizams of Hyderabad; the sixth Nizam, Mahboob Ali Khan, was among its best-known patrons.",
      specialities="- Family attar shops near Charminar\n- House blends that trace back to the Nizam's court",
      latitude="17.3616", longitude="78.4747"),
 dict(slug="mysore", name="Mysore (Mysuru)", name_hi="मैसूर", aliases="Mysuru|Karnataka sandalwood", state="Karnataka",
      summary="Historic centre of Indian sandalwood (Santalum album) and of sandalwood oil, the traditional base of classic attars.",
      history="In the early 20th century the Mysore Kingdom was one of the world's largest sandalwood producers. When the First World War cut off exports to Europe, the Maharaja set up a factory in Mysore in 1916 to distil sandalwood oil, alongside the Government Soap Factory in Bangalore.\n\nWikipedia's article on Santalum album records that the first extraction of the tree's essential oil took place in Mysore in 1917. Sandalwood is now classed as vulnerable, and cultivation and sale are regulated state by state; Karnataka allowed private cultivation through a 2001 amendment.",
      specialities="- Indian sandalwood (chandan) and its oil, the classic base for attars",
      latitude="12.2958", longitude="76.6394"),
 dict(slug="assam", name="Assam (Hojai)", name_hi="असम (होजाई)", aliases="Hojai|Northeast India|oud", state="Assam",
      summary="Agarwood (oud) country. Hojai in Assam is where the agarwood trade that became Ajmal Perfumes began.",
      history="Agarwood forms in the heartwood of Aquilaria trees as a defensive resin after fungal infection. Seventh-century sources describe agarwood products, including 'aloe-oil', in ancient Assam (Kamarupa).\n\nBefore founding his company, Haji Ajmal Ali collected agarwood in the jungles of Assam and sold it to dealers. In 1951 he founded Ajmal Perfumes in Hojai.",
      specialities="- Agarwood (oud) and oud oil\n- Origin of Ajmal Perfumes",
      latitude="26.0040", longitude="92.8560"),
 dict(slug="ganjam", name="Ganjam (Odisha)", name_hi="गंजाम (ओडिशा)", aliases="Berhampur|Brahmapur|kewra country", state="Odisha",
      summary="Coastal district around Brahmapur that supplies most of India's kewra (fragrant screwpine) flowers.",
      history="Ganjam district on the Odisha coast is the heart of India's kewra industry. About 95% of the kewra flowers India exports are collected around Brahmapur. Kewra growing is a major source of income in the district, which has nearly 200 registered kewra distillation units.",
      specialities="- Kewra (kewda) flowers, kewra water and kewra oil for attar",
      latitude="19.3149", longitude="84.7941"),
]
cite("region","kannauj","history","natgeo","wp_kannauj")
cite("region","kannauj","specialities","wp_kannauj","wp_kperfume","natgeo")
cite("region","old-delhi","history","gsj_story","wp_attar")
cite("region","old-delhi","specialities","gsj_blog")
cite("region","hyderabad","history","nod_nizam")
cite("region","hyderabad","specialities","nod_nizam")
cite("region","mysore","history","wp_mysoresoap","wp_sandal")
cite("region","mysore","specialities","wp_sandal","natgeo")
cite("region","assam","history","wp_agarwood","fbh_ajmal")
cite("region","assam","specialities","wp_agarwood","fbh_ajmal")
cite("region","ganjam","history","wp_kewra")
cite("region","ganjam","specialities","wp_kewra")
write("regions.csv", "slug,name,name_hi,aliases,state,country,summary,summary_hi,history,specialities,latitude,longitude,published".split(","), regions)

# ---------------------------------------------------------------- houses
houses = [
 dict(slug="gulabsingh-johrimal", name="Gulabsingh Johrimal", aliases="Gulab Singh Johrimal|GSJ", city="Delhi", region_slug="old-delhi", founded_year="1816",
      summary="One of India's oldest surviving perfumeries, in Dariba Kalan, Old Delhi, founded in 1816 and still run by the founding family.",
      history="Lala Gulab Singh moved to Delhi from Jhajjar, in present-day Haryana, and in 1816 set up a perfumery in Old Delhi with his son, Lala Johrimal. The shop, once known locally as 'Gulab Gundhi ki Dukaan' (the shop of Gulab the perfumer), began mainly as an attar-making business. Its head office is still in Dariba Kalan, off Chandni Chowk.\n\nThe house describes itself as now run by the seventh and eighth generations of the family.",
      website_url="https://gulabsinghjohrimal.com"),
 dict(slug="ajmal", name="Ajmal Perfumes", aliases="Ajmal", city="Hojai", region_slug="assam", founded_year="1951",
      summary="Perfume house founded in 1951 in Hojai, Assam, by Haji Ajmal Ali, who started out trading agarwood.",
      history="Haji Ajmal Ali was born in 1923 in Alinagar, near Hojai in Assam, to a family of rice farmers. He began by collecting agarwood in the forests of Assam and selling it to dealers, and in 1951 he founded Ajmal Perfumes.\n\nIn the early 1960s he moved to Mumbai, where he experimented with perfume blends that were not based on oud. From the late 1960s he travelled around the Gulf, which became one of the business's largest markets."),
 dict(slug="ml-ramnarain", name="M.L. Ramnarain Perfumers", aliases="ML Ramnarain|M L Ramnarain|MLR", city="Kannauj", region_slug="kannauj", founded_year="1970",
      summary="Kannauj perfumer, established in 1970, that makes natural attars and still runs a traditional distillery in the town.",
      history="M.L. Ramnarain Perfumers was founded in 1970 by Shri Harinarain Kapoor, from a family with a tradition of making perfumes. National Geographic describes the Ramnarain Perfumers factory as one of the traditional distillers still working in Kannauj.",
      website_url="https://mlramnarain.com"),
 dict(slug="nizam-attar", name="Nizam Attar", aliases="Nizam Attar Hyderabad", city="Hyderabad", region_slug="hyderabad", founded_year="1840",
      summary="A small family attar shop near Charminar, Hyderabad, that traces its business to 1840 and to the Nizams' court.",
      history="The business was started by Ghulam Mohammad Ramzan, who came from Kannauj in the mid-1800s to serve the Nizams of Hyderabad, and the shop dates its trade to 1840. Its best-known patron was Mahboob Ali Khan, the sixth Nizam, for whom the founder created a special blend.\n\nThe shop, about 80 square feet near Charminar, is run by the fifth generation of the family and stocks around 150 varieties of attar."),
]
cite("house","gulabsingh-johrimal","city","gsj_story")
cite("house","gulabsingh-johrimal","founded_year","gsj_story","gsj_blog")
cite("house","gulabsingh-johrimal","history","gsj_story","gsj_blog")
cite("house","gulabsingh-johrimal","website_url","gsj_blog")
cite("house","ajmal","city","fbh_ajmal","ajmal_about")
cite("house","ajmal","founded_year","fbh_ajmal","ajmal_about")
cite("house","ajmal","history","fbh_ajmal")
cite("house","ml-ramnarain","city","mlr_indiamart")
cite("house","ml-ramnarain","founded_year","mlr_indiamart","mlr_about")
cite("house","ml-ramnarain","history","mlr_indiamart","natgeo")
cite("house","ml-ramnarain","website_url","mlr_about")
cite("house","nizam-attar","city","nod_nizam")
cite("house","nizam-attar","founded_year","nod_nizam")
cite("house","nizam-attar","history","nod_nizam")
write("houses.csv", "slug,name,name_hi,aliases,city,region_slug,founded_year,summary,summary_hi,history,website_url,published".split(","), houses)

# ---------------------------------------------------------------- notes
notes = [
 dict(slug="vetiver", name="Vetiver (khus)", name_hi="खस", aliases="khus|khas|vetyver|ruh khus|खस", botanical_name="Chrysopogon zizanioides", category="earthy",
      summary="A perennial grass whose roots give an earthy, woody, smoky oil. In North India it is known as khus.",
      smell="Vetiver oil is described as deep, sweet, woody, smoky and earthy, with amber and balsamic facets. It is prized as a fixative in perfumery.",
      botany="A perennial bunchgrass of the family Poaceae. The oil comes from the roots, which are dug up, cleaned, dried, chopped and soaked before steam distillation; the best oil comes from roots 18 to 24 months old.",
      grown_in="Native to India. Major producers include Haiti, India, Indonesia and Réunion. In India, woven vetiver-root mats are hung in doorways and kept damp to cool rooms in summer."),
 dict(slug="rose", name="Rose (gulab)", name_hi="गुलाब", aliases="gulab|gulaab|damask rose|ruh gulab|गुलाब", botanical_name="Rosa × damascena", category="floral",
      summary="The Damask rose, used for rose oil, rose water and rose attar. Kannauj has distilled rose attar for centuries.",
      smell="Damask rose flowers are renowned for their fine fragrance; the oil is used in perfumery as rose otto and rose absolute.",
      botany="A hybrid rose derived from Rosa gallica and Rosa moschata, with a genetic contribution from Rosa fedtschenkoana. The flowers are light to moderate pink and grow in small clusters.",
      grown_in="Iran, Bulgaria and Turkey are the main producers of rose oil, and France and India also contribute significantly. Around Kannauj the Damask rose favours the Ganges alluvial soils."),
 dict(slug="kewra", name="Kewra (kewda)", name_hi="केवड़ा", aliases="kewda|keora|kevda|screwpine|केवड़ा", botanical_name="Pandanus odorifer", category="floral",
      summary="Fragrant screwpine. Oil and water distilled from its male flowers are used in food and in Indian attar.",
      smell="Sweet and perfumed, with a quality close to rose but fruitier.",
      botany="An aromatic plant of the family Pandanaceae. The scent comes from the male flowers, which are wrapped in leaves and sold in markets; kewra oil and kewra water are distilled from them.",
      grown_in="Native to tropical and Southeast Asia and found wild in southern India. Most of India's kewra comes from around Brahmapur in Ganjam district, Odisha."),
 dict(slug="jasmine-sambac", name="Jasmine (mogra)", name_hi="मोगरा", aliases="mogra|motia|Arabian jasmine|sambac jasmine|मोगरा", botanical_name="Jasminum sambac", category="floral",
      summary="Arabian jasmine, the small white mogra strung into gajras. One of the classic summer attars.",
      smell="A sweet, heady and intense fragrance that some people find overpowering.",
      botany="A shrub or vine of the jasmine genus with strongly scented white flowers 2 to 3 cm across.",
      grown_in="Native to Bhutan and India and cultivated widely across West, South and Southeast Asia."),
 dict(slug="sandalwood", name="Sandalwood (chandan)", name_hi="चंदन", aliases="chandan|chandanam|Mysore sandalwood|चंदन", botanical_name="Santalum album", category="woody",
      summary="Indian sandalwood. Its oil is the traditional base into which classic Indian attars are distilled.",
      smell="Creamy, soft and woody. Attars made on a sandalwood-oil base are noted for lasting a long time.",
      botany="A small tropical tree. Only the heartwood is used for fragrance, and the oil's value comes from its high alpha-santalol content. The IUCN lists the species as vulnerable.",
      grown_in="Native to Indonesia, the Philippines and Western Australia, and naturalised in South India for thousands of years. Karnataka (Mysore) is historically the best-known Indian source."),
 dict(slug="oud", name="Oud (agarwood)", name_hi="ऊद", aliases="oudh|agarwood|aloeswood|agar|ऊद", botanical_name="Aquilaria spp.", category="resinous",
      summary="A dark, resinous wood formed in infected Aquilaria trees, and the oil distilled from it.",
      smell="Described as sweet, woody, balsamic, leathery, fruity, smoky and animalic, with tobacco facets.",
      botany="Agarwood forms in the heartwood of Aquilaria trees after fungal infection, as the tree secretes a defensive resin. Oil is steam-distilled from the wood; 70 kg of wood yields no more than about 20 ml of oil. All Aquilaria species have been on CITES Appendix II since 2004.",
      grown_in="Southeast and South Asia; in India, the northeast, especially Assam."),
 dict(slug="baked-earth", name="Baked earth (mitti)", name_hi="मिट्टी", aliases="mitti|gil|geeli mitti|petrichor|मिट्टी", category="earthy",
      summary="Fired clay discs distilled to capture the smell of rain on dry earth. The defining material of mitti attar.",
      smell="Evokes petrichor, the earthy smell of the first rain on dry ground.",
      botany="Not a plant: Kannauj distillers use baked alluvial clay as the raw material in the still.",
      grown_in="Kannauj, Uttar Pradesh, using local alluvial clay."),
 dict(slug="saffron", name="Saffron (kesar)", name_hi="केसर", aliases="kesar|zafran|केसर", category="spicy",
      summary="A warm spice used in attars; kesar attar is traditionally counted among the 'warm' winter attars.",
      grown_in=""),
 dict(slug="musk", name="Musk (mushk)", name_hi="मुश्क", aliases="mushk|kasturi|white musk|कस्तूरी", category="musky",
      summary="Originally from the musk deer; modern musk attars are made with synthetic 'white musk'.",
      botany="Natural musk is produced by the male musk deer, and obtaining it involves killing the animal. Demand has endangered most musk deer species and led to the rise of synthetic musk, known as white musk."),
]
for slug, keys in [("vetiver","wp_vetiver"),("rose","wp_rose"),("kewra","wp_kewra"),("jasmine-sambac","wp_jasmine"),("sandalwood","wp_sandal"),("oud","wp_agarwood")]:
    cite("note", slug, "botanical_name", keys)
cite("note","vetiver","smell","wp_vetiver"); cite("note","vetiver","botany","wp_vetiver"); cite("note","vetiver","grown_in","wp_vetiver")
cite("note","rose","smell","wp_rose"); cite("note","rose","botany","wp_rose"); cite("note","rose","grown_in","wp_rose","natgeo")
cite("note","kewra","smell","wp_kewra","wp_pandanus"); cite("note","kewra","botany","wp_pandanus","wp_kewra"); cite("note","kewra","grown_in","wp_pandanus","wp_kewra")
cite("note","jasmine-sambac","smell","wp_jasmine"); cite("note","jasmine-sambac","botany","wp_jasmine"); cite("note","jasmine-sambac","grown_in","wp_jasmine")
cite("note","sandalwood","smell","pv_explained","wp_kperfume"); cite("note","sandalwood","botany","wp_sandal"); cite("note","sandalwood","grown_in","wp_sandal")
cite("note","oud","smell","wp_agarwood"); cite("note","oud","botany","wp_agarwood"); cite("note","oud","grown_in","wp_agarwood")
cite("note","baked-earth","smell","wp_kperfume","natgeo"); cite("note","baked-earth","botany","natgeo"); cite("note","baked-earth","grown_in","natgeo")
cite("note","musk","botany","wp_attar")
write("notes.csv", "slug,name,name_hi,aliases,botanical_name,category,summary,summary_hi,smell,botany,grown_in,published".split(","), notes)

# ---------------------------------------------------------------- attars
attars = [
 dict(slug="mitti-attar", name="Mitti Attar", name_hi="मिट्टी इत्र", aliases="Gil attar|Geeli mitti|Petrichor attar|Barsaati attar", attar_type="natural_deg_bhapka",
      base_oil="Sandalwood oil", scent_family="Earthy", region_slug="kannauj", occasions="daily|monsoon",
      summary="Kannauj's 'scent of first rain': baked clay distilled into sandalwood oil. The classic monsoon attar.",
      summary_hi="कन्नौज का 'पहली बारिश की ख़ुशबू' वाला इत्र: पकी मिट्टी को चंदन तेल में आसवित किया जाता है।",
      description="Mitti attar is the monsoon variety among Kannauj perfumes. Its smell recalls petrichor, the earthy scent of rain on dry ground. National Geographic describes it as balancing sweet, spice, smoke and damp.\n\nOpinion is not unanimous. One Reddit buyer complained that a mitti attar they bought smelled of sweat rather than rain, a reminder that quality varies between makers. Other Reddit users list *gili mitti* among their favourite summer attars.\n\n**What buyers report, by house.** A Reddit review of M.L. Ramnarain's Attar Mitti says it smells exactly as described, like earth after the first monsoon rain. Several buyers warn that the gil (gili) mitti from S. Md. Ayub & Md. Yaqub opens dark and muddy but fades to something like wet cardboard. Another commenter notes that most mitti attars smell more of baked earth than of rain itself.",
      how_made="Baked alluvial clay goes into the copper deg (still) in place of flowers. As the still heats, the vapour travels through a bamboo pipe into a receiver holding sandalwood oil, which absorbs the earthy aroma. This is the traditional deg-bhapka hydro-distillation."),
 dict(slug="ruh-khus", name="Ruh Khus", name_hi="रूह ख़स", aliases="Ruh Khas|Khus attar|Vetiver attar|Ruh-e-khus", attar_type="ruh",
      base_oil="", scent_family="Earthy", occasions="daily|summer",
      summary="The concentrated essence of vetiver root: green, earthy and cooling. The attar most often recommended for Indian summers.",
      summary_hi="ख़स (वेटिवर) की जड़ का गाढ़ा सार; भारतीय गर्मी के लिए सबसे ज़्यादा सुझाया जाने वाला इत्र।",
      description="Khus is counted among the 'cool' attars, traditionally worn in summer for their perceived cooling effect. As a *ruh*, Ruh Khus is the concentrated essence of a single material, here the root of the vetiver grass.\n\nOn Reddit's r/DesiFragranceAddicts, khus comes up again and again as the go-to attar for hot and humid summers. Commenters point out that khus is sold in many qualities and at many price levels."),
 dict(slug="ruh-gulab", name="Ruh Gulab", name_hi="रूह गुलाब", aliases="Rooh Gulab|Gulab attar|Rose attar|Attar of roses", attar_type="ruh",
      scent_family="Floral", region_slug="kannauj", occasions="wedding|prayer|daily",
      summary="The essence of rose, India's best-loved attar, traditionally associated with Kannauj and its Damask roses.",
      summary_hi="गुलाब का सार; भारत का सबसे प्रिय इत्र, जो कन्नौज के दमिश्क गुलाबों से जुड़ा है।",
      description="Rose is counted among the 'cool' summer attars. Indian tradition credits Nur Jahan with the discovery of Rooh Gulab, and local Kannauj folklore says she started a run on rose attar after falling for the scent of Kannauj roses in her bath. Rose attar is worn for occasions from weddings to daily prayer.\n\nStrictly, a *ruh* is the pure, concentrated essence of one material. Much of what is sold as 'ruh gulab' is rose attar, rose distilled into a base oil, so check the label and the seller.",
      how_made="Roses are picked early in the morning, before sunrise, and taken to a nearby distillery. The petals go into a copper deg with water; the deg is sealed with clay and cotton and connected by a bamboo pipe (chonga) to a copper receiver (bhapka). The first distillate is collected and distilled again, and the second distillation yields the rose attar. In Kannauj the receiver traditionally holds sandalwood oil."),
 dict(slug="kewda-attar", name="Kewda Attar", name_hi="केवड़ा इत्र", aliases="Kewra attar|Keora attar|Ruh kewra", region_slug="ganjam",
      scent_family="Floral", occasions="summer|daily",
      summary="Attar from the male flowers of fragrant screwpine: sweet, rose-like and fruity. A traditional cooling summer attar.",
      summary_hi="केवड़े के फूलों से बना इत्र: मीठा, गुलाब जैसा और फलदार; गर्मियों का पारंपरिक ठंडा इत्र।",
      description="Kewra is counted among the 'cool' attars worn in summer. Its scent is sweet and perfumed, close to rose but fruitier. Nearly all of India's kewra flowers come from around Brahmapur in Ganjam, Odisha, where about 200 distillation units operate.\n\nOn Reddit, users suggest pairing kewra with gili mitti as a summer combination, and include kewda among the attars worth sampling in India."),
 dict(slug="mogra-attar", name="Mogra Attar", name_hi="मोगरा इत्र", aliases="Motia attar|Ruh mogra|Jasmine sambac attar",
      scent_family="Floral", occasions="summer|wedding",
      summary="Attar of Arabian jasmine (mogra): sweet, heady and white-floral. A classic summer attar.",
      summary_hi="मोगरे का इत्र: मीठा और गहरा सफ़ेद-फूलों वाला; गर्मियों का पारंपरिक इत्र।",
      description="Mogra is among the 'cool' attars worn in summer. Jasminum sambac has a sweet, heady scent that some find overpowering, so a small amount goes a long way. White jasmine is also among the flowers Kannauj uses for its summer varieties."),
 dict(slug="shamama", name="Shamama", name_hi="शमामा", aliases="Shamama attar|Shamamatul Amber|Samamme",
      scent_family="Spicy", region_slug="kannauj", occasions="winter|evening",
      summary="Kannauj's great winter attar: a dense, warm blend of dozens of herbs, spices and resins.",
      summary_hi="कन्नौज का सर्दियों वाला ख़ास इत्र: दर्जनों जड़ी-बूटियों, मसालों और रेज़िन का गाढ़ा, गर्म मिश्रण।",
      description="Shamama is a warm winter attar built from many herbs, spices and resins over a long process. Recipes vary from distiller to distiller. One perfumery glossary describes blends of more than 40 botanicals that typically include henna flowers, saffron, mace and various resins. Wikipedia records the tradition that Shah Jahan discovered 'Samamme' attar."),
 dict(slug="hina-attar", name="Hina Attar", name_hi="हिना इत्र", aliases="Heena attar|Henna attar",
      scent_family="Spicy", region_slug="kannauj", occasions="winter",
      summary="A warm winter attar built around henna, with spicy and floral facets.",
      summary_hi="हिना पर आधारित गर्म इत्र, मसालेदार और फूलों वाली ख़ुशबू के साथ; सर्दियों के लिए।",
      description="Hina (heena) attar is one of the traditional winter varieties of Kannauj perfume. It is built around henna, with warm florals and spices. On Reddit it is suggested, together with mitti, kewda and shamama, as a good attar to sample in India."),
 dict(slug="majmua", name="Majmua", name_hi="मजमुआ", aliases="Majmua attar|Majmooa",
      scent_family="Earthy", occasions="daily",
      summary="'A collection': several attars blended and aged together into one rounded scent, worn in every season.",
      summary_hi="'संग्रह': कई इत्रों को मिलाकर और पुराना करके बना एक संतुलित इत्र; हर मौसम के लिए।",
      description="*Majmua* means a collection. Traditionally it is a blend of several attars aged together, so the result smells rounded rather than like any single flower. It is suggested for every season. The exact formula differs from house to house."),
 dict(slug="musk-attar", name="Musk Attar", name_hi="मुश्क इत्र", aliases="Mushk attar|White musk attar|Kasturi attar",
      scent_family="Musky", occasions="winter|daily|prayer",
      summary="A soft, skin-close musk oil. Traditionally a 'warm' winter attar; modern versions use synthetic white musk.",
      summary_hi="मुलायम, त्वचा के पास रहने वाला कस्तूरी इत्र; आधुनिक संस्करण सिंथेटिक व्हाइट मस्क से बनते हैं।",
      description="Musk is counted among the 'warm' attars traditionally worn in winter, and musk attar is one of the winter varieties of Kannauj perfume. Natural musk comes from the male musk deer, and harvesting it kills the animal. Demand has endangered most musk deer species, so modern musk attars, including *musk tahara*, are made with synthetic 'white musk'."),
 dict(slug="kesar-attar", name="Kesar Attar", name_hi="केसर इत्र", aliases="Saffron attar|Zafran attar",
      scent_family="Spicy", occasions="winter|wedding",
      summary="Saffron attar: a 'warm' attar traditionally reserved for winter.",
      summary_hi="केसर का इत्र: सर्दियों के लिए पारंपरिक 'गर्म' इत्र।",
      description="Kesar (saffron) appears with musk and amber among the 'warm' attars, which are worn in winter because they are believed to raise body temperature. Saffron is also listed among the aromatic materials used in Kannauj perfume."),
 dict(slug="oud-attar", name="Oud Attar (Assam)", name_hi="ऊद इत्र", aliases="Dehn al oud|Agarwood oil|Hindi oud", region_slug="assam",
      scent_family="Woody", occasions="evening|winter|prayer",
      summary="Oil distilled from resinated agarwood, a dense, smoky and animalic material with deep roots in Assam.",
      summary_hi="राल युक्त अगरवुड से आसवित तेल; गहरा, धुएँदार; असम से गहरा संबंध।",
      description="Oud oil is steam-distilled from agarwood, the resinous heartwood of infected Aquilaria trees. Yields are tiny: about 70 kg of wood gives no more than 20 ml of oil. Its aroma is described as sweet, woody, balsamic, leathery, smoky and animalic. Oud is listed among the winter attars, and Aquilaria species are protected under CITES Appendix II.",
      how_made="Resinated agarwood is chipped and steam-distilled. The oil is collected from the distillate."),
 dict(slug="nizam-durbar", name="Nizam Durbar", name_hi="निज़ाम दरबार", aliases="Nizam Darbar", house_slug="nizam-attar", region_slug="hyderabad",
      scent_family="Floral", occasions="wedding|evening",
      summary="Nizam Attar's house blend, first made for the Nizam's court, now a mix of seven flowers.",
      summary_hi="निज़ाम अत्तार का ख़ास मिश्रण, जो निज़ाम के दरबार के लिए बना था; अब सात फूलों से बनता है।",
      description="The founder of Nizam Attar created a special blend for Mahboob Ali Khan, the sixth Nizam of Hyderabad. The family still makes it with a variation: it now blends seven flowers, among them rose, jasmine and mogra, plus four local flowers that replaced ones from the original formula that no longer bloom."),
]
# citations for attars
cite("attar","mitti-attar","attar_type","natgeo","wp_kperfume"); cite("attar","mitti-attar","base_oil","fraterworks_mitti","natgeo")
cite("attar","mitti-attar","region_id","wp_kperfume","natgeo"); cite("attar","mitti-attar","description","wp_kperfume","natgeo","rd_mitti_sucks","rd_recommend","rd_mlr_mitti","rd_mitti_reco","rd_smamy_gil","rd_mitti_layer")
cite("attar","mitti-attar","how_made","natgeo","fraterworks_mitti"); cite("attar","mitti-attar","notes","wp_kperfume","natgeo")
cite("attar","ruh-khus","attar_type","pv_explained","ka_ruh"); cite("attar","ruh-khus","description","wp_attar","pv_explained","rd_summer_newbie","rd_recommend")
cite("attar","ruh-khus","notes","pv_explained")
cite("attar","ruh-gulab","attar_type","pv_explained","ka_ruh"); cite("attar","ruh-gulab","region_id","natgeo","wp_kannauj")
cite("attar","ruh-gulab","description","wp_attar","natgeo","pv_explained","tot_ruh"); cite("attar","ruh-gulab","how_made","ka_degbhapka","natgeo"); cite("attar","ruh-gulab","notes","pv_explained")
cite("attar","kewda-attar","region_id","wp_kewra"); cite("attar","kewda-attar","description","wp_attar","wp_kewra","rd_recommend","rd_mustbuy"); cite("attar","kewda-attar","notes","wp_kewra")
cite("attar","mogra-attar","description","wp_attar","wp_jasmine","wp_kperfume"); cite("attar","mogra-attar","notes","pv_explained")
cite("attar","shamama","region_id","premiere_shamama"); cite("attar","shamama","description","pv_explained","premiere_shamama","wp_attar"); cite("attar","shamama","notes","premiere_shamama")
cite("attar","hina-attar","region_id","wp_kperfume"); cite("attar","hina-attar","description","wp_kperfume","pv_explained","rd_mustbuy"); cite("attar","hina-attar","notes","pv_explained")
cite("attar","majmua","description","pv_explained")
cite("attar","musk-attar","description","wp_attar","wp_kperfume"); cite("attar","musk-attar","notes","wp_attar")
cite("attar","kesar-attar","description","wp_attar","wp_kperfume"); cite("attar","kesar-attar","notes","wp_attar")
cite("attar","oud-attar","region_id","wp_agarwood"); cite("attar","oud-attar","description","wp_agarwood","pv_explained"); cite("attar","oud-attar","how_made","wp_agarwood"); cite("attar","oud-attar","notes","wp_agarwood")
cite("attar","nizam-durbar","house_id","nod_nizam"); cite("attar","nizam-durbar","region_id","nod_nizam"); cite("attar","nizam-durbar","description","nod_nizam"); cite("attar","nizam-durbar","notes","nod_nizam")
write("attars.csv", "slug,name,name_hi,aliases,house_slug,attar_type,base_oil,scent_family,region_slug,launch_year,occasions,summary,summary_hi,description,how_made,published".split(","), attars)

attar_notes = [
 ("mitti-attar","baked-earth","heart"),("mitti-attar","sandalwood","base"),
 ("ruh-khus","vetiver","base"),
 ("ruh-gulab","rose","heart"),
 ("kewda-attar","kewra","heart"),
 ("mogra-attar","jasmine-sambac","heart"),
 ("shamama","saffron","heart"),
 ("hina-attar",None,None),
 ("musk-attar","musk","base"),
 ("kesar-attar","saffron","heart"),
 ("oud-attar","oud","base"),
 ("nizam-durbar","rose","heart"),("nizam-durbar","jasmine-sambac","heart"),
]
write("attar_notes.csv", ["attar_slug","note_slug","position","sort_order"],
      [dict(attar_slug=a, note_slug=n, position=p, sort_order=i+1) for i,(a,n,p) in enumerate(attar_notes) if n])

# ---------------------------------------------------------------- glossary
glossary = [
 dict(slug="deg-bhapka", term="Deg-bhapka", term_hi="डेग-भपका", aliases="deg and bhapka|degh-bhapka|hydro-distillation",
      short_definition="The traditional Indian hydro-distillation method for attar, using a copper still (deg), a bamboo pipe and a receiver (bhapka) holding sandalwood oil.",
      short_definition_hi="इत्र बनाने की पारंपरिक भारतीय जल-आसवन विधि: ताँबे की डेग, बाँस की नली और चंदन तेल वाला भपका।",
      body="## The equipment\n\n- **Deg**: a copper still filled with flowers (or clay, herbs or wood) and water\n- **Bhapka**: the copper receiving vessel, which traditionally holds sandalwood oil\n- **Chonga**: a bamboo pipe that carries vapour from the deg to the bhapka\n- **Bhatti**: the wood- or dung-fired furnace\n- **Gachchi**: a water tank that cools the receiver\n- **Kuppi**: a leather bottle\n\n## How it works\n\nThe deg's lid is sealed with a paste of clay and cotton. As the contents simmer, fragrant steam travels down the chonga into the bhapka, where it condenses into the oil. The distiller judges the heat by touch and by the sound of the steam. For rose attar the first distillate is distilled a second time, which yields the attar.\n\nKannauj still has hundreds of distilleries that use this method, although liquid paraffin is now often used in place of costly sandalwood oil."),
 dict(slug="ruh", term="Ruh", term_hi="रूह", aliases="rooh|ruh vs attar",
      short_definition="'Soul' or 'essence': the pure, concentrated oil of a single material, as opposed to an attar distilled into a base oil.",
      short_definition_hi="'आत्मा' या 'सार': किसी एक सामग्री का शुद्ध, गाढ़ा तेल।",
      body="On an attar label, *ruh* marks the concentrated essence of one material: **Ruh Gulab** is the essence of rose and **Ruh Khus** the essence of vetiver root. Because a ruh is undiluted, it usually costs much more than an attar of the same material.\n\nA conventional **attar**, by contrast, is distilled *into* a base, traditionally sandalwood oil. Be cautious with very cheap products labelled 'ruh': many are attars or blends."),
 dict(slug="majmua", term="Majmua", term_hi="मजमुआ", aliases="majmooa",
      short_definition="'A collection': several attars blended and aged together into one rounded scent.",
      short_definition_hi="'संग्रह': कई इत्रों का मिलाकर पुराना किया गया मिश्रण।",
      body="Majmua is less a single recipe than a style. Each house builds its own from several finished attars, which are then left to mature together. See [Majmua](/attars/majmua) for the attar itself."),
 dict(slug="mukhallat", term="Mukhallat", term_hi="मुख़ल्लत", aliases="mukhalat",
      short_definition="Arabic for 'mixed': a composed blend, often of rose, oud, amber and musk, made richer than any one ingredient.",
      short_definition_hi="अरबी में 'मिश्रित': अक्सर गुलाब, ऊद, अंबर और मुश्क का गाढ़ा मिश्रण।"),
 dict(slug="warm-and-cool-attars", term="Warm and cool attars", term_hi="गर्म और ठंडे इत्र", aliases="garam attar|thanda attar|seasonal attars",
      short_definition="The traditional classification of attars by their perceived effect on the body: 'warm' attars for winter and 'cool' attars for summer.",
      short_definition_hi="शरीर पर अनुभव किए जाने वाले असर के आधार पर इत्रों का पारंपरिक वर्गीकरण: सर्दी के लिए 'गर्म', गर्मी के लिए 'ठंडे'।",
      body="## Warm (winter)\n\nMusk, amber and kesar (saffron) are traditionally worn in winter because they are believed to raise body temperature. Kannauj's winter varieties include hina and musk attar; shamama and oud are also counted among the winter attars.\n\n## Cool (summer)\n\nRose, jasmine, khus, kewra and mogra are worn in summer for their perceived cooling effect.\n\n## Monsoon\n\nMitti attar, distilled from baked earth, is the traditional rainy-season variety.\n\nThis is a cultural classification, not a medical one. In practice, community votes on each attar page show how it actually performs in heat, humidity and winter."),
 dict(slug="base-oil", term="Base oil", term_hi="बेस ऑयल", aliases="carrier oil|sandalwood base|liquid paraffin",
      short_definition="The oil an attar is distilled into or diluted with. Traditionally sandalwood oil; today often liquid paraffin or other substitutes.",
      short_definition_hi="वह तेल जिसमें इत्र आसवित या घोला जाता है; पारंपरिक रूप से चंदन तेल।",
      body="Classic Indian attars are distilled into **sandalwood oil**, which absorbs the fragrant vapour and makes the attar long-lasting. Sandalwood is now scarce and regulated: the species is classed as vulnerable, and India restricted its sale in the late 1990s, which pushed up the cost of traditional attar.\n\nMany attars therefore use **liquid paraffin** or other neutral bases instead. Such attars can be close approximations, but they are not the same as sandalwood-based ones. Ask the seller what the base actually is."),
]
cite("glossary","deg-bhapka","short_definition","ka_degbhapka","wp_attar"); cite("glossary","deg-bhapka","body","ka_degbhapka","natgeo")
cite("glossary","ruh","short_definition","pv_explained","ka_ruh"); cite("glossary","ruh","body","pv_explained","ka_ruh")
cite("glossary","majmua","short_definition","pv_explained"); cite("glossary","majmua","body","pv_explained")
cite("glossary","mukhallat","short_definition","pv_explained")
cite("glossary","warm-and-cool-attars","short_definition","wp_attar"); cite("glossary","warm-and-cool-attars","body","wp_attar","wp_kperfume","pv_explained")
cite("glossary","base-oil","short_definition","wp_attar","natgeo"); cite("glossary","base-oil","body","natgeo","wp_sandal","wp_kperfume")
write("glossary.csv", "slug,term,term_hi,aliases,short_definition,short_definition_hi,body,published".split(","), glossary)

# ---------------------------------------------------------------- guides
os.makedirs(os.path.join(ROOT, "guides"), exist_ok=True)
summer = """## Why attars and Indian summers go together

Attars are oil-based rather than alcohol-based and are worn directly on the skin, where they linger for hours. Indian tradition also sorts attars into **cool** and **warm**, and the cool group is the classic summer wardrobe.

## The traditional summer attars

- **[Ruh Khus](/attars/ruh-khus)**: vetiver root, earthy and green. The most frequently recommended summer attar in Indian fragrance communities.
- **[Kewda](/attars/kewda-attar)**: sweet and fruity-floral, from the screwpine flowers of Ganjam, Odisha.
- **[Mogra](/attars/mogra-attar)** and **[Ruh Gulab](/attars/ruh-gulab)**: jasmine and rose, the two great floral 'cool' attars.

## Monsoon: mitti

**[Mitti attar](/attars/mitti-attar)** is distilled from baked clay to smell like the first rain on dry earth. It is Kannauj's traditional rainy-season attar, and many people wear it all summer.

## What the community says

Threads on r/DesiFragranceAddicts give a consistent picture:

- Khus is the most common answer to 'what should I wear in hot and humid weather?'
- Gili mitti, kewra and camphor-infused oud also come up as summer favourites, and kewra with mitti is suggested as a combination.
- Quality varies a lot between makers. One buyer found a mitti attar that smelled of sweat rather than rain, so sample before buying a full bottle.

## Practical tips

1. Apply a small amount to pulse points; attars are concentrated.
2. Patch-test any oil on a small area of skin first.
3. Vote on the **heat** and **humidity** performance of attars you own, so the wiki's averages reflect real Indian conditions.
"""
natural = """## What 'natural' means for an attar

A traditional attar is made by **hydro-distillation**: flowers, roots, clay or wood are heated with water in a copper still (the *deg*), and the fragrant vapour is carried into a receiver (the *bhapka*) holding **sandalwood oil**, which absorbs it. This is the [deg-bhapka](/glossary/deg-bhapka) method still used in Kannauj.

## The sandalwood problem

Indian sandalwood is a vulnerable species, and its trade is regulated. After the Indian government restricted the sale of sandalwood in the late 1990s, the cost of sandalwood-based attar rose sharply. Many producers now distil into **liquid paraffin** or other neutral bases. These can be close approximations, but they are not identical to the classic product.

## Ruh, attar or blend?

- A **[ruh](/glossary/ruh)** is the undiluted essence of one material, the most expensive form.
- An **attar** is a material distilled into a base oil.
- A **[majmua](/glossary/majmua)** or **[mukhallat](/glossary/mukhallat)** is a blend of several attars or materials.

## Questions to ask a seller

1. Is this a distillation, a ruh or a compounded blend?
2. What is the base: sandalwood oil, liquid paraffin or something else?
3. Where was it distilled?

## Musk and oud: ethics

Natural musk comes from the musk deer and harvesting it kills the animal. Modern musk attars use synthetic 'white musk'. Agarwood (oud) species are listed under CITES Appendix II, which regulates international trade.
"""
open(os.path.join(ROOT,"guides","attars-for-indian-summer.md"),"w").write(summer)
open(os.path.join(ROOT,"guides","natural-vs-synthetic-attars.md"),"w").write(natural)
guides = [
 dict(slug="attars-for-indian-summer", title="Attars for an Indian summer and monsoon", title_hi="भारतीय गर्मी और बरसात के लिए इत्र",
      summary="The traditional 'cool' attars, the monsoon classic, and what Indian fragrance communities actually recommend for heat and humidity.",
      summary_hi="पारंपरिक 'ठंडे' इत्र, बरसात का ख़ास इत्र, और गर्मी-उमस के लिए समुदाय की सिफ़ारिशें।",
      body_file="attars-for-indian-summer.md", author_name="Attar Wiki editors", published="true", published_at="2026-11-15"),
 dict(slug="natural-vs-synthetic-attars", title="Natural, paraffin-based or synthetic? Understanding what's in your attar", title_hi="प्राकृतिक या सिंथेटिक? आपके इत्र में क्या है",
      summary="Deg-bhapka distillation, the sandalwood shortage, ruh vs attar vs blend, and the questions to ask before you buy.",
      summary_hi="डेग-भपका आसवन, चंदन की कमी, रूह बनाम इत्र बनाम मिश्रण, और ख़रीदने से पहले पूछे जाने वाले सवाल।",
      body_file="natural-vs-synthetic-attars.md", author_name="Attar Wiki editors", published="true", published_at="2026-11-15"),
]
cite("guide","attars-for-indian-summer","body","nod_nizam","natgeo","wp_attar","wp_kperfume","wp_kewra","rd_summer_newbie","rd_recommend","rd_mitti_sucks","pv_explained")
cite("guide","natural-vs-synthetic-attars","body","ka_degbhapka","natgeo","wp_sandal","pv_explained","wp_attar","wp_agarwood")
write("guides.csv", "slug,title,title_hi,summary,summary_hi,body_file,author_name,published,published_at".split(","), guides)

print(f"regions {len(regions)}, houses {len(houses)}, notes {len(notes)}, attars {len(attars)}, glossary {len(glossary)}, guides {len(guides)}, citations {len(citations)}")

# ================================================================ house products
def first_sentence(text):
    """First sentence, not fooled by initials such as 'M.L.'"""
    m = re.search(r"(?<=[a-z0-9\)'])\.(\s|$)", text)
    return text[: m.start() + 1] if m else text

S.update(PR.EXTRA_SOURCES)
for h in PR.NEW_HOUSES:
    houses.append(h)
cite("house","kannauj-attar","city","ka_blackoud")
cite("house","kannauj-attar","history","ka_degbhapka_page","ka_henna")
cite("house","kannauj-attar","website_url","ka_degbhapka_page")
write("houses.csv", "slug,name,name_hi,aliases,city,region_slug,founded_year,summary,summary_hi,history,website_url,published".split(","), houses)

for n in PR.NEW_NOTES:
    k = n.pop("_cite", None)
    notes.append(n)
    if k and n.get("botanical_name"):
        cite("note", n["slug"], "botanical_name", k)
write("notes.csv", "slug,name,name_hi,aliases,botanical_name,category,summary,summary_hi,smell,botany,grown_in,published".split(","), notes)

style_slugs = {a["slug"] for a in attars}
relations, prices, product_notes = [], [], []
for p in PR.PRODUCTS:
    assert p["style"] is None or p["style"] in style_slugs, p["slug"]
    src_key = "prod_" + p["slug"]
    pub = p["source"] or PR.PUBLISHER[p["house"]]
    S[src_key] = (p["url"], p["name"].split(" (")[0], pub)
    row = dict(slug=p["slug"], name=p["name"], house_slug=p["house"], attar_type=p["type"] or "", base_oil=p["base"] or "",
               scent_family=p["family"] or "", region_slug=p["region"] or "", occasions=p["occasions"],
               summary=p["summary"] or first_sentence(p["desc"]), description=p["desc"])
    attars.append(row)
    keys = [src_key] + p["cite_extra"]
    cite("attar", p["slug"], "house_id", src_key)
    cite("attar", p["slug"], "description", *keys)
    if p["type"]: cite("attar", p["slug"], "attar_type", src_key)
    if p["base"]: cite("attar", p["slug"], "base_oil", src_key)
    if p["region"]: cite("attar", p["slug"], "region_id", src_key)
    if p["notes"]: cite("attar", p["slug"], "notes", src_key)
    for i, (note, pos) in enumerate(p["notes"]):
        product_notes.append((p["slug"], note, pos))
    if p["style"]:
        relations.append(dict(attar_slug=p["slug"], relation="example_of", related_attar_slug=p["style"], external_name="", note=""))
    for qty, price in p["prices"]:
        prices.append(dict(attar_slug=p["slug"], price_min_inr=price, price_max_inr=price, volume_ml=qty, unit=p["unit"],
                           reported_on=PR.REPORTED_ON, source_name=pub, source_url=p["url"],
                           note="Listed price on the official store on this date" if not p["source"] else "Listed price on a retailer page on this date"))
    if p["prices"]: cite("attar", p["slug"], "price", src_key)

cite("house","boond-fragrances","history","prod_boond-maati"); cite("house","boond-fragrances","website_url","prod_boond-maati")
cite("house","baanka","website_url","prod_baanka-manmath-mitti")
cite("house","sugandhco","city","prod_sugandhco-gil-mitti")
write("attars.csv", "slug,name,name_hi,aliases,house_slug,attar_type,base_oil,scent_family,region_slug,launch_year,occasions,summary,summary_hi,description,how_made,published".split(","), attars)
all_notes = [(a, n, p) for a, n, p in attar_notes if n] + product_notes
write("attar_notes.csv", ["attar_slug","note_slug","position","sort_order"],
      [dict(attar_slug=a, note_slug=n, position=p, sort_order=i+1) for i,(a,n,p) in enumerate(all_notes)])
write("attar_relations.csv", ["attar_slug","relation","related_attar_slug","external_name","note"], relations)
write("price_reports.csv", ["attar_slug","price_min_inr","price_max_inr","volume_ml","unit","reported_on","source_name","source_url","note"], prices)
write("citations.csv", "entity_type,entity_slug,field_name,url,title,publisher,accessed_at,quote".split(","), citations)
print(f"products {len(PR.PRODUCTS)}, product prices {len(prices)}, style links {len(relations)}, notes now {len(notes)}, houses now {len(houses)}, citations {len(citations)}")
