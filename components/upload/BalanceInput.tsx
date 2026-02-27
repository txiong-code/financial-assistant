"use client";

import { useState } from "react";
import { ParsedCSV } from "@/lib/finance/types";

interface Props {
  parsed: ParsedCSV;
  onSubmit: (balance: string, parsed: ParsedCSV) => void;
}

export function BalanceInput({ parsed, onSubmit }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(value, parsed);
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-8 border rounded-xl bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">What is your current balance?</h2>
      <p className="text-sm text-gray-500 mb-6">
        Your CSV doesn&apos;t include a balance column. Enter your current account balance to
        continue. We found {parsed.transactions.length} transactions.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            className="w-full pl-7 pr-4 py-2 border rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
