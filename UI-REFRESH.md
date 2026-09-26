# TravelSetu UI refresh

This update extends the latest travel(1).zip source. Existing Google Maps navigation, itinerary details, journals, reviews, offline packs and backend integrations are retained.

## What changed

- Dashboard: mountain hero, quick trip form, six discovery categories, landmark cards, local crafts and cuisine ideas.
- Explore India: category filtering, compact initial results, popular sights, food discovery, craft filters and interactive India notebook.
- Food & Stays: purple photo cards inspired by your reference, course tabs, carousel controls and cuisine filtering of nearby results.
- Weather: blue forecast dashboard, 24-hour strip, selectable 10-day forecast, precipitation point-location map, US AQI/PM values and wind compass. Compact weather panel on Interactive Map. Missing values remain unavailable. The precipitation map is a location map, not weather radar; US AQI is not India's NAQI.
- Cars: photo cards, full-hire allowance, visible locked upgrades with the exact required increase. A same-day sample economy hatchback costs INR 940. Increasing the allowance refreshes offers; a signed offer above its allowance cannot be quoted or confirmed. Costs scale with all selected hire days. Fuel/tolls/deposits require a separate quote. No real rental availability is claimed.
- Safety & SOS: focused on the supplied conditions screenshot: provider status, weather/traffic/disaster checks, refresh, simulations and change history.
- Teal/ivory theme, violet food sections, colourful discovery tiles, responsive sidebar/header/footer and readable spacing.
- Fixed the map page's missing Suspense boundary and existing type errors. Removed automatic sample substitution after Gemini failure. The itinerary recommendation cards lead to comparison/review instead of automatically confirming a different property.

## Install the update

1. Extract this ZIP and open the folder containing package.json.
2. Keep/copy your existing .env.local into that folder. Private keys are excluded from this ZIP.
3. Run npm ci, then npm run dev. Open http://localhost:3000.
4. Keep your existing Google Maps, Gemini and Supabase settings. Restart after changing environment variables. Run npm run check:gemini on your machine to diagnose your key and model access.

## Verification

- npm test: 50 passing checks, including new vehicle allowance/API guards and missing weather measurements.
- npm run build: production compilation and static page generation passed.
- Chromium desktop (1440 px) and mobile (390 px): Dashboard, Explore, Food & Stays, Weather, Safety, Interactive Map and Book Travel loaded with no page errors or horizontal document overflow.
- Browser interactions: INR 1000 allowance permits the same-day economy car, locks the sedan, and unlocks the sedan after explicitly increasing to INR 2400; quote review opens correctly. Explore category and notebook tabs respond.
- Weather layout verification used browser fixtures, not live observations. No test weather is shipped as a production fallback. Live Gemini access, Google Maps credentials, Supabase and Hotelbeds transactions need your configured environment.

## Assets and data

Reference screenshots are bundled as photo sources and displayed through CSS photo windows. They are illustrations, not verified supplier inventory. The credits page identifies this provenance. Existing external catalog imagery remains; some external images/maps require network access.

Booking data stays explicitly labelled sample or supplier test. Hotelbeds adapters still use its evaluation environment. This update does not add a production payment or real reservation service.
