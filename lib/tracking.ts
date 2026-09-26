import {distanceKm} from './itinerary';
export type TrackPoint={latitude:number;longitude:number;accuracy:number;timestamp:number;segment:number};
export type VisitedStop=TrackPoint&{id:string;name:string};
export type TripTrack={points:TrackPoint[];stops:VisitedStop[];elapsedSeconds:number};
export const emptyTrack=():TripTrack=>({points:[],stops:[],elapsedSeconds:0});
export function validTrackPoint(p:TrackPoint){return Number.isFinite(p?.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180&&Number.isFinite(p.timestamp)&&p.timestamp>0&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&p.accuracy<=100&&Number.isInteger(p.segment)&&p.segment>=0;}
export function appendTrackPoint(points:TrackPoint[],point:TrackPoint){
 if(!validTrackPoint(point))return points;
 const last=points.at(-1);if(last){if(point.timestamp<=last.timestamp)return points;const km=distanceKm(last,point),seconds=(point.timestamp-last.timestamp)/1000;
 if(point.segment===last.segment&&seconds<120&&(km<.01||km/(seconds/3600)>1300))return points;
 }
 return [...points,point].slice(-20000);
}
export function trackSegments(points:TrackPoint[]){const segments:TrackPoint[][]=[];for(const p of points){const previous=segments.at(-1)?.at(-1);if(!previous||previous.segment!==p.segment||p.timestamp-previous.timestamp>120000)segments.push([p]);else segments.at(-1)!.push(p);}return segments;}
export function trackDistance(points:TrackPoint[]){return trackSegments(points).reduce((total,segment)=>total+segment.reduce((n,p,i)=>n+(i?distanceKm(segment[i-1],p):0),0),0);}
export function directionsUrl(destination:{latitude:number;longitude:number},origin?:{latitude:number;longitude:number}){const q=new URLSearchParams({lat:String(destination.latitude),lng:String(destination.longitude)});if(origin){q.set('originLat',String(origin.latitude));q.set('originLng',String(origin.longitude));}return '/trip-map?'+q;}
