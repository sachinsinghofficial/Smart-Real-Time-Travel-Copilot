# TravelSetu Phase 3

Adds secure Gemini itinerary generation, structured JSON output validation, demo fallback, and the functional `/itinerary` experience.

## Environment

Copy `.env.local.example` to `.env.local`. Set `GEMINI_API_KEY`. Set `DEMO_MODE=false` to call Gemini. `GEMINI_MODEL` can override the default model.

## Flow

`/plan-trip` → POST `/api/gemini` → structured itinerary → localStorage → `/itinerary`.

The API never sends the Gemini key to the browser. When the key is missing, the demo flag is enabled, or Gemini fails, a deterministic local itinerary is returned so the hackathon demo stays usable.
