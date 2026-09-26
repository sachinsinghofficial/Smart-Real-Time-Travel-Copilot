import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('.',import.meta.url));if(process.platform==='win32'){console.error('Run the Unix-socket compute service in WSL2 or Linux. The Next.js app works without it.');process.exit(1);}mkdirSync(cwd+'build',{recursive:true});const r=spawnSync(process.env.CXX||'c++',['-std=c++20','-O2','-pthread','engine.cpp','-o','build/travelsetu-compute'],{cwd,stdio:'inherit'});process.exit(r.status??1);
