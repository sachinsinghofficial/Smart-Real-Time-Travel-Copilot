'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ArrowRight,MapPin,CalendarDays,Wallet,CloudSun,Route,Compass,Sparkles} from 'lucide-react';
import destinations from '@/data/destinations.json';
import {todayDate,formatINR} from '@/lib/trip';
import type {Itinerary} from '@/lib/itinerary';
import DiscoveryHub,{MoodTiles} from './components/DiscoveryHub';
import CuisineDiscovery from './components/CuisineDiscovery';
export default function Home(){const [date,setDate]=useState(''),[plan,setPlan]=useState<Itinerary|null>(null);useEffect(()=>{setDate(todayDate());try{setPlan(JSON.parse(localStorage.getItem('travelsetu_itinerary')||'null'));}catch{}},[]);
 return <main className="page-shell discovery-home"><div className="container-page"><div className="page-head"><div><p className="eyebrow">YOUR TRAVEL COMPANION</p><h1 className="page-title">A little closer to your next adventure.</h1></div><Link className="btn-secondary" href={plan?'/itinerary':'/explore?discover=1'}>{plan?'Continue my trip':'Help me choose'}<ArrowRight size={16}/></Link></div>
 <section className="journey-hero"><div className="journey-hero-copy"><span className="hero-kicker"><Compass size={15}/> EXTRAORDINARY INDIA. YOUR WAY.</span><h2>Collect moments.<br/><em>Find your India.</em></h2><p>Mountain mornings. Local flavours. Roads you’ll remember.</p><Link href="/explore" className="hero-button">Find my next escape <ArrowRight size={17}/></Link><div className="hero-footnote"><span>01 — THE HIMALAYAS</span><span>Go a little further.</span></div></div></section>
 <form action="/plan-trip" className="dashboard-planner"><label><span><MapPin size={15}/>Where to?</span><select name="destination" defaultValue={plan?.destination||'Manali'}>{destinations.map(d=><option key={d.id}>{d.name}</option>)}</select></label><label><span><CalendarDays size={15}/>When?</span><input type="date" name="startDate" min={date} value={date} onChange={e=>setDate(e.target.value)} required/></label><label><span><Wallet size={15}/>Group budget</span><input aria-label="Group budget in rupees" type="number" name="budget" min={1000} max={10000000} defaultValue={20000} required/></label><button className="btn-primary"><Sparkles size={17}/>Build my trip</button></form>
 {plan&&<section className="trip-ribbon"><div><span className="eyebrow">YOUR NEXT CHAPTER</span><h2>{plan.destination}</h2><p>{plan.startDate} — {plan.endDate}</p></div><div><small>Travelling together</small><strong>{plan.travellers} people</strong></div><div><small>Planning estimate</small><strong>{formatINR(plan.estimatedCost)}</strong></div><Link href="/itinerary" className="btn-primary">Open itinerary <ArrowRight size={17}/></Link></section>}
 <section className="discovery-section"><div className="section-heading-row"><div><p className="eyebrow">START WITH A FEELING</p><h2 className="section-title">What kind of day are you dreaming of?</h2></div><Link className="text-link" href="/explore">Explore India <ArrowRight size={16}/></Link></div><MoodTiles/></section>
 <DiscoveryHub compact/>
 <CuisineDiscovery destination={plan?.destination} compact/>
 <section className="discovery-section"><div className="section-heading-row"><div><p className="eyebrow">A LITTLE LESS GUESSWORK</p><h2 className="section-title">Travel light. Stay a step ahead.</h2></div></div><div className="utility-grid">{[{title:'Weather, at a glance',text:'Hourly skies and the days ahead.',href:'/weather',Icon:CloudSun,tone:'blue'},{title:'Your journey, on the map',text:'Find stops. Follow your route.',href:'/trip-map',Icon:Route,tone:'mint'},{title:'The India notebook',text:'Culture, landscapes and local stories.',href:'/explore#india-notebook',Icon:Compass,tone:'peach'}].map(({title,text,href,Icon,tone})=><Link key={href} className={'utility-card '+tone} href={href}><Icon size={28} strokeWidth={1.5}/><h3>{title}</h3><p>{text}</p><ArrowRight size={18}/></Link>)}</div></section>
 </div></main>;
}
