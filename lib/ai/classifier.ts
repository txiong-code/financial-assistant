import { openai, MODEL } from "@/lib/ai/client";
import { CHAT_INTENT_PROMPT, CHAT_SOFT_INTENT_PROMPT } from "@/lib/ai/prompts";

export interface IntentResult {
  intent: string;
  params: Record<string, unknown>;
}

async function callClassifier(
  systemPrompt: string,
  question: string
): Promise<IntentResult> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    max_tokens: 100,
    response_format: { type: "json_object" },
  });

  const raw =
    completion.choices[0]?.message?.content ??
    '{"intent":"unknown","params":{}}';
  try {
    return JSON.parse(raw) as IntentResult;
  } catch {
    return { intent: "unknown", params: {} };
  }
}

export async function extractIntent(question: string): Promise<IntentResult> {
  // Pass 1: strict classifier
  const pass1 = await callClassifier(CHAT_INTENT_PROMPT, question);
  if (pass1.intent !== "unknown") return pass1;

  // Pass 2: soft classifier — only triggered when Pass 1 returns "unknown"
  const pass2 = await callClassifier(CHAT_SOFT_INTENT_PROMPT, question);
  if (pass2.intent === "unknown") return { intent: "unknown", params: {} };

  // Guard: affordability_check requires an explicit amount from the user
  if (
    pass2.intent === "affordability_check" &&
    (pass2.params.amount === undefined || pass2.params.amount === null)
  ) {
    return { intent: "unknown", params: {} };
  }

  return pass2;
}
