import { FinancialSnapshot } from "@/lib/finance/types";

function fmt(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function fmtDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

interface Props {
  snapshot: FinancialSnapshot;
}

export function BalanceSummary({ snapshot }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="p-5 border rounded-xl bg-white">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Balance</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{fmt(snapshot.currentBalance)}</p>
        <p className="mt-1 text-xs text-gray-400">{snapshot.transactionCount} transactions loaded</p>
      </div>

      <div className="p-5 border rounded-xl bg-white">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Daily Spend</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{fmt(snapshot.avgDailySpend)}</p>
        <p className="mt-1 text-xs text-gray-400">trailing 30 days</p>
      </div>

      <div className="p-5 border rounded-xl bg-white">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">7-Day Low</p>
        <p className={`mt-1 text-2xl font-semibold ${snapshot.riskFlag ? "text-red-600" : "text-gray-900"}`}>
          {fmt(snapshot.lowestProjectedBalance)}
        </p>
        <p className="mt-1 text-xs text-gray-400">projected on {fmtDate(snapshot.lowestProjectedDate)}</p>
      </div>
    </div>
  );
}
