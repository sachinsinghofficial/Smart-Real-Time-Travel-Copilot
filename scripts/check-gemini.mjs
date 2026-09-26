import {loadEnvFile} from 'node:process';
import {GoogleGenAI} from '@google/genai';
try{loadEnvFile('.env.local');}catch{}
const key=process.env.GEMINI_API_KEY?.trim(),model=process.env.GEMINI_MODEL?.trim()||'gemini-2.5-flash';
if(!key){console.error('Missing GEMINI_API_KEY in .env.local.');process.exitCode=1;}
else{try{const ai=new GoogleGenAI({apiKey:key,httpOptions:{timeout:20000}});const response=await ai.models.generateContent({model,contents:'Return an object with ok set to true.',config:{responseMimeType:'application/json',responseJsonSchema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok']},maxOutputTokens:512}});const value=JSON.parse(response.text||'null');if(value?.ok!==true)throw new Error('The connection succeeded but no complete test object was returned.');console.log('Gemini connection and structured output succeeded with '+model+'.');}
catch(e){const status=Number(e.status||e.statusCode||0);console.error('Gemini check failed'+(status?' (HTTP '+status+')':'')+'.');const message=String(e.message||'No diagnostic available').split(key).join('[redacted]');console.error(message.slice(0,1800));console.error('401/403: key access or API restrictions. 404: model availability. 429: quota/billing. Network errors: server connectivity.');process.exitCode=1;}}
