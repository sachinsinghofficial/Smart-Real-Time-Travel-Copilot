import {NextResponse} from 'next/server';
import {roadRoute} from '@/lib/routing';
export async function POST(request:Request){try{const text=await request.text();if(text.length>12000)return NextResponse.json({error:'Route too large'},{status:400});const {points}=JSON.parse(text);const route=await roadRoute(points);return NextResponse.json(route);}catch{return NextResponse.json({error:'A road route could not be loaded. The map can still show the order of saved stops.'},{status:503});}}
