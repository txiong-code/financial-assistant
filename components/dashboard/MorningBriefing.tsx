"use client";

import { useEffect, useState } from "react";
import { FinancialSnapshot } from "@/lib/finance/types";

interface Props {
  snapshot: FinancialSnapshot;
}

export function MorningBriefing({ snapshot }: Props) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBriefing() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot }),
        });

        if (!res.ok) {
          throw new Error("Briefing request failed.");
        }

        const data = await res.json();
        if (!cancelled) setBriefing(data.briefing);
      } catch {
        if (!cancelled) setError("Couldn't load your briefing. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBriefing();
    return () => { cancelled = true; };
  }, [snapshot]);

  return (
    <div className="p-5 border rounded-xl bg-amber-50 border-amber-200">
      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-2">Morning Briefing</p>
      {loading && (
        <p className="text-sm text-gray-500 animate-pulse">Generating your briefing...</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {briefing && (
        <p className="text-sm text-gray-800 leading-relaxed">{briefing}</p>
      )}
    </div>
  );
}
