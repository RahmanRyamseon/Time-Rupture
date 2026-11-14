# Seed CSVs

These files are **templates**: each has a header row and no data. Fill them from vetted sources, then import:

```bash
npm run import -- all --dry-run   # validate every file and every slug reference
```

```bash
npm run import -- all             # write to Supabase (needs SUPABASE_SERVICE_ROLE_KEY)
```

```bash
npm run import -- attars          # or import a single file
```

The importer is idempotent. Rows are upserted by `slug` (or by natural keys for child tables), so you can fix a CSV and run it again. Each content change writes a revision through database triggers. Imported revisions are labelled "Data import".

## Ground rules

- **Never make up data.** Leave a cell empty if you do not have a source. The site shows "Not yet documented, help add it" for empty fields.
- **Write descriptions in your own words.** Do not paste text from fragrance databases, brand sites or retailers. Add them to `citations.csv` instead.
- Give every factual field a source in `citations.csv`. Uncited fields are flagged "needs citation" on the page.

## Cell formats

| Format | Example | Notes |
|---|---|---|
| list | `khus\|खस\|vetiver` | Pipe-separated (aliases, occasions) |
| slug | `ruh-khus` | Lowercase a–z, 0–9, single hyphens |
| boolean | `true` / `false` | Empty = default (`true`, except guides = `false`) |
| date | `2026-10-01` | ISO format |
| Markdown | multi-line text in quotes | For long fields such as `description`, `how_made` and `history` |

Load order (handled by `all`): regions → houses → notes → attars → attar_notes → attar_relations → price_reports → glossary → guides → citations → media.

## Files and columns

### `regions.csv`
`slug, name, name_hi, aliases, state, country, summary, summary_hi, history, specialities, latitude, longitude, published`
`country` defaults to `India`.

### `houses.csv`
`slug, name, name_hi, aliases, city, region_slug, founded_year, summary, summary_hi, history, website_url, published`
`region_slug` must exist in `regions.csv` or in the database. `website_url` is the official site only (no shop or affiliate links).

### `notes.csv`
`slug, name, name_hi, aliases, botanical_name, category, summary, summary_hi, smell, botany, grown_in, published`
Put local names in `aliases` (for example Hindi or Urdu spellings) so search finds them.

### `attars.csv`
`slug, name, name_hi, aliases, house_slug, attar_type, base_oil, scent_family, region_slug, launch_year, occasions, summary, summary_hi, description, how_made, published`
- `attar_type` is one of `natural_deg_bhapka`, `blended`, `synthetic`, `ruh`.
- `occasions` is free text, for example `daily|wedding|prayer`. The "Find your attar" matcher reads these words.

### `attar_notes.csv`
`attar_slug, note_slug, position, sort_order`
`position` is one of `top`, `heart`, `base`. Each attar listed in this file gets **exactly** the notes in the file; existing notes for that attar are replaced.

### `attar_relations.csv`
`attar_slug, relation, related_attar_slug, external_name, note`
`relation` is one of `similar`, `clone_of`, `inspired_by`. Use `related_attar_slug` for an attar in the wiki, or `external_name` for a fragrance outside it.

### `price_reports.csv`
`attar_slug, price_min_inr, price_max_inr, volume_ml, reported_on, source_name, source_url, note`
These are reported price ranges, not offers. Always include the date and source. Exact duplicates are skipped.

### `glossary.csv`
`slug, term, term_hi, aliases, short_definition, short_definition_hi, body, published`

### `guides.csv`
`slug, title, title_hi, summary, summary_hi, body_file, author_name, published, published_at`
`body_file` is the name of a Markdown file in `seed/guides/`. Its `##` headings become the table of contents.

### `citations.csv`
`entity_type, entity_slug, field_name, url, title, publisher, accessed_at, quote`
- `entity_type` is one of `attar`, `house`, `note`, `region`, `glossary`, `guide`.
- `field_name` is the column the source supports. For attars it can also be `notes` or `price`.
- `accessed_at` defaults to today.

### `media.csv`
`entity_type, entity_slug, file, alt, license, credit, source_url, permission_note, is_primary`
- `file` is a path inside `seed/media/`.
- `license` is one of `CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `OWN-WORK-CC-BY-SA-4.0`, `BRAND-PERMISSION`.
- `BRAND-PERMISSION` requires a `permission_note` describing the written permission.
- Imported images are marked approved, because the operator vetted them.
