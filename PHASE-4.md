# TravelSetu Phase 4

Adds Open-Meteo weather integration, a weather risk engine, weather-aware itinerary activity statuses, and Gemini/local dynamic replanning.

## Weather

`/api/weather` uses Open-Meteo. Future dates inside the supported live forecast window use the Forecast API. Historical demo dates such as the project's 2025 Manali flow use Open-Meteo's Historical Forecast API. If the weather service is unavailable, TravelSetu returns deterministic demo weather.

## Risk rules

- Heavy rain / rain probability >= 60% → AT RISK
- Strong wind >= 55 km/h → AT RISK
- Temperature below 2°C or above 38°C → AT RISK
- Rain probability >= 40% → CAUTION
- Wind >= 35 km/h → CAUTION

Thresholds live in `lib/weather.ts` so the risk engine can be tuned without touching page components.

## Dynamic replanning

`/api/replan` receives the trip, affected day/activity and weather conditions. With Gemini configured it asks Gemini for a structured replacement itinerary. In demo mode, or if Gemini fails, TravelSetu returns a safe local alternative plan.

Flow:

`/itinerary` → weather check → risk → `Replan this day` → `/api/replan` → replacement itinerary → localStorage → updated `/itinerary`.
