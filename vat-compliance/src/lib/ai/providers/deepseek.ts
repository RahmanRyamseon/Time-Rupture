import OpenAI from "openai";
import { ClassificationSchema, buildPrompt, CLASSIFIER_SYSTEM_PROMPT, type ClassifyLineInput, type ClassificationResult } from "../schema";

// DeepSeek's API is OpenAI-compatible, so the official `openai` SDK works
// unmodified against it — just point baseURL at DeepSeek and use its model
// name. DeepSeek has no dedicated structured-output helper, so the response
// is validated against the shared Zod schema manually.
export async function classifyWithDeepseek(lines: ClassifyLineInput[], apiKey: string): Promise<ClassificationResult[]> {
  const client = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(lines) },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("DeepSeek returned no output.");

  const parsed = ClassificationSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error("DeepSeek returned output that didn't match the expected schema.");
  return parsed.data.results;
}
