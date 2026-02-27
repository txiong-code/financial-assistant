# Architectural Patterns

## 1. Hybrid AI Pipeline (3-Stage Chat)

`app/api/chat/route.ts:183-192`

The chat endpoint never lets the LLM do math. Every query goes through three stages:

1. **Intent extraction** — LLM classifies the question into one of 5 intents and extracts structured params (e.g., `{ intent: "affordability_check", params: { amount: 200, timeframe: "weekend" } }`)
2. **Engine dispatch** — Deterministic TypeScript switch routes to the right `engine.ts` function; no LLM involved
3. **LLM explanation** — The engine's numeric result is handed to the LLM as context; it only writes prose

This means financial figures are always deterministic and testable. The LLM role is explanation only.

Intent values: `affordability_check`, `balance_query`, `projection_query`, `spending_query`, `general`, `unknown`

## 2. Discriminated Union State Machine

`hooks/useFinancialData.ts:8-12`

`useFinancialData` models application state as a discriminated union with four stages:

```
idle → (CSV uploaded) → needs_balance | ready
                                          ↑
                        (balance entered)─┘
any stage → (parse error) → error
```

Components switch on `state.stage` to render the correct UI phase. Each stage carries only the data relevant to it — `needs_balance` carries `parsed`, `ready` carries `snapshot`, `error` carries `message`.

## 3. Result Type for Errors

`lib/finance/parser.ts` (return type of `parseCSV`)

The parser returns a tagged result object rather than throwing:

```typescript
{ ok: true; data: ParsedCSV }
{ ok: false; error: Error }
```

Callers check `result.ok` before accessing `result.data`. This keeps error handling explicit at the call site (`useFinancialData.ts:18-21`) and avoids try/catch in hooks.

## 4. Date Rehydration at API Boundary

`app/api/chat/route.ts:170-181`

`Date` objects survive in-process but become ISO strings when serialized through `JSON.stringify`. The `POST /api/chat` handler explicitly reconstructs `Date` objects from the incoming snapshot before passing it to the engine:

- `lowestProjectedDate`
- `dateRange.from` / `dateRange.to`
- Each `projection[].date`

Any new `Date` fields added to `FinancialSnapshot` must also be rehydrated here.

## 5. Date Inference Ownership

`app/api/chat/route.ts:10-53`

Date inference (e.g., resolving "weekend" → next Saturday) lives in the routing layer, not in the engine. `resolveTimeframe()` returns `{ date, assumptionMade }`. When `assumptionMade` is true, the LLM explanation prompt is injected with a note to disclose the assumption to the user. The engine itself only accepts concrete `Date` objects.

## 6. Pure Business Logic Layer

`lib/finance/engine.ts`

All five engine functions (`computeBalance`, `computeAvgDailySpend`, `computeProjection`, `computeAffordability`, `buildSnapshot`) are pure: no I/O, no side effects, no React. This makes them directly unit-testable (`engine.test.ts`) without mocking.

The pattern: UI hooks call engine functions, API routes call engine functions — the engine never calls back out.

## 7. Prompt Co-location

`lib/ai/prompts.ts`

All system prompts are string constants in one file. The OpenAI client and model name are in `lib/ai/client.ts`. Neither file imports from `lib/finance/` — the AI layer is independent of the business logic layer.
