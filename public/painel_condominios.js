/* Navegação de carteiras e visão consolidada por condomínio — demonstração local. */
(()=>{
'use strict';
const clean=x=>String(x??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[k]));
const uniqueOwners=()=>[...new Set(db.condos.map(c=>c.sindico||'Não atribuído'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
let selected=uniqueOwners()[0]||'Não atribuído';
UI.choosePortfolio=(name)=>{selected=name;render()};
UI.openCondoPanel=(id)=>{state.detail=Number(id);state.modal='condoDashboard';render()};
const oldTeam=views.team;
views.team=()=>{
 const owners=uniqueOwners();if(!owners.includes(selected))selected=owners[0];
 const list=db.condos.filter(c=>(c.sindico||'Não atribuído')===selected).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
 return `<div class="panel"><div class="panelhead"><h2>Carteiras por responsável</h2><span class="sub">Selecione o responsável e abra o painel de cada condomínio</span></div><div class="toolbar"><label class="field">Responsável<select onchange="UI.choosePortfolio(this.value)">${owners.map(n=>`<option value="${clean(n)}" ${n===selected?'selected':''}>${clean(n)}</option>`).join('')}</select></label><span class="pill blue">${list.length} condomínios</span></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">${list.map(c=>`<button type="button" class="btn secondary" style="text-align:left;display:flex;justify-content:space-between;align-items:center;white-space:normal;min-height:55px" onclick="UI.openCondoPanel(${Number(c.id)})"><span>▦ ${clean(c.nome)}</span><span>→</span></button>`).join('')||'<p class="sub">Nenhum condomínio nesta carteira.</p>'}</div></div>`;
};
const oldModal=renderModal;
renderModal=function(){
 if(state.modal!=='condoDashboard')return oldModal();
 const c=condo(state.detail);if(!c)return modal('Condomínio não encontrado','');
 const tasks=db.tasks.filter(t=>Number(t.condoId)===c.id),ins=db.inspections.filter(i=>Number(i.condoId)===c.id);
 const open=tasks.filter(t=>!['Concluída','Finalizada','Encerrado'].includes(t.status));
 const calls=(typeof portalDB!=='undefined' && Array.isArray(portalDB.tickets)) ? portalDB.tickets.filter(t=>Number(t.condoId)===c.id) : []; 
 const info=(key,label)=>`<div class="detailrow"><span>${clean(label)}</span><b>${clean(c[key]||'Não informado')}</b></div>`;
 return modal('Painel do condomínio · '+clean(c.nome),`<div class="metrics" style="grid-template-columns:repeat(2,minmax(0,1fr))">${metric('Chamados do portal',calls.length,'Protocolos associados','◉')}${metric('Tarefas em aberto',open.length,'Registros operacionais','☑')}${metric('Vistorias',ins.length,'Agendadas e executadas','▤')}${metric('Unidades',c.unidades||'—','Cadastro do condomínio','▦')}</div><h2 style="margin:18px 0 8px">Dados gerais</h2><div class="split">${info('sindico','Síndico responsável')}${info('cnpj','CNPJ')}${info('endereco','Endereço')}${info('status','Situação')}${info('classe','Complexidade')}${DETAIL_FIELDS.filter(([k])=>!['cnpj','endereco'].includes(k)).map(([k,label])=>info(k,label)).join('')}</div><h2 style="margin:18px 0 8px">Chamados do portal</h2><div class="tablewrap"><table><thead><tr><th>Protocolo</th><th>Assunto</th><th>Status</th></tr></thead><tbody>${calls.map(t=>`<tr><td>${clean(t.protocol)}</td><td>${clean(t.titulo)}</td><td>${pill(t.status)}</td></tr>`).join('')||'<tr><td colspan="3">Nenhum chamado do portal.</td></tr>'}</tbody></table></div><h2 style="margin:18px 0 8px">Tarefas e processos</h2><div class="tablewrap"><table><thead><tr><th>Descrição</th><th>Status</th><th>Responsável</th><th>Prazo</th></tr></thead><tbody>${tasks.map(t=>`<tr><td>${clean(t.titulo)}</td><td>${pill(t.status)}</td><td>${clean(t.responsavel)}</td><td>${clean(t.prazo||'—')}</td></tr>`).join('')||'<tr><td colspan="4">Nenhum registro neste condomínio.</td></tr>'}</tbody></table></div><h2 style="margin:18px 0 8px">Vistorias</h2><div class="tablewrap"><table><thead><tr><th>Data</th><th>Vistoriador</th><th>Status</th></tr></thead><tbody>${ins.map(i=>`<tr><td>${clean(i.data)}</td><td>${clean(i.responsavel)}</td><td>${pill(i.status)}</td></tr>`).join('')||'<tr><td colspan="3">Nenhuma vistoria cadastrada.</td></tr>'}</tbody></table></div><div class="modalactions"><button class="btn secondary" onclick="UI.close()">Fechar</button>${canEditCondo()?`<button class="btn" onclick="UI.editCondo(${c.id})">Editar cadastro</button>`:''}</div>`);
};
})();
