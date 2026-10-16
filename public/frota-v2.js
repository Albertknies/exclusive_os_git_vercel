'use strict';
const $=id=>document.getElementById(id);
let vehicles=[],sindicos=[],usos=[],admin=false,maintenance=[];
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const number=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:2});
const date=x=>x?new Date(x).toLocaleString('pt-BR'):'—';
const plate=id=>vehicles.find(v=>v.id===id)?.placa||'—';
const name=id=>sindicos.find(s=>s.id===id)?.nome||'Meu registro';
const validAvg=u=>u.fim&&u.combustivel_retirada==='cheio'&&u.combustivel_devolucao==='cheio'&&Number(u.litros_abastecidos)>0;
function notify(message,error=false){const n=$('notice');n.hidden=false;n.classList.toggle('error',error);n.textContent=message;n.scrollIntoView({behavior:'smooth',block:'nearest'});}
async function api(action,method='GET',body,query=''){
 const r=await fetch('/api/veiculos?action='+encodeURIComponent(action)+query,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Falha na requisição');return d;
}
function opts(el,items,all=false){el.replaceChildren();if(all)el.add(new Option('Todos',''));for(const i of items)el.add(new Option(i.label,i.id))}
function localNow(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function td(row,value){const cell=document.createElement('td');cell.textContent=value??'—';row.append(cell);return cell}
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b}
function setBusy(form,busy){form.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=busy)}
function fileToPhoto(file){
 return new Promise((resolve,reject)=>{
  if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type))return reject(Error('Selecione uma foto JPEG, PNG ou WebP.'));
  if(file.size>15000000)return reject(Error('Foto original muito grande (limite 15 MB).'));
  const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{URL.revokeObjectURL(url);try{
   const scale=Math.min(1,1200/Math.max(im.width,im.height)),canvas=document.createElement('canvas');
   canvas.width=Math.round(im.width*scale);canvas.height=Math.round(im.height*scale);
   canvas.getContext('2d').drawImage(im,0,0,canvas.width,canvas.height);
   let quality=.82,data=canvas.toDataURL('image/jpeg',quality);
   while(data.length>1100000&&quality>.4){quality-=.12;data=canvas.toDataURL('image/jpeg',quality)}
   if(data.length>1260000)throw Error('Foto excedeu o limite após compressão. Fotografe novamente.');
   resolve(data);
  }catch(e){reject(e)}};
  im.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Não foi possível ler a foto.'))};im.src=url;
 });
}
function showTab(tab){
 document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 for(const id of ['retiradas','relatorios','manutencoes','cadastro'])$(id).hidden=id!==tab;
 if(tab==='manutencoes')loadMaintenance();
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
function currentFilters(){
 return usos.filter(u=>{
  const a=$('filtroInicio').value,z=$('filtroFim').value;
  return (!a||u.inicio.slice(0,10)>=a)&&(!z||u.inicio.slice(0,10)<=z);
 });
}
function metrics(){
 const rows=currentFilters(),closed=rows.filter(u=>u.fim),valid=closed.filter(validAvg);
 const kms=closed.reduce((a,u)=>a+Number(u.km_rodados||0),0),validKms=valid.reduce((a,u)=>a+Number(u.km_rodados||0),0),liters=valid.reduce((a,u)=>a+Number(u.litros_abastecidos||0),0);
 $('kVeiculos').textContent=vehicles.length;
 $('kAbertos').textContent=usos.filter(u=>!u.fim).length;
 $('kKm').textContent=number(kms)+' km';
 $('kMedia').textContent=liters>0?number(validKms/liters)+' km/L':'—';
 $('kCusto').textContent=money(closed.reduce((a,u)=>a+Number(u.valor_abastecimento||0),0));
}
function renderPending(){
 const target=$('pendentes');target.replaceChildren();
 const open=usos.filter(u=>!u.fim);
 if(!open.length){target.textContent='Nenhuma devolução pendente.';return}
 for(const u of open){
  const p=document.createElement('p');p.className='highlight';
  const strong=document.createElement('strong');strong.textContent=plate(u.veiculo_id)+' · '+name(u.sindico_id);
  p.append(strong,document.createTextNode(' — '+number(u.km_inicial)+' km, retirada em '+date(u.inicio)+' · '));
  p.append(button('Devolver',()=>openReturn(u)));target.append(p);
 }
}
function renderReports(){
 const list=currentFilters(),rows=$('rows');rows.replaceChildren();
 for(const u of list){
  const tr=document.createElement('tr');
  for(const value of [plate(u.veiculo_id),name(u.sindico_id),date(u.inicio),date(u.fim),number(u.km_inicial),u.km_final==null?'—':number(u.km_final),u.km_rodados==null?'—':number(u.km_rodados),u.litros_abastecidos==null?'—':number(u.litros_abastecidos),u.valor_abastecimento==null?'—':money(u.valor_abastecimento),validAvg(u)?number(u.media_km_l):'Não calculável',u.combustivel_devolucao||'—'])td(tr,value);
  const photos=document.createElement('td');
  for(const [kind,label,key] of [['retirada','Retirada','foto_painel_retirada'],['devolucao','Devolução','foto_painel_devolucao'],['comprovante','Nota','foto_comprovante']]){
   if(u[key]){const b=button(label,()=>openPhoto(u.id,kind));b.className='light';b.style.margin='2px';photos.append(b)}
  }
  tr.append(photos);td(tr,u.destino);rows.append(tr);
 }
 const group=new Map();
 for(const u of list.filter(u=>u.fim)){
  const g=group.get(u.sindico_id)||{n:0,km:0,validKm:0,litros:0,custo:0};
  g.n++;g.km+=Number(u.km_rodados||0);g.custo+=Number(u.valor_abastecimento||0);
  if(validAvg(u)){g.validKm+=Number(u.km_rodados||0);g.litros+=Number(u.litros_abastecidos||0)}
  group.set(u.sindico_id,g);
 }
 const summary=$('resumoSindicos');summary.replaceChildren();
 for(const [id,g] of group){
  const tr=document.createElement('tr');
  [name(id),g.n,number(g.km),number(g.litros),g.litros>0?number(g.validKm/g.litros):'—',money(g.custo)].forEach(v=>td(tr,v));summary.append(tr);
 }
 metrics();
}
async function openPhoto(id,tipo){
 try{const d=await api('foto','GET',null,'&id='+encodeURIComponent(id)+'&tipo='+encodeURIComponent(tipo));window.open(d.url,'_blank','noopener,noreferrer')}
 catch(e){notify(e.message,true)}
}
async function load(){
 try{
  const query=( $('filtroVeiculo').value?'&veiculo_id='+encodeURIComponent($('filtroVeiculo').value):'')+(admin&&$('filtroSindico').value?'&sindico_id='+encodeURIComponent($('filtroSindico').value):'');
  usos=(await api('usos','GET',null,query)).items||[];
  renderPending();renderReports();
 }catch(e){notify(e.message,true)}
}
function openReturn(u){
 showTab('retiradas');$('devolucaoCard').hidden=false;$('devolucaoForm').reset();
 $('devolucaoId').value=u.id;$('devolucaoPlaca').textContent='· '+plate(u.veiculo_id);
 $('devolucaoForm').elements.fim.value=localNow();
 $('devolucaoForm').elements.km_final.min=u.km_inicial;
 $('devolucaoForm').elements.km_final.placeholder='Mínimo: '+u.km_inicial;
 $('devolucaoForm').dataset.kmInicial=u.km_inicial;
 updatePreview();$('devolucaoCard').scrollIntoView({behavior:'smooth'});
}
function updatePreview(){
 const f=$('devolucaoForm'),km=Number(f.elements.km_final.value),liters=Number(f.elements.litros_abastecidos.value),cheio=$('tanqueDevolucao').value==='cheio';
 const initial=Number(f.dataset.kmInicial||0),distance=km>=initial?km-initial:null;
 $('justificativaWrap').hidden=cheio;
 f.elements.justificativa_excecao.required=!cheio;
 f.elements.foto_comprovante.required=liters>0;
 f.elements.posto_abastecimento.required=liters>0;
 $('previewDevolucao').textContent=distance===null?'Informe um KM final válido.':number(distance)+' km percorridos · '+(cheio&&liters>0?number(distance/liters)+' km/L (estimativa com tanque cheio)':'Média indisponível até completar o tanque')+' · '+money(f.elements.valor_abastecimento.value);
}
for(const field of ['km_final','litros_abastecidos','valor_abastecimento','combustivel_devolucao'])$('devolucaoForm').elements[field].addEventListener('input',updatePreview);
$('cancelarDevolucao').onclick=()=>$('devolucaoCard').hidden=true;
$('usoForm').onsubmit=async e=>{
 e.preventDefault();const form=e.target;setBusy(form,true);
 try{
  const data=Object.fromEntries(new FormData(form));
  data.inicio=new Date(data.inicio).toISOString();data.km_inicial=Number(data.km_inicial);
  data.combustivel_retirada=form.elements.combustivel_retirada.checked?'cheio':'incompleto';
  data.foto_painel_retirada=await fileToPhoto(form.elements.foto_painel_retirada.files[0]);
  await api('uso','POST',data);form.reset();form.elements.inicio.value=localNow();
  notify('Retirada registrada com foto e confirmação de tanque cheio.');await load();
 }catch(err){notify(err.message,true)}finally{setBusy(form,false)}
};
$('devolucaoForm').onsubmit=async e=>{
 e.preventDefault();const form=e.target;setBusy(form,true);
 try{
  const data=Object.fromEntries(new FormData(form));
  data.fim=new Date(data.fim).toISOString();data.km_final=Number(data.km_final);
  data.litros_abastecidos=Number(data.litros_abastecidos);data.valor_abastecimento=Number(data.valor_abastecimento);
  data.foto_painel_devolucao=await fileToPhoto(form.elements.foto_painel_devolucao.files[0]);
  if(data.litros_abastecidos>0)data.foto_comprovante=await fileToPhoto(form.elements.foto_comprovante.files[0]);
  await api('devolucao','PATCH',data);
  $('devolucaoCard').hidden=true;notify('Devolução concluída. Distância, custos e média atualizados.');await load();
 }catch(err){notify(err.message,true)}finally{setBusy(form,false)}
};
$('veiculoForm').onsubmit=async e=>{
 e.preventDefault();const form=e.target;setBusy(form,true);
 try{await api('veiculo','POST',Object.fromEntries(new FormData(form)));form.reset();notify('Veículo cadastrado.');await init()}
 catch(err){notify(err.message,true)}finally{setBusy(form,false)}
};
$('manutencaoForm').onsubmit=async e=>{
 e.preventDefault();const form=e.target;setBusy(form,true);
 try{
  const data=Object.fromEntries(new FormData(form));data.km_servico=Number(data.km_servico);data.intervalo_km=Number(data.intervalo_km);
  await api('manutencao','POST',data);form.reset();notify('Manutenção registrada e próximo vencimento atualizado.');await loadMaintenance();
 }catch(err){notify(err.message,true)}finally{setBusy(form,false)}
};
async function loadMaintenance(){
 if(!admin)return;
 try{
  maintenance=(await api('manutencoes')).alerts||[];const rows=$('alertas');rows.replaceChildren();
  for(const m of maintenance.sort((a,b)=>a.km_restantes-b.km_restantes)){
   const tr=document.createElement('tr');
   [m.placa,m.tipo,number(m.km_atual),number(m.proximo_km),number(m.km_restantes)+' km',m.situacao].forEach(v=>td(tr,v));
   if(m.situacao==='Vencida')tr.className='danger';rows.append(tr);
  }
  if(!maintenance.length){const tr=document.createElement('tr');td(tr,'Nenhuma manutenção cadastrada. Registre o último serviço para ativar alertas.');rows.append(tr)}
 }catch(e){notify(e.message,true)}
}
$('atualizar').onclick=load;
$('filtroInicio').onchange=renderReports;$('filtroFim').onchange=renderReports;
$('csv').onclick=()=>{
 const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const data=[['Placa','Síndico','Retirada','Devolução','KM inicial','KM final','KM rodados','Litros','Valor R$','Média km/L','Tanque','Destino','Finalidade'],
 ...currentFilters().map(u=>[plate(u.veiculo_id),name(u.sindico_id),date(u.inicio),date(u.fim),u.km_inicial,u.km_final,u.km_rodados,u.litros_abastecidos,u.valor_abastecimento,validAvg(u)?u.media_km_l:'',u.combustivel_devolucao,u.destino,u.finalidade])];
 const blob=new Blob(['\uFEFF'+data.map(row=>row.map(esc).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='exclusive-os-frota.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
};
async function init(){
 try{
  vehicles=(await api('veiculos')).items||[];
  const options=vehicles.map(v=>({id:v.id,label:v.placa+' · '+v.modelo}));
  opts($('veiculo'),options);opts($('filtroVeiculo'),options,true);opts($('manutencaoVeiculo'),options);
  try{
   sindicos=(await api('sindicos')).items||[];admin=true;
   $('sindicoWrap').hidden=false;$('filtroSindicoWrap').hidden=false;$('tabCadastro').hidden=false;$('tabManutencoes').hidden=false;
   const people=sindicos.map(s=>({id:s.id,label:s.nome}));opts($('sindico'),people);opts($('filtroSindico'),people,true);
  }catch(e){if(e.message!=='Sem permissão')throw e}
  $('usoForm').elements.inicio.value=localNow();
  await load();
 }catch(e){notify(e.message+' — faça login em /admin.html e aplique a migração SQL.',true)}
}
init();
