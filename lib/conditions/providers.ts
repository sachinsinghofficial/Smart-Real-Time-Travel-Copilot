import destinations from '../../data/destinations.json';
import type { Itinerary } from '../itinerary';
import { distanceKm } from '../itinerary';
import { todayDate, dateAt } from '../trip';
import { getWeather } from '../weather';
import type { Conditions, FeedStatus, TravelAlert, TrafficLeg } from './types';
import type { TripForm } from '../../types/travel';
const json=async(url:URL,http:typeof fetch)=>{const r=await http(url.toString(),{signal:AbortSignal.timeout(9000),cache:'no-store',headers:{accept:'application/json'}});if(!r.ok)throw new Error('Provider unavailable');return r.json();};
const stamp=()=>new Date().toISOString();
const feed=(provider:string,status:FeedStatus['status'],message:string,url?:string):FeedStatus=>({provider,status,message,url,checkedAt:stamp()});
function point(coords:unknown):{latitude:number;longitude:number}|undefined{if(!Array.isArray(coords)||coords.length<2||!Number.isFinite(coords[0])||!Number.isFinite(coords[1])||Math.abs(coords[0])>180||Math.abs(coords[1])>90)return;return {latitude:coords[1],longitude:coords[0]};}
export function parseDisasters(raw:unknown,centre:{latitude:number;longitude:number},now=new Date()):TravelAlert[]{
 const data=raw as {features?:any[]};if(!Array.isArray(data?.features))throw new Error('Invalid event feed');
 return data.features.flatMap(f=>{const p=f.properties||{},c=f.geometry?.type==='Point'?point(f.geometry.coordinates):undefined;if(!c||!p.eventid||!p.eventtype)return [];
  const report=String(p.todate||p.fromdate||''),age=now.getTime()-Date.parse(report);if(!Number.isFinite(age)||age>7*86400000||age< -86400000||distanceKm(centre,c)>150)return [];
  const level=String(p.alertlevel||'').toLowerCase();if(!['red','orange'].includes(level))return [];
  return [{id:`gdacs-${p.eventtype}-${p.eventid}`,kind:'disaster' as const,title:String(p.name||p.description||`${p.eventtype} event`).slice(0,160),description:`${level} GDACS event near the destination. This is regional screening, not a route-specific warning. Check NDMA and local authorities.`,severity:level==='red'?'avoid' as const:'notice' as const,...c,radiusKm:50,date:todayDate(now),reportedAt:report,source:'GDACS',sourceUrl:`https://www.gdacs.org/report.aspx?eventtype=${encodeURIComponent(String(p.eventtype))}&eventid=${encodeURIComponent(String(p.eventid))}`}];
 });
}
export function parseTraffic(raw:unknown,now=new Date()):TravelAlert[]{
 const data=raw as {incidents?:any[]};if(!Array.isArray(data?.incidents))throw new Error('Invalid incident feed');
 return data.incidents.slice(0,100).flatMap(i=>{const p=i.properties||{},coords=i.geometry?.type==='Point'?[i.geometry.coordinates]:i.geometry?.type==='LineString'?i.geometry.coordinates:[];const c=coords.map(point).find(Boolean);if(!c||!p.id)return [];
  if(p.endTime&&Date.parse(p.endTime)<now.getTime()||p.startTime&&Date.parse(p.startTime)>now.getTime())return [];
  const blocked=[8,11].includes(p.iconCategory);return [{id:'tomtom-'+String(p.id),kind:'traffic' as const,title:String(p.events?.[0]?.description||'Traffic incident').slice(0,160),description:[p.from,p.to].filter(Boolean).join(' → ').slice(0,300)||'Reported road disruption near this point.',severity:blocked?'avoid' as const:'notice' as const,...c,radiusKm:.75,date:todayDate(now),startsAt:p.startTime,endsAt:p.endTime,source:'TomTom',sourceUrl:'https://www.tomtom.com/traffic-index/'}];
 });
}
let disasterCache:{expires:number;raw:unknown}|undefined;
async function disasterReports(centre:{latitude:number;longitude:number},http:typeof fetch){
 try{let raw:unknown;if(http===fetch&&disasterCache&&disasterCache.expires>Date.now())raw=disasterCache.raw;else{const url=new URL('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH');url.searchParams.set('fromdate',dateAt(todayDate(),-7));url.searchParams.set('todate',todayDate());url.searchParams.set('alertlevel','red;orange');url.searchParams.set('pagesize','100');raw=await json(url,http);if(!Array.isArray((raw as any)?.features))throw new Error('Incomplete event feed');if(http===fetch)disasterCache={expires:Date.now()+600000,raw};}
 const alerts=parseDisasters(raw,centre);return {alerts,status:feed('GDACS','partial','Recent regional events within 150 km. Limited global feed; empty results do not confirm absence of a local disaster. Check NDMA SACHET.','https://sachet.ndma.gov.in/')};
 }catch{return {alerts:[] as TravelAlert[],status:feed('GDACS','unavailable','Disaster feed unavailable. Check NDMA SACHET and destination authorities.','https://sachet.ndma.gov.in/')};}
}
async function trafficReports(plan:Itinerary,trip:TripForm,centre:{latitude:number;longitude:number},http:typeof fetch){
 const key=process.env.TOMTOM_API_KEY;if(!key)return {alerts:[] as TravelAlert[],legs:[] as TrafficLeg[],status:feed('TomTom','not-configured','Traffic connection is not configured. Travel times remain estimates.')};
 const today=todayDate(),now=new Date();let failures=0;const legs:TrafficLeg[]=[];let alerts:TravelAlert[]=[];
 // Each daily request contains the actual named stops. The starting point is an approximate destination base.
 const jobs=plan.days.filter(day=>day.date>=today&&day.date<=dateAt(today,7)&&day.activities.some(a=>a.type==='activity'&&a.latitude!==undefined&&a.longitude!==undefined));
 const incidentJob=async()=>{try{const url=new URL('https://api.tomtom.com/traffic/services/5/incidentDetails');url.searchParams.set('key',key);const latSpan=20/111,lngSpan=20/(111*Math.cos(centre.latitude*Math.PI/180));url.searchParams.set('bbox',`${centre.longitude-lngSpan},${centre.latitude-latSpan},${centre.longitude+lngSpan},${centre.latitude+latSpan}`);url.searchParams.set('fields','{incidents{type,geometry{type,coordinates},properties{id,iconCategory,events{description},startTime,endTime,from,to}}}');url.searchParams.set('timeValidityFilter','present');alerts=parseTraffic(await json(url,http));}catch{failures++;}};
 await incidentJob();
 if(!['Mostly walking','Public transport'].includes(trip.localTransport||'')){
  for(let offset=0;offset<jobs.length;offset+=4){await Promise.all(jobs.slice(offset,offset+4).map(async day=>{
   try{const visits=day.activities.filter(a=>a.type==='activity'&&a.latitude!==undefined&&a.longitude!==undefined);const url=new URL(`https://api.tomtom.com/routing/1/calculateRoute/${[centre,...visits].map(p=>`${p.latitude},${p.longitude}`).join(':')}/json`);const firstTransfer=day.activities.find(a=>a.type==='transport'&&a.distanceKm!==undefined);const departure=new Date(`${day.date}T${firstTransfer?.time||'09:00'}:00+05:30`);Object.entries({key,traffic:'true',routeType:'fastest',travelMode:'car',computeTravelTimeFor:'all',routeRepresentation:'summaryOnly',departAt:departure>now?departure.toISOString():'now'}).forEach(([k,v])=>url.searchParams.set(k,v));
    const data=await json(url,http),route=data.routes?.[0];if(!Array.isArray(route?.legs)||route.legs.length!==visits.length)throw new Error('Missing route');
    visits.forEach((visit,i)=>{const s=route.legs[i]?.summary,index=day.activities.findIndex(a=>a.id===visit.id),transfer=day.activities[index-1];if(!s||!Number.isFinite(s.travelTimeInSeconds)||!Number.isFinite(s.lengthInMeters)||transfer?.type!=='transport')return;legs.push({day:day.day,activityId:transfer.id,minutes:Math.ceil(s.travelTimeInSeconds/60)+10,distanceKm:s.lengthInMeters/1000,delayMinutes:Math.max(0,Math.ceil((s.trafficDelayInSeconds||0)/60)),source:day.date===today?'current':'prediction'});});
   }catch{failures++;}
  }));}
 }
 return {alerts,legs,status:feed('TomTom',failures?'partial':'available',`Road incidents checked now. ${legs.length} local car legs estimated with traffic. Future traffic is a model prediction; walking, public transport and intercity routes are not measured.`)};
}
export async function getConditions(trip:TripForm,plan:Itinerary,http:typeof fetch=fetch):Promise<Conditions>{
 const d=destinations.find(d=>d.name===trip.destination)!;
 const result=await Promise.allSettled([getWeather(d.latitude,d.longitude,plan.days.map(d=>d.date),d.name,http),trafficReports(plan,trip,d,http),disasterReports(d,http)]);
 const weather=result[0].status==='fulfilled'?result[0].value:{latitude:d.latitude,longitude:d.longitude,location:d.name,timezone:'Asia/Kolkata',source:'unavailable' as const,daily:[],fetchedAt:stamp(),fallback:false};
 const traffic=result[1].status==='fulfilled'?result[1].value:{alerts:[],legs:[],status:feed('TomTom','unavailable','Traffic information is unavailable.')};
 const disaster=result[2].status==='fulfilled'?result[2].value:{alerts:[],status:feed('GDACS','unavailable','Check local disaster advisories directly.','https://sachet.ndma.gov.in/')};
 return {checkedAt:stamp(),weather,traffic:traffic.status,disasters:disaster.status,alerts:[...traffic.alerts,...disaster.alerts],legs:traffic.legs};
}
