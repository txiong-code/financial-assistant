# Financial Assistant

An AI-powered 7-day liquidity forecast tool. Upload a bank CSV export, get a deterministic view of your financial runway, and ask plain-English questions about your money — with answers you can trust because the LLM never touches the math.

**Stack:** Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · OpenAI gpt-4o

---

## The Problem

Personal finance apps either show you charts (but can't answer questions) or let you chat with an AI (which will confidently hallucinate a wrong balance). The core insight here is that these don't have to be the same system.

---

## How It Works

The app is built around three layers with a strict separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: CSV Ingest                                        │
│  Flexible column detection · date/amount normalization      │
│  Handles balance column or prompts for manual entry         │
└────────────────────────┬────────────────────────────────────┘
                         │ Transaction[]  +  startingBalance
┌────────────────────────▼────────────────────────────────────┐
│  Layer 2: Deterministic Financial Engine  (lib/finance/)    │
│  · Average daily spend (trailing 30 days, debits only)      │
│  · 7-day linear balance projection                          │
│  · Affordability check against $500 liquidity threshold     │
│  · Risk flag if any projected day falls below threshold     │
│  Pure TypeScript functions. No I/O. Fully unit-tested.      │
└────────────────────────┬────────────────────────────────────┘
                         │ FinancialSnapshot (typed, immutable)
┌────────────────────────▼────────────────────────────────────┐
│  Layer 3: AI Explanation  (lib/ai/)                         │
│  · Morning briefing: snapshot → GPT-4o → plain prose        │
│  · Chat: question → intent classifier → engine → GPT-4o     │
│  LLM receives pre-computed numbers. Explains, never solves. │
└─────────────────────────────────────────────────────────────┘
```

---

## The Key Design Decision: LLM as Explainer, Never as Calculator

The chat pipeline runs in three stages:

1. **Intent extraction** — GPT-4o classifies the question into a structured intent (`balance_query`, `projection_query`, `affordability_check`, `spending_query`, `general`) and extracts any parameters (e.g., `{ amount: 150 }`).

2. **Engine dispatch** — A TypeScript switch routes the intent to the appropriate deterministic function. The engine returns exact numbers. No LLM is involved.

3. **LLM explanation** — GPT-4o receives the engine's output as structured context and writes a 2-3 sentence plain-English response. The system prompt explicitly forbids it from recalculating anything.

This means the answer to "Can I afford $400 this weekend?" is computed in TypeScript, not inferred by a language model. The LLM's job is translation — numbers into words — where it excels and where errors are low-stakes.

### Two-Pass Intent Classification

A single-pass strict classifier will mark colloquial questions like "Can I swing $150 tomorrow?" or "Am I heading toward trouble?" as `unknown` and ask the user to rephrase. The classifier runs two passes instead:

- **Pass 1 (strict):** Precise JSON schema prompt. If it returns a clear intent, done.
- **Pass 2 (soft):** A more permissive prompt that maps casual phrasing to the closest intent. Only triggered when Pass 1 returns `unknown`.

If Pass 2 still can't classify — or if `affordability_check` is returned without an explicit dollar amount — the final result is `unknown` and the user is asked to clarify. The engine is never called with ambiguous input.

---

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key with access to `gpt-4o`

### Setup

```bash
git clone https://github.com/txiong-code/financial-assistant
cd financial-assistant
npm install
cp .env.example .env.local
# Add your key to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Upload `public/sample.csv` to see the app with realistic demo data, or drag in your own bank export.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key. Used server-side only — never exposed to the client. |

---

## Project Structure

```
app/
  api/
    chat/route.ts        Three-stage pipeline: intent → engine → explanation
    briefing/route.ts    Morning briefing generation
  page.tsx               Entry point; manages upload → balance → dashboard flow

lib/
  finance/
    engine.ts            Pure calculation functions (fully unit-tested)
    parser.ts            CSV parsing with flexible column detection
    types.ts             Shared TypeScript interfaces
  ai/
    classifier.ts        Two-pass intent extraction
    prompts.ts           All system prompts (one source of truth)
    client.ts            OpenAI singleton

components/
  upload/                CSVUploader, BalanceInput
  dashboard/             Dashboard, BalanceSummary, LiquidityAlert, MorningBriefing
  chat/                  ChatPanel, ChatMessage, ReasoningTrace

hooks/
  useFinancialData.ts    State machine: idle → needs_balance | ready | error
  useChat.ts             Chat API client and message state
```

---

## Running Tests

```bash
npm test
```

The financial engine is fully unit-tested with 18 cases covering balance computation, daily spend averaging, projection generation, and affordability logic. The two-pass classifier has 7 tests using a mocked OpenAI client, covering each intent type plus the fallback and amount-guard cases.

---

## Deployment

The app deploys to Vercel with no configuration beyond the environment variable. Set `OPENAI_API_KEY` in your project's environment settings and deploy.

```bash
npm run build   # Verify locally before deploying
```

---

## Engineering Notes

**Why not let the LLM see the raw CSV?** Token cost scales with data size, latency compounds, and the model will still occasionally produce wrong sums. A deterministic engine is faster, free, and correct by construction.

**Why a 7-day window?** Short enough that linear projection is a reasonable approximation — spending patterns don't change dramatically in a week — long enough to catch most near-term liquidity events like rent or credit card bills.

**Why $500 as the risk threshold?** A buffer that covers most unexpected small expenses without triggering false alarms on healthy accounts. It's a named constant (`LIQUIDITY_RISK_THRESHOLD_USD` in `lib/finance/engine.ts`) and easy to make configurable.

**Why a state machine in `useFinancialData`?** The upload flow has four mutually exclusive states (`idle`, `needs_balance`, `ready`, `error`) with typed transitions between them. A discriminated union makes impossible states unrepresentable — the `ready` branch always has a snapshot, the `needs_balance` branch always has parsed data, and so on.

**Why extract `extractIntent` out of the route handler?** Keeping AI orchestration in a route handler makes it untestable without constructing HTTP requests. Moving it to `lib/ai/classifier.ts` lets the two-pass logic be unit-tested by mocking the OpenAI client directly, keeping tests fast and free of network calls.
