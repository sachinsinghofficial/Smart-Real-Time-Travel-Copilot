import {assertPlanBudget} from '@/lib/budget-policy';
import { NextResponse } from 'next/server';
import { parseTrip } from '@/lib/trip-validation';
import { validateItinerary } from '@/lib/itinerary';
import { getConditions } from '@/lib/conditions/providers';
import { adaptItinerary, baselinePlan } from '@/lib/conditions/adapt';
export const runtime='nodejs';
export async function POST(request:Request){try{
 const raw=await request.text();if(raw.length>700000)throw new Error('Plan is too large.');const body=JSON.parse(raw),trip=parseTrip(body.trip);if(!body.itinerary)throw new Error("Generate an itinerary with Gemini first.");const seed=validateItinerary(body.itinerary,trip);
 if(seed.baselineDays)validateItinerary({...seed,days:seed.baselineDays},trip);
 const day=body.day===undefined?undefined:Number(body.day);if(day!==undefined&&(!Number.isInteger(day)||day<1||day>seed.days.length))throw new Error('Choose a valid day.');
 // Caller-provided weather or alerts are deliberately ignored. Re-fetch trusted providers.
 const conditions=await getConditions(trip,baselinePlan(seed));const apply=body.apply!==false;
 const replacement=adaptItinerary(seed,trip,conditions,{apply,day,preserveElapsed:true});
 if(apply)assertPlanBudget(replacement,trip);
 return NextResponse.json({replacement,source:'conditions-replan',applied:apply,reason:`Conditions refreshed. ${replacement.changes?.length||0} adjustments ${apply?'applied':'suggested'}. Elapsed activities and bookings remain unchanged.`});
}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to refresh the plan.'},{status:400});}}
