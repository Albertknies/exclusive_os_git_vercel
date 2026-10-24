'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..','public'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const outputs=[];
const window={};const document={body:{append(){}},createElement(){return {click(){},remove(){}}}};
const URL={createObjectURL(blob){outputs.push(blob);return 'blob:teste'},revokeObjectURL(){}};
vm.runInNewContext(read('relatorios-export.js'),{window,document,URL,Blob,TextEncoder,setTimeout:()=>{}});
const h=['Código','Nome completo','Endereço completo','Unidades','Síndico responsável','Início Exclusive'];
const rows=Array.from({length:180},(_,i)=>['EX-'+String(i+1).padStart(3,'0'),'Condomínio das Acácias '+i,'Rua das Palmeiras, 250, Santa Maria/RS',48,'Grégory','2024-03-15']);
const download=async(format,values=rows)=>{window.ExclusiveReports.download('Cadastro de condomínios',h,values,format,'teste');return Buffer.from(await outputs.pop().arrayBuffer())};
function validatePdf(b){const s=b.toString('latin1');assert(s.startsWith('%PDF-1.4'));assert(s.endsWith('%%EOF'));const xref=Number(s.match(/startxref\n(\d+)/)?.[1]);assert.equal(s.slice(xref,xref+5),'xref\n');const section=s.slice(xref);const offsets=[...section.matchAll(/^(\d{10}) 00000 n /gm)].map(m=>Number(m[1]));for(let i=0;i<offsets.length;i++)assert.equal(s.slice(offsets[i],offsets[i]+(i+1+' 0 obj').length),i+1+' 0 obj');const streams=[...s.matchAll(/<< \/Length (\d+) >>\nstream\n/g)];for(const m of streams){const from=m.index+m[0].length;assert.equal(s.slice(from+Number(m[1]),from+Number(m[1])+10),'\nendstream')}return (s.match(/\/Type \/Page \/Parent/g)||[]).length}
(async()=>{
const large=await download('pdf');const pageCount=validatePdf(large);assert(pageCount>1,'180 registros devem gerar várias páginas');
const empty=await download('pdf',[]);assert.equal(validatePdf(empty),1);
const csv=await download('csv');assert(csv.subarray(0,3).equals(Buffer.from([0xef,0xbb,0xbf])));const content=csv.toString('utf8');assert(content.includes('Grégory'));assert(content.includes('Condomínio das Acácias'));assert.equal(content.split('\r\n').length,181);
const malicious=await download('csv',[['=2+2','+SUM(A1:A2)','@cmd','-1','Normal','2024-01-01']]);assert(malicious.toString('utf8').includes('"\'=2+2"'));
for(const name of ['relatorios-export.js','os-operacional.js','os-sidebar.js','equipe-v1.js','frota-v2.js'])new vm.Script(read(name),{filename:name});
for(const name of ['operacional.html','demo.html']){const html=read(name);for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1],{filename:name});assert(html.includes('relatorios-export.js'));assert(html.includes('Exportar relatório'))}
const server=fs.readFileSync(path.resolve(__dirname,'server.js'),'utf8');assert(server.includes("'relatorios-export.js'"));
console.log('OK: PDF vazio e multipágina ('+pageCount+' páginas), offsets/streams, CSV UTF-8, acentos, 180 linhas, proteção de fórmula, scripts e integração HTML.');
})().catch(e=>{console.error(e);process.exitCode=1});
