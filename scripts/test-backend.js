const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
for(const p of ['api/access.js','api/operacoes.js','api/health.js','lib/access.js','scripts/importar-condominios.js'])new vm.Script(fs.readFileSync(p,'utf8'),{filename:p});
const page=fs.readFileSync('public/operacional.html','utf8');assert(page.includes('/api/operacoes?entity='));assert(page.includes('/api/access?action=login'));
for(const x of ['os_condominios','os_processos','os_vistorias','os_vinculos','os_login_attempts'])assert(fs.readFileSync('supabase/operacoes.sql','utf8').includes(x));
console.log('OK: sintaxe backend, interface operacional e migrações');
