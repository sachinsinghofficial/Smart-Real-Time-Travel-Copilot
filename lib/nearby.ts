import destinations from '../data/destinations.json';
import type { Itinerary } from './itinerary';
import { distanceKm } from './itinerary';
import type { TripForm } from '../types/travel';
import type { NearbyPlace, NearbyResult } from './nearby-types';
import { localAffinity } from './local';
export function planAnchors(plan:Itinerary){const destination=destinations.find(d=>d.name===plan.destination)!;const seen=new Set<string>();const anchors:{id:string;name:string;latitude:number;longitude:number;day:number}[]=[];
 for(const day of plan.days)for(const a of day.activities)if(a.type==='activity'&&a.latitude!==undefined&&a.longitude!==undefined&&!seen.has(a.placeId||a.id)){seen.add(a.placeId||a.id);anchors.push({id:a.placeId||a.id,name:a.name,latitude:a.latitude,longitude:a.longitude,day:day.day});}
 return [...anchors,{id:'destination-base',name:`${destination.name} centre (approximate base)`,latitude:destination.latitude,longitude:destination.longitude,day:0}];
}
export function rankNearby(elements:unknown,plan:Itinerary,trip:TripForm):NearbyPlace[]{
 if(!Array.isArray(elements))throw new Error('Invalid nearby response');const anchors=planAnchors(plan);const radius=trip.nearbyRadiusKm||3;const unique=new Map<string,NearbyPlace>();
 for(const e of elements.slice(0,700)){const t=e?.tags||{},latitude=e?.lat??e?.center?.lat,longitude=e?.lon??e?.center?.lon;if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180||!Number.isInteger(e.id)||!['node','way','relation'].includes(e.type)||!(t['name:en']||t.name))continue;
  const kind:NearbyPlace['kind']=['hotel','hostel','guest_house','motel','apartment'].includes(t.tourism)?'hotel':['restaurant','cafe','fast_food','food_court'].includes(t.amenity)?'restaurant':['bus_station','taxi','car_rental','bicycle_rental'].includes(t.amenity)||t.railway==='station'?'transport':'experience';
  const distances=anchors.map(a=>({...a,km:distanceKm(a,{latitude,longitude})})).sort((a,b)=>a.km-b.km);const closest=distances[0];if(!closest||closest.km>radius)continue;
  const cuisine=typeof t.cuisine==='string'?t.cuisine.slice(0,120):undefined;
  const localMatch=kind==='experience'?localAffinity(String(t.name))||['marketplace','arts_centre'].includes(t.amenity):kind==='restaurant'&&!!cuisine&&/regional|indian|himachali|garhwali|kumaoni|rajasthani|goan|kerala|bengali|punjabi|gujarati|assamese|tamil|kashmiri|sikkimese|tibetan|maharashtrian|south_indian|north_indian/i.test(cuisine);
  const id=`osm-${e.type}-${e.id}`;unique.set(id,{id,name:String(t['name:en']||t.name).slice(0,200),kind,latitude,longitude,source:'openstreetmap',sourceUrl:`https://www.openstreetmap.org/${e.type}/${e.id}`,distanceKm:Math.round(closest.km*100)/100,nearStop:closest.name,nearStopId:closest.id,dayNumbers:[...new Set(distances.filter(a=>a.day&&a.km<=radius).map(a=>a.day))],cuisine,vegetarian:t['diet:vegetarian'],vegan:t['diet:vegan'],brand:typeof t.brand==='string'?t.brand.slice(0,120):undefined,openingHours:typeof t.opening_hours==='string'?t.opening_hours.slice(0,300):undefined,phone:typeof(t.phone||t['contact:phone'])==='string'?String(t.phone||t['contact:phone']).slice(0,80):undefined,wheelchair:t.wheelchair,localMatch,matchReason:localMatch?'Regional cuisine or neighbourhood experience tag; ownership is unverified.':'Close to a planned stop; local ownership and food suitability are unverified.'});
 }
 return [...unique.values()].sort((a,b)=>(trip.experienceMode==='local'?Number(b.localMatch)-Number(a.localMatch):0)||a.distanceKm-b.distanceKm).slice(0,160);
}
const cache=new Map<string,{expires:number;elements:unknown}>();
export async function getNearby(plan:Itinerary,trip:TripForm,http:typeof fetch=fetch):Promise<NearbyResult>{
 const anchors=planAnchors(plan).slice(0,9),radius=Math.max(1,Math.min(10,trip.nearbyRadiusKm||3));const key=anchors.map(a=>a.id).sort().join(':')+':'+radius;
 try{let elements:unknown;const existing=cache.get(key);if(http===fetch&&existing&&existing.expires>Date.now())elements=existing.elements;else{
  const locations=anchors.map(a=>`around:${radius*1000},${a.latitude},${a.longitude}`);
  const group=(filter:string,limit:number)=>`(${locations.map(l=>`nwr(${l})${filter};`).join('')});out center ${limit};`;
  const query='[out:json][timeout:12];'+group('["tourism"~"^(hotel|hostel|guest_house|motel|apartment)$"]',150)+group('["amenity"~"^(restaurant|cafe|fast_food|food_court)$"]',220)+group('["amenity"~"^(marketplace|arts_centre|bus_station|taxi|car_rental|bicycle_rental)$"]',100);
  const r=await http('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(16000),cache:'no-store'});if(!r.ok)throw new Error('Nearby unavailable');const body=await r.json();if(body.remark||!Array.isArray(body.elements))throw new Error('Incomplete nearby search');elements=body.elements;if(http===fetch){if(cache.size>=50)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+600000,elements});}
 }
 const places=rankNearby(elements,plan,trip);return {places,status:'partial',checkedAt:new Date().toISOString(),radiusKm:radius,message:'OpenStreetMap listings near named stops and the approximate destination base. Distances are straight-line, not road distances. Limited results; verify hours, dietary needs and availability directly.'};
 }catch{return {places:[],status:'unavailable',checkedAt:new Date().toISOString(),radiusKm:radius,message:'Nearby listings could not be loaded. No hotel or restaurant locations have been invented. Try refreshing nearby places.'};}
}
export function attachNearby(plan:Itinerary,result:NearbyResult):Itinerary{
 const anchors=planAnchors(plan);result={...result,places:result.places.flatMap(p=>{const nearest=anchors.map(a=>({...a,km:distanceKm(a,p)})).sort((a,b)=>a.km-b.km)[0];return nearest&&nearest.km<=result.radiusKm?[{...p,distanceKm:Math.round(nearest.km*100)/100,nearStop:nearest.name,nearStopId:nearest.id,dayNumbers:anchors.filter(a=>a.day&&distanceKm(a,p)<=result.radiusKm).map(a=>a.day)}]:[];})};plan.nearby=result;const d=destinations.find(d=>d.name===plan.destination)!;
 for(const day of plan.days){let anchor={latitude:d.latitude,longitude:d.longitude};for(const a of day.activities){if(a.latitude!==undefined&&a.longitude!==undefined)anchor={latitude:a.latitude,longitude:a.longitude};if(a.type==='food'){a.nearbyPlaceIds=result.places.filter(p=>p.kind==='restaurant'&&distanceKm(anchor,p)<=result.radiusKm).slice(0,3).map(p=>p.id);}}}
 return plan;
}
