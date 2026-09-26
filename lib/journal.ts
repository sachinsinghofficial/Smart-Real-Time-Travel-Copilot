import { z } from 'zod';
import type { Itinerary } from './itinerary';
import type { TripForm } from '../types/travel';
import { isDate } from './trip-validation';
export const CATEGORIES=['Stay','Food','Activities','Local transport','Intercity travel','Other'] as const;
export const expenseSchema=z.object({id:z.string().uuid(),category:z.enum(CATEGORIES),amountPaise:z.number().int().positive().max(1000000000),date:z.string().refine(isDate,'Choose a valid date'),note:z.string().max(300),paidBy:z.string().min(1).max(80)});
export type Expense=z.infer<typeof expenseSchema>;
export type TripRecord={id:string;ownerId?:string;preferences:TripForm;itinerary:Itinerary;expenses:Expense[];visited:string[];reflection:string;completed:boolean;photos:{path:string;name:string}[];updatedAt:string;pendingSync?:boolean;cloudVersion?:number};
export const recordKey=(p:Itinerary)=>[p.from,p.destination,p.startDate,p.endDate,p.createdAt||'legacy'].join('|');
export function analytics(record:TripRecord){const {itinerary:i,expenses}=record;const b=i.budgetBreakdown;const actualPaise=expenses.reduce((s,e)=>s+e.amountPaise,0),budgetPaise=Math.round((i.budgetLimit??record.preferences.budget)*100),reservePaise=Math.round((b?.reserve||0)*100);
 const planned=[b?.stay||0,b?.food||0,b?.activities||0,b?.localTransport||0,b?.intercityTransport||0,0];
 const categories=CATEGORIES.map((name,k)=>({name,planned:planned[k],actual:expenses.filter(e=>e.category===name).reduce((s,e)=>s+e.amountPaise,0)/100}));
 const dates=[...new Set(expenses.map(e=>e.date))].sort();let running=0;const daily=dates.map(date=>{const spent=expenses.filter(e=>e.date===date).reduce((s,e)=>s+e.amountPaise,0);running+=spent;return {date,spent:spent/100,cumulative:running/100};});
 const group=Math.max(1,i.travellers);return {actual:actualPaise/100,budget:budgetPaise/100,reserve:reservePaise/100,remaining:(budgetPaise-actualPaise)/100,spendableRemaining:(budgetPaise-reservePaise-actualPaise)/100,perPerson:actualPaise/100/group,categories,daily,recordedExpenses:expenses.length,visited:record.visited.length};
}
export function publicSummary(record:TripRecord,includeBudget=false){const i=record.itinerary,a=analytics(record);const all=[...i.days,...(i.baselineDays||[])].flatMap(d=>d.activities).filter(a=>a.placeId).map(p=>({id:p.placeId!,name:p.name}));all.push(...(i.nearby?.places||[]).map(p=>({id:p.id,name:p.name})));const sights=Array.from(new Map(all.filter(p=>record.visited.includes(p.id)).map(p=>[p.id,p])).values());return {title:`My ${i.destination} chapter`,destination:i.destination,days:i.duration,placesVisited:sights.length,highlights:sights.map(s=>s.name).slice(0,5),experience:record.preferences.experienceMode||'balanced',completed:record.completed,...(includeBudget?{recordedSpend:a.actual,currency:'INR'}:{})};}
export type SharedSummary=ReturnType<typeof publicSummary>;

export const sharedSummarySchema=z.object({title:z.string().max(200),destination:z.string().max(100),days:z.number().int().min(1).max(14),placesVisited:z.number().int().min(0).max(1000),highlights:z.array(z.string().max(200)).max(5),experience:z.enum(['local','balanced','highlights']),completed:z.boolean(),recordedSpend:z.number().finite().nonnegative().optional(),currency:z.literal('INR').optional()});
