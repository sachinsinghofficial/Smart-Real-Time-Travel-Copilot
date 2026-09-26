import { TripForm } from "@/types/travel";

// India is the destination timezone. Compute at use time, never a fixed build date.
export function todayDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export const DEMO_TRIP: TripForm = {
  from: "Delhi",
  destination: "Manali",
  startDate: todayDate(),
  endDate: dateAt(todayDate(), 4),
  travellers: 3,
  budget: 20000,
  interests: ["Nature", "Adventure", "Food"],
  foodPreference: "Any",
  transport: "Any",
  travelStyle: "Balanced",
  accommodationPreference: "Comfortable stay",
  specialRequirements: "",
  groupType: "Friends", children: 0, seniors: 0,
  arrivalTime: "10:00", departureTime: "18:00", dayStartTime: "08:30", dayEndTime: "20:00",
  walkingLimitKm: 5, accessibility: [], avoid: [], mustVisit: "", roomCount: 2,
  hotelAmenities: ["Wi-Fi"], localTransport: "Mix of walking and taxis",
  budgetScope: "whole-trip", reservePercent: 10, dietaryNotes: "",
  experienceMode: 'balanced', nearbyRadiusKm: 3, autoAdjust: true,
};

export function defaultTrip(now = new Date()): TripForm {
  return {...structuredClone(DEMO_TRIP), startDate: todayDate(now), endDate: dateAt(todayDate(now), 4)};
}

export function currentDraft(draft: TripForm, now = new Date()): TripForm {
  const today = todayDate(now);
  if (!draft.startDate || draft.startDate < today) {
    const days = Math.max(1, Math.min(14, getTripDuration(draft.startDate, draft.endDate) || 5));
    return {...draft, startDate: today, endDate: dateAt(today, days - 1)};
  }
  return draft;
}

export const TRIP_STORAGE_KEY = "travelsetu_trip_draft";
export const SAVED_TRIP_STORAGE_KEY = "travelsetu_saved_trips";

export function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export function getTripDuration(start: string, end: string) {
  if (!start || !end) return 0;
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const diff = endDate.getTime() - startDate.getTime();
  return diff >= 0 ? Math.floor(diff / 86400000) + 1 : 0;
}

export function getTripNights(start: string, end: string) {
  return Math.max(0, getTripDuration(start, end) - 1);
}

export function dateAt(start: string, offset: number) {
  return new Date(new Date(`${start}T00:00:00Z`).getTime() + offset * 86400000).toISOString().slice(0, 10);
}
