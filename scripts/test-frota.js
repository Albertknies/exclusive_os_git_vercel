'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const home=fs.readFileSync('public/operacional.html','utf8');
const fleet=fs.readFileSync('public/veiculos.html','utf8');
const api=fs.readFileSync('api/veiculos.js','utf8');
for(const [name,html] of [['operacional',home],['veiculos',fleet]]){for(const m of html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g))new vm.Script(m[1],{filename:name})}
new vm.Script(api,{filename:'api/veiculos.js'});
assert(home.includes('href="/veiculos.html"'),'Menu da frota ausente');
assert(fleet.includes('id="fuelForm"'),'Formulário de abastecimento ausente');
assert(fleet.includes('id="fuelRows"'),'Histórico de abastecimento ausente');
assert(fleet.includes("api('abastecimento','POST'"),'Envio do abastecimento ausente');
assert(api.includes("action==='abastecimentos'"),'Consulta de abastecimentos ausente');
assert(api.includes("action==='abastecimento'"),'Cadastro de abastecimento ausente');
const migration=fs.readFileSync('supabase/migrations/20261023_frota_abastecimentos.sql','utf8');
assert(migration.includes('create table if not exists public.os_veiculo_abastecimentos'));
console.log('OK: sintaxe e integração estática de frota');
