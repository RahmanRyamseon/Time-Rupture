# CSV templates — دليل الأعمدة

Copy a template into `data/csv/`, add rows, then run `npm run content` (validates and compiles)
and, if Supabase is connected, `npm run import:supabase`. Files are UTF-8; quote any cell containing commas or line breaks.

**Golden rule / القاعدة الذهبية:** leave a cell empty when the fact is not documented. Never guess origins, grades, prices or authenticity. The site renders empty fields as «لم يُوثَّق بعد — ساهم بإضافته».

| File | Key columns | Notes |
|---|---|---|
| `citations.csv` | `id,url,title,publisher,accessed,quote` | One row per source. `accessed` = YYYY-MM-DD. `quote` = the exact supporting sentence (short). |
| `taxonomy.csv` | `type,id,name_ar,name_en,order` | Types: `category`, `origin_group`, `wild_status`, `occasion`, `season`, `character`, `unit`, `climate`, `strength`, `longevity`, `sillage`. |
| `houses.csv` | `id,slug_ar,slug_en,name_*,country_*,city_*,founded_year,founder_*,history_*,official_website,citations` | `official_website` must be the house's own site — no shops or affiliate links. |
| `origins.csv` | `id,slug_*,name_*,region_*,species,profile_*,smell_*,grading_*,uses_*,citations` | |
| `notes.csv` | `id,slug_*,name_*,family,description_*,citations` | `family` is a `character` taxonomy id. |
| `products.csv` | `id,slug_*,name_*,house_id,category,origins,wild_status,notes_top,notes_heart,notes_base,description_*,occasions,seasons,size_value,size_unit,size_note_*,official_url,citations` | Lists use `|`. Notes may carry an origin qualifier: `oud@cambodi`. `size_unit`: `tola`, `ml` or `g` — never convert between them. |
| `prices.csv` | `product_id,price_min,price_max,currency,size_text_*,observed_on,citation_id,note_*` | Reported prices only: date and source are mandatory. ISO currency (AED, SAR, KWD, QAR, BHD, OMR…). |
| `articles.csv` | `id,kind,slug_*,title_*,summary_*,body_*,citations,updated` | `kind` = `culture` or `guide`. Body is light Markdown (`##`, `###`, lists, `>`, `**bold**`, links) with inline sources: `{{cite:citation-id}}`. |

### The `citations` column
Per-field sources, `field:citation_id` pairs separated by `|`, e.g.

```
origins:sa-shaheen|notes:sa-shaheen|description:sa-shaheen
```

A field shown without a matching pair displays a «بحاجة إلى مصدر» (citation needed) tag.

### Slugs
Arabic slugs keep Arabic letters with hyphens between words, no diacritics: `دهن-العود-شاهين`. English slugs are kebab-case. Both must be unique within their type.
