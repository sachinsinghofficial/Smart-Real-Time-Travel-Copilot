import {NextResponse} from 'next/server';
import destinations from '@/data/destinations.json';
import {parseOsmElements} from '@/lib/map';
import {distanceKm} from '@/lib/itinerary';
const cache=new Map<string,{expires:number;data:object}>();
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,d=destinations.find(x=>x.id===p.get('destination')),device=p.has('lat')||p.has('lng');
 const lat=device?Number(p.get('lat')):d?.latitude,lng=device?Number(p.get('lng')):d?.longitude,km=Number(p.get('radius')||5),emergency=p.get('services')==='emergency';
 if(device&&(!p.get('lat')?.trim()||!p.get('lng')?.trim())||lat===undefined||lng===undefined||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||!Number.isFinite(km)||km<1||km>10)return NextResponse.json({error:'Choose a destination or valid latitude/longitude, and a radius from 1–10 km.'},{status:400});
 // No shared cache for precise device coordinates; response also bypasses browser/CDN caches.
 const headers={'Cache-Control':'private, no-store'},key=`${d?.id}:${km}:${emergency}`;
 const cached=!device?cache.get(key):undefined;if(cached&&cached.expires>Date.now())return NextResponse.json(cached.data,{headers});
 try{const around=`around:${km*1000},${lat},${lng}`;
 const query=emergency?`[out:json][timeout:15];(nwr(${around})["amenity"="hospital"];);out center 100;(nwr(${around})["amenity"="police"];);out center 100;`:`[out:json][timeout:15];(nwr(${around})["amenity"~"^(restaurant|cafe|fast_food|hospital|clinic|pharmacy|police|atm|toilets|parking|fuel|bus_station|taxi)$"];nwr(${around})["tourism"~"^(hotel|hostel|guest_house|attraction|museum|viewpoint)$"];nwr(${around})["railway"="station"];);out center 250;`;
 const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(20000),cache:'no-store'});if(!r.ok)throw new Error('Nearby service unavailable');const result=await r.json();if(result.remark||!Array.isArray(result.elements))throw new Error('Nearby search incomplete');
 const points=parseOsmElements(result.elements).filter(x=>distanceKm({latitude:lat,longitude:lng},{latitude:x.lat,longitude:x.lng})<=km).sort((a,b)=>distanceKm({latitude:lat,longitude:lng},{latitude:a.lat,longitude:a.lng})-distanceKm({latitude:lat,longitude:lng},{latitude:b.lat,longitude:b.lng}));
 const data={points,fetchedAt:new Date().toISOString(),center:{latitude:lat,longitude:lng},radiusKm:km,source:'openstreetmap',message:'Community-mapped places. Straight-line distances; confirm hours and emergency services directly. Results may be incomplete.'};
 if(!device){if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+600000,data});}return NextResponse.json(data,{headers});
 }catch{return NextResponse.json({points:[],source:'unavailable',error:'Nearby places could not be loaded. Try again when connected. No hospital or police locations have been invented.'},{status:503,headers});}
}
