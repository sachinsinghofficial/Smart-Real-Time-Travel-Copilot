# Phase 4 Gemini Reliability Fix

This patch fixes the Gemini 503 experience without removing the existing weather/replanning functionality.

## What changed
- Gemini requests now retry transient 408/429/5xx failures with short exponential backoff + jitter.
- The API automatically tries fallback Gemini models when the configured model is temporarily unavailable.
- The default model in `.env.local.example` is `gemini-3.8-flash`.
- Raw Gemini error JSON is no longer shown to the user; the UI receives a friendly fallback message.
- The existing local demo itinerary remains available if all AI attempts fail.
- The Next.js smooth-scroll warning is fixed by adding `data-scroll-behavior="smooth"` to the root `<html>` element.

## User setup
Keep your real API key in `.env.local`, for example:

```env
GEMINI_API_KEY=your_real_key
GEMINI_MODEL=gemini-3.8-flash
DEMO_MODE=false
```

Then restart Next.js:

```bash
npm run dev
```

No new npm package is required beyond the existing `@google/genai` dependency.
