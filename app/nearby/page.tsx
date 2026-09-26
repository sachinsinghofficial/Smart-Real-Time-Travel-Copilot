'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {Itinerary} from '@/lib/itinerary';
import CuisineDiscovery from '@/app/components/CuisineDiscovery';
import NearbyPanel from '@/app/components/NearbyPanel';
export default function NearbyPage(){const [plan,setPlan]=useState<Itinerary|null>(null),[ready,setReady]=useState(false),[cuisine,setCuisine]=useState('');useEffect(()=>{setCuisine(new URLSearchParams(location.search).get('cuisine')||'');try{setPlan(JSON.parse(localStorage.getItem('travelsetu_itinerary')||'null'));}catch{}setReady(true);},[]);return <main className="page-shell"><div className="container-page"><p className="eyebrow">Stay close to what brought you here</p><h1 className="page-title">Good food. A place to slow down.</h1><p className="muted">Local flavours and thoughtful stays, close to your journey.</p><CuisineDiscovery destination={plan?.destination} onChoose={q=>{setCuisine(q);document.getElementById('nearby')?.scrollIntoView({behavior:'smooth'});}}/>{plan?<NearbyPanel cuisine={cuisine} itinerary={plan} onUpdate={nearby=>setPlan({...plan,nearby})}/>:<div className="panel mt-8"><p>{ready?'Create your itinerary to find places near your route.':'Loading your itinerary…'}</p><Link href="/plan-trip" className="btn-primary mt-4">Plan my trip</Link></div>}</div></main>}
