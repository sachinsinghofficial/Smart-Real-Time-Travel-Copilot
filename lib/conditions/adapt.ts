import type { TripForm } from '../../types/travel';
import type { Itinerary, ItineraryActivity, ItineraryDay } from '../itinerary';
import { distanceKm, recalculateItinerary } from '../itinerary';
import type { Conditions, PlanChange } from './types';
import { minutes, timeLabel } from '../trip-validation';
import { todayDate } from '../trip';
import destinations from '../../data/destinations.json';
import { foodIdeas } from '../local';

export function baselinePlan(plan:Itinerary):Itinerary{return {...structuredClone(plan),days:structuredClone(plan.baselineDays||plan.days)};}
export function adaptItinerary(input:Itinerary,trip:TripForm,conditions:Conditions,options:{apply?:boolean;day?:number;preserveElapsed?:boolean;now?:Date}={}):Itinerary{
 const now=options.now||new Date(),today=todayDate(now),apply=options.apply??trip.autoAdjust!==false;
 const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);const elapsed=minutes(clock);
 const fresh=now.getTime()-Date.parse(conditions.checkedAt)<=30*60000&&Date.parse(conditions.checkedAt)<=now.getTime()+60000;
 const weatherFresh=now.getTime()-Date.parse(conditions.weather.fetchedAt)<=60*60000;
 const plan=structuredClone(input),base=baselinePlan(input),destination=destinations.find(d=>d.name===trip.destination)!;
 const changes:PlanChange[]=[];plan.baselineDays=base.days;plan.conditions=conditions;
 const change=(day:ItineraryDay,a:ItineraryActivity,after:string,reason:string,source:string)=>changes.push({day:day.day,date:day.date,activityId:a.id,before:a.name+' · '+a.time+'–'+(a.endTime||timeLabel(minutes(a.time)+a.durationMinutes)),after,reason,source});
 if(!fresh){plan.warnings=[...new Set([...(plan.warnings||[]),'Condition data is stale; no new automatic changes were applied. Refresh before travel.'])];plan.changes=[];return plan;}
 const adjusted=base.days.map((original,index)=>{
  if((options.day&&original.day!==options.day)||original.date<today)return structuredClone(input.days[index]);
  const day=structuredClone(original);const observed=conditions.weather.source==='forecast'||conditions.weather.source==='partial';
  const weather=observed&&weatherFresh?conditions.weather.daily.find(w=>w.date===day.date):undefined;
  const alerts=conditions.alerts.filter(a=>a.date===day.date&&(!a.endsAt||Date.parse(a.endsAt)>=now.getTime()));
  const severe=weather?.risk==='AT RISK';const paused=new Set<string>();
  const preserve=(a:ItineraryActivity)=>!!options.preserveElapsed&&day.date===today&&minutes(a.time)<elapsed;
  const hasRegionAlert=alerts.some(a=>a.kind==='disaster'&&a.severity==='avoid'&&distanceKm(a,destination)<=a.radiusKm);
  let activityList=day.activities.map((a,i):ItineraryActivity=>{
   if(preserve(a))return structuredClone(input.days[index]?.activities.find(x=>x.id===a.id)||a);
   const loc=a.latitude!==undefined&&a.longitude!==undefined?{latitude:a.latitude,longitude:a.longitude}:destination;
   const alert=alerts.find(alert=>alert.severity==='avoid'&&distanceKm(alert,loc)<=alert.radiusKm);
   if(input.days[index]?.activities.some(x=>x.id===a.id&&x.adaptationReason)&&(!weather||conditions.disasters.status==='unavailable'||conditions.traffic.status==='unavailable')){const previous=input.days[index].activities.find(x=>x.id===a.id)!;if(previous.type==='free-time'&&a.type==='activity'){paused.add(a.id);change(day,a,previous.name,'Previous adjustment retained because a relevant feed could not be rechecked.','TravelSetu');return structuredClone(previous);}}
   const affected=(a.type==='activity'&&(hasRegionAlert||!!alert||severe&&!a.indoor))||(a.type==='free-time'&&!a.indoor&&(hasRegionAlert||!!alert||severe));
   if(affected){const reason=hasRegionAlert?'A recent severe regional event requires local verification before sightseeing.':alert?`${alert.title}: reported near this stop. Avoid this visit pending local confirmation.`:weather!.reason||'Exposed activity paused because of the weather forecast.';paused.add(a.id);
    const name=trip.experienceMode==='local'?'Sheltered local-culture time, if appropriate':'Pause sightseeing & check local guidance';
    change(day,a,name,reason,alert?.source|| (hasRegionAlert?'GDACS':'Open-Meteo'));
    return {id:a.id,time:a.time,endTime:a.endTime,durationMinutes:a.durationMinutes,name,type:'free-time',location:trip.destination,description:`${reason} Follow official instructions, including any evacuation advice. Once appropriate, use the time for a regional food or craft conversation at your accommodation. ${trip.experienceMode==='local'?`Ask about ${foodIdeas(destination,trip)}; confirm dietary ingredients.`:''} No replacement venue or booking is assumed.`,estimatedCost:0,safety:'CAUTION',indoor:true,localExperience:trip.experienceMode==='local',adaptationReason:reason,alternative:'Reschedule the original stop after conditions and access have been checked.',costBasis:'Unbooked activity allowance removed. Existing bookings or prepaid tickets are not cancelled or refunded.'};
   }
   if(a.type==='transport'&&a.distanceKm!==undefined){const leg=conditions.legs.find(l=>l.day===day.day&&l.activityId===a.id);if(leg){const duration=Math.max(a.durationMinutes,Math.min(600,leg.minutes));if(duration>a.durationMinutes)change(day,a,`Allow ${duration} minutes for ${a.name}`,`Traffic-aware car estimate plus arrival buffer; ${leg.delayMinutes} minutes of reported/modelled traffic delay.`,'TomTom');return {...a,durationMinutes:duration,distanceKm:Math.round(leg.distanceKm*10)/10,description:`TomTom ${leg.source==='current'?'current traffic snapshot':'traffic prediction'} suggests about ${leg.minutes} minutes including a 10-minute buffer. Starting base and catalog entrances are approximate. Later legs can change with actual departure time; recheck before leaving.`,adaptationReason:duration>a.durationMinutes?'More transfer time allowed for reported or modelled traffic.':undefined};}}
   if(weather?.risk==='CAUTION'&&a.type==='activity'&&!a.indoor)return {...a,safety:'CAUTION',adaptationReason:weather.reason};
   return a;
  });
  activityList=activityList.map((a,i)=>{const next=activityList[i+1];if(a.type==='transport'&&a.distanceKm!==undefined&&next&&paused.has(next.id)&&!preserve(a)){change(day,a,'Rest & conditions check','The next sightseeing visit is paused, so its transfer is removed.','TravelSetu');return {...a,name:'Rest & conditions check',type:'free-time' as const,durationMinutes:original.activities[i].durationMinutes,estimatedCost:0,distanceKm:undefined,indoor:true,description:'Remain in an appropriate location and follow official/local advice. No sightseeing journey is scheduled in this block.'};}return a;});
  const fixedDeparture=original.activities.find(a=>a.name==='Departure buffer');const finish=fixedDeparture?minutes(fixedDeparture.time):minutes(trip.dayEndTime||'20:00');let cursor=0;const scheduled:ItineraryActivity[]=[];
  for(const a of activityList){
   if(a.name==='Departure buffer'){scheduled.push(a);continue;}
   if(preserve(a)){scheduled.push(a);cursor=Math.max(cursor,minutes(a.time)+a.durationMinutes);continue;}
   const start=Math.max(minutes(a.time),cursor),room=finish-start;
   let length=a.durationMinutes;if((a.type==='free-time'||a.type==='food')&&length>room)length=Math.max(0,room);
   if(room<=0||length<15||start+length>finish){change(day,a,'Deferred — does not fit before your finish time','Extra transfer time leaves insufficient time for this stop. Departure and daily finish are preserved.','TravelSetu');
    if(a.type==='activity'&&scheduled.at(-1)?.type==='transport'&&scheduled.at(-1)?.distanceKm!==undefined){const transfer=scheduled.pop()!;cursor=scheduled.length?minutes(scheduled.at(-1)!.time)+scheduled.at(-1)!.durationMinutes:0;change(day,transfer,'Transfer removed','The following visit no longer fits this day.','TravelSetu');}
    continue;
   }
   if(start!==minutes(a.time))change(day,a,`${a.name} · ${timeLabel(start)}–${timeLabel(start+length)}`,'Shifted to keep activities from overlapping after a transfer adjustment.','TravelSetu');
   scheduled.push({...a,time:timeLabel(start),endTime:timeLabel(start+length),durationMinutes:length});cursor=start+length;
  }
  if(!scheduled.length)return {...day,conditionsSummary:'No schedule changes could be fitted. Check local guidance.'};
  day.activities=scheduled;const count=changes.filter(c=>c.day===day.day).length;
  day.conditionsSummary=`${weather?`${weather.description}; ${weather.precipitation} mm precipitation, ${weather.maxWindSpeed} km/h wind.`:'No usable weather forecast for this date.'} ${alerts.length?`${alerts.length} regional/road reports to review.`:'No relevant reports returned; local conditions remain unverified.'}`;
  if(count){day.title='An adjusted day in '+trip.destination;day.summary=`${count} schedule adjustments based on available information. Check the change log before leaving.`;day.walkingKm=Math.min(day.walkingKm||0,day.activities.filter(a=>a.type==='activity').length);}
  return day;
 });
 plan.changes=changes;plan.changesApplied=apply;plan.adjustedAt=apply?now.toISOString():input.adjustedAt;
 if(apply)plan.days=adjusted;
 if(changes.length)plan.warnings=[...new Set([...(plan.warnings||[]),'Automatic adjustments change unbooked planning estimates only. They do not cancel transport, accommodation, tickets or meals.'])];
 return recalculateItinerary(plan);
}
