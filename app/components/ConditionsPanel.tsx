'use client';
import {rememberItinerary} from '@/lib/travel-store';
import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Route, ShieldAlert, CloudSun } from 'lucide-react';
import { recalculateItinerary, type Itinerary } from '@/lib/itinerary';
import { defaultTrip } from '@/lib/trip';
import { minutes, timeLabel } from '@/lib/trip-validation';
export default function ConditionsPanel({itinerary,onUpdate}:{itinerary:Itinerary;onUpdate:(plan:Itinerary)=>void}){
 const [auto,setAuto]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const running=useRef(false);
 const conditions=itinerary.conditions;
 useEffect(()=>{try{setAuto(JSON.parse(localStorage.getItem('travelsetu_trip')||'{}').autoAdjust!==false);}catch{}},[]);
 function toggle(value:boolean){setAuto(value);try{for(const key of ['travelsetu_trip','travelsetu_trip_draft']){const old=JSON.parse(localStorage.getItem(key)||'{}');localStorage.setItem(key,JSON.stringify({...old,autoAdjust:value}));}}catch{setMessage('The preference could not be saved in this browser.');}}
 function simulateDisruption(){
  if(running.current)return;
  const demo=structuredClone(itinerary);
  const base=structuredClone(itinerary.baselineDays||itinerary.days);
  const changes=[] as NonNullable<Itinerary['changes']>;
  demo.baselineDays=base;
  let changed=false;
  for(let di=0;di<demo.days.length&&!changed;di++){
   const day=demo.days[di];
   const idx=day.activities.findIndex(a=>a.type==='activity');
   if(idx<0)continue;
   const a=day.activities[idx];
   const start=minutes(a.time);
   const newStart=Math.min(start+60, 19*60);
   const newEnd=newStart+a.durationMinutes;
   const before=`${a.name} · ${a.time}–${a.endTime||timeLabel(start+a.durationMinutes)}`;
   const after=`${a.name} · ${timeLabel(newStart)}–${timeLabel(newEnd)}`;
   day.activities[idx]={...a,time:timeLabel(newStart),endTime:timeLabel(newEnd),adaptationReason:'Demo disruption: heavy rain was detected, so the stop was moved later to create a safer weather window.',safety:'CAUTION'};
   const next=day.activities[idx+1];
   if(next?.type==='transport'){
    day.activities[idx+1]={...next,time:timeLabel(Math.min(newEnd+15, 23*60)),endTime:timeLabel(Math.min(newEnd+15+next.durationMinutes, 23*60)),adaptationReason:'Transfer shifted with the replanned activity.'};
   }
   changes.push({day:day.day,date:day.date,activityId:a.id,before,after,reason:'Simulated heavy rain. TravelSetu created a safer timing window without changing any booking.',source:'TravelSetu Demo'});
   day.conditionsSummary='Demo mode: heavy rain detected. The itinerary was automatically adjusted to demonstrate dynamic replanning.';
   changed=true;
  }
  if(!changed){setMessage('No activity was available to simulate a disruption. Generate a fuller itinerary first.');return;}
  demo.changes=changes;demo.changesApplied=true;demo.adjustedAt=new Date().toISOString();demo.warnings=[...new Set([...(demo.warnings||[]),'Demo replanning is simulated for presentation purposes and is not a real weather or safety alert.'])];
  const updated=recalculateItinerary(demo);
  onUpdate(updated);
  setMessage('Demo disruption applied: a simulated heavy-rain event moved an activity and its transfer.');
  try{rememberItinerary(updated);}catch{}
 }

 async function refresh(apply=auto){if(running.current)return;running.current=true;setBusy(true);setMessage('');try{
  const raw=localStorage.getItem('travelsetu_trip');const trip={...defaultTrip(),...(raw?JSON.parse(raw):{}),destination:itinerary.destination,from:itinerary.from,startDate:itinerary.startDate,endDate:itinerary.endDate,travellers:itinerary.travellers,budget:itinerary.budgetLimit||itinerary.estimatedCost,autoAdjust:auto};
  const r=await fetch('/api/replan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trip,itinerary,apply}),signal:AbortSignal.timeout(55000)});const data=await r.json();if(!r.ok||!data.replacement)throw new Error(data.error||'Conditions could not be refreshed.');onUpdate(data.replacement);setMessage(data.reason);try{rememberItinerary(data.replacement);}catch{setMessage(data.reason+' The updated plan could not be saved in this browser.');}
 }catch(e){setMessage(e instanceof Error?e.message:'Conditions could not be refreshed.');}finally{running.current=false;setBusy(false);}}
 useEffect(()=>{
  if(!conditions||Date.now()-Date.parse(conditions.checkedAt)>15*60000)void refresh(auto);
  const timer=setInterval(()=>{if(!document.hidden)void refresh(auto);},5*60000);
  return()=>clearInterval(timer);
  // Restart the timer with the latest plan after an update; no background requests in a hidden tab.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[itinerary,auto]);
 const cards=[{name:'Weather',icon:CloudSun,status:conditions?.weather.source||'unavailable',text:conditions?.weather.message||'Waiting for a usable forecast.'},{name:'Traffic & roads',icon:Route,status:conditions?.traffic.status||'unavailable',text:conditions?.traffic.message||'Traffic has not been checked.'},{name:'Disaster context',icon:ShieldAlert,status:conditions?.disasters.status||'unavailable',text:conditions?.disasters.message||'Regional alerts have not been checked.'}];
 return <section className="panel mb-6 border-blue-200"><div className="flex flex-wrap justify-between gap-4"><div><p className="eyebrow">CONDITIONS</p><h2 className="mt-2 text-2xl font-bold">Conditions & changes</h2><p className="mt-2 text-sm muted">{conditions?`Last checked ${new Date(conditions.checkedAt).toLocaleString('en-IN')}`:'Checking available sources…'} · refreshes every 5 minutes while this tab is visible.</p></div><div className="flex flex-wrap gap-2"><button disabled={busy} className="btn-secondary h-fit" onClick={simulateDisruption}><ShieldAlert size={16}/>Simulate disruption</button><button disabled={busy} className="btn-primary h-fit" onClick={()=>refresh()}><RefreshCw size={16} className={busy?'animate-spin':''}/>{busy?'Checking conditions…':'Refresh conditions'}</button></div></div>
 <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" checked={auto} onChange={e=>toggle(e.target.checked)} className="mt-1 h-5 w-5"/><span><strong>Apply itinerary adjustments automatically</strong><br/>Pause affected sightseeing and allow extra transfer time when supported by fresh reports. With this off, refresh produces suggestions to review.</span></label>
 <div className="mt-5 grid gap-3 lg:grid-cols-3">{cards.map(c=><div className="rounded-2xl bg-slate-50 p-4" key={c.name}><div className="flex items-center gap-2 font-bold"><c.icon size={18}/>{c.name}</div><span className={`mt-3 inline-block rounded-lg px-2 py-1 text-xs font-bold ${['unavailable','not-configured'].includes(c.status)?'bg-amber-100 text-amber-900':'bg-blue-100 text-blue-900'}`}>{c.status.replaceAll('-',' ')}</span><details className="mt-3 text-xs muted"><summary>Coverage details</summary><p className="mt-3 leading-6">{c.text}</p></details></div>)}</div>
 <p className="mt-4 text-xs leading-5 muted">A missing feed or empty alert list does not mean a place is safe. Forecasts, regional event locations and traffic models have limited coverage. Follow official directions. <a className="font-bold text-blue-700" href="https://sachet.ndma.gov.in/" target="_blank" rel="noreferrer">NDMA SACHET ↗</a></p>
 {!!conditions?.alerts.length&&<details className="mt-5 rounded-xl border p-4"><summary className="cursor-pointer font-bold">Reports near the destination ({conditions.alerts.length})</summary><div className="mt-3 space-y-4">{conditions.alerts.map(a=><div key={a.id}><a href={a.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-700">{a.title} ↗</a><p className="mt-1 text-xs muted">{a.source} · {a.date} · {a.description}</p></div>)}</div></details>}
 {!!itinerary.changes?.length&&<div className="mt-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{itinerary.changesApplied===false?'Suggested changes':'Changes in this check'} ({itinerary.changes.length})</h3>{itinerary.changesApplied===false&&<button className="btn-secondary" disabled={busy} onClick={()=>refresh(true)}>Recheck & apply suggestions</button>}</div><div className="mt-3 max-h-96 overflow-auto rounded-xl border"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Day / before</th><th className="p-3">After</th><th className="p-3">Why</th></tr></thead><tbody>{itinerary.changes.map((c,i)=><tr key={i} className="border-t"><td className="p-3 align-top">Day {c.day}<span className="block text-xs muted">{c.before}</span></td><td className="p-3 align-top">{c.after}</td><td className="p-3 align-top text-xs muted">{c.reason}<strong className="mt-1 block">{c.source}</strong></td></tr>)}</tbody></table></div><p className="mt-3 text-xs muted">No bookings, paid tickets or refunds are changed. Past activities stay intact.</p></div>}
 {message&&<p role="status" className="notice mt-4">{message}</p>}
 </section>;
}
