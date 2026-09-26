import type { TripForm } from '../types/travel';
import destinations from '../data/destinations.json';
import { getTripDuration } from './trip';
export const INTERESTS=['Nature','Adventure','Beaches','Culture','Wildlife','Spiritual','Food','Nightlife'] as const;
export const ACCESS=['Step-free access','Minimal stairs','Frequent seated breaks','Stroller-friendly'] as const;
export const AVOID=['Strenuous hikes','Heights','Crowds','Night travel','Water activities'] as const;
function record(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Trip details are required.');return v as Record<string,unknown>;}
function number(v:unknown,fallback:number,min:number,max:number,label:string){const n=v===undefined?fallback:Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new Error(`${label} must be between ${min} and ${max}.`);return n;}
function text(v:unknown,max=500){return typeof v==='string'?v.trim().slice(0,max):'';}
function choose(v:unknown,options:readonly string[],fallback:string){return options.includes(String(v))?String(v):fallback;}
function list(v:unknown,options:readonly string[]){return Array.isArray(v)?[...new Set(v.filter((x):x is string=>typeof x==='string'&&options.includes(x)))].slice(0,15):[];}
export function isDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;}
export function minutes(value:string){const m=/^(\d{2}):(\d{2})$/.exec(value);if(!m||+m[1]>23||+m[2]>59)throw new Error('Use a valid time in HH:MM format.');return +m[1]*60 + +m[2];}
export function timeLabel(value:number){const n=Math.min(1439,Math.max(0,Math.round(value)));return `${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toString().padStart(2,'0')}`;}
export function parseTrip(input:unknown):TripForm{
 const t=record(input);const from=text(t.from,80),name=text(t.destination,80),startDate=text(t.startDate,10),endDate=text(t.endDate,10);
 const destination=destinations.find(d=>d.name.toLowerCase()===name.toLowerCase());
 if(!from)throw new Error('Enter your starting city.');if(!destination)throw new Error('Choose a destination from Explore.');
 if(!isDate(startDate)||!isDate(endDate))throw new Error('Enter valid calendar dates.');const days=getTripDuration(startDate,endDate);if(days<1||days>14)throw new Error('Choose between 1 and 14 calendar days, including arrival and departure.');
 const travellers=number(t.travellers,1,1,20,'Travellers'),children=number(t.children,0,0,19,'Children'),seniors=number(t.seniors,0,0,20,'Seniors');
 if(![travellers,children,seniors].every(Number.isInteger)||children+seniors>travellers||children>=travellers)throw new Error('Group counts must be whole numbers with at least one adult. Children and seniors are included in the traveller total.');
 const arrivalTime=text(t.arrivalTime,5)||'10:00',departureTime=text(t.departureTime,5)||'18:00',dayStartTime=text(t.dayStartTime,5)||'08:30',dayEndTime=text(t.dayEndTime,5)||'20:00';
 for(const v of [arrivalTime,departureTime,dayStartTime,dayEndTime])minutes(v);
 if(minutes(dayEndTime)-minutes(dayStartTime)<240)throw new Error('Allow at least four hours between your daily start and finish.');
 if(days===1&&minutes(departureTime)-minutes(arrivalTime)<120)throw new Error('Allow at least two hours between arrival and departure for a day trip.');
 const rooms=number(t.roomCount,Math.ceil(travellers/2),1,travellers,'Rooms');if(!Number.isInteger(rooms))throw new Error('Room count must be a whole number.');
 return {experienceMode:choose(t.experienceMode,['local','balanced','highlights'],'balanced') as TripForm['experienceMode'],nearbyRadiusKm:number(t.nearbyRadiusKm,3,1,10,'Nearby radius'),autoAdjust:t.autoAdjust!==false,from,destination:destination.name,startDate,endDate,travellers,budget:number(t.budget,20000,1000,10000000,'Group budget'),interests:list(t.interests,INTERESTS) as TripForm['interests'],foodPreference:choose(t.foodPreference,['Any','Vegetarian','Non-Veg','Vegan'],'Any') as TripForm['foodPreference'],transport:choose(t.transport,['Any','Train','Bus','Flight','Car'],'Any') as TripForm['transport'],travelStyle:choose(t.travelStyle,['Relaxed','Balanced','Packed'],'Balanced') as TripForm['travelStyle'],accommodationPreference:choose(t.accommodationPreference,['Comfortable stay','Budget stay','Hostel / homestay','Premium stay'],'Comfortable stay'),specialRequirements:text(t.specialRequirements),groupType:choose(t.groupType,['Solo','Couple','Friends','Family','Work trip'],'Friends'),children,seniors,arrivalTime,departureTime,dayStartTime,dayEndTime,walkingLimitKm:number(t.walkingLimitKm,5,0,20,'Daily walking limit'),accessibility:list(t.accessibility,ACCESS),avoid:list(t.avoid,AVOID),mustVisit:text(t.mustVisit),roomCount:rooms,hotelAmenities:list(t.hotelAmenities,['Wi-Fi','Breakfast','Parking','Air conditioning','Lift','Kitchen','Pool']),localTransport:choose(t.localTransport,['Mix of walking and taxis','Mostly walking','Public transport','Private cab'],'Mix of walking and taxis'),budgetScope:choose(t.budgetScope,['whole-trip','at-destination'],'whole-trip') as TripForm['budgetScope'],reservePercent:number(t.reservePercent,10,0,30,'Reserve percentage'),dietaryNotes:text(t.dietaryNotes,300)};
}
