# Financial Assistant

## Overview

A 7-day liquidity forecast tool. Users upload a bank CSV export, optionally enter a starting balance, and get a dashboard with balance projections and an AI chat interface for natural-language financial queries (e.g., "Can I afford $200 this weekend?").

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5 (strict)
- **Styling**: Tailwind CSS 4 + PostCSS
- **AI**: OpenAI SDK (`gpt-4o`) via `OPENAI_API_KEY` env var — see `.env.example`
- **CSV parsing**: `papaparse`
- **Testing**: Jest 30 + ts-jest
- **Path alias**: `@/` maps to project root (`tsconfig.json`)

## Key Directories

| Path | Purpose |
|---|---|
| `app/api/` | Two POST routes: `/chat` (3-stage pipeline) and `/briefing` (morning summary) |
| `lib/finance/` | Pure business logic: `types.ts`, `engine.ts`, `parser.ts`, `engine.test.ts` |
| `lib/ai/` | OpenAI client (`client.ts`), system prompts (`prompts.ts`), two-pass classifier (`classifier.ts`) |
| `components/` | UI split by concern: `upload/`, `dashboard/`, `chat/` |
| `hooks/` | `useFinancialData.ts` (CSV → snapshot state machine), `useChat.ts` (chat API client) |
| `public/sample.csv` | Reference CSV for testing the upload flow |

## Build & Test Commands

```bash
npm run dev      # Dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint
npm test         # Jest (runs lib/finance/engine.test.ts)
```

## Adding New Features or Fixing Bugs

**IMPORTANT**: When you work on a new feature or bug, create a git branch first. Then work on changes in that branch for the remainder of the session.

## Key Constants (`lib/finance/engine.ts:8-10`)

- `LIQUIDITY_RISK_THRESHOLD_USD = 500` — purchase affordability and risk flag threshold
- `PROJECTION_DAYS = 7` — forecast window
- `AVG_SPEND_LOOKBACK_DAYS = 30` — daily spend calculation window

## Additional Documentation

| File | When to check |
|---|---|
| `.claude/docs/architectural_patterns.md` | Chat pipeline, state machine, date handling, error result types |
