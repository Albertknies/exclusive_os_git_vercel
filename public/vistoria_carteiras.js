/* Complemento local: carteiras provenientes do PDF e checklist imprimível da Exclusive. */
(()=>{
'use strict';
const KEY='exclusive_checklists_v1';
let checks={};try{checks=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(checks))}catch(e){alert('Não foi possível salvar o checklist neste navegador.')}};
const ITEMS=['Portas corta-fogo','Central da bomba de incêndio','Central do gás','Portas de entrada','Portão de carros','Gás','Grama','Lâmpadas','Cerca elétrica','Bomba da caixa d’água','Elevador','Limpeza','Telhados e calhas','Extintores','Câmeras','Luminárias de emergência','Central de alarme de incêndio','Central de alarme da cerca elétrica','Pub gourmet','Espaço coworking','Academia','Lixeira'];
const statuses=['Não avaliado','Bom','Regular','Ruim / Crítico','O.S. resolvida'];
const safe=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const id=()=>String(Date.now());
UI.openChecklist=(inspectionId)=>{state.modal='checklistExclusive';state.detail=inspectionId;render()};
const previousModal=renderModal;
renderModal=function(){
 if(state.modal!=='checklistExclusive')return previousModal();
 const inspection=db.inspections.find(i=>i.id===state.detail);if(!inspection)return modal('Vistoria não encontrada','');
 const c=condo(inspection.condoId), saved=checks[inspection.id]||{};
 const rows=ITEMS.map((item,n)=>{const v=saved.items?.[n]||{};return `<div class="field" style="border:1px solid #e5e4e1;padding:10px;margin:8px 0;border-radius:8px"><b>${n+1}. ${safe(item)}</b><div class="formgrid"><label class="field">Condição<select name="status_${n}">${statuses.map(s=>`<option ${s===v.status?'selected':''}>${safe(s)}</option>`).join('')}</select></label><label class="field">Observações<input class="input" name="obs_${n}" value="${safe(v.obs||'')}" placeholder="Descrição do item"></label></div></div>`}).join('');
 return modal('Checklist de vistoria · Exclusive',`<form onsubmit="UI.saveChecklist(event,${inspection.id})"><p class="sub">${safe(c?.nome)} · ${safe(inspection.data)} · ${safe(inspection.responsavel)}. Modelo baseado nos 22 locais do relatório fornecido; adapte os itens a cada prédio.</p><div style="max-height:52vh;overflow:auto;padding:3px">${rows}</div><div class="modalactions"><button type="button" class="btn secondary" onclick="UI.printChecklist(${inspection.id})">Imprimir / PDF</button><button class="btn">Salvar checklist</button></div></form>`);
};
UI.saveChecklist=(e,inspectionId)=>{e.preventDefault();const f=new FormData(e.target);const items=ITEMS.map((name,n)=>({name,status:String(f.get('status_'+n)),obs:String(f.get('obs_'+n)||'')}));checks[inspectionId]={items,updated:new Date().toISOString()};persist();alert('Checklist salvo neste navegador.');render()};
UI.printChecklist=(inspectionId)=>{
 const inspection=db.inspections.find(i=>i.id===inspectionId);if(!inspection)return alert('Vistoria não encontrada');
 const c=condo(inspection.condoId),record=checks[inspectionId]||{};const items=record.items||ITEMS.map(name=>({name,status:'Não avaliado',obs:''}));
 const count=s=>items.filter(i=>i.status===s).length;
 const body=items.map((item,n)=>`<section class="item"><div class="itemhead"><strong>${n+1}. ${safe(item.name)}</strong><span>${safe(item.status)}</span></div><p>${safe(item.obs||'Sem observações registradas.')}</p></section>`).join('');
 const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Vistoria | ${safe(c?.nome)}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#282a39;margin:0}header{background:#302f61;color:white;padding:22px 25px;border-bottom:6px solid #b18c4e}header h1{font-size:20px;margin:0}header small{letter-spacing:2px;color:#e6d3ae}.intro{padding:20px 0 14px;border-bottom:1px solid #ddd}.intro p{margin:5px 0}.summary{display:flex;gap:8px;margin:18px 0}.summary div{border:1px solid #dedbd5;padding:10px;flex:1;text-align:center}.summary b{display:block;font-size:18px;color:#302f61}.item{break-inside:avoid;border:1px solid #dedbd5;margin:10px 0}.itemhead{display:flex;justify-content:space-between;gap:10px;background:#f3f1ed;border-left:4px solid #b18c4e;padding:10px}.item p{margin:10px}footer{margin-top:28px;padding-top:12px;border-top:1px solid #ccc;color:#666;font-size:10px}@media print{button{display:none}}</style></head><body><header><small>EXCLUSIVE SÍNDICOS</small><h1>RELATÓRIO DE VISTORIA TÉCNICA</h1></header><div class="intro"><p><b>Condomínio:</b> ${safe(c?.nome)} &nbsp; <b>CNPJ:</b> ${safe(c?.cnpj||'Não informado')}</p><p><b>Síndico:</b> ${safe(c?.sindico||'Não atribuído')} &nbsp; <b>Vistoriador:</b> ${safe(inspection.responsavel)}</p><p><b>Data:</b> ${safe(inspection.data)} &nbsp; <b>Situação:</b> ${safe(inspection.status)}</p></div><div class="summary"><div><b>${items.length}</b>Itens</div><div><b>${count('Bom')}</b>Bom</div><div><b>${count('Regular')}</b>Regular</div><div><b>${count('Ruim / Crítico')}</b>Crítico</div><div><b>${count('O.S. resolvida')}</b>Resolvida</div></div>${body}<footer>EXCLUSIVE SÍNDICOS · Documento gerado pelo Exclusive OS · Os registros refletem as informações preenchidas pelo vistoriador.</footer><script>window.onload=()=>window.print()<\/script></body></html>`;
 const w=window.open('','_blank');if(!w)return alert('Permita janelas pop-up para imprimir o relatório.');w.document.write(html);w.document.close();
};
const priorInspection=renderModal;
renderModal=function(){const html=priorInspection();if(state.modal==='inspection')return html.replace('<div class="modalactions">','<div class="modalactions"><button type="button" class="btn secondary" onclick="UI.openChecklist('+state.detail+')">Checklist + PDF Exclusive</button>');return html};
const previousInspections=views.inspections;
views.inspections=()=>`<div class="panel"><p class="sub">Checklist estruturado com 22 locais do modelo enviado. Abra uma vistoria e selecione <b>Checklist + PDF Exclusive</b> para preencher, salvar e imprimir no layout da empresa.</p></div>`+previousInspections();
})();
