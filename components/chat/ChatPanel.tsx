"use client";

import { useState, useRef, useEffect } from "react";
import { FinancialSnapshot } from "@/lib/finance/types";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "./ChatMessage";

interface Props {
  snapshot: FinancialSnapshot;
}

export function ChatPanel({ snapshot }: Props) {
  const { messages, loading, sendMessage } = useChat(snapshot);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    sendMessage(q);
  }

  return (
    <div className="border rounded-xl bg-gray-50 flex flex-col" style={{ minHeight: "320px" }}>
      <div className="px-4 py-3 border-b bg-white rounded-t-xl">
        <p className="text-sm font-medium text-gray-700">Ask about your finances</p>
        <p className="text-xs text-gray-400">Try: &ldquo;Can I afford $400 this weekend?&rdquo;</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-8">No messages yet. Ask anything.</p>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-gray-400 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t bg-white rounded-b-xl flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
