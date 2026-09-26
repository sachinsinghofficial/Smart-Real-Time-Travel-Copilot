'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {MapPin,ArrowRight} from 'lucide-react';
import destinations from '@/data/destinations.json';
import WeatherDashboard from '@/app/components/WeatherDashboard';
export default function WeatherPage(){const [destination,setDestination]=useState('Manali');useEffect(()=>{try{const query=new URLSearchParams(location.search).get('destination'),plan=JSON.parse(localStorage.getItem('travelsetu_itinerary')||'null');const name=query||plan?.destination;if(destinations.some(d=>d.name===name))setDestination(name);}catch{}},[]);return <main className="page-shell weather-page"><div className="container-page"><div className="page-head"><div><p className="eyebrow">LIVE WEATHER</p><h1 className="page-title">Read the skies. Find your window.</h1><p className="text-sm muted">A little perspective before you head out.</p></div><label className="destination-pill"><MapPin size={16}/><select aria-label="Weather destination" value={destination} onChange={e=>setDestination(e.target.value)}>{destinations.map(d=><option key={d.id}>{d.name}</option>)}</select></label></div><WeatherDashboard destination={destination}/><Link href="/trip-map" className="text-link mt-6">See your journey on the map <ArrowRight size={16}/></Link></div></main>;}
