/** Shared facts referenced across the legal pages, kept in one place so they stay consistent. */

export const SITE_NAME = "Nuqati";
export const SITE_URL = "https://gulfcards.vercel.app";
export const REPO_URL = "https://github.com/RahmanRyamseon/Time-Rupture";
export const SITE_DESCRIPTION =
  "Which card should you swipe? What are your points actually worth? Nuqati is a free GCC credit " +
  "card rewards optimizer covering Bahrain's bank cards, with real reward-rate comparisons, a points " +
  "valuation engine, and a transfer-partner map — no bank login required.";

export const LEGAL_LAST_UPDATED = "26 October 2026";

/**
 * Nuqati is currently an independent, unincorporated personal project — not operated by a
 * registered company. Every legal page says so plainly rather than inventing a corporate
 * identity. If a real entity is formed, replace this one constant and every page updates.
 */
export const OPERATOR_DESCRIPTION =
  "Nuqati is currently an independent personal project, not operated by a registered company. " +
  "If a legal entity is formed to operate Nuqati, this page will be updated with its registered name, " +
  "jurisdiction of incorporation, and registered address.";

/**
 * No monitored inbox exists yet (see Privacy Policy "How to reach us"). Routing requests through
 * a public GitHub issue is the only real, verifiable channel available today — fabricating an
 * email address that nobody reads would be worse than naming this gap honestly.
 */
export const CONTACT_FALLBACK_NOTE =
  `A dedicated, monitored contact address has not been published yet. In the meantime, open an issue ` +
  `on the project's GitHub repository (${REPO_URL}) describing your request — mention "privacy", ` +
  `"security", or "legal" in the title so it's easy to find. This page will be updated with a dedicated ` +
  `email address once one exists.`;

export const LEGAL_REVIEW_NOTICE =
  "This page is a good-faith, plain-language description of what Nuqati actually does today. It is " +
  "not legal advice and has not been reviewed by a lawyer. Before Nuqati is used commercially, " +
  "expands into Saudi Arabia or any other market, or adds accounts, payments, or analytics, this " +
  "page should be reviewed by qualified privacy counsel in each applicable jurisdiction.";
