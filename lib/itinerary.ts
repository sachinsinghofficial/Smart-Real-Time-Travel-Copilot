import type { Conditions, PlanChange } from './conditions/types';
import type { NearbyResult } from './nearby-types';
import { localAffinity, foodIdeas } from './local';
import type { Destination, TripForm } from '../types/travel';
import catalog from '../data/places.json';
import destinations from '../data/destinations.json';
import { dateAt, getTripDuration } from './trip';
import { minutes, timeLabel } from './trip-validation';
export type ItineraryActivity={id:string;time:string;name:string;type:'stay'|'activity'|'food'|'transport'|'free-time';location:string;description:string;estimatedCost:number;durationMinutes:number;image?:string;safety:'SAFE'|'CAUTION'|'AT RISK';endTime?:string;placeId?:string;latitude?:number;longitude?:number;locationAccuracy?:string;whyVisit?:string;insiderTip?:string;alternative?:string;distanceKm?:number;bookingNote?:string;costBasis?:string;indoor?:boolean;accessibilityNote?:string;adaptationReason?:string;localExperience?:boolean;nearbyPlaceIds?:string[]};
export type ItineraryDay={day:number;date:string;title:string;summary:string;estimatedCost:number;activities:ItineraryActivity[];lodgingCost?:number;walkingKm?:number;conditionsSummary?:string};
export type BudgetBreakdown={stay:number;food:number;activities:number;localTransport:number;intercityTransport:number;reserve:number;total:number};
export type Itinerary={destination:string;from:string;startDate:string;endDate:string;duration:number;travellers:number;estimatedCost:number;currency:'INR';tripSummary:string;packingSuggestions:string[];travelTips:string[];days:ItineraryDay[];budgetBreakdown?:BudgetBreakdown;budgetLimit?:number;warnings?:string[];assumptions?:string[];createdAt?:string;conditions?:Conditions;changes?:PlanChange[];baselineDays?:ItineraryDay[];nearby?:NearbyResult;experienceMode?:TripForm['experienceMode'];adjustedAt?:string;changesApplied?:boolean;generation?:{provider:'gemini';model:string;createdAt:string}};
export function distanceKm(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){const rad=(n:number)=>n*Math.PI/180;const x=Math.sin(rad(b.latitude-a.latitude)/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(rad(b.longitude-a.longitude)/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));}
export function recalculateItinerary(plan:Itinerary):Itinerary{
 const budget:BudgetBreakdown={stay:0,food:0,activities:0,localTransport:0,intercityTransport:plan.budgetBreakdown?.intercityTransport||0,reserve:plan.budgetBreakdown?.reserve||0,total:0};
 for(const d of plan.days){d.estimatedCost=d.activities.reduce((s,a)=>s+a.estimatedCost,0)+(d.lodgingCost||0);budget.stay+=d.lodgingCost||0;for(const a of d.activities){if(a.type==='food')budget.food+=a.estimatedCost;else if(a.type==='transport')budget.localTransport+=a.estimatedCost;else if(a.type==='stay')budget.stay+=a.estimatedCost;else budget.activities+=a.estimatedCost;}}
 budget.total=budget.stay+budget.food+budget.activities+budget.localTransport+budget.intercityTransport+budget.reserve;
 plan.budgetBreakdown=budget;plan.estimatedCost=budget.total;return plan;
}
export function buildDemoItinerary(trip:TripForm,destination?:Destination):Itinerary{
 const d=destination||destinations.find(x=>x.name===trip.destination);if(!d)throw new Error('Destination is not in the catalog.');
 const duration=getTripDuration(trip.startDate,trip.endDate);if(duration<1||duration>14)throw new Error('Trip must have 1–14 calendar days.');
 const dailyStart=minutes(trip.dayStartTime||'08:30'),dailyEnd=minutes(trip.dayEndTime||'20:00'),arrival=minutes(trip.arrivalTime||'10:00'),departure=minutes(trip.departureTime||'18:00');
 const walkingLimit=trip.walkingLimitKm??5;const relaxed=trip.travelStyle==='Relaxed'||!!trip.seniors||!!trip.children||!!trip.accessibility?.length;
 const stopLimit=walkingLimit<1?0:relaxed?1:trip.travelStyle==='Packed'?3:2;
 const must=(trip.mustVisit||'').toLowerCase().split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
 const exclude=(p:typeof catalog[number])=> (trip.avoid?.includes('Heights')&&/hill|viewpoint|stupa|cliff/i.test(p.name))||(trip.avoid?.includes('Water activities')&&/lake|beach|dam|cove/i.test(p.name))||(trip.avoid?.includes('Strenuous hikes')&&/hill|cave|doddabetta/i.test(p.name))||(d.id==='leh'&&duration<3);
 const candidates=catalog.filter(p=>p.destinationId===d.id&&!exclude(p)).sort((a,b)=>{
  const score=(p:typeof catalog[number])=>(must.some(m=>p.name.toLowerCase().includes(m))?100:0)+(trip.interests.includes(p.category as TripForm['interests'][number])?5:0)+(trip.experienceMode==='local'&&localAffinity(p.name)?30:0)+(trip.experienceMode==='highlights'&&!localAffinity(p.name)?20:0);return score(b)-score(a);
 });
 const local=trip.experienceMode==='local';const familiar=trip.experienceMode==='highlights';const food=foodIdeas(d,trip);
 const used=new Set<string>();const warnings:string[]=[];
 if(d.id==='leh')warnings.push('High altitude: reserve the first 48 hours for rest and acclimatisation. Confirm a suitable plan with a clinician if you have relevant health conditions.');
 if(trip.accessibility?.length)warnings.push('Venue access is unverified. The pace is reduced; confirm step-free access and suitable transfers before booking.');
 if(trip.avoid?.includes('Crowds'))warnings.push('Crowd levels are not live. Prefer early visits where opening hours allow, and leave if conditions are uncomfortable.');
 if(trip.avoid?.includes('Night travel'))warnings.push('Intercity tickets are not selected here. Choose daytime departures when booking to avoid night travel.');
 for(const m of must)if(!candidates.some(p=>p.name.toLowerCase().includes(m)))warnings.push(`“${m}” could not be matched to an eligible catalog place; it has not been silently added to the map.`);
 const priceFactor=trip.accommodationPreference==='Premium stay'?1.7:trip.accommodationPreference==='Budget stay'||trip.accommodationPreference==='Hostel / homestay'?.72:1;
 const mealBase=Math.round((d.dailyBudget||1800)*.13*priceFactor);
 const roomRate=Math.round((d.dailyBudget||1800)*.8*priceFactor/100)*100;
 const days:ItineraryDay[]=Array.from({length:duration},(_,index)=>{
  const date=dateAt(trip.startDate,index);const first=index===0,last=index===duration-1;
  const finish=last?Math.min(dailyEnd,departure-45):dailyEnd;
  let cursor=first?arrival:last?Math.max(0,Math.min(dailyStart,departure-45)):dailyStart;const activities:ItineraryActivity[]=[];let walking=0;let previous={latitude:d.latitude,longitude:d.longitude};
  const add=(name:string,type:ItineraryActivity['type'],length:number,cost:number,description:string,extras:Partial<ItineraryActivity>={},force=false)=>{
   if(!force&&cursor+length>finish)return false;
   const end=Math.min(1439,cursor+length);
   activities.push({id:`day-${index+1}-${activities.length+1}`,time:timeLabel(cursor),endTime:timeLabel(end),durationMinutes:Math.max(1,end-cursor),name,type,location:d.name,description,estimatedCost:Math.max(0,Math.round(cost)),safety:'CAUTION',costBasis:'Estimated total for your group; confirm current rates.',...extras});cursor=end;return true;
  };
  if(first){add('Arrival & settle in','transport',30,250*Math.ceil(trip.travellers/4),'Allow time to reach your accommodation, leave luggage and confirm check-in. The start time is your arrival at the destination, not departure from home.',{bookingNote:'Your intercity ticket and room are not booked.'},true);}
  const breakfast=()=>add('Breakfast & a gentle start','food',45,mealBase*trip.travellers,`${trip.foodPreference==='Any'?'Choose a local breakfast':`Ask for a ${trip.foodPreference.toLowerCase()} breakfast`}. ${familiar?'Familiar breakfast options':food} are ideas to explore; check ingredients and dietary suitability.`,{indoor:true,insiderTip:trip.dietaryNotes?`Tell the kitchen: ${trip.dietaryNotes}. Confirm allergens directly.`:'Eat near your stay to avoid an extra morning transfer.'});
  if(cursor<10*60)breakfast();
  let visited=0,lunched=false;const allowSights=!(d.id==='leh'&&index<2);
  const remaining=candidates.filter(p=>!used.has(p.id));const daysLeft=duration-index;const wanted=allowSights?Math.min(stopLimit,Math.max(1,Math.ceil(remaining.length/Math.max(1,daysLeft-1)))):0;
  for(const p of remaining){
   if(visited>=wanted||walking+1>walkingLimit)break;
   const weekday=new Date(date+'T00:00:00Z').getUTCDay();if(p.name==='Taj Mahal'&&weekday===5){if(!warnings.includes('The Taj Mahal is closed to regular sightseeing on Fridays.'))warnings.push('The Taj Mahal is closed to regular sightseeing on Fridays.');continue;}
   const distance=distanceKm(previous,p)*1.5;
   const walk=trip.localTransport==='Mostly walking'&&distance<1.2&&walking+distance+1<=walkingLimit;
   const transfer=walk?Math.max(15,Math.ceil(distance/4*60)):Math.max(20,Math.ceil(distance/25*60)+15);
   const visit=relaxed?Math.min(90,p.durationMinutes):p.durationMinutes;
   if(cursor+transfer+visit+60>finish)continue;
   if(cursor>=12*60&&!lunched){add('Lunch & a proper break','food',60,mealBase*1.5*trip.travellers,`Take an unhurried meal and sit down before the afternoon. Try suitable local dishes such as ${familiar?'a familiar meal that suits you':food}.`,{indoor:true});lunched=true;}
   if(cursor+transfer+visit>finish)continue;
   add(`${walk?'Walk':'Local transfer'} to ${p.name}`,'transport',transfer,walk?0:trip.localTransport==='Public transport'?70*trip.travellers:Math.max(180,distance*24)*Math.ceil(trip.travellers/4),`Allow approximately ${transfer} minutes including a buffer. Distance and time are rough planning estimates, not a checked road route.`,{distanceKm:Math.round(distance*10)/10});
   walking+=walk?distance:0;
   add(p.name,'activity',visit,p.estimatedCost*trip.travellers,`${p.name} is one of the named highlights in this ${d.name} plan. Spend time exploring at your pace, then keep a little room for photographs and a seated break.`,{placeId:p.id,latitude:p.latitude,longitude:p.longitude,locationAccuracy:'approximate',location:p.name+', '+d.name,localExperience:localAffinity(p.name),whyVisit:`${local&&localAffinity(p.name)?'Prioritised for your local-experience preference. ':''}Chosen for ${trip.interests.join(', ')||'local discovery'} and grouped within ${d.name} to keep the day manageable.`,insiderTip:p.visitTip,alternative:'If access, crowds or weather are unsuitable, skip this stop and take a sheltered break near your stay.',bookingNote:p.requiresBooking?'Book with an authorised operator or official venue after checking availability.':'Opening hours and admission charges have not been verified for your dates.',indoor:p.indoor,accessibilityNote:p.accessibility});
   previous=p;walking+=1;visited++;used.add(p.id);
  }
  if(!lunched&&cursor<14*60&&cursor+60<=finish){if(cursor<12*60)add('Unhurried local time','free-time',Math.min(60,12*60-cursor),0,allowSights?'Explore near your stay, browse local craft or pause for photographs. Keep this flexible until you know local conditions.':'Rest at your accommodation. Avoid exertion during acclimatisation.',{indoor:!allowSights});add('Lunch & local flavours','food',60,mealBase*1.5*trip.travellers,`Ask for a meal suited to your ${trip.foodPreference.toLowerCase()} food preference. ${local?`Explore regional flavours: ${food}. `:''}${trip.dietaryNotes||'Confirm ingredients with the restaurant.'}`,{indoor:true});}
  if(cursor+60<=finish)add(allowSights?(local?'Local food, craft & neighbourhood time':'Rest, café or independent exploring'):'Acclimatisation & rest','free-time',Math.min(120,Math.max(30,finish-cursor-75)),0,allowSights?(local?`Stay in the neighbourhood of your last stop. Ask about locally made crafts, a regional cooking demonstration or a small neighbourhood café. ${food} are food ideas to ask about; check ingredients. These are optional experience types, not confirmed venues or bookings.`:'Use this block for a café, a booked local experience or simply a break. It is intentionally flexible and has no implied venue reservation.'):'Keep activity light and stay close to your accommodation. Do not start a strenuous excursion.',{localExperience:local,indoor:!allowSights,alternative:'Stay indoors if local conditions are unsuitable.'});
  if(cursor<18*60&&finish>=19*60)cursor=18*60;
  if(cursor>=17*60&&cursor+60<=finish)add('Dinner & tomorrow’s check-in','food',60,mealBase*1.7*trip.travellers,`Choose a meal near your stay. Review the next day’s opening hours, tickets and weather. ${trip.dietaryNotes?'Reconfirm your dietary requirements.':''}`,{indoor:true});
  if(last){cursor=Math.max(cursor,Math.max(0,departure-45));add('Departure buffer','transport',Math.max(1,Math.min(45,departure-cursor,1439-cursor)),250*Math.ceil(trip.travellers/4),'Allow time for checkout and the local transfer. For airports and long-distance trains, increase this buffer to meet your carrier’s check-in requirements.',{bookingNote:'This does not include or confirm an intercity ticket.'},true);}
  if(!activities.length)add('Flexible local day','free-time',30,0,'Rest, arrange a locally verified experience or adjust your dates to spend more time at another destination.',{indoor:true},true);
  return {day:index+1,date,title:!allowSights?'Rest & acclimatisation':first?'Arrive, settle in & discover':last?'A little more exploring, then home':visited?`${d.name} at your pace`:'Local time, your way',summary:`${trip.travelStyle} pace with ${visited} named stop${visited===1?'':'s'}, meal time and flexible breaks. ${trip.children?'Extra time is kept for family comfort.':''}`,estimatedCost:0,lodgingCost:last?0:roomRate*(trip.roomCount||Math.ceil(trip.travellers/2)),walkingKm:Math.round(walking*10)/10,activities};
 });
 const perPerson=trip.transport==='Flight'?11000:trip.transport==='Train'?3000:trip.transport==='Bus'?2400:trip.transport==='Car'?5500:3500;
 const intercity=trip.budgetScope==='at-destination'||trip.from.toLowerCase()===trip.destination.toLowerCase()?0:perPerson*trip.travellers;
 for(const m of must){const matched=candidates.find(p=>p.name.toLowerCase().includes(m));if(matched&&!used.has(matched.id))warnings.push(`${matched.name} did not fit your dates, time window or walking limit. Adjust the plan if this is essential.`);}
 if(days.some(day=>day.activities.every(a=>a.type!=='activity')))warnings.push('Some days include flexible local time. The planner does not repeat named sights or invent additional verified venues to fill a longer stay.');
 const plan:Itinerary={destination:trip.destination,from:trip.from,startDate:trip.startDate,endDate:trip.endDate,duration,travellers:trip.travellers,currency:'INR',estimatedCost:0,budgetLimit:trip.budget,experienceMode:trip.experienceMode||'balanced',createdAt:new Date().toISOString(),tripSummary:`${duration} calendar days in ${d.name} for ${trip.travellers} traveller${trip.travellers===1?'':'s'}, built around a ${trip.travelStyle.toLowerCase()} pace, ${trip.experienceMode==='local'?'regional food and neighbourhood culture':trip.experienceMode==='highlights'?'classic highlights':'a mix of highlights and local discoveries'}, your available hours and group needs.`,packingSuggestions:['Photo ID and booking confirmations','Comfortable shoes and a reusable water bottle','Phone charger and power bank',...(d.category.includes('Mountains')?['Layers for changing mountain temperatures']:['Sun protection and light layers']),...(trip.children?['Child essentials and snacks']:[]),...(trip.dietaryNotes?['A written note of your dietary requirements']:[])],travelTips:[d.gettingThere||'Confirm how you will reach the destination.','Meal and attraction costs are estimated for the entire group.','Keep a copy of the itinerary offline; external maps and live services need internet.'],warnings,assumptions:['All times are local to India (IST). Arrival means arrival at the destination.','Named place coordinates are approximate. Travel distance uses a geographic estimate, not road routing.','Venue opening hours, accessibility and tickets need direct confirmation. Activity caution labels do not mean live risk has been checked.',`${duration-1} nights × ${trip.roomCount||Math.ceil(trip.travellers/2)} rooms; room rates are planning allowances, not hotel offers.`,intercity?'Intercity travel is a broad round-trip allowance based on transport preference. Origin-specific fares are not checked.':'Intercity travel is excluded or the starting city matches the destination.','Reserve is unspent budget set aside, not a booking charge.'],budgetBreakdown:{stay:0,food:0,activities:0,localTransport:0,intercityTransport:intercity,reserve:Math.round(trip.budget*(trip.reservePercent??10)/100),total:0},days};
 return recalculateItinerary(plan);
}
export function enrichmentSchema(){return {type:'object',properties:{tripSummary:{type:'string'},days:{type:'array',items:{type:'object',properties:{day:{type:'integer'},title:{type:'string'},summary:{type:'string'},activityNotes:{type:'array',items:{type:'object',properties:{id:{type:'string'},description:{type:'string'},whyVisit:{type:'string'},insiderTip:{type:'string'},alternative:{type:'string'}},required:['id','description','whyVisit','insiderTip','alternative']}}},required:['day','title','summary','activityNotes']}},packingSuggestions:{type:'array',items:{type:'string'}},travelTips:{type:'array',items:{type:'string'}}},required:['tripSummary','days','packingSuggestions','travelTips']};}
function safeText(value:unknown,fallback:string,max=1100){return typeof value==='string'&&value.trim()?value.trim().slice(0,max):fallback;}
export function enrichItinerary(seed:Itinerary,input:unknown):Itinerary{
 if(!input||typeof input!=='object')throw new Error('Invalid planning response');const r=input as Record<string,unknown>;
 if(!Array.isArray(r.days)||r.days.length!==seed.days.length)throw new Error('AI returned an incomplete plan.');
 const out=structuredClone(seed);out.tripSummary=safeText(r.tripSummary,seed.tripSummary);
 for(const day of out.days){const match=r.days.find(x=>x&&typeof x==='object'&&x.day===day.day);if(!match)throw new Error('Missing itinerary day');day.title=safeText(match.title,day.title,160);day.summary=safeText(match.summary,day.summary,800);if(!Array.isArray(match.activityNotes))throw new Error('Missing activity notes');
  for(const a of day.activities){const n=match.activityNotes.find((x:Record<string,unknown>)=>x?.id===a.id);if(!n)continue;a.description=safeText(n.description,a.description);a.whyVisit=safeText(n.whyVisit,a.whyVisit||'Fits the pace of this day.',600);a.insiderTip=safeText(n.insiderTip,a.insiderTip||'Confirm current local details.',600);a.alternative=safeText(n.alternative,a.alternative||'Keep this time flexible.',600);}
 }
 if(Array.isArray(r.packingSuggestions))out.packingSuggestions=r.packingSuggestions.filter((s):s is string=>typeof s==='string').map(s=>s.slice(0,250)).slice(0,15);
 if(Array.isArray(r.travelTips))out.travelTips=r.travelTips.filter((s):s is string=>typeof s==='string').map(s=>s.slice(0,450)).slice(0,12);
 return out;
}
// Kept for older saved plans and replanning consumers. Monetary totals are always recalculated.
export function validateItinerary(input:unknown,trip:TripForm):Itinerary{
 if(!input||typeof input!=='object')throw new Error('Invalid itinerary');const p=input as Itinerary;
 if(!Array.isArray(p.days)||p.days.length!==getTripDuration(trip.startDate,trip.endDate))throw new Error('Incomplete itinerary');
 for(let i=0;i<p.days.length;i++){const d=p.days[i];if(d.date!==dateAt(trip.startDate,i)||!Array.isArray(d.activities)||!d.activities.length||d.activities.length>25)throw new Error('Invalid day');let end=0;
  for(const a of d.activities){const start=minutes(a.time);if(start<end||!Number.isFinite(a.durationMinutes)||a.durationMinutes<1||start+a.durationMinutes>1440||!Number.isFinite(a.estimatedCost)||a.estimatedCost<0)throw new Error('Invalid schedule or cost');end=start+a.durationMinutes;}
 }
 return recalculateItinerary({...p,destination:trip.destination,from:trip.from,startDate:trip.startDate,endDate:trip.endDate,duration:p.days.length,travellers:trip.travellers,currency:'INR'});
}
