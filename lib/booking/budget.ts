import type {BookingOffer} from './types';
export function offerBudgetState(offer:Pick<BookingOffer,'price'|'currency'>,budget:number){
 if(!Number.isFinite(budget)||budget<=0||!Number.isFinite(offer.price)||offer.price<0)return {available:false,shortfall:0,reason:'Enter a valid budget.'};
 if(offer.currency!=='INR')return {available:false,shortfall:0,reason:'An INR quote is needed to compare this option with your budget.'};
 const shortfall=Math.max(0,Math.round((offer.price-budget)*100)/100);
 return {available:shortfall===0,shortfall,reason:shortfall?`Increase the budget by ₹${shortfall.toLocaleString('en-IN')} to access this car.`:'Within your vehicle budget'};
}
export function assertBookingBudget(offer:BookingOffer){if(offer.query.budgetLimit===undefined)return;const state=offerBudgetState(offer,offer.query.budgetLimit);if(!state.available)throw new Error(state.reason+' Update the allowance and search again before requesting a quote.');}
