export type RiskLevel = "SAFE" | "CAUTION" | "HIGH RISK" | "CRITICAL";
export type RiskFactors = {
  trafficLevel: "low" | "moderate" | "heavy";
  trafficDelayMinutes: number;
  roadStatus: "open" | "restricted" | "closed";
  roadCondition: "good" | "wet_sections" | "poor";
  landslideRisk: number;
  floodRisk: number;
  snowRisk: number;
  wildfireRisk: number;
  visibilityRisk: number;
  localAlert?: string | null;
  transportDelayRisk: number;
  officialAlertLevel: "LOW" | "CAUTION" | "HIGH" | "CRITICAL";
};
export type RiskAssessment = { score:number; level:RiskLevel; factors:Array<{label:string; score:number; reason:string}>; blockers:string[]; summary:string };

const clamp=(n:number)=>Math.max(0,Math.min(100,n));
export function assessTravelRisk(f:RiskFactors):RiskAssessment{
  const blockers:string[]=[];
  if(f.roadStatus==='closed') blockers.push('Road is closed');
  if(f.officialAlertLevel==='CRITICAL') blockers.push('Critical official/local safety alert');
  if(f.roadCondition==='poor' && f.landslideRisk>=70) blockers.push('Poor road condition with high landslide risk');
  const traffic=f.trafficLevel==='heavy'?Math.max(70,clamp(f.trafficDelayMinutes)):clamp(f.trafficDelayMinutes*1.5);
  const factors=[
    {label:'Road status',score:f.roadStatus==='closed'?100:f.roadStatus==='restricted'?65:10,reason:f.roadStatus==='open'?'Route currently open':'Route restrictions are active'},
    {label:'Traffic',score:traffic,reason:`Approx. ${Math.round(f.trafficDelayMinutes)} min delay`},
    {label:'Landslide',score:clamp(f.landslideRisk),reason:`Landslide risk ${Math.round(f.landslideRisk)}/100`},
    {label:'Flood',score:clamp(f.floodRisk),reason:`Flood risk ${Math.round(f.floodRisk)}/100`},
    {label:'Snow / avalanche',score:clamp(f.snowRisk),reason:`Snow risk ${Math.round(f.snowRisk)}/100`},
    {label:'Wildfire',score:clamp(f.wildfireRisk),reason:`Wildfire risk ${Math.round(f.wildfireRisk)}/100`},
    {label:'Visibility',score:clamp(f.visibilityRisk),reason:`Visibility risk ${Math.round(f.visibilityRisk)}/100`},
    {label:'Transport delay',score:clamp(f.transportDelayRisk),reason:`Transport delay risk ${Math.round(f.transportDelayRisk)}/100`},
  ];
  const weights=[.18,.12,.18,.12,.08,.08,.08,.06];
  const score=Math.round(factors.reduce((s,x,i)=>s+x.score*weights[i],0));
  let level:RiskLevel=score>=75?'HIGH RISK':score>=45?'CAUTION':'SAFE';
  if(blockers.length) level='CRITICAL';
  const summary=level==='CRITICAL'?'Do not use the affected route or activity until the blocker is cleared.':level==='HIGH RISK'?'Conditions are unsafe for higher-exposure travel. Prefer indoor or alternate-route plans.':level==='CAUTION'?'Travel is possible, but timing, route choice and activity intensity should be adjusted.':'No major demo safety blockers detected right now.';
  return {score,level,factors,blockers,summary};
}
