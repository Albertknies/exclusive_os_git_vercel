'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('public/index.html','utf8');
const tests=[];function test(name,fn){try{fn();tests.push({name,status:'PASSOU'})}catch(e){tests.push({name,status:'FALHOU',detail:e.message})}}
const match=html.match(/const IMPORTED_CONDOS=(\[[^;]+\]);/);assert(match,'Base ausente');const base=JSON.parse(match[1]);
const seedSource=html.slice(html.indexOf("'use strict';"),html.indexOf('const STORE='));const ctx=vm.createContext({Date});vm.runInContext(seedSource+';globalThis.testSeed=seed();globalThis.testWeights=WEIGHTS;globalThis.testNames=NAMES;',ctx);
const demo=JSON.parse(JSON.stringify(ctx.testSeed));
// Fixtures isoladas: NUNCA persistir em localStorage, banco ou repositório de dados.
const fixtures={users:[{nome:'CEO TESTE',perfil:'Master'},{nome:'GERENTE TESTE',perfil:'Gerente'},{nome:'ADMIN TESTE 1',perfil:'Administrativo'},{nome:'ADMIN TESTE 2',perfil:'Administrativo'},{nome:'SINDICO TESTE',perfil:'Síndico'},{nome:'VISTORIADOR TESTE',perfil:'Vistoriador'},{nome:'CLIENTE TESTE',perfil:'Cliente'}],condos:[{id:90001,nome:'CONDOMÍNIO TESTE ALFA',sindico:'Cristiano',classe:'B',status:'Regular'},{id:90002,nome:'CONDOMÍNIO TESTE BETA',sindico:'Grégory',classe:'D',status:'Atenção'}],tasks:[{id:90001,condoId:90001,titulo:'TESTE - manutenção de portão',status:'Aberta',prioridade:'Alta',responsavel:'Cristiano'},{id:90002,condoId:90002,titulo:'TESTE - retorno ao conselho',status:'Concluída',prioridade:'Média',responsavel:'Grégory'}]};
test('Base importada: 103 condomínios',()=>assert.equal(base.length,103));
test('IDs dos condomínios não se repetem',()=>assert.equal(new Set(base.map(c=>c.id)).size,base.length));
test('Carteiras importadas têm síndico e nome',()=>assert(base.every(c=>c.nome&&c.sindico)));
test('Alan não está nas carteiras importadas',()=>assert(!base.some(c=>/\balan\b/i.test(c.sindico))));
test('Dados de teste isolados da base importada',()=>assert(fixtures.condos.every(c=>!base.some(x=>x.id===c.id||x.nome===c.nome))));
test('Dados de teste identificados como TESTE',()=>assert(fixtures.condos.every(c=>c.nome.includes('TESTE'))&&fixtures.tasks.every(t=>t.titulo.includes('TESTE'))));
test('Perfis fictícios incluem direção, gerência e operação',()=>assert.equal(new Set(fixtures.users.map(u=>u.perfil)).size,6));
test('Pesos operacionais A/B/C/D',()=>assert.equal(JSON.stringify({...ctx.testWeights}),JSON.stringify({A:4,B:7,C:11,D:16})));
test('Carga por carteira calculada a partir das classes',()=>{const pts=base.filter(c=>c.sindico==='Cristiano').reduce((n,c)=>n+ctx.testWeights[c.classe],0);assert.equal(pts,126)});
test('Cenário: chamado de teste associado ao condomínio',()=>assert(fixtures.tasks.every(t=>fixtures.condos.some(c=>c.id===t.condoId))));
test('Cenário: tarefas abertas e concluídas',()=>assert.equal(fixtures.tasks.filter(t=>t.status==='Aberta').length,1));
test('Cenário: síndico acessa apenas carteira atribuída (regra de dados)',()=>{const owned=fixtures.condos.filter(c=>c.sindico==='Cristiano');assert.equal(owned.length,1);assert.equal(owned[0].id,90001)});
test('Cenário: limpeza remove somente fixtures',()=>{const combined=[...base,...fixtures.condos];const cleaned=combined.filter(c=>!fixtures.condos.some(t=>t.id===c.id));assert.equal(cleaned.length,103)});
test('Fonte não contém CPF fictício de morador nas fixtures',()=>assert(fixtures.users.every(u=>!('cpf'in u))));
const report={date:new Date().toISOString(),mode:'offline/isolado',tests,summary:{passed:tests.filter(x=>x.status==='PASSOU').length,failed:tests.filter(x=>x.status==='FALHOU').length},limits:['Testes de regras e integridade de dados; não executam cliques reais no navegador.','Não comprovam autenticação/controle de acesso no servidor (backend ainda não existe).','Não alteram o site hospedado, o GitHub ou dados do navegador.']};fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/report.json',JSON.stringify(report,null,2));console.log(tests.map(t=>`${t.status}: ${t.name}${t.detail?' - '+t.detail:''}`).join('\n'));console.log(`TOTAL ${report.summary.passed}/${tests.length}`);if(report.summary.failed)process.exitCode=1;
