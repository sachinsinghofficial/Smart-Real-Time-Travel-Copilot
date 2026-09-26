import {parseSky,type SkyPoint,type AirQuality} from './weather-dashboard';
import { todayDate, dateAt } from './trip';
export type WeatherSource = 'forecast' | 'partial' | 'unavailable' | 'historical-forecast' | 'demo';
export type RiskLevel = 'SAFE' | 'CAUTION' | 'AT RISK';
export type WeatherPoint = {time:string;temperature:number;rainProbability:number;precipitation:number;windSpeed:number;humidity:number;weatherCode:number;description:string};
export type DailyWeather = {date:string;minTemperature:number;maxTemperature:number;rainProbability:number;precipitation:number;maxWindSpeed:number;maxWindGusts:number;humidity:number;weatherCode:number;description:string;risk:RiskLevel;reason?:string};
export type WeatherResponse = {latitude:number;longitude:number;timezone:string;source:WeatherSource;location:string;current?:WeatherPoint;skyCurrent?:SkyPoint;hourly?:SkyPoint[];airQuality?:AirQuality;daily:DailyWeather[];fetchedAt:string;fallback:boolean;message?:string;missingDates?:string[]};
// Planning thresholds, not official meteorological warnings or disaster predictions.
export function classifyWeatherRisk(input:{rainProbability:number;windSpeed:number;temperature:number;precipitation?:number;gusts?:number;weatherCode?:number;minTemperature?:number}):{risk:RiskLevel;reason?:string}{
 const reasons:string[]=[];let severe=false;
 if((input.precipitation??0)>=35){severe=true;reasons.push(`${input.precipitation} mm daily precipitation forecast`);}
 if(input.windSpeed>=55||(input.gusts??0)>=70){severe=true;reasons.push('strong wind or gusts forecast');}
 if([65,67,75,82,86,95,96,99].includes(input.weatherCode??-1)){severe=true;reasons.push('heavy precipitation or thunderstorms forecast');}
 if(input.temperature>=40||(input.minTemperature??input.temperature)<=-5){severe=true;reasons.push('extreme temperature for outdoor planning');}
 if(severe)return {risk:'AT RISK',reason:reasons.join('; ')+'. Reduce exposed activities and consult local alerts. This is an app planning flag.'};
 if(input.rainProbability>=40||(input.precipitation??0)>=5||input.windSpeed>=35||input.temperature>=35||(input.minTemperature??input.temperature)<2)return {risk:'CAUTION',reason:'Allow flexible time and check conditions. A chance of rain alone does not establish dangerous weather.'};
 return {risk:'SAFE',reason:'No weather planning threshold exceeded in the available forecast. This is not a safety clearance.'};
}
export function weatherDescription(code:number){const map:Record<number,string>={0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Freezing fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',56:'Freezing drizzle',57:'Freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Heavy freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Light showers',81:'Showers',82:'Heavy showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm with hail',99:'Thunderstorm with heavy hail'};return map[code]||'Changing conditions';}
export function buildDailyWeather(raw:{daily?:Record<string,unknown[]>;hourly?:Record<string,unknown[]>},dates:string[]):DailyWeather[]{
 const d=raw.daily||{},h=raw.hourly||{};const available=Array.isArray(d.time)?d.time.map(String):[];
 const read=(key:string,i:number)=>{const v=d[key]?.[i];return typeof v==='number'&&Number.isFinite(v)?v:undefined;};
 return dates.flatMap(date=>{const i=available.indexOf(date);if(i<0)return [];
  const min=read('temperature_2m_min',i),max=read('temperature_2m_max',i),rain=read('precipitation_probability_max',i),precip=read('precipitation_sum',i),wind=read('wind_speed_10m_max',i),gust=read('wind_gusts_10m_max',i),code=read('weather_code',i);
  if([min,max,rain,precip,wind,gust,code].some(v=>v===undefined))return [];
  const humidity=(h.time||[]).flatMap((time,j)=>String(time).startsWith(date)&&typeof h.relative_humidity_2m?.[j]==='number'?[h.relative_humidity_2m[j] as number]:[]);
  const risk=classifyWeatherRisk({rainProbability:rain!,precipitation:precip!,windSpeed:wind!,gusts:gust!,weatherCode:code!,temperature:max!,minTemperature:min!});
  return [{date,minTemperature:min!,maxTemperature:max!,rainProbability:rain!,precipitation:precip!,maxWindSpeed:wind!,maxWindGusts:gust!,humidity:humidity.length?Math.round(humidity.reduce((a,b)=>a+b,0)/humidity.length):0,weatherCode:code!,description:weatherDescription(code!),...risk}];
 });
}
const weatherCache=new Map<string,{expires:number;value:WeatherResponse}>();
export async function getWeather(latitude:number,longitude:number,dates:string[],location:string,http:typeof fetch=fetch):Promise<WeatherResponse>{
 const now=new Date(),today=todayDate(now),eligible=dates.filter(d=>d>=today&&d<=dateAt(today,15));
 const key=[latitude,longitude,...eligible].join(':');const cached=weatherCache.get(key);
 const empty:WeatherResponse={latitude,longitude,location,timezone:'Asia/Kolkata',source:'unavailable',daily:[],fetchedAt:now.toISOString(),fallback:false,missingDates:dates,message:'Forecast unavailable for these dates. No simulated weather is used for planning.'};
 if(!eligible.length)return empty;
 try{
  let full:WeatherResponse;
  if(http===fetch&&cached&&cached.expires>Date.now())full=cached.value;
  else{
   const url=new URL('https://api.open-meteo.com/v1/forecast');Object.entries({latitude:String(latitude),longitude:String(longitude),timezone:'Asia/Kolkata',forecast_days:'16',daily:'weather_code,temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max',current:'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m',hourly:'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m',wind_speed_unit:'kmh'}).forEach(([k,v])=>url.searchParams.set(k,v));
   const r=await http(url.toString(),{signal:AbortSignal.timeout(9000),cache:'no-store'});if(!r.ok)throw new Error('Forecast unavailable');
   const raw=await r.json();const daily=buildDailyWeather(raw,eligible);full={...empty,source:'forecast',daily,...parseSky(raw,now),message:undefined};
   if(http===fetch){if(weatherCache.size>=100)weatherCache.delete(weatherCache.keys().next().value!);weatherCache.set(key,{expires:Date.now()+600000,value:full});}
  }
  const missingDates=dates.filter(d=>!full.daily.some(w=>w.date===d));return {...full,missingDates,source:!full.daily.length?'unavailable':missingDates.length?'partial':'forecast',message:missingDates.length?'Some dates have no usable forecast. Those days remain unassessed.':'Open-Meteo forecast. Recheck before travel; weather is not an official disaster warning.'};
 }catch{return empty;}
}
// Retained only for explicitly selected simulations; never called by live planning.
export function buildDemoWeather(latitude=32.24,longitude=77.189,dates:string[],location='Manali'):WeatherResponse{return {latitude,longitude,location,timezone:'Asia/Kolkata',source:'demo',daily:dates.map(date=>({date,minTemperature:12,maxTemperature:24,rainProbability:20,precipitation:1,maxWindSpeed:15,maxWindGusts:20,humidity:60,weatherCode:2,description:'Simulated partly cloudy',risk:'CAUTION',reason:'Simulation only'})),fetchedAt:new Date().toISOString(),fallback:true,message:'Simulation, not a forecast.'};}
