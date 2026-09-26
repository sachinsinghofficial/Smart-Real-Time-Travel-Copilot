import type {Itinerary} from './itinerary';
import type {TripForm} from '../types/travel';

export class BudgetExceededError extends Error {
 readonly code='BUDGET_EXCEEDED';
 constructor(readonly budget:number,readonly estimated:number,readonly suggestedBudget:number){
  super(`This proposed plan needs about ₹${suggestedBudget.toLocaleString('en-IN')} including your reserve. Your budget is ₹${budget.toLocaleString('en-IN')}. Try simpler stays, buses or trains, fewer paid activities, or update your budget below.`);
 }
}
// Recompute from the cost lines. Never trust a model-provided total or trim costs to fit.
export function assertPlanBudget(plan:Itinerary,trip:Pick<TripForm,'budget'|'reservePercent'>){
 const base=plan.days.reduce((sum,day)=>sum+(day.lodgingCost||0)+day.activities.reduce((n,a)=>n+a.estimatedCost,0),0)+(plan.budgetBreakdown?.intercityTransport||0);
 const ratio=(trip.reservePercent??10)/100;
 const total=base+Math.round(trip.budget*ratio);
 if(!Number.isFinite(total)||total<0)throw new Error('The generated costs are invalid. Please retry.');
 if(total>trip.budget)throw new BudgetExceededError(trip.budget,total,Math.ceil(base/(1-ratio)/100)*100);
 return total;
}
export function affordableReplacement(plan:Itinerary,slotAllowance:number,groupPrice:number){
 const limit=plan.budgetLimit;
 return Number.isFinite(groupPrice)&&groupPrice>=0&&Number.isFinite(slotAllowance)&&slotAllowance>=0&&limit!==undefined&&plan.estimatedCost<=limit&&groupPrice<=slotAllowance&&plan.estimatedCost-slotAllowance+groupPrice<=limit;
}
