import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ClassificationSchema, CLASSIFIER_SYSTEM_PROMPT, type ClassifyLineInput, type ClassificationResult } from "../schema";

export async function classifyWithAnthropic(lines: ClassifyLineInput[], apiKey: string): Promise<ClassificationResult[]> {
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: CLASSIFIER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(lines) }],
    output_config: { format: zodOutputFormat(ClassificationSchema) },
  });

  if (!response.parsed_output) throw new Error("Anthropic did not return parseable output.");
  return response.parsed_output.results;
}
