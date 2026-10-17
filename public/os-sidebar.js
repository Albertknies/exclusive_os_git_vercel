'use strict';
/* Navegação compartilhada: não interfere nos formulários nem nas APIs dos módulos. */
(function(){
 const entries=[
  ['GERENCIAMENTO'],
  ['◫','Visão geral','/operacional.html'],
  ['♙','Equipe e carteiras','/equipe.html'],
  ['▦','Condomínios','/operacional.html#condominios'],
  ['☑','Tarefas e processos','/operacional.html#processos'],
  ['◉','Chamados','/operacional.html#chamados'],
  ['▤','Vistorias','/operacional.html#vistorias'],
  ['◇','Financeiro','/operacional.html#financeiro'],
  ['FROTA'],
  ['🚗','Visão da frota','/veiculos.html'],
  ['↗','Retiradas','/veiculos.html#retirada'],
  ['↙','Devoluções','/veiculos.html#pendentes'],
  ['⛽','Abastecimentos','/veiculos.html#abastecimentos'],
  ['⚒','Manutenção','/veiculos.html#manutencao'],
  ['ADMINISTRAÇÃO'],
  ['▥','Indicadores','/operacional.html#indicadores'],
  ['♧','Usuários e acessos','/admin.html']
 ];
 const aside=document.createElement('aside');aside.id='os-sidebar';aside.setAttribute('aria-label','Menu lateral principal');
 const brand=document.createElement('a');brand.className='os-brand';brand.href='/operacional.html';brand.innerHTML='◆ EXCLUSIVE SÍNDICOS<small>EXCLUSIVE OS · GESTÃO</small>';aside.append(brand);
 const path=location.pathname;
 for(const item of entries){
  if(item.length===1){const group=document.createElement('div');group.className='os-group';group.textContent=item[0];aside.append(group);continue}
  const a=document.createElement('a');a.className='os-link';a.href=item[2];
  const icon=document.createElement('span');icon.className='os-icon';icon.textContent=item[0];
  const name=document.createElement('span');name.textContent=item[1];a.append(icon,name);
  if(item[2]===path || (item[2]==='/veiculos.html'&&path==='/veiculos.html') || (item[2]==='/equipe.html'&&path==='/equipe.html')){if(item[2]===path)a.setAttribute('aria-current','page')}
  aside.append(a);
 }
 const foot=document.createElement('div');foot.className='os-foot';foot.textContent='Exclusive OS · Operação integrada';aside.append(foot);
 const toggle=document.createElement('button');toggle.id='os-menu-toggle';toggle.type='button';toggle.textContent='☰';toggle.setAttribute('aria-label','Abrir menu lateral');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','os-sidebar');
 const overlay=document.createElement('div');overlay.id='os-menu-overlay';
 function openMenu(open){document.body.classList.toggle('os-nav-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Fechar menu lateral':'Abrir menu lateral');toggle.textContent=open?'×':'☰'}
 toggle.addEventListener('click',()=>openMenu(!document.body.classList.contains('os-nav-open')));
 overlay.addEventListener('click',()=>openMenu(false));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')openMenu(false)});
 aside.addEventListener('click',e=>{const link=e.target.closest('a.os-link');if(link)openMenu(false)});
 document.body.prepend(overlay,aside,toggle);
 document.body.classList.add('os-shell-ready');
 /* Abre a aba interna correspondente, quando ela já existe no módulo. */
 function routeHash(){
  const hash=decodeURIComponent(location.hash.slice(1));if(!hash)return;
  if(path==='/veiculos.html'){
   const key=hash==='abastecimentos'?'abastecimentos':hash==='manutencao'?'manutencao':hash;
   const btn=document.querySelector('.tabs [data-tab="'+key+'"],.tabs [data-target="'+key+'"]');
   if(btn)btn.click();else{const target=document.getElementById(key);if(target)target.scrollIntoView()}
  }
 }
 window.addEventListener('hashchange',routeHash);
 window.addEventListener('load',routeHash);
})();
