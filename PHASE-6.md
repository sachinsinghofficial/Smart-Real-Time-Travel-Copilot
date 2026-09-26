# TravelSetu Phase 6

Phase 6 adds Safety & SOS and the AI Travel Assistant on top of Phase 5.

## Safety
- Weather alert based on the existing `/api/weather` route
- Hold-to-confirm demo SOS interaction
- Live browser geolocation
- Emergency contact quick-dial links from `data/emergency.json`
- Nearby safe-place guidance through Trip Map
- Destination safety tips from `destinations.json`
- Explicit messaging that demo actions do not send real alerts

## AI Travel Assistant
- Context-aware `/assistant` page
- Secure `/api/assistant` server route using the existing Gemini helper
- Structured Gemini JSON response
- Uses current trip, itinerary and local JSON catalog context
- Demo/fallback responses when Gemini is unavailable
- Quick prompts and conversational UI

No new npm packages are required beyond Phase 5.
