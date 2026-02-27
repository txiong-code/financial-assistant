import {
  Transaction,
  DailyProjection,
  FinancialSnapshot,
  AffordabilityResult,
} from "./types";

export const LIQUIDITY_RISK_THRESHOLD_USD = 500;
export const PROJECTION_DAYS = 7;
export const AVG_SPEND_LOOKBACK_DAYS = 30;

export function computeBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

export function computeAvgDailySpend(
  transactions: Transaction[],
  fromDate: Date
): number {
  const cutoff = new Date(fromDate);
  cutoff.setDate(cutoff.getDate() - AVG_SPEND_LOOKBACK_DAYS);

  const recentDebits = transactions
    .filter((t) => t.date >= cutoff && t.date <= fromDate && t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0);

  // Returns a positive number representing daily burn rate
  return Math.abs(recentDebits) / AVG_SPEND_LOOKBACK_DAYS;
}

export function computeProjection(
  balance: number,
  avgDailySpend: number,
  days: number
): DailyProjection[] {
  const projection: DailyProjection[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const projectedBalance = balance - avgDailySpend * i;
    projection.push({ date, projectedBalance });
  }

  return projection;
}

export function computeAffordability(
  amount: number,
  snapshot: FinancialSnapshot,
  targetDate: Date
): AffordabilityResult {
  // Find the projection entry closest to targetDate
  const targetTime = targetDate.getTime();
  let closest = snapshot.projection[0];
  let minDiff = Math.abs(closest.date.getTime() - targetTime);

  for (const entry of snapshot.projection) {
    const diff = Math.abs(entry.date.getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = entry;
    }
  }

  // If targetDate is beyond our projection window, extrapolate from last entry
  const lastEntry = snapshot.projection[snapshot.projection.length - 1];
  const lastTime = lastEntry.date.getTime();
  let projectedBalance: number;

  if (targetTime > lastTime) {
    const extraDays = Math.round((targetTime - lastTime) / (1000 * 60 * 60 * 24));
    projectedBalance = lastEntry.projectedBalance - snapshot.avgDailySpend * extraDays;
  } else {
    projectedBalance = closest.projectedBalance;
  }

  const remainingAfterPurchase = projectedBalance - amount;
  const canAfford = remainingAfterPurchase >= LIQUIDITY_RISK_THRESHOLD_USD;

  return {
    amount,
    targetDate,
    projectedBalanceAtDate: projectedBalance,
    remainingAfterPurchase,
    canAfford,
    assumptionMade: false, // caller sets this to true if targetDate was inferred
  };
}

export function buildSnapshot(
  transactions: Transaction[],
  startingBalance: number
): FinancialSnapshot {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const avgDailySpend = computeAvgDailySpend(transactions, today);
  const projection = computeProjection(startingBalance, avgDailySpend, PROJECTION_DAYS);

  const lowestEntry = projection.reduce((min, entry) =>
    entry.projectedBalance < min.projectedBalance ? entry : min
  );

  const riskFlag = projection.some(
    (entry) => entry.projectedBalance < LIQUIDITY_RISK_THRESHOLD_USD
  );

  const sortedDates = transactions.map((t) => t.date).sort((a, b) => a.getTime() - b.getTime());

  return {
    currentBalance: startingBalance,
    avgDailySpend,
    projection,
    lowestProjectedBalance: lowestEntry.projectedBalance,
    lowestProjectedDate: lowestEntry.date,
    riskFlag,
    transactionCount: transactions.length,
    dateRange: {
      from: sortedDates[0] ?? today,
      to: sortedDates[sortedDates.length - 1] ?? today,
    },
  };
}
