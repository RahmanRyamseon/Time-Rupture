import { z } from "zod/v4";

export const NATURE_VALUES = [
  "Standard-rated",
  "Zero-rated",
  "Exempt",
  "Blocked input",
  "Import (reverse charge)",
  "Export (zero-rated)",
  "Out of scope",
] as const;

export const ClassificationResultSchema = z.object({
  id: z.string(),
  classifiedNature: z.enum(NATURE_VALUES),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(280),
});

export const ClassificationSchema = z.object({
  results: z.array(ClassificationResultSchema),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

export interface ClassifyLineInput {
  id: string;
  desc: string;
}

export const CLASSIFIER_SYSTEM_PROMPT =
  "You are a Bahrain VAT compliance classifier. For each transaction line, classify its likely VAT nature " +
  "under VAT Decree-Law 48/2018 and its Executive Regulations, based only on its description text: " +
  "Standard-rated, Zero-rated (e.g. basic food items on the NBR list, exports), Exempt (e.g. residential rent, " +
  "local passenger transport, certain financial services), Blocked input (Art. 42(C) — entertainment, " +
  "personal-use motor vehicles, non-business hospitality), Import (reverse charge), Export (zero-rated), or " +
  "Out of scope if the description gives no basis for classification. Give a confidence 0-1 and a short reason.";

export function buildPrompt(lines: ClassifyLineInput[]): string {
  return (
    "Classify each of these transaction lines. Respond with JSON matching this exact shape: " +
    `{"results":[{"id":"<line id>","classifiedNature":"<one of ${NATURE_VALUES.join(" | ")}>",` +
    '"confidence":<0-1 number>,"reasoning":"<short reason, max 280 chars>"}]}. ' +
    "Return exactly one result per input line, in any order, using the same id. " +
    `Lines:\n${JSON.stringify(lines)}`
  );
}
