# TravelSetu — Phase 2

Phase 2 extends Phase 1 without changing the existing architecture.

## Added
- Four-step Trip Planner
- Demo planner state persisted to localStorage
- Destination selection and URL-prefill from Explore
- Interests, food, transport, travel style and accommodation preferences
- Review + Save Trip flow
- Local JSON demo catalog for destinations, hotels, restaurants, activities, transport and emergency contacts
- Explore search bar and category filters
- Destination detail modal with best time, budget, activities, food/stay counts and safety tips
- Homepage popular destinations now read from `data/destinations.json`

## Dataset counts
- 10 destinations
- 20 hotels
- 20 restaurants
- 60 activities
- 20 transport options
- 4 emergency contacts

## Run
```bash
npm install
npm run dev
```

Phase 3 will add Gemini-powered itinerary generation. Phase 2 intentionally does not add AI generation yet.
