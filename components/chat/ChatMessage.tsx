import { ChatMessage as ChatMessageType } from "@/lib/finance/types";
import { ReasoningTrace } from "./ReasoningTrace";

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "order-last" : ""}`}>
        {!isUser && message.engineResult && message.intent && (
          <ReasoningTrace engineResult={message.engineResult} intent={message.intent} />
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-white border text-gray-800 rounded-bl-sm"
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
