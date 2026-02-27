import {
  computeBalance,
  computeAvgDailySpend,
  computeProjection,
  computeAffordability,
  buildSnapshot,
  LIQUIDITY_RISK_THRESHOLD_USD,
  PROJECTION_DAYS,
} from "./engine";
import { Transaction, FinancialSnapshot } from "./types";

function makeDate(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function makeTransaction(daysAgo: number, amount: number): Transaction {
  return {
    date: makeDate(daysAgo),
    description: "test",
    amount,
  };
}

describe("computeBalance", () => {
  it("sums all transaction amounts", () => {
    const transactions: Transaction[] = [
      makeTransaction(5, 1000),
      makeTransaction(4, -200),
      makeTransaction(3, -50.5),
    ];
    expect(computeBalance(transactions)).toBeCloseTo(749.5);
  });

  it("returns 0 for empty array", () => {
    expect(computeBalance([])).toBe(0);
  });

  it("handles all credits", () => {
    const transactions = [makeTransaction(1, 500), makeTransaction(2, 300)];
    expect(computeBalance(transactions)).toBe(800);
  });

  it("handles all debits", () => {
    const transactions = [makeTransaction(1, -100), makeTransaction(2, -200)];
    expect(computeBalance(transactions)).toBe(-300);
  });
});

describe("computeAvgDailySpend", () => {
  it("calculates daily burn from last 30 days debits", () => {
    // $300 total debits in 30 days = $10/day
    const transactions: Transaction[] = [
      makeTransaction(5, -150),
      makeTransaction(15, -150),
      makeTransaction(35, -500), // outside 30-day window, should be excluded
    ];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = computeAvgDailySpend(transactions, today);
    expect(result).toBeCloseTo(10, 1);
  });

  it("ignores credits", () => {
    const transactions: Transaction[] = [
      makeTransaction(5, 1000), // credit — should be ignored
      makeTransaction(10, -300),
    ];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = computeAvgDailySpend(transactions, today);
    expect(result).toBeCloseTo(10, 1);
  });

  it("returns 0 if no debits in window", () => {
    const transactions: Transaction[] = [makeTransaction(5, 500)];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(computeAvgDailySpend(transactions, today)).toBe(0);
  });
});

describe("computeProjection", () => {
  it("returns PROJECTION_DAYS entries", () => {
    const result = computeProjection(1000, 10, PROJECTION_DAYS);
    expect(result).toHaveLength(PROJECTION_DAYS);
  });

  it("reduces balance by avgDailySpend each day", () => {
    const result = computeProjection(1000, 10, 3);
    expect(result[0].projectedBalance).toBeCloseTo(990);
    expect(result[1].projectedBalance).toBeCloseTo(980);
    expect(result[2].projectedBalance).toBeCloseTo(970);
  });

  it("dates start from tomorrow", () => {
    const result = computeProjection(1000, 10, 1);
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(result[0].date.toDateString()).toBe(tomorrow.toDateString());
  });
});

describe("computeAffordability", () => {
  function makeSnapshot(balance: number, avgDailySpend: number): FinancialSnapshot {
    return buildSnapshot(
      [makeTransaction(10, balance + avgDailySpend * 10)], // synthetic transactions
      balance
    );
  }

  it("returns canAfford=true when remaining > threshold", () => {
    const snapshot = makeSnapshot(2000, 50);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    const result = computeAffordability(400, snapshot, targetDate);
    // Balance after 3 days: 2000 - 150 = 1850. After $400 purchase: 1450. > 500 threshold.
    expect(result.canAfford).toBe(true);
    expect(result.remainingAfterPurchase).toBeGreaterThan(LIQUIDITY_RISK_THRESHOLD_USD);
  });

  it("returns canAfford=false when remaining < threshold", () => {
    const snapshot = makeSnapshot(600, 50);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const result = computeAffordability(500, snapshot, targetDate);
    // Balance after 2 days: 600 - 100 = 500. After $500 purchase: 0. < 500 threshold.
    expect(result.canAfford).toBe(false);
  });

  it("always returns the provided targetDate", () => {
    const snapshot = makeSnapshot(1000, 20);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 5);
    const result = computeAffordability(100, snapshot, targetDate);
    expect(result.targetDate).toBe(targetDate);
  });
});

describe("buildSnapshot", () => {
  it("sets riskFlag=true when any projected day < threshold", () => {
    const transactions = [makeTransaction(5, -100)];
    const snapshot = buildSnapshot(transactions, 520); // balance just above threshold
    // With zero spend (no debits in data, transaction is a debit), avgDailySpend might be low.
    // Use a very low starting balance to force risk.
    const lowSnapshot = buildSnapshot([], 400);
    expect(lowSnapshot.riskFlag).toBe(true);
  });

  it("sets riskFlag=false when all projected days are safe", () => {
    const snapshot = buildSnapshot([], 10000);
    expect(snapshot.riskFlag).toBe(false);
  });

  it("lowestProjectedBalance is the minimum across projection", () => {
    const snapshot = buildSnapshot([makeTransaction(5, -300)], 1000);
    const minFromProjection = Math.min(...snapshot.projection.map((p) => p.projectedBalance));
    expect(snapshot.lowestProjectedBalance).toBeCloseTo(minFromProjection, 5);
  });

  it("transactionCount matches input", () => {
    const transactions = [makeTransaction(1, -50), makeTransaction(2, -30), makeTransaction(3, 500)];
    const snapshot = buildSnapshot(transactions, 800);
    expect(snapshot.transactionCount).toBe(3);
  });
});
