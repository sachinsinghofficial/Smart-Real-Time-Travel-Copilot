import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const buttonVariants=cva('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:pointer-events-none disabled:opacity-50',{variants:{variant:{default:'bg-[#075b3d] text-white hover:bg-[#03442c]',outline:'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',destructive:'bg-red-600 text-white hover:bg-red-700',secondary:'bg-amber-300 text-slate-900 hover:bg-amber-400'}},defaultVariants:{variant:'default'}});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,VariantProps<typeof buttonVariants>{asChild?:boolean}
export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(({className,variant,asChild=false,...props},ref)=>{const Component=asChild?Slot:'button';return <Component ref={ref} className={cn(buttonVariants({variant}),className)} {...props}/>;});Button.displayName='Button';
