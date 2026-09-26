'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {useTravelStore} from '@/lib/travel-store';
import {loadCloudTrips,saveCloudTrip} from '@/lib/cloud';
export default function AppProvider(){const [offline,setOffline]=useState(false);useEffect(()=>{useTravelStore.getState().hydrate();const online=()=>setOffline(!navigator.onLine);online();window.addEventListener('online',online);window.addEventListener('offline',online);if(process.env.NODE_ENV==='production'&&'serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
 const client=supabase();let stopped=false;client?.auth.getSession().then(({data})=>{if(!stopped)useTravelStore.getState().setUser(data.session?.user.id||null);});const subscription=client?.auth.onAuthStateChange((_event,session)=>{useTravelStore.getState().setUser(session?.user.id||null);if(session)setTimeout(()=>loadCloudTrips().catch(()=>{}),0);});
 let syncing=false;const sync=async()=>{if(syncing||!navigator.onLine)return;const state=useTravelStore.getState();if(!state.userId)return;syncing=true;try{for(const record of state.records.filter(r=>r.ownerId===state.userId&&r.pendingSync))await saveCloudTrip(record);}catch{}finally{syncing=false;}};const timer=setInterval(sync,60000);window.addEventListener('online',sync);
 return()=>{stopped=true;subscription?.data.subscription.unsubscribe();window.removeEventListener('online',online);window.removeEventListener('offline',online);window.removeEventListener('online',sync);clearInterval(timer);};},[]);
 return offline?<div role="status" className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-center text-xs text-amber-900">Offline · saved plans and journal edits remain on this device. Live conditions, bookings and street-map tiles require a connection. <a className="font-bold underline" href="/offline.html">Open offline trip →</a></div>:null;}
