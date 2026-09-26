import type { WeatherResponse } from '../weather';
export type FeedStatus={provider:string;status:'available'|'partial'|'unavailable'|'not-configured';checkedAt:string;message:string;url?:string};
export type TravelAlert={id:string;kind:'traffic'|'disaster';title:string;description:string;severity:'notice'|'avoid';latitude:number;longitude:number;radiusKm:number;date:string;source:string;sourceUrl:string;reportedAt?:string;startsAt?:string;endsAt?:string};
export type TrafficLeg={day:number;activityId:string;minutes:number;distanceKm:number;delayMinutes:number;source:'current'|'prediction'};
export type Conditions={checkedAt:string;weather:WeatherResponse;traffic:FeedStatus;disasters:FeedStatus;alerts:TravelAlert[];legs:TrafficLeg[]};
export type PlanChange={day:number;date:string;activityId:string;before:string;after:string;reason:string;source:string};
