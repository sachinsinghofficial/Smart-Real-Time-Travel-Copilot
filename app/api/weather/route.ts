import { NextResponse } from 'next/server';
import destinations from '@/data/destinations.json';
import {getAirQuality} from '@/lib/weather-dashboard';
import { getWeather } from '@/lib/weather';
import { isDate } from '@/lib/trip-validation';
import { dateAt, getTripDuration, todayDate } from '@/lib/trip';
export const runtime='nodejs';
export async function POST(request:Request){try{
 const b=await request.json();const d=destinations.find(d=>d.name.toLowerCase()===String(b.destination||b.location||'Manali').toLowerCase());if(!d)throw new Error('Choose a supported destination.');
 const start=String(b.startDate||todayDate()),end=String(b.endDate||start);const duration=getTripDuration(start,end);
 if(!isDate(start)||!isDate(end)||duration<1||duration>14)throw new Error('Choose valid dates, up to 14 days.');
 const dates=Array.isArray(b.dates)?b.dates.filter((v:unknown)=>typeof v==='string'&&isDate(v)).slice(0,14):Array.from({length:duration},(_,i)=>dateAt(start,i));
 const [forecast,airQuality]=await Promise.all([getWeather(d.latitude,d.longitude,dates,d.name),b.dashboard===true?getAirQuality(d.latitude,d.longitude):Promise.resolve(undefined)]);
 return NextResponse.json({...forecast,...(b.dashboard===true?{airQuality}: {})});
}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Check weather request.'},{status:400});}}
