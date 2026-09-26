import {assertBookingBudget} from '@/lib/booking/budget';
import { NextResponse } from 'next/server';
import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseSearch, demoOffers } from '@/lib/booking/catalog';
import { searchHotels,searchTransfers,supplierConfigured,refreshOffer,confirmSupplier,hotelBookingPayload } from '@/lib/booking/hotelbeds';
import { signOffer,readOffer } from '@/lib/booking/tokens';
import type { BookingContact, BookingReceipt } from '@/lib/booking/types';
export const runtime='nodejs';
export async function GET(){return NextResponse.json({hotelTestConfigured:supplierConfigured('hotel'),transferTestConfigured:supplierConfigured('vehicle'),productionBookingEnabled:false});}
function contact(input:unknown):BookingContact{if(!input||typeof input!=='object')throw new Error('Guest details are required.');const c=input as BookingContact;const name=(v:unknown)=>typeof v==='string'&&v.trim().length>0&&v.length<=80;if(!name(c.name)||!name(c.surname))throw new Error('Enter the lead guest first and last name.');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email||'')||(c.email||'').length>254||!/^\+[1-9]\d{7,14}$/.test(c.phone||''))throw new Error('Enter a valid email and international phone number, such as +919876543210.');if(c.guests&&(!Array.isArray(c.guests)||c.guests.length>40||c.guests.some(g=>!name(g?.name)||!name(g?.surname))))throw new Error('Enter a valid name for each guest.');return c;}
export async function POST(request:Request){try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:'Cross-origin booking requests are not allowed.'},{status:403});
 const raw=await request.text();if(raw.length>70000)throw new Error('Request is too large.');const b=JSON.parse(raw);
 if(b.action==='search'){const q=parseSearch(b.query);const offers=q.mode==='demo'?demoOffers(q):q.kind==='hotel'?await searchHotels(q):await searchTransfers(q);return NextResponse.json({offers:offers.map(o=>({...o,token:signOffer(o,'offer')})),mode:q.mode,message:q.mode==='demo'?'Sample inventory. No real availability or reservations.':'Supplier evaluation results. These are test services, not travel reservations.'});}
 const token=readOffer(b.token);
 if(b.action==='quote'){assertBookingBudget(token.offer);const o=token.offer.mode==='demo'?token.offer:await refreshOffer(token.offer);assertBookingBudget(o);return NextResponse.json({offer:{...o,token:signOffer(o,'quote',token.nonce)},message:'Review the current total and conditions before confirming.'});}
 if(b.action!=='confirm'||token.phase!=='quote'||b.acceptTerms!==true)throw new Error('Review the quote and accept its terms before confirming.');
 assertBookingBudget(token.offer);
 const o=token.offer,c=o.mode==='test'?contact(b.contact):undefined;
 if(o.mode==='test'&&o.kind==='hotel'){const required=(o.query.adults+o.query.childrenAges.length)*o.query.rooms;if(c?.guests?.length!==required)throw new Error('Provide all guest names for the selected rooms.');hotelBookingPayload(o,c!,token.nonce);}
 if(o.mode==='test'&&o.kind==='vehicle'&&!/^[A-Z0-9]{2,7}$/i.test(c?.flightNumber||''))throw new Error('Enter the arrival flight number.');
 if(process.env.VERCEL)return NextResponse.json({error:'Test confirmations require the local Node deployment with a persistent booking journal. Search and quotes are available here; no reservation has been attempted.'},{status:503});
 const dir=path.join(process.cwd(),'.data','booking-attempts');await mkdir(dir,{recursive:true});const file=path.join(dir,token.nonce+'.json');
 try{const handle=await open(file,'wx');await handle.writeFile(JSON.stringify({status:'pending',clientReference:token.nonce}));await handle.close();}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;const previous=JSON.parse(await readFile(file,'utf8'));if(previous.receipt)return NextResponse.json({receipt:previous.receipt,repeated:true});return NextResponse.json({error:'This booking attempt is pending or its outcome is unknown. Check the supplier dashboard before starting another booking.',clientReference:token.nonce},{status:409});}
 try{const result=o.mode==='demo'?{reference:'DEMO-'+token.nonce.slice(0,8).toUpperCase(),status:'DEMO_CONFIRMED'}:await confirmSupplier(o,c!,token.nonce);const receipt:BookingReceipt={id:token.nonce,reference:result.reference,name:o.name,kind:o.kind,mode:o.mode,status:result.status,price:o.price,currency:o.currency,destinationId:o.query.destinationId,startDate:o.query.checkIn,endDate:o.query.checkOut,createdAt:new Date().toISOString(),message:o.mode==='demo'?'Demo only. No supplier reservation or payment occurred.':'Supplier evaluation booking only. This is not a real travel reservation.'};await writeFile(file,JSON.stringify({status:'completed',receipt}));return NextResponse.json({receipt});}catch(e){await writeFile(file,JSON.stringify({status:'unknown',clientReference:token.nonce}));return NextResponse.json({error:e instanceof Error?e.message:'Booking outcome could not be confirmed.',clientReference:token.nonce},{status:502});}
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Booking request could not be completed.'},{status:400});}}
