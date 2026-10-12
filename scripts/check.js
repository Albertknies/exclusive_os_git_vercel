const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync('public/index.html','utf8');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(m[1].trim())new vm.Script(m[1]);
const found=html.match(/const IMPORTED_CONDOS=(\[[^;]+\]);/);if(!found)throw Error('Import missing');
const data=JSON.parse(found[1]);if(data.length!==103)throw Error('Expected 103 condominiums');
const allowed=new Set(['id','nome','sindico','classe','status']);
for(const row of data){for(const key of Object.keys(row))if(!allowed.has(key))throw Error('Unexpected public data: '+key);}
for(const [,url] of html.matchAll(/<script[^>]+src="\/([^"]+)"/g))if(!fs.existsSync(path.join('public',url)))throw Error('Missing script: '+url);
for(const f of fs.readdirSync('public').filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync(path.join('public',f),'utf8'),{filename:f});
// Smoke test: initialization must not iterate beyond the six allocation groups.
const seedSource=html.slice(html.indexOf("'use strict';"),html.indexOf("const STORE="));
const context=vm.createContext({Date});
vm.runInContext(seedSource+';globalThis.__seedResult=seed();',context);
if(!Array.isArray(context.__seedResult.condos)||context.__seedResult.condos.length===0)throw Error('Seed initialization failed');
console.log('OK: scripts parse; references exist; 103 minimal public condo records; no operational CSV.');
