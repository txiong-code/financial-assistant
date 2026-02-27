import { NextRequest, NextResponse } from "next/server";
import { openai, MODEL } from "@/lib/ai/client";
import { CHAT_EXPLAIN_PROMPT } from "@/lib/ai/prompts";
import { extractIntent } from "@/lib/ai/classifier";
import { FinancialSnapshot, AffordabilityResult } from "@/lib/finance/types";
import {
  computeAffordability,
  buildSnapshot,
} from "@/lib/finance/engine";

// ── Date helpers (routing layer owns date inference, not the engine) ──────────

function nearestWeekend(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 6=Sat
  const daysUntilSaturday = day === 6 ? 7 : (6 - day);
  d.setDate(d.getDate() + daysUntilSaturday);
  return d;
}

function resolveTimeframe(timeframe: string | undefined): { date: Date; assumptionMade: boolean } {
  if (!timeframe) {
    return { date: nearestWeekend(), assumptionMade: true };
  }

  const lower = timeframe.toLowerCase().replace(/[_\s]/g, " ");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lower.includes("tomorrow")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return { date: d, assumptionMade: false };
  }
  if (lower.includes("weekend") || lower.includes("saturday") || lower.includes("sunday")) {
    return { date: nearestWeekend(), assumptionMade: false };
  }
  if (lower.includes("friday")) {
    const d = new Date(today);
    const dayOfWeek = d.getDay();
    const daysUntilFriday = dayOfWeek <= 5 ? (5 - dayOfWeek) || 7 : 6;
    d.setDate(d.getDate() + daysUntilFriday);
    return { date: d, assumptionMade: false };
  }
  if (lower.includes("week")) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return { date: d, assumptionMade: false };
  }

  // Unrecognized timeframe — fall back to nearest weekend with assumption flag
  return { date: nearestWeekend(), assumptionMade: true };
}

// ── Engine dispatch (based on intent) ─────────────────────────────────────────

function dispatchEngine(
  intent: string,
  params: Record<string, unknown>,
  snapshot: FinancialSnapshot
): { engineResult: object; assumptionMade: boolean } {
  switch (intent) {
    case "affordability_check": {
      const amount = Number(params.amount ?? 0);
      const { date, assumptionMade } = resolveTimeframe(params.timeframe as string | undefined);
      const result = computeAffordability(amount, snapshot, date);
      return { engineResult: { ...result, assumptionMade }, assumptionMade };
    }
    case "balance_query": {
      return {
        engineResult: { currentBalance: snapshot.currentBalance },
        assumptionMade: false,
      };
    }
    case "projection_query": {
      return {
        engineResult: {
          lowestProjectedBalance: snapshot.lowestProjectedBalance,
          lowestProjectedDate: snapshot.lowestProjectedDate,
          riskFlag: snapshot.riskFlag,
          projection: snapshot.projection,
        },
        assumptionMade: false,
      };
    }
    case "spending_query": {
      return {
        engineResult: {
          avgDailySpend: snapshot.avgDailySpend,
          dateRange: snapshot.dateRange,
          transactionCount: snapshot.transactionCount,
        },
        assumptionMade: false,
      };
    }
    default: {
      // general or unknown — pass the full snapshot as context
      return { engineResult: snapshot as unknown as object, assumptionMade: false };
    }
  }
}

// ── LLM explanation ───────────────────────────────────────────────────────────

async function generateExplanation(
  question: string,
  intent: string,
  engineResult: object,
  assumptionMade: boolean
): Promise<string> {
  if (intent === "unknown") {
    return "I'm not sure what you're asking. Could you rephrase? For example: \"Can I afford $200 this weekend?\" or \"What's my current balance?\"";
  }

  const contextStr = JSON.stringify(engineResult, null, 2);
  const assumptionNote = assumptionMade
    ? "\nNote: The targetDate was inferred as the nearest weekend because no specific date was provided. State this assumption at the start of your response."
    : "";

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: CHAT_EXPLAIN_PROMPT },
      {
        role: "user",
        content: `User question: "${question}"\n\nEngine result:\n${contextStr}${assumptionNote}`,
      },
    ],
    max_tokens: 200,
  });

  return completion.choices[0]?.message?.content ?? "Could not generate a response.";
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { question, snapshot } = (await req.json()) as {
    question: string;
    snapshot: FinancialSnapshot;
  };

  // Rehydrate Date objects (JSON serialization strips them)
  const rehydratedSnapshot: FinancialSnapshot = {
    ...snapshot,
    lowestProjectedDate: new Date(snapshot.lowestProjectedDate),
    dateRange: {
      from: new Date(snapshot.dateRange.from),
      to: new Date(snapshot.dateRange.to),
    },
    projection: snapshot.projection.map((p) => ({
      ...p,
      date: new Date(p.date),
    })),
  };

  try {
    // Stage 1: extract intent
    const { intent, params } = await extractIntent(question);

    // Stage 2: route to deterministic engine
    const { engineResult, assumptionMade } = dispatchEngine(intent, params, rehydratedSnapshot);

    // Stage 3: LLM explanation
    const explanation = await generateExplanation(question, intent, engineResult, assumptionMade);

    return NextResponse.json({ explanation, engineResult, intent });
  } catch {
    return NextResponse.json(
      { error: "Failed to process your question. Check that your API key is valid." },
      { status: 500 }
    );
  }
}
