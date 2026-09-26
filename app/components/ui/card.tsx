import * as React from 'react';
import {cn} from '@/lib/utils';
export function Card({className,...props}:React.HTMLAttributes<HTMLDivElement>){return <div className={cn('panel',className)} {...props}/>;}
export function CardTitle({className,...props}:React.HTMLAttributes<HTMLHeadingElement>){return <h2 className={cn('text-xl font-bold',className)} {...props}/>;}
