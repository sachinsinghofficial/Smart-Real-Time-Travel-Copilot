# TravelSetu Google Maps setup

TravelSetu now uses Google Maps Platform directly inside the app.

## 1. Create a Google Cloud project
Create/select a project in Google Cloud Console and enable billing.

## 2. Enable APIs
Enable:
- Maps JavaScript API
- Places API (New)
- Routes API

## 3. Create the browser API key
Create an API key and restrict it by HTTP referrer. For local development you can allow:
- http://localhost:3000/*
- http://127.0.0.1:3000/*
- http://192.168.1.114:3000/*

Replace the LAN address with your own development machine address if it changes.

## 4. Add `.env.local`
Create `.env.local` in the project root:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_BROWSER_KEY
```

Do not commit `.env.local`.

## 5. Run
```bash
npm install
npm run dev
```

The Interactive Map now provides:
- Google Maps inside TravelSetu
- Google Places text search
- In-app route calculation
- Driving, two-wheeler, transit, walking and cycling modes
- Turn-by-turn instructions
- Distance and ETA
- Current GPS location
- No redirect to maps.google.com

Google recommends restricting browser keys by HTTP referrer. Routes and Places usage can incur charges depending on your Google Maps Platform billing/usage.
