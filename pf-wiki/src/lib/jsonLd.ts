/**
 * Serializes data for a JSON-LD <script> tag. Escapes `<` so a string value
 * (e.g. a title containing "</script>") can't prematurely close the tag and
 * inject markup — defense in depth even though today's data is static.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
