"use client";

import { FinancialSnapshot } from "@/lib/finance/types";
import { BalanceSummary } from "./BalanceSummary";
import { LiquidityAlert } from "./LiquidityAlert";
import { MorningBriefing } from "./MorningBriefing";
import { ChatPanel } from "@/components/chat/ChatPanel";

interface Props {
  snapshot: FinancialSnapshot;
  onReset: () => void;
}

export function Dashboard({ snapshot, onReset }: Props) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Your Financial Picture</h1>
        <button
          onClick={onReset}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Upload new CSV
        </button>
      </div>

      <LiquidityAlert snapshot={snapshot} />
      <BalanceSummary snapshot={snapshot} />
      <MorningBriefing snapshot={snapshot} />
      <ChatPanel snapshot={snapshot} />
    </div>
  );
}
