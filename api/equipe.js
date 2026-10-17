'use strict';
const {db,session}=require('../lib/access');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN=new Set(['Master','Gerente']);
const weights={A:4,B:7,C:11,D:16};
function bad(res,status,error){return res.status(status).json({error})}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function pending(s){return !['concluido','concluida','cancelado','cancelada','resolvido','finalizado'].includes(normalize(s))}
function overdue(row){if(!pending(row.status))return false;const due=row.prazo;if(!due)return false;return due<new Date().toISOString().slice(0,10)}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return bad(res,405,'Método não permitido');
 try{
  const s=session(req);if(!s)return bad(res,401,'Entre no sistema');
  const c=db();
  const {data:actor,error:ae}=await c.from('os_users').select('id,nome,perfil,ativo').eq('id',s.id).maybeSingle();
  if(ae)throw ae;if(!actor?.ativo)return bad(res,401,'Conta inativa');
  if(!ADMIN.has(actor.perfil))return bad(res,403,'Somente Master e Gerente podem gerir carteiras');
  if(req.method==='POST'){
   const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host;
   const proto=req.headers['x-forwarded-proto']||(/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host||'')?'http':'https');
   if(origin&&origin!==proto+'://'+host)return bad(res,403,'Origem não autorizada');
   if(!String(req.headers['content-type']||'').startsWith('application/json'))return bad(res,415,'Envie JSON');
   if(req.query?.action!=='transferir')return bad(res,404,'Ação desconhecida');
   const b=req.body||{},condominio_id=String(b.condominio_id||''),destino_id=String(b.destino_id||''),motivo=String(b.motivo||'').trim();
   if(!UUID.test(condominio_id)||!UUID.test(destino_id)||motivo.length<10||motivo.length>1000)return bad(res,400,'Condomínio, destinatário ou motivo inválido (mínimo 10 caracteres)');
   const {data:dest,error:de}=await c.from('os_users').select('id,nome,perfil,ativo').eq('id',destino_id).maybeSingle();
   if(de)throw de;if(!dest?.ativo||dest.perfil!=='Síndico')return bad(res,400,'Destinatário deve ser síndico ativo');
   const {data:cond,error:ce}=await c.from('os_condominios').select('id,nome,sindico,classe').eq('id',condominio_id).maybeSingle();
   if(ce)throw ce;if(!cond)return bad(res,404,'Condomínio não encontrado');
   if(normalize(cond.sindico)===normalize(dest.nome))return bad(res,409,'Condomínio já pertence a este síndico');
   const {data:old,error:oe}=await c.from('os_users').select('id,nome,perfil').eq('perfil','Síndico').eq('nome',cond.sindico).limit(2);
   if(oe)throw oe;
   const source=old?.length===1?old[0]:null;
   // A função SQL faz atualização e auditoria em uma única transação com bloqueio de linha.
   const {data:result,error:re}=await c.rpc('os_transferir_carteira',{p_condominio_id:condominio_id,p_destino_id:destino_id,p_actor_id:actor.id,p_motivo:motivo,p_sindico_esperado:cond.sindico||''});
   if(re){if(re.code==='P0001')return bad(res,409,re.message);throw re}
   return res.json({ok:true,item:result,origem:source?.nome||cond.sindico||'Não atribuído',destino:dest.nome});
  }
  const [ur,cr,tr,pr,hr]=await Promise.all([
   c.from('os_users').select('id,nome,perfil,ativo').eq('perfil','Síndico').eq('ativo',true).order('nome').limit(500),
   c.from('os_condominios').select('id,nome,sindico,classe,unidades,status,regiao').order('nome').limit(1000),
   c.from('os_tarefas').select('id,condominio_id,responsavel_id,status,prazo').limit(5000),
   c.from('os_processos').select('id,condominio_id,responsavel_id,status,prazo').limit(5000),
   c.from('os_chamados').select('id,condominio_id,responsavel_id,status').limit(5000)
  ]);
  for(const x of [ur,cr,tr,pr,hr])if(x.error)throw x.error;
  const users=ur.data||[],condos=cr.data||[];
  const tasks=[...(tr.data||[]),...(pr.data||[]),...(hr.data||[])];
  const byCondo=new Map();
  for(const row of tasks){if(!row.condominio_id)continue;const m=byCondo.get(row.condominio_id)||{abertos:0,atrasados:0,total:0};m.total++;if(pending(row.status))m.abertos++;if(overdue(row))m.atrasados++;byCondo.set(row.condominio_id,m)}
  const details=condos.map(x=>({...x,pontos:weights[x.classe]||0,indicadores:byCondo.get(x.id)||{abertos:0,atrasados:0,total:0}}));
  const people=users.map(u=>{
   const assigned=details.filter(x=>normalize(x.sindico)===normalize(u.nome));
   const pontos=assigned.reduce((n,x)=>n+x.pontos,0),abertos=assigned.reduce((n,x)=>n+x.indicadores.abertos,0),atrasados=assigned.reduce((n,x)=>n+x.indicadores.atrasados,0);
   const concluidos=assigned.reduce((n,x)=>n+x.indicadores.total-x.indicadores.abertos,0);
   return {id:u.id,nome:u.nome,condominios:assigned.length,pontos,abertos,atrasados,concluidos,classes:Object.fromEntries(Object.keys(weights).map(k=>[k,assigned.filter(x=>x.classe===k).length]))};
  });
  const unassigned=details.filter(x=>!people.some(u=>normalize(u.nome)===normalize(x.sindico)));
  const totalPoints=people.reduce((n,u)=>n+u.pontos,0),average=people.length?totalPoints/people.length:0;
  return res.json({users:people,condominios:details,sem_responsavel:unassigned.map(x=>x.id),media_pontos:average,pesos:weights,metodologia:'Carga estrutural por classe. Pendências e atrasos são indicadores separados, não notas individuais. Dados atuais, não histórico de SLA.'});
 }catch(e){console.error('equipe:',e.message);return bad(res,503,'Não foi possível carregar a equipe. Verifique banco e migração SQL.')}
};