interface Props {
  engineResult: object;
  intent: string;
}

function fmt(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(d);
}

export function ReasoningTrace({ engineResult, intent }: Props) {
  const data = engineResult as Record<string, unknown>;

  return (
    <div className="mb-3 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-mono text-gray-500">
      <p className="font-semibold text-gray-400 uppercase tracking-wide mb-1">
        Engine output · {intent.replace(/_/g, " ")}
      </p>
      {intent === "affordability_check" && (
        <div className="space-y-0.5">
          <p>amount: {fmt(data.amount as number)}</p>
          <p>target date: {fmtDate(data.targetDate as string)}</p>
          <p>projected balance at date: {fmt(data.projectedBalanceAtDate as number)}</p>
          <p>remaining after purchase: {fmt(data.remainingAfterPurchase as number)}</p>
          <p>can afford: {String(data.canAfford)}</p>
          {Boolean(data.assumptionMade) && (
            <p className="text-amber-500">assumption: date inferred (nearest weekend)</p>
          )}
        </div>
      )}
      {intent === "balance_query" && (
        <div className="space-y-0.5">
          <p>current balance: {fmt(data.currentBalance as number)}</p>
        </div>
      )}
      {intent === "projection_query" && (
        <div className="space-y-0.5">
          <p>7-day low: {fmt(data.lowestProjectedBalance as number)}</p>
          <p>on: {fmtDate(data.lowestProjectedDate as string)}</p>
          <p>risk flag: {String(data.riskFlag)}</p>
        </div>
      )}
      {intent === "spending_query" && (
        <div className="space-y-0.5">
          <p>avg daily spend: {fmt(data.avgDailySpend as number)}</p>
          <p>30-day window</p>
        </div>
      )}
      {(intent === "general" || intent === "unknown") && (
        <p>snapshot provided to LLM</p>
      )}
    </div>
  );
}
