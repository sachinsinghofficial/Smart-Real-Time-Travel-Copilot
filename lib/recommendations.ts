import demos from '../data/recommendation-demo.json';
import type {Itinerary,ItineraryDay} from './itinerary';
import {distanceKm} from './itinerary';
import type {TripForm} from '../types/travel';
import {affordableReplacement} from './budget-policy';
export type RecommendationKind='hotel'|'restaurant'|'experience'|'transport'|'intercity';
export type RecommendationSlot={id:string;name:string;allowance:number;kind:RecommendationKind;latitude?:number;longitude?:number;area:string};
export function daySlots(plan:Itinerary,day:ItineraryDay):RecommendationSlot[]{
 const first=day.activities.find(a=>Number.isFinite(a.latitude)&&Number.isFinite(a.longitude));
 const slots:RecommendationSlot[]=[];
 if(day.day<plan.duration)slots.push({id:`night-${day.day}`,name:`Night ${day.day} · all rooms`,kind:'hotel',allowance:(day.lodgingCost||0)+day.activities.filter(a=>a.type==='stay').reduce((n,a)=>n+a.estimatedCost,0),latitude:first?.latitude,longitude:first?.longitude,area:first?.location||plan.destination});
 let anchor=first;
 for(const a of day.activities){if(Number.isFinite(a.latitude)&&Number.isFinite(a.longitude))anchor=a;const kind=a.type==='food'?'restaurant':a.type==='activity'?'experience':a.type==='transport'&&a.name!=='Departure buffer'?'transport':null;if(kind)slots.push({id:a.id,name:`${a.time} · ${a.name}`,kind,allowance:a.estimatedCost,latitude:a.latitude??anchor?.latitude,longitude:a.longitude??anchor?.longitude,area:a.location});}
 if(day.day===1&&(plan.budgetBreakdown?.intercityTransport||0)>0)slots.push({id:'intercity',name:'Return travel · whole group',kind:'intercity',allowance:plan.budgetBreakdown!.intercityTransport,area:`${plan.from} → ${plan.destination}`});
 return slots;
}
export function demoRecommendations(plan:Itinerary,slot:RecommendationSlot,trip:Pick<TripForm,'roomCount'|'travellers'|'transport'>){
 const people=plan.travellers,rooms=trip.roomCount||Math.ceil(people/2),premium=slot.allowance/Math.max(1,slot.kind==='hotel'?rooms:people)>=(slot.kind==='hotel'?6000:slot.kind==='intercity'?14000:1000);
 return demos.filter(d=>d.kind===slot.kind&&(slot.kind!=='intercity'||trip.transport==='Any'||d.id.includes(trip.transport.toLowerCase()))).map(d=>({...d,groupPrice:d.rate*(d.unit==='room'?rooms:d.unit==='car'?Math.ceil(people/4):people)})).filter(d=>affordableReplacement(plan,slot.allowance,d.groupPrice)).sort((a,b)=>premium?b.groupPrice-a.groupPrice:a.groupPrice-b.groupPrice).slice(0,3);
}
export function nearbyForSlot(plan:Itinerary,day:number,slot:RecommendationSlot,radius:number){
 const anchor=Number.isFinite(slot.latitude)&&Number.isFinite(slot.longitude)?{latitude:slot.latitude!,longitude:slot.longitude!}:null;
 if(!anchor)return [];
 return (plan.nearby?.places||[]).filter(p=>p.kind===slot.kind&&(p.dayNumbers.includes(day)||!p.dayNumbers.length)&&p.distanceKm<=radius).map(p=>({...p,slotDistance:anchor?distanceKm(anchor,p):p.distanceKm})).filter(p=>p.slotDistance<=radius).sort((a,b)=>(plan.experienceMode==='local'?Number(b.localMatch)-Number(a.localMatch):0)||a.slotDistance-b.slotDistance).slice(0,5);
}
