import { NextResponse } from 'next/server';
import { parseTrip } from '@/lib/trip-validation';
import { buildDemoItinerary, validateItinerary } from '@/lib/itinerary';
import { getNearby } from '@/lib/nearby';
export const runtime='nodejs';
export async function POST(request:Request){try{const raw=await request.text();if(raw.length>700000)throw new Error('Plan is too large.');const body=JSON.parse(raw),trip=parseTrip(body.trip);const plan=body.itinerary?validateItinerary(body.itinerary,trip):buildDemoItinerary(trip);return NextResponse.json(await getNearby(plan,trip));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not search nearby places.'},{status:400});}}
