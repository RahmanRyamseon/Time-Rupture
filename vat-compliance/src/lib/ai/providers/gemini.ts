import { GoogleGenAI } from "@google/genai";
import { ClassificationSchema, buildPrompt, CLASSIFIER_SYSTEM_PROMPT, type ClassifyLineInput, type ClassificationResult } from "../schema";

// Written without access to live @google/genai docs in this environment —
// `text` extraction is defensive (property vs. method vs. raw candidate
// shape) specifically because that surface has changed across SDK versions.
// Verify against the current @google/genai docs if Gemini output ever fails
// to parse.
interface GeminiResponseLike {
  text?: string | (() => string);
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

function extractText(response: GeminiResponseLike): string {
  if (typeof response.text === "string") return response.text;
  if (typeof response.text === "function") return response.text();
  const candidateText = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof candidateText === "string") return candidateText;
  throw new Error("Could not extract text from Gemini response.");
}

export async function classifyWithGemini(lines: ClassifyLineInput[], apiKey: string): Promise<ClassificationResult[]> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `${CLASSIFIER_SYSTEM_PROMPT}\n\n${buildPrompt(lines)}`,
    config: { responseMimeType: "application/json" },
  });

  const text = extractText(response);
  const parsed = ClassificationSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("Gemini returned output that didn't match the expected schema.");
  return parsed.data.results;
}
