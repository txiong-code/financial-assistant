"use client";

import { useFinancialData } from "@/hooks/useFinancialData";
import { CSVUploader } from "@/components/upload/CSVUploader";
import { BalanceInput } from "@/components/upload/BalanceInput";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default function Home() {
  const { state, loadCSV, submitBalance, reset } = useFinancialData();

  if (state.stage === "ready") {
    return <Dashboard snapshot={state.snapshot} onReset={reset} />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Financial Assistant</h1>
        <p className="mt-2 text-sm text-gray-500">
          Upload your bank export to see your 7-day financial picture.
        </p>
      </div>

      {state.stage === "needs_balance" ? (
        <BalanceInput parsed={state.parsed} onSubmit={submitBalance} />
      ) : (
        <>
          <CSVUploader onParsed={loadCSV} />
          {state.stage === "error" && (
            <p className="mt-4 text-sm text-red-600 text-center">{state.message}</p>
          )}
        </>
      )}
    </div>
  );
}
