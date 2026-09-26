import type { Destination, TripForm } from '../types/travel';
export function localAffinity(name:string){return /market|bazaar|bazar|village|old |fontainhas|ghat|quarter|chowk|street|craft|town|promenade|colony|lane|walk/i.test(name);}
export function foodIdeas(d:Pick<Destination,'localFood'>,trip:TripForm){
 let dishes=d.localFood||[];
 if(trip.foodPreference==='Vegetarian'||trip.foodPreference==='Vegan')dishes=dishes.filter(s=>!/fish|chicken|mutton|pork|beef|meat|prawn|crab|seafood|rogan|wazwan/i.test(s));
 if(trip.foodPreference==='Vegan')dishes=dishes.filter(s=>!/paneer|lassi|milk|butter|ghee|cheese|cream|yogurt|curd|rabri|rasgulla|sandesh|kheer/i.test(s));
 return dishes.length?dishes.join(', '):'a suitable regional meal';
}
