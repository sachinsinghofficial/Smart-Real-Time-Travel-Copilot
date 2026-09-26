import {z} from 'zod';
import {parseTrip} from './trip-validation';
import type {TripForm} from '../types/travel';
export const tripSchema=z.any().transform((input,ctx):TripForm=>{try{return parseTrip(input);}catch(e){ctx.addIssue({code:'custom',message:e instanceof Error?e.message:'Check trip details.',path:['root']});return z.NEVER;}});
export const aiEnrichmentSchema=z.object({tripSummary:z.string().max(2500),days:z.array(z.object({day:z.number().int().min(1).max(14),title:z.string().max(300),summary:z.string().max(2000),activityNotes:z.array(z.object({id:z.string().max(100),description:z.string().max(3000),whyVisit:z.string().max(1500),insiderTip:z.string().max(1500),alternative:z.string().max(1500)})).max(30)})).min(1).max(14),packingSuggestions:z.array(z.string().max(500)).max(30),travelTips:z.array(z.string().max(1000)).max(30)});
