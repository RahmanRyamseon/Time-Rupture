import type { ClassificationResult, ClassifyLineInput } from "./schema";
import { classifyWithGemini } from "./providers/gemini";
import { classifyWithDeepseek } from "./providers/deepseek";
import { classifyWithAnthropic } from "./providers/anthropic";

export type AiProvider = "gemini" | "deepseek" | "anthropic";

// Preference order when AI_PROVIDER isn't explicitly set: Gemini has a
// genuinely free API tier (Google AI Studio), DeepSeek is extremely low
// cost, Anthropic has no free tier. GitHub Copilot is deliberately not an
// option here — Copilot has no public API for arbitrary server-side
// completions from a third-party app; its API surface is IDE-integration
// only, so a "Copilot key" can't be wired into a route handler like this.
const PROVIDER_ENV_KEYS: Record<AiProvider, string> = {
  gemini: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};
const PREFERENCE_ORDER: AiProvider[] = ["gemini", "deepseek", "anthropic"];

export function resolveProvider(): { provider: AiProvider; apiKey: string } | null {
  const forced = process.env.AI_PROVIDER as AiProvider | undefined;
  const order = forced && PROVIDER_ENV_KEYS[forced] ? [forced] : PREFERENCE_ORDER;

  for (const provider of order) {
    const apiKey = process.env[PROVIDER_ENV_KEYS[provider]];
    if (apiKey) return { provider, apiKey };
  }
  return null;
}

export async function classifyLines(
  lines: ClassifyLineInput[]
): Promise<{ provider: AiProvider; results: ClassificationResult[] }> {
  const resolved = resolveProvider();
  if (!resolved) {
    throw new Error(
      "No AI provider configured. Set one of GEMINI_API_KEY (free tier, recommended), DEEPSEEK_API_KEY (low cost), or ANTHROPIC_API_KEY."
    );
  }

  const { provider, apiKey } = resolved;
  const results =
    provider === "gemini"
      ? await classifyWithGemini(lines, apiKey)
      : provider === "deepseek"
        ? await classifyWithDeepseek(lines, apiKey)
        : await classifyWithAnthropic(lines, apiKey);

  return { provider, results };
}
