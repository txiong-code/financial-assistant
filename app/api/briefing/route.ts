import { NextRequest, NextResponse } from "next/server";
import { openai, MODEL } from "@/lib/ai/client";
import { BRIEFING_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { FinancialSnapshot } from "@/lib/finance/types";

function formatSnapshotForPrompt(snapshot: FinancialSnapshot): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const fmtDate = (d: string | Date) =>
    new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(
      new Date(d)
    );

  return `Financial Snapshot:
- Current balance: ${fmt(snapshot.currentBalance)}
- Average daily spend (last 30 days): ${fmt(snapshot.avgDailySpend)}
- 7-day projected low: ${fmt(snapshot.lowestProjectedBalance)} on ${fmtDate(snapshot.lowestProjectedDate)}
- Liquidity risk flag: ${snapshot.riskFlag ? "YES — projected balance drops below $500 within 7 days" : "No — all projected days are above $500"}
- Transactions loaded: ${snapshot.transactionCount}`;
}

export async function POST(req: NextRequest) {
  const { snapshot } = (await req.json()) as { snapshot: FinancialSnapshot };

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: BRIEFING_SYSTEM_PROMPT },
        { role: "user", content: formatSnapshotForPrompt(snapshot) },
      ],
      max_tokens: 200,
    });

    const briefing = completion.choices[0]?.message?.content ?? "Could not generate briefing.";
    return NextResponse.json({ briefing });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate briefing. Check that your API key is valid." },
      { status: 500 }
    );
  }
}
