import { extractIntent } from "./classifier";
import { openai } from "@/lib/ai/client";

jest.mock("@/lib/ai/client", () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
  MODEL: "gpt-4o",
}));

const mockCreate = openai.chat.completions.create as jest.Mock;

function makeCompletion(intent: string, params: Record<string, unknown> = {}) {
  return {
    choices: [{ message: { content: JSON.stringify({ intent, params }) } }],
  };
}

describe("extractIntent — two-pass classification", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("resolves balance_query on Pass 2 for colloquial phrasing", async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion("unknown"));
    mockCreate.mockResolvedValueOnce(makeCompletion("balance_query"));

    const result = await extractIntent("What do I have left to work with?");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.intent).toBe("balance_query");
    expect(result.params).toEqual({});
  });

  it("resolves projection_query on Pass 2 for colloquial phrasing", async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion("unknown"));
    mockCreate.mockResolvedValueOnce(makeCompletion("projection_query"));

    const result = await extractIntent("Am I heading toward trouble soon?");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.intent).toBe("projection_query");
    expect(result.params).toEqual({});
  });

  it("resolves affordability_check on Pass 2 when explicit amount is present", async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion("unknown"));
    mockCreate.mockResolvedValueOnce(
      makeCompletion("affordability_check", { amount: 150, timeframe: "tomorrow" })
    );

    const result = await extractIntent("Can I swing $150 tomorrow?");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.intent).toBe("affordability_check");
    expect(result.params).toEqual({ amount: 150, timeframe: "tomorrow" });
  });

  it("resolves spending_query on Pass 2 for colloquial phrasing", async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion("unknown"));
    mockCreate.mockResolvedValueOnce(makeCompletion("spending_query"));

    const result = await extractIntent("Where's all my money disappearing to?");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.intent).toBe("spending_query");
    expect(result.params).toEqual({});
  });

  it("resolves general on Pass 2 for broad summary request", async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion("unknown"));
    mockCreate.mockResolvedValueOnce(makeCompletion("general"));

    const result = await extractIntent("Give me a summary of my situation");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.intent).toBe("general");
    expect(result.params).toEqual({});
  });

  it("returns unknown when both passes return unknown", async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion("unknown"));
    mockCreate.mockResolvedValueOnce(makeCompletion("unknown"));

    const result = await extractIntent("asdfghjkl");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.intent).toBe("unknown");
    expect(result.params).toEqual({});
  });

  it("returns unknown when Pass 2 returns affordability_check without an amount", async () => {
    mockCreate.mockResolvedValueOnce(makeCompletion("unknown"));
    mockCreate.mockResolvedValueOnce(makeCompletion("affordability_check", {}));

    const result = await extractIntent("Can I swing it tomorrow?");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.intent).toBe("unknown");
    expect(result.params).toEqual({});
  });
});
