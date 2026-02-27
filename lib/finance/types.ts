export interface Transaction {
  date: Date;
  description: string;
  amount: number; // positive = credit, negative = debit
}

export interface DailyProjection {
  date: Date;
  projectedBalance: number;
}

export interface FinancialSnapshot {
  currentBalance: number;
  avgDailySpend: number; // trailing 30 days, negative txns only (positive value = daily burn)
  projection: DailyProjection[]; // 7 entries, starting tomorrow
  lowestProjectedBalance: number;
  lowestProjectedDate: Date;
  riskFlag: boolean; // true if any projected day < LIQUIDITY_RISK_THRESHOLD
  transactionCount: number;
  dateRange: { from: Date; to: Date };
}

export interface AffordabilityResult {
  amount: number;
  targetDate: Date;
  projectedBalanceAtDate: number;
  remainingAfterPurchase: number;
  canAfford: boolean;
  assumptionMade: boolean; // true if targetDate was inferred, not stated by user
}

export interface ParsedCSV {
  transactions: Transaction[];
  hasBalanceColumn: boolean;
  startingBalance: number | null; // null if hasBalanceColumn is false
  needsBalanceInput: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  engineResult?: object; // structured result from deterministic engine, if applicable
  intent?: string;
}
