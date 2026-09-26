'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ChevronLeft,ChevronRight,Utensils} from 'lucide-react';
import ReferencePhoto from './ReferencePhoto';
import destinations from '@/data/destinations.json';
const dishes=[{name:'Biryani',filter:'biryani',rect:[174,340,384,281]},{name:'Meals & thalis',filter:'indian',rect:[600,340,384,281]},{name:'Regional curries',filter:'regional',rect:[1025,340,384,281]},{name:'Wraps & quick bites',filter:'wrap',rect:[1450,340,380,281]}];
const courses=['All','Main course','Snacks','Desserts','Beverages'];
export default function CuisineDiscovery({destination,onChoose,compact=false}:{destination?:string;onChoose?:(q:string)=>void;compact?:boolean}){
 const [course,setCourse]=useState('All'),[offset,setOffset]=useState(0);const d=destinations.find(d=>d.name===destination);
 const foods=d?.localFood||['Regional thalis','Street snacks','Local sweets','Chai & conversation'];
 const shown=course==='Snacks'?[dishes[3]]:course==='Main course'?dishes.slice(0,3):course==='Desserts'||course==='Beverages'?[]:dishes;
 function choose(q:string){if(onChoose)onChoose(q);else window.location.href='/nearby?cuisine='+encodeURIComponent(q);}
 return <section className={'cuisine-discovery '+(compact?'compact':'')} id="cuisines"><div className="section-heading-row"><div><p className="eyebrow"><Utensils size={14}/> FOLLOW YOUR APPETITE</p><h2 className="section-title">{d?`A taste of ${d.name}.`:'Your next trip, served locally.'}</h2><p className="text-sm mt-2">{d?'Explore regional ideas, then find a place near your route.':'Popular cuisines to inspire your next stop.'}</p></div><Link href="/nearby" className="cuisine-all">Food & stays <ArrowRight size={16}/></Link></div>
 {!compact&&<div className="cuisine-tabs">{courses.map(c=><button key={c} aria-pressed={course===c} onClick={()=>setCourse(c)}>{c}</button>)}</div>}
 <div className="cuisine-grid">{shown.map((_,i)=>{const item=shown[(i+offset)%shown.length];return <button key={item.name} className="cuisine-card" onClick={()=>choose(item.filter)}><ReferencePhoto sheet="cuisines" rect={item.rect as [number,number,number,number]} alt={item.name}/><span><strong>{item.name}</strong><ArrowRight size={20}/></span></button>;})}{!shown.length&&<button className="course-feature" onClick={()=>choose(course==='Beverages'?'tea':'dessert')}><ReferencePhoto sheet="food" rect={[1080,980,680,375]} alt="Local sweets and tea"/><span><strong>{course==='Beverages'?'Chai, coffee & slow afternoons':'Something sweet, made locally'}</strong><small>Find matching mapped places →</small></span></button>}</div>
 <div className="cuisine-bottom"><p>{d?`Local food ideas: ${foods.slice(0,3).join(' · ')}`:'Photographs are inspiration, not live menus or confirmed restaurant offers.'}</p>{shown.length>1&&<div className="flex gap-2"><button aria-label="Previous cuisines" onClick={()=>setOffset((offset+shown.length-1)%shown.length)}><ChevronLeft size={18}/></button><button aria-label="Next cuisines" onClick={()=>setOffset((offset+1)%shown.length)}><ChevronRight size={18}/></button></div>}</div>
 </section>;
}
