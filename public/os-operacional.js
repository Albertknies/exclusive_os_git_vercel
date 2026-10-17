'use strict';
(function(){
 const nav=document.querySelector('#app>nav');if(!nav)return;
 const button=document.createElement('button');button.id='os-operacional-toggle';button.type='button';button.textContent='☰';button.style.display='none';button.setAttribute('aria-controls','os-operacional-menu');button.setAttribute('aria-label','Abrir menu lateral');button.setAttribute('aria-expanded','false');
 nav.id='os-operacional-menu';const overlay=document.createElement('div');overlay.id='os-operacional-overlay';
 document.body.append(button,overlay);
 function setOpen(open){document.body.classList.toggle('os-nav-open',open);button.textContent=open?'×':'☰';button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Fechar menu lateral':'Abrir menu lateral')}
 button.addEventListener('click',()=>setOpen(!document.body.classList.contains('os-nav-open')));
 overlay.addEventListener('click',()=>setOpen(false));
 nav.addEventListener('click',e=>{if(e.target.closest('button,a'))setOpen(false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
 function goHash(){const name=decodeURIComponent(location.hash.slice(1));if(!name)return;const target=nav.querySelector('[data-tab="'+name+'"]');if(target)target.click()}
 window.addEventListener('hashchange',goHash);
 window.addEventListener('load',()=>setTimeout(goHash,400));
})();
