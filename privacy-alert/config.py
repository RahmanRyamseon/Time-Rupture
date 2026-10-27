# -*- coding: utf-8 -*-
"""Configuration for the daily data-privacy regulatory alert.

Edit this file to add, remove or tune sources, keywords and schedule.
Secrets never go here: they are read from environment variables (see .env.example).

SOURCE VERIFICATION: the URLs below were written without live verification.
Check each one once from an unrestricted network before relying on it
(`python main.py --stage fetch --source "<name>"` reports failures per source).
Set "enabled": False to switch a source off without deleting it.
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SEEN_FILE = BASE_DIR / "seen.json"          # de-duplication state
LOG_FILE = BASE_DIR / "alerts_log.csv"      # append-only audit trail

# ---------------------------------------------------------------------------
# SOURCES: add or remove entries here.
#   type "rss"  -> parsed as a feed (RSS or Atom); each entry is an item.
#   type "page" -> HTML page scraped; every same-site link with a meaningful
#                  title is an item, and a change in the page's content hash
#                  raises a "page change" item if it touches a keyword.
#   same_domain_only  (page)  ignore links that leave the site
#   ignore_patterns   (page)  regexes stripped before hashing, e.g. timestamps
# ---------------------------------------------------------------------------
SOURCES = {
    # --- United Kingdom ----------------------------------------------------
    "UK - ICO news and guidance": {
        "jurisdiction": "UK", "type": "rss",
        "url": "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/rss/",
    },
    "UK - legislation.gov.uk new legislation": {
        "jurisdiction": "UK", "type": "rss",
        "url": "https://www.legislation.gov.uk/new/data.feed",
    },
    "UK - UK GDPR (retained 2016/679) contents": {
        "jurisdiction": "UK", "type": "page",
        "url": "https://www.legislation.gov.uk/eur/2016/679/contents",
        "same_domain_only": True,
    },
    "UK - Data Protection Act 2018 contents": {
        "jurisdiction": "UK", "type": "page",
        "url": "https://www.legislation.gov.uk/ukpga/2018/12/contents",
        "same_domain_only": True,
    },

    # --- European Union ----------------------------------------------------
    "EU - EUR-Lex GDPR (2016/679)": {
        "jurisdiction": "EU", "type": "page",
        "url": "https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng",
    },
    "EU - EUR-Lex ePrivacy Directive (2002/58/EC)": {
        "jurisdiction": "EU", "type": "page",
        "url": "https://eur-lex.europa.eu/eli/dir/2002/58/oj/eng",
    },
    "EU - EUR-Lex AI Act (2024/1689)": {
        "jurisdiction": "EU", "type": "page",
        "url": "https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng",
    },
    "EU - EUR-Lex Data Act (2023/2854)": {
        "jurisdiction": "EU", "type": "page",
        "url": "https://eur-lex.europa.eu/eli/reg/2023/2854/oj/eng",
    },
    "EU - EDPB news": {
        "jurisdiction": "EU", "type": "rss",
        "url": "https://www.edpb.europa.eu/rss/news.xml",
    },

    # --- Canada ------------------------------------------------------------
    "Canada - Office of the Privacy Commissioner news": {
        "jurisdiction": "Canada", "type": "page",
        "url": "https://www.priv.gc.ca/en/opc-news/",
        "same_domain_only": True,
    },
    "Canada - Parliament LEGISinfo bills (federal privacy reform)": {
        # Replace with a saved LEGISinfo search for privacy bills once confirmed.
        "jurisdiction": "Canada", "type": "page",
        "url": "https://www.parl.ca/legisinfo/en/bills",
        "same_domain_only": True,
    },

    # --- Bahrain -----------------------------------------------------------
    "Bahrain - Personal Data Protection Authority (PDPA)": {
        "jurisdiction": "Bahrain", "type": "page",
        "url": "https://www.pdp.gov.bh/",
        "same_domain_only": True,
    },
    "Bahrain - Official Gazette / legislation portal": {
        "jurisdiction": "Bahrain", "type": "page",
        "url": "https://www.legalaffairs.gov.bh/",
        "same_domain_only": True,
    },

    # --- Saudi Arabia ------------------------------------------------------
    "Saudi Arabia - SDAIA news": {
        "jurisdiction": "Saudi Arabia", "type": "page",
        "url": "https://sdaia.gov.sa/",
        "same_domain_only": True,
    },
    "Saudi Arabia - NDMO (data management and personal data protection)": {
        "jurisdiction": "Saudi Arabia", "type": "page",
        "url": "https://sdaia.gov.sa/ndmo/",
        "same_domain_only": True,
    },

    # --- Mozambique --------------------------------------------------------
    "Mozambique - Boletim da Republica (Imprensa Nacional)": {
        "jurisdiction": "Mozambique", "type": "page",
        "url": "https://www.imprensanacional.gov.mz/",
        "same_domain_only": True,
    },
    "Mozambique - INTIC (ICT ministry and regulator)": {
        "jurisdiction": "Mozambique", "type": "page",
        "url": "https://intic.gov.mz/",
        "same_domain_only": True,
    },
}

# Order in which jurisdictions appear in the digest and the audit log.
JURISDICTIONS = ["UK", "EU", "Canada", "Bahrain", "Saudi Arabia", "Mozambique"]

# Case-insensitive, whole-word matching. Include English, Portuguese and Arabic.
KEYWORDS = [
    "personal data", "personal information", "data protection", "privacy",
    "PDPL", "GDPR", "UK GDPR", "ePrivacy", "Data Protection Act",
    "cross-border transfer", "international transfer", "data localisation",
    "data localization", "data breach", "breach notification",
    "personal data breach", "DPO", "data protection officer", "data subject",
    "data controller", "data processor", "consent", "amendment", "regulation",
    "decree", "artificial intelligence",
    "dados pessoais", "proteção de dados", "privacidade",
    "البيانات الشخصية", "حماية البيانات", "الخصوصية",
]

# ---------------------------------------------------------------------------
# SCHEDULE: informational. The actual schedule lives in the cron entry (README)
# or in .github/workflows/privacy-alert.yml. Keep those in step with this.
# 07:00 Bahrain (UTC+3, no daylight saving) = 04:00 UTC.
# ---------------------------------------------------------------------------
TIMEZONE = "Asia/Bahrain"
SCHEDULE_LOCAL_TIME = "07:00"
SCHEDULE_CRON_UTC = "0 4 * * *"

# ---------------------------------------------------------------------------
# DELIVERY AND AI
# ---------------------------------------------------------------------------
WHATSAPP_PROVIDER = "twilio"          # "twilio" or "meta"
WHATSAPP_CHUNK_CHARS = 1500           # split free-form digests above this
TEMPLATE_CHUNK_CHARS = 1000           # Meta template parameters are capped at 1024
META_GRAPH_VERSION = "v21.0"
GEMINI_MODEL = "gemini-2.5-flash"

# ---------------------------------------------------------------------------
# TUNING
# ---------------------------------------------------------------------------
BASELINE_ON_FIRST_RUN = True          # first run per source records items silently
REQUEST_TIMEOUT = 30                  # seconds per HTTP request
HTTP_RETRIES = 3
USER_AGENT = "PrivacyAlertBot/1.0 (internal GRC monitoring; contact: GRC team)"
MAX_ENTRIES_PER_SOURCE = 50
MAX_LINKS_PER_PAGE = 150
MAX_TEXT_PER_ITEM = 800               # characters of item text sent to Gemini
MAX_ITEMS_TO_SUMMARISE = 60
MAX_SEEN_ITEMS = 5000                 # oldest entries are pruned from seen.json
SEND_DELAY_SECONDS = 2                # pause between WhatsApp messages
