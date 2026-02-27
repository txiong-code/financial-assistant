"use client";

import { FinancialSnapshot } from "@/lib/finance/types";

interface Props {
  snapshot: FinancialSnapshot;
}

export function LiquidityAlert({ snapshot }: Props) {
  if (!snapshot.riskFlag) return null;

  return (
    <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50">
      <p className="text-sm font-medium text-red-700">Liquidity warning</p>
      <p className="text-sm text-red-600 mt-0.5">
        Your projected balance drops below $500 within the next 7 days. Review
        upcoming expenses or consider adding funds before{" "}
        {new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(new Date(snapshot.lowestProjectedDate))}
        .
      </p>
    </div>
  );
}
