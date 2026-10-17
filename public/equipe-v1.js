'use strict';
const root=document.getElementById('app');
const css=document.createElement('style');
css.textContent=':root{font-family:Inter,system-ui,sans-serif;color:#292a47;background:#f7f6f3}*{box-sizing:border-box}body{margin:0}header{background:#252549;color:white;padding:19px 4%}header a{color:#e4c48b}main{max-width:1250px;margin:auto;padding:22px 16px}h1{margin:0 0 7px}h2{font-size:19px;margin:0 0 12px}.hero{background:linear-gradient(110deg,#292a56,#454575);color:#fff;padding:25px;border-radius:15px;margin-bottom:17px}.hero p{color:#e6e3f0}.card{background:white;border:1px solid #e7e5ed;border-radius:13px;padding:18px;margin-bottom:14px;box-shadow:0 5px 20px #292a5010}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.stat{border-left:3px solid #98773d}.stat strong{display:block;font-size:25px;color:#343568}.stat span,small,.muted{font-size:12px;color:#6e7085}.columns{display:grid;grid-template-columns:310px 1fr;gap:15px}.member{display:block;width:100%;text-align:left;background:#fff;border:1px solid #e6e4ed;border-radius:9px;padding:13px;margin:7px 0;cursor:pointer;color:#30314d}.member.active{background:#efedf8;border-color:#343568}.member b{display:block}.bar{height:8px;border-radius:8px;background:#eeecf3;margin-top:9px;overflow:hidden}.bar i{height:100%;display:block;background:#343568}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.table{overflow:auto}table{border-collapse:collapse;width:100%;min-width:650px}td,th{border-bottom:1px solid #eceaf0;padding:10px;text-align:left;font-size:12px}th{background:#f8f7fb}label{display:block;font-size:12px;font-weight:700;margin-bottom:10px}input,select,textarea{width:100%;padding:10px;border:1px solid #c9c8d4;border-radius:8px;margin-top:5px;font:inherit}button{cursor:pointer}button.action{background:#343568;color:#fff;border:0;padding:11px 14px;border-radius:9px;font-weight:700}button.gold{background:#98773d}.notice{padding:12px;border-radius:9px;background:#eeedf7;margin-bottom:12px}.warn{padding:11px;background:#fcf7ec;border-left:3px solid #98773d;font-size:12px;margin:10px 0}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #c2a16a;outline-offset:2px}@media(max-width:800px){.columns{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}}@media(max-width:480px){main{padding:12px}.grid{grid-template-columns:1fr}.hero{padding:17px}}';
document.head.append(css);
root.innerHTML='<header><b>◆ EXCLUSIVE SÍNDICOS · OS</b> <a style="float:right" href="/operacional.html">← Operacional</a></header><main><div class="hero"><small style="color:#e4c48b">GESTÃO OPERACIONAL</small><h1>Equipe e carteiras</h1><p>Distribuição, complexidade, pendências e reequilíbrio de carga.</p></div><div id="notice" class="notice" hidden></div><div class="stats"><div class="card stat"><span>Síndicos</span><strong id="countPeople">—</strong></div><div class="card stat"><span>Condomínios</span><strong id="countCondos">—</strong></div><div class="card stat"><span>Pontos atribuídos</span><strong id="countPoints">—</strong></div><div class="card stat"><span>Sem síndico ativo</span><strong id="countMissing">—</strong></div></div><div class="columns"><div class="card"><h2>Minha equipe</h2><p class="muted">Selecione um síndico para ver os condomínios e a carga.</p><div id="members"></div><div class="warn">A pontuação indica complexidade da carteira, não qualidade individual.</div></div><div><div class="card"><h2 id="personName">Detalhamento</h2><div class="stats"><div class="stat card"><span>Condomínios</span><strong id="personCondos">—</strong></div><div class="stat card"><span>Carga</span><strong id="personPoints">—</strong></div><div class="stat card"><span>Pendências</span><strong id="personOpen">—</strong></div><div class="stat card"><span>Atrasados</span><strong id="personLate">—</strong></div></div><p id="classes" class="muted"></p><p id="status" class="warn"></p></div><div class="card"><h2>Condomínios vinculados</h2><label>Pesquisar<input id="search" placeholder="Nome, região, classe"></label><div class="table"><table><thead><tr><th>Condomínio</th><th>Classe</th><th>Unidades</th><th>Pontos</th><th>Pendências</th><th>Atrasos</th><th></th></tr></thead><tbody id="rows"></tbody></table></div></div><div class="card"><h2>Redistribuir carteira</h2><p class="muted">A transferência altera o síndico do condomínio, mas não migra automaticamente tarefas, chamados ou permissões.</p><form id="transfer"><div class="grid"><label>Condomínio<select name="condominio_id" id="condo" required></select></label><label>Novo síndico<select name="destino_id" id="destination" required></select></label></div><label>Motivo<textarea name="motivo" required minlength="10" maxlength="1000" placeholder="Explique o motivo da transferência"></textarea></label><div id="impact" class="warn">Selecione o condomínio e o destino.</div><button class="action gold">Confirmar redistribuição</button></form></div></div></div><div class="card"><h2>Como os indicadores são calculados</h2><p class="muted">Classes A = 4, B = 7, C = 11 e D = 16 pontos. A carga é comparada à média dos síndicos ativos, não a um limite de capacidade validado. Pendências abrangem chamados, tarefas e processos associados aos condomínios, mesmo quando executados por outros funcionários. Um índice de desempenho individual depende de SLAs e qualidade de entrega, não disponíveis neste painel.</p></div></main>';
const $=id=>document.getElementById(id);
let data=null,selected=null;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function notice(msg){$('notice').hidden=false;$('notice').textContent=msg}
async function api(action='',body){
 const r=await fetch('/api/equipe'+(action?'?action='+action:''),{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erro de conexão');return d;
}
function options(el,rows){el.replaceChildren();for(const r of rows)el.add(new Option(r.label,r.value))}
function getCondo(id){return data.condominios.find(c=>c.id===id)}
function render(){
 if(!data)return;
 $('countPeople').textContent=data.users.length;$('countCondos').textContent=data.condominios.length;
 $('countPoints').textContent=data.users.reduce((s,u)=>s+u.pontos,0);$('countMissing').textContent=data.sem_responsavel.length;
 const members=$('members');members.replaceChildren();
 for(const u of data.users){
  const b=document.createElement('button');b.className='member'+(selected===u.id?' active':'');
  const label=document.createElement('b');label.textContent=u.nome;const small=document.createElement('small');small.textContent=u.condominios+' condomínios · '+u.pontos+' pontos · '+u.atrasados+' atrasados';
  const bar=document.createElement('div');bar.className='bar';const fill=document.createElement('i');fill.style.width=Math.min(100,u.pontos/Math.max(1,data.media_pontos*1.5)*100)+'%';bar.append(fill);b.append(label,small,bar);
  b.onclick=()=>{selected=u.id;render()};members.append(b);
 }
 const u=data.users.find(x=>x.id===selected);if(!u)return;
 $('personName').textContent=u.nome;$('personCondos').textContent=u.condominios;$('personPoints').textContent=u.pontos+' pts';$('personOpen').textContent=u.abertos;$('personLate').textContent=u.atrasados;
 $('classes').textContent='Complexidade: A '+u.classes.A+' · B '+u.classes.B+' · C '+u.classes.C+' · D '+u.classes.D;
 $('status').textContent=u.pontos>data.media_pontos*1.1?'Carga acima de 110% da média da equipe; avaliar redistribuição.':'Carga estrutural dentro de 110% da média. Verifique também pendências e atrasos.';
 const mine=data.condominios.filter(c=>norm(c.sindico)===norm(u.nome));
 options($('condo'),mine.map(c=>({value:c.id,label:c.nome+' · '+c.pontos+' pts'})));
 options($('destination'),data.users.filter(x=>x.id!==u.id).map(x=>({value:x.id,label:x.nome+' · '+x.pontos+' pts'})));
 const tbody=$('rows');tbody.replaceChildren();const search=norm($('search').value);
 for(const c of mine.filter(c=>norm(c.nome+' '+c.regiao+' '+c.classe).includes(search))){
  const tr=document.createElement('tr');for(const v of [c.nome,c.classe,c.unidades,c.pontos,c.indicadores.abertos,c.indicadores.atrasados]){const td=document.createElement('td');td.textContent=v??'—';tr.append(td)}
  const td=document.createElement('td'),b=document.createElement('button');b.className='action';b.textContent='Transferir';b.onclick=()=>{$('condo').value=c.id;impact();$('transfer').scrollIntoView({behavior:'smooth'})};td.append(b);tr.append(td);tbody.append(tr);
 }
 if(!tbody.children.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=7;td.textContent='Nenhum condomínio encontrado nesta carteira.';tr.append(td);tbody.append(tr)}
 impact();
}
function impact(){
 if(!data)return;const c=getCondo($('condo').value),u=data.users.find(x=>x.id===$('destination').value),old=data.users.find(x=>x.id===selected);
 $('impact').textContent=c&&u&&old?c.nome+' ('+c.pontos+' pts): '+old.nome+' '+old.pontos+' → '+(old.pontos-c.pontos)+' pts; '+u.nome+' '+u.pontos+' → '+(u.pontos+c.pontos)+' pts.':'Selecione condomínio e destino.';
}
$('search').addEventListener('input',render);$('condo').onchange=impact;$('destination').onchange=impact;
$('transfer').onsubmit=async e=>{
 e.preventDefault();const form=e.target,b=Object.fromEntries(new FormData(form)),c=getCondo(b.condominio_id),u=data.users.find(x=>x.id===b.destino_id);
 if(!c||!u)return notice('Selecione condomínio e destino.');
 if(!confirm('Confirmar transferência de '+c.nome+' para '+u.nome+'? As tarefas e permissões não serão transferidas automaticamente.'))return;
 const btn=form.querySelector('button[type=submit],button:not([type])');btn.disabled=true;
 try{await api('transferir',b);await load();notice('Carteira redistribuída com registro de auditoria. Revise os acessos e as tarefas do condomínio.')}
 catch(err){notice(err.message)}finally{btn.disabled=false}
};
async function load(){
 data=await api();if(!data.users.some(u=>u.id===selected))selected=data.users.find(u=>norm(u.nome).includes('gregory'))?.id||data.users[0]?.id;
 render();
}
load().catch(e=>notice(e.message+' — faça login em /admin.html e aplique a migração SQL.'));
