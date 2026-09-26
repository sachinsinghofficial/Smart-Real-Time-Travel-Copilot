'use client';
import {useEffect,useMemo,useState} from 'react';
import type {Itinerary} from '@/lib/itinerary';
import {formatINR} from '@/lib/trip';
import hotels from '@/data/hotels.json';
import restaurants from '@/data/restaurants.json';
import buses from '@/data/buses.json';
import trains from '@/data/trains.json';
import flights from '@/data/flights.json';
import {Hotel,Utensils,BusFront,TrainFront,Plane,CarFront,CheckCircle,Loader2} from 'lucide-react';

type Props={plan:Itinerary;day:number};
type Offer={id:string;name:string;kind:'hotel'|'restaurant'|'vehicle'|'bus'|'train'|'flight';price:number;priceLabel:string;image?:string;description:string;amenities:string[];query?:any;token?:string};

export default function BudgetRecommendations({plan,day}:Props){
 const [selected,setSelected]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState('');
 const [receipt,setReceipt]=useState<any>(null);
 const [error,setError]=useState('');
 const budget=plan.budgetLimit??plan.estimatedCost;
 const nights=Math.max(1,plan.duration-1),rooms=Math.max(1,Math.ceil(plan.travellers/2));
 const dest=plan.destination.trim().toLowerCase().replace(/\s+/g,'-');
 const currentStay=plan.budgetBreakdown?.stay||0,currentFood=plan.days.find(d=>d.day===day)?.activities.find(a=>a.type==='food')?.estimatedCost||0,currentIntercity=plan.budgetBreakdown?.intercityTransport||0;

 const hotelOptions=useMemo(()=>hotels.filter(h=>h.destinationId===dest).map(h=>({...h,total:h.pricePerNight*nights*rooms,projected:plan.estimatedCost-currentStay+h.pricePerNight*nights*rooms})).filter(h=>h.projected<=budget).sort((a,b)=>a.total-b.total).slice(0,6),[dest,nights,rooms,plan.estimatedCost,currentStay,budget]);
 const restaurantOptions=useMemo(()=>restaurants.filter(r=>r.destinationId===dest).map(r=>({...r,total:r.averageCost*plan.travellers,projected:plan.estimatedCost-currentFood+r.averageCost*plan.travellers})).filter(r=>r.projected<=budget).sort((a,b)=>a.total-b.total).slice(0,6),[dest,plan.travellers,plan.estimatedCost,currentFood,budget]);
 const busOptions=useMemo(()=>buses.filter(b=>b.destinationId===dest&&b.from.toLowerCase()===plan.from.toLowerCase()).map(b=>({...b,total:b.pricePerPerson*plan.travellers,projected:plan.estimatedCost-currentIntercity+b.pricePerPerson*plan.travellers})).filter(b=>b.projected<=budget).sort((a,b)=>a.total-b.total).slice(0,4),[dest,plan.from,plan.travellers,plan.estimatedCost,currentIntercity,budget]);
 const trainOptions=useMemo(()=>trains.filter(t=>t.destinationId===dest&&t.from.toLowerCase()===plan.from.toLowerCase()).map(t=>({...t,total:t.pricePerPerson*plan.travellers,projected:plan.estimatedCost-currentIntercity+t.pricePerPerson*plan.travellers})).filter(t=>t.projected<=budget).sort((a,b)=>a.total-b.total).slice(0,4),[dest,plan.from,plan.travellers,plan.estimatedCost,currentIntercity,budget]);
 const flightOptions=useMemo(()=>flights.filter(f=>f.destinationId===dest&&f.from.toLowerCase()===plan.from.toLowerCase()).map(f=>({...f,total:f.pricePerPerson*plan.travellers,projected:plan.estimatedCost-currentIntercity+f.pricePerPerson*plan.travellers})).filter(f=>f.projected<=budget).sort((a,b)=>a.total-b.total).slice(0,4),[dest,plan.from,plan.travellers,plan.estimatedCost,currentIntercity,budget]);

 const bestTransport=flightOptions[0]||trainOptions[0]||busOptions[0];
 // Catalog cards are discovery examples; quotes must be reviewed in Book Travel.
 const book=async(kind:Offer['kind'],id:string)=>{if(!id)return;window.location.href=kind==='restaurant'?'/nearby':`/marketplace?tab=${kind}&destination=${encodeURIComponent(dest)}`;};

 return <section className="panel mt-7" aria-label="TravelSetu booking recommendations">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><p className="eyebrow">Compare inside TravelSetu</p><h2 className="mt-1 text-2xl font-bold">Stay, taste and travel.</h2><p className="mt-2 text-sm muted">Demo estimates below your planning limit of {formatINR(budget)} are shown.</p></div>
   <div className="rounded-xl bg-[#edf5ec] px-4 py-3 text-sm"><span className="muted">Trip estimate</span><strong className="ml-2">{formatINR(plan.estimatedCost)}</strong></div>
  </div>
  {plan.estimatedCost>budget&&<div className="notice mt-4">Your itinerary is {formatINR(plan.estimatedCost-budget)} over budget. Increase the client budget before selecting an option.</div>}
  {error&&<div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
  {receipt&&<div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4"><div className="flex items-center gap-2 font-bold text-[#075b3d]"><CheckCircle size={19}/>Booked on TravelSetu</div><p className="mt-2 text-sm">{receipt.name} · Reference <strong>{receipt.reference}</strong></p><p className="mt-1 text-xs muted">Demo booking confirmed inside the website. No real payment or supplier reservation was made.</p></div>}

  <div className="mt-6 grid gap-5 xl:grid-cols-2">
   <Choice title="Hotels" icon={<Hotel size={20}/>} options={hotelOptions} selected={selected.hotel} setSelected={v=>setSelected(s=>({...s,hotel:v}))} render={(o:any)=>`${o.name} · ${formatINR(o.pricePerNight)}/night · ${formatINR(o.total)} total`} imageKey="image" book={()=>book('hotel',selected.hotel||hotelOptions[0]?.id)} busy={busy.startsWith('hotel')} />
   <Choice title="Cafés & restaurants" icon={<Utensils size={20}/>} options={restaurantOptions} selected={selected.restaurant} setSelected={v=>setSelected(s=>({...s,restaurant:v}))} render={(o:any)=>`${o.name} · ${formatINR(o.averageCost)}/person · ${formatINR(o.total)} group`} imageKey="image" book={()=>book('restaurant',selected.restaurant||restaurantOptions[0]?.id)} busy={busy.startsWith('restaurant')} note="Restaurant choices are estimates; confirm the restaurant directly." />
   <Choice title="Car / local hire" icon={<CarFront size={20}/>} options={plan.estimatedCost<=budget&&plan.estimatedCost-(plan.budgetBreakdown?.localTransport||0)+2400*plan.duration<=budget?[{id:'car-sedan',name:'Sample sedan with driver',rate:2400,total:2400*plan.duration,description:'Demo local hire estimate for the entire trip. Review actual quote and extras.'}]:[]} selected={selected.vehicle} setSelected={v=>setSelected(s=>({...s,vehicle:v}))} render={(o:any)=>`${o.name} · ${formatINR(o.total)} demo trip`} book={()=>book('vehicle',selected.vehicle||'car-sedan')} busy={busy.startsWith('vehicle')} note="Car hire is a demo TravelSetu booking and can be used for local transfers." />
   <Choice title="Intercity travel" icon={flightOptions.length?<Plane size={20}/>:trainOptions.length?<TrainFront size={20}/>:<BusFront size={20}/>} options={[...busOptions.map(o=>({...o,kind:'bus',label:`🚌 ${o.service} · ${formatINR(o.pricePerPerson)}/person · ${formatINR(o.total)} group`})),...trainOptions.map(o=>({...o,kind:'train',label:`🚆 ${o.service} · ${formatINR(o.pricePerPerson)}/person · ${formatINR(o.total)} group`})),...flightOptions.map(o=>({...o,kind:'flight',label:`✈️ ${o.airline} · ${formatINR(o.pricePerPerson)}/person · ${formatINR(o.total)} group`}))]} selected={selected.transport} setSelected={v=>setSelected(s=>({...s,transport:v}))} render={(o:any)=>o.label} book={()=>{const id=selected.transport||bestTransport?.id; const o=[...busOptions,...trainOptions,...flightOptions].find(x=>x.id===id); return book(o&&'airline' in o?'flight':o&&'operator' in o&&o.operator.includes('Rail')?'train':'bus',id)}} busy={busy.startsWith('bus')||busy.startsWith('train')||busy.startsWith('flight')} note="Low budget favors bus/train. A flight is shown only when it fits the client budget." />
  </div>
  <p className="mt-5 text-xs muted">Hotel and café photos come from the demo catalog. Prices and availability are demo data unless a supplier integration is connected.</p>
 </section>;
}

function Choice({title,icon,options,selected,setSelected,render,imageKey,book,busy,note}:{title:string;icon:React.ReactNode;options:any[];selected?:string;setSelected:(v:string)=>void;render:(o:any)=>string;imageKey?:string;book:()=>void;busy:boolean;note?:string}){
 const current=options.find(o=>o.id===selected)||options[0];
 return <section className="rounded-2xl border p-4">
  <div className="flex items-center gap-2 font-semibold">{icon}{title}</div>
  {current?.[imageKey||'image']&&<img src={current[imageKey||'image']} alt={`${title} recommendation`} className="mt-4 h-40 w-full rounded-xl object-cover" loading="lazy"/>}
  {options.length?<><select className="input" value={selected||current.id} onChange={e=>setSelected(e.target.value)}>{options.map(o=><option key={o.id} value={o.id}>{render(o)}</option>)}</select><p className="mt-2 text-xs muted">{current.description||'Budget-safe TravelSetu recommendation.'}</p><button className="btn-primary mt-4" disabled={busy} onClick={book}>{busy?<><Loader2 size={16} className="animate-spin"/>Booking…</>:<>Compare & review</>}</button>{note&&<p className="mt-2 text-xs muted">{note}</p>}</>:<div className="notice mt-3">No option fits the current budget. Increase the budget to unlock more choices.</div>}
 </section>;
}
