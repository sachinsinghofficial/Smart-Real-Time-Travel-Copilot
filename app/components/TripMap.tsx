'use client';

import {useEffect,useRef,useState} from 'react';
import type {MapPoint,MapCategory} from '@/lib/map';
import {trackDistance,type TrackPoint,type TripTrack} from '@/lib/tracking';

export type {MapPoint,MapCategory} from '@/lib/map';

const colors:Record<MapCategory,string>={
 destination:'#075b3d',hotel:'#7c4dff',restaurant:'#bd7400',attraction:'#19834a',
 hospital:'#c93c53',pharmacy:'#c93c53',police:'#334155',atm:'#334155',toilets:'#334155',
 parking:'#475569',fuel:'#475569',transport:'#0f766e'
};

type TravelMode='DRIVING'|'TWO_WHEELER'|'TRANSIT'|'WALKING'|'BICYCLING';

let googleMapsPromise:Promise<any>|null=null;
function loadGoogleMaps(){
 const key=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
 if(!key) return Promise.reject(new Error('Google Maps API key is missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local.'));
 if(typeof window==='undefined') return Promise.reject(new Error('Google Maps can only load in the browser.'));
 if((window as any).google?.maps) return Promise.resolve((window as any).google.maps);
 if(googleMapsPromise) return googleMapsPromise;
 googleMapsPromise=new Promise((resolve,reject)=>{
   const existing=document.querySelector('script[data-travelsetu-google-maps]');
   if(existing){
     existing.addEventListener('load',()=>resolve((window as any).google.maps));
     existing.addEventListener('error',()=>reject(new Error('Google Maps could not load.')));
     return;
   }
   const script=document.createElement('script');
   script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=places`;
   script.async=true;script.defer=true;script.dataset.travelsetuGoogleMaps='true';
   script.onload=()=>resolve((window as any).google.maps);
   script.onerror=()=>reject(new Error('Google Maps could not load. Check the API key, billing and enabled APIs.'));
   document.head.appendChild(script);
 });
 return googleMapsPromise;
}

function pointToLatLng(p:MapPoint|TrackPoint){return {lat:'lat' in p?p.lat:p.latitude,lng:'lng' in p?p.lng:p.longitude};}

export default function TripMap({
 center,points,route,selectedId,onSelect,position,track,tripName='My TravelSetu trip',follow=false
}:{center:[number,number];points:MapPoint[];route:MapPoint[];selectedId?:string;onSelect?:(p:MapPoint)=>void;position?:TrackPoint|null;track?:TripTrack;tripName?:string;follow?:boolean}){
 const container=useRef<HTMLDivElement>(null);
 const map=useRef<any>(null);
 const markers=useRef<any[]>([]);
 const info=useRef<any>(null);
 const routePolyline=useRef<any>(null);
 const liveMarker=useRef<any>(null);
 const onSelectRef=useRef(onSelect);
 const [ready,setReady]=useState(false);
 const [mode,setMode]=useState<TravelMode>('DRIVING');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('Google Maps is ready for in-app navigation.');
 const [search,setSearch]=useState('');
 const [searchBusy,setSearchBusy]=useState(false);
 const [searchResults,setSearchResults]=useState<any[]>([]);
 const [steps,setSteps]=useState<string[]>([]);
 const [routeStats,setRouteStats]=useState<{distance:string;duration:string}|null>(null);

 useEffect(()=>{onSelectRef.current=onSelect;},[onSelect]);

 useEffect(()=>{
   let disposed=false;
   loadGoogleMaps().then(async (g:any)=>{
     if(disposed||!container.current)return;
     const {Map}=await g.importLibrary('maps');
     map.current=new Map(container.current,{
       center:{lat:center[0],lng:center[1]},
       zoom:11,
       mapTypeControl:false,
       streetViewControl:false,
       fullscreenControl:true,
       clickableIcons:true,
       gestureHandling:'greedy'
     });
     info.current=new g.InfoWindow();
     setReady(true);
   }).catch((e:Error)=>setMessage(e.message));
   return()=>{disposed=true;markers.current.forEach(m=>m.setMap(null));routePolyline.current?.setMap(null);liveMarker.current?.setMap(null);};
   // map is initialized once; subsequent props update map state.
   // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 useEffect(()=>{
   if(!map.current||!ready)return;
   markers.current.forEach(m=>m.setMap(null));
   markers.current=points.map(p=>{
     const marker=new (window as any).google.maps.Marker({
       map:map.current,position:{lat:p.lat,lng:p.lng},title:p.name,
       label:{text:p.routeOrder?String(p.routeOrder):p.category==='hotel'?'H':p.category==='restaurant'?'F':p.category==='hospital'?'+':p.category==='police'?'P':'•',color:'#fff',fontWeight:'700'},
       icon:{path:(window as any).google.maps.SymbolPath.CIRCLE,scale:16,fillColor:colors[p.category]||'#075b3d',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}
     });
     marker.addListener('click',()=>{
       onSelectRef.current?.(p);
       info.current?.setContent(`<div style="min-width:180px"><strong>${escapeHtml(p.name)}</strong><div style="margin-top:5px;color:#52675c">${escapeHtml(p.subtitle||'')}</div></div>`);
       info.current?.open({map:map.current,anchor:marker});
     });
     return marker;
   });
 },[points,ready]);

 useEffect(()=>{
   if(!map.current||!ready)return;
   if(route.length){
     const bounds=new (window as any).google.maps.LatLngBounds();
     route.forEach(p=>bounds.extend({lat:p.lat,lng:p.lng}));
     map.current.fitBounds(bounds,{top:70,bottom:90,left:40,right:40});
   }else{
     map.current.setCenter({lat:center[0],lng:center[1]});
     map.current.setZoom(11);
   }
 },[center,route,ready]);

 const selectedPoint=points.find(p=>p.id===selectedId);
 useEffect(()=>{
   if(selectedPoint&&map.current&&ready){
     map.current.panTo({lat:selectedPoint.lat,lng:selectedPoint.lng});
     map.current.setZoom(14);
   }
 },[selectedId,selectedPoint?.lat,selectedPoint?.lng,ready]);

 useEffect(()=>{
   if(!map.current||!ready)return;
   if(liveMarker.current)liveMarker.current.setMap(null);
   if(position){
     liveMarker.current=new (window as any).google.maps.Marker({
       map:map.current,position:{lat:position.latitude,lng:position.longitude},
       title:'Your current location',
       icon:{path:(window as any).google.maps.SymbolPath.CIRCLE,scale:9,fillColor:'#2563eb',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}
     });
     if(follow)map.current.panTo({lat:position.latitude,lng:position.longitude});
   }
 },[position,follow,ready]);

 async function calculateRoute(){
   if(!map.current||!ready)return;
   const destination=selectedPoint||route[route.length-1];
   if(!destination){setMessage('Select a place or itinerary stop first.');return;}
   const origin=position?{lat:position.latitude,lng:position.longitude}:route[0]?{lat:route[0].lat,lng:route[0].lng}:{lat:center[0],lng:center[1]};
   if(Math.abs(origin.lat-destination.lat)<0.00001&&Math.abs(origin.lng-destination.lng)<0.00001){setMessage('You are already at this location.');return;}
   setBusy(true);setSteps([]);setRouteStats(null);
   try{
     const {Route}=await (window as any).google.maps.importLibrary('routes');
     const request:any={
       origin,destination:{lat:destination.lat,lng:destination.lng},
       travelMode:mode,
       routingPreference:mode==='DRIVING'||mode==='TWO_WHEELER'?'TRAFFIC_AWARE':'TRAFFIC_UNAWARE',
       fields:['path','distanceMeters','durationMillis','localizedValues','legs.steps.instructions','legs.steps.distanceMeters','legs.steps.durationMillis'],
       polylineQuality:'OVERVIEW'
     };
     if(mode==='DRIVING'||mode==='TWO_WHEELER')request.computeAlternativeRoutes=true;
     const result=await Route.computeRoutes(request);
     const r=result.routes?.[0];
     if(!r)throw new Error('No route was found for this travel mode.');
     routePolyline.current?.setMap(null);
     const polylines=r.createPolylines?.({polylineOptions:{strokeColor:'#075b3d',strokeOpacity:.9,strokeWeight:6}});
     if(polylines?.length){polylines.forEach((p:any)=>p.setMap(map.current));routePolyline.current=polylines[0];}
     const distance=Number(r.distanceMeters||0);
     const duration=Number(r.durationMillis||0);
     setRouteStats({distance:distance?`${(distance/1000).toFixed(1)} km`:'—',duration:duration?formatDuration(duration):'—'});
     const stepList=(r.legs||[]).flatMap((leg:any)=>leg.steps||[]).map((s:any)=>stripHtml(s.instructions||'')).filter(Boolean).slice(0,30);
     setSteps(stepList);
     setMessage(`${destination.name}: ${distance?`${(distance/1000).toFixed(1)} km`:''} ${duration?`· ${formatDuration(duration)}`:''} · ${modeLabel(mode)}`);
     const bounds=new (window as any).google.maps.LatLngBounds();
     if(r.path?.length)r.path.forEach((p:any)=>bounds.extend(p));
     else{bounds.extend(origin);bounds.extend({lat:destination.lat,lng:destination.lng});}
     map.current.fitBounds(bounds,{top:80,bottom:180,left:40,right:40});
   }catch(e){setMessage(e instanceof Error?e.message:'Google route calculation failed.');}
   finally{setBusy(false);}
 }

 async function searchPlaces(){
   const text=search.trim();
   if(!text||!map.current||!ready)return;
   setSearchBusy(true);setSearchResults([]);
   try{
     const {Place}=await (window as any).google.maps.importLibrary('places');
     const {places}=await Place.searchByText({
       textQuery:text,
       fields:['id','displayName','formattedAddress','location','rating','userRatingCount'],
       locationBias:map.current.getCenter(),
       language:'en-IN',region:'IN',maxResultCount:8
     });
     setSearchResults(places||[]);
     if(places?.length){
       const bounds=new (window as any).google.maps.LatLngBounds();
       places.forEach((p:any)=>{if(p.location)bounds.extend(p.location);});
       map.current.fitBounds(bounds,{top:90,bottom:120,left:30,right:30});
     }else setMessage('No Google Places matched that search.');
   }catch(e){setMessage(e instanceof Error?e.message:'Google Places search failed.');}
   finally{setSearchBusy(false);}
 }

 function focusPlace(place:any){
   if(!place?.location)return;
   map.current.panTo(place.location);map.current.setZoom(16);
   info.current?.setContent(`<div style="min-width:220px"><strong>${escapeHtml(place.displayName||'Place')}</strong><div style="margin-top:5px;color:#52675c">${escapeHtml(place.formattedAddress||'')}</div>${place.rating?`<div style="margin-top:5px">★ ${place.rating}${place.userRatingCount?` (${place.userRatingCount})`:''}</div>`:''}</div>`);
   info.current?.open({map:map.current,position:place.location});
 }

 function fitRecorded(){
   if(!track?.points.length||!map.current)return;
   const bounds=new (window as any).google.maps.LatLngBounds();
   track.points.forEach(p=>bounds.extend({lat:p.latitude,lng:p.longitude}));
   map.current.fitBounds(bounds,{top:70,bottom:70,left:30,right:30});
 }

 return <div>
   <div className="relative overflow-hidden rounded-xl border bg-slate-100">
     <div ref={container} className="h-[600px] w-full"/>
     {ready&&<div className="absolute left-3 right-3 top-3 z-10 flex flex-col gap-2 md:left-5 md:right-auto md:w-[380px]">
       <form className="flex rounded-xl bg-white p-2 shadow-lg" onSubmit={e=>{e.preventDefault();searchPlaces();}}>
         <input className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm outline-none" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search places, hotels, cafés..."/>
         <button className="btn-primary px-4" disabled={searchBusy}>{searchBusy?'…':'Search'}</button>
       </form>
       {searchResults.length>0&&<div className="max-h-64 overflow-auto rounded-xl bg-white shadow-lg">{searchResults.map((p:any)=><button key={p.id} type="button" className="block w-full border-b px-4 py-3 text-left text-sm hover:bg-[#edf5ec]" onClick={()=>focusPlace(p)}><strong>{p.displayName}</strong><span className="mt-1 block text-xs muted">{p.formattedAddress||'Address not available'}{p.rating?` · ★ ${p.rating}`:''}</span></button>)}</div>}
     </div>}
     <div className="absolute bottom-3 left-3 right-3 z-10 rounded-xl bg-white/95 p-3 shadow text-xs">{message}</div>
   </div>
   <div className="mt-3 flex flex-wrap items-center gap-2">
     <select className="input w-auto" value={mode} onChange={e=>setMode(e.target.value as TravelMode)}>
       <option value="DRIVING">🚗 Driving</option><option value="TWO_WHEELER">🏍 Two-wheeler</option>
       <option value="TRANSIT">🚌 Transit</option><option value="WALKING">🚶 Walking</option><option value="BICYCLING">🚲 Cycling</option>
     </select>
     <button className="btn-primary" disabled={!ready||busy||(!selectedPoint&&!route.length)} onClick={calculateRoute}>{busy?'Finding route…':'Navigate inside app'}</button>
     <button className="btn-secondary" disabled={!track?.points.length} onClick={fitRecorded}>Fit recorded route</button>
   </div>
   {routeStats&&<div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#edf5ec] p-3 text-sm"><span className="muted">Distance</span><strong className="ml-2">{routeStats.distance}</strong></div><div className="rounded-xl bg-[#edf5ec] p-3 text-sm"><span className="muted">Estimated time</span><strong className="ml-2">{routeStats.duration}</strong></div></div>}
   {steps.length>0&&<details open className="quiet-details mt-3"><summary className="font-semibold">Turn-by-turn directions</summary><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">{steps.map((s,i)=><li key={i}>{s}</li>)}</ol></details>}
   <p className="mt-2 text-xs muted">Powered by Google Maps. Navigation stays inside TravelSetu; no Google Maps page is opened.</p>
 </div>;
}

function modeLabel(m:TravelMode){return m==='DRIVING'?'driving':m==='TWO_WHEELER'?'two-wheeler':m==='TRANSIT'?'transit':m==='WALKING'?'walking':'cycling';}
function formatDuration(ms:number){const mins=Math.round(ms/60000);return mins<60?`${mins} min`:`${Math.floor(mins/60)} hr ${mins%60} min`;}
function stripHtml(s:string){return s.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ');}
function escapeHtml(s:string){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}
