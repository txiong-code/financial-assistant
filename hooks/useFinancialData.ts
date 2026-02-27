"use client";

import { useState } from "react";
import { parseCSV } from "@/lib/finance/parser";
import { buildSnapshot } from "@/lib/finance/engine";
import { ParsedCSV, FinancialSnapshot } from "@/lib/finance/types";

type State =
  | { stage: "idle" }
  | { stage: "needs_balance"; parsed: ParsedCSV }
  | { stage: "ready"; snapshot: FinancialSnapshot }
  | { stage: "error"; message: string };

export function useFinancialData() {
  const [state, setState] = useState<State>({ stage: "idle" });

  function loadCSV(csvText: string) {
    const result = parseCSV(csvText);

    if (!result.ok) {
      setState({ stage: "error", message: result.error.message });
      return;
    }

    const parsed = result.data;

    if (parsed.needsBalanceInput) {
      setState({ stage: "needs_balance", parsed });
    } else {
      const snapshot = buildSnapshot(parsed.transactions, parsed.startingBalance!);
      setState({ stage: "ready", snapshot });
    }
  }

  function submitBalance(balanceInput: string, parsed: ParsedCSV) {
    const value = parseFloat(balanceInput.replace(/[$,\s]/g, ""));
    if (isNaN(value)) {
      setState({ stage: "error", message: "Please enter a valid balance amount." });
      return;
    }
    const snapshot = buildSnapshot(parsed.transactions, value);
    setState({ stage: "ready", snapshot });
  }

  function reset() {
    setState({ stage: "idle" });
  }

  return { state, loadCSV, submitBalance, reset };
}
