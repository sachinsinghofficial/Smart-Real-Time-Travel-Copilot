# TravelSetu — Phase 5

Phase 5 adds a functional Leaflet + React Leaflet interactive trip map.

## Includes
- `/trip-map` interactive map
- OpenStreetMap tiles
- Numbered route markers based on saved itinerary stops
- Route polyline
- Hotels, restaurants, attractions, transport, hospitals and fuel filters
- Search within visible map points
- Distance, estimated travel time and estimated transport cost
- Responsive desktop/mobile layout
- Uses local JSON datasets and localStorage itinerary state
- No Google Maps billing and no map API key

## Install

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

## Run

```bash
npm run dev
```

Then open `http://localhost:3000/trip-map`.

## Data note
The Phase 2 hotel/restaurant/transport demo datasets do not contain exact latitude/longitude fields. Phase 5 therefore creates visibly labelled demo placements around the destination rather than pretending those coordinates are real. Destination coordinates come directly from `data/destinations.json`.


## Map discoverability update
The Trip Map is now linked directly from the global Navbar on desktop and mobile. The Itinerary page also has a visible Trip Map action beside Share Trip and Download, plus a Trip Map card in the right sidebar.
