const {db,session}=require('../lib/access');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADM=new Set(['Master','Gerente','Administrativo']);
module.exports=async(req,res)=>{
res.setHeader('Cache-Control','no-store');
try{
if(!['GET','POST','PATCH','DELETE'].includes(req.method))return res.status(405).json({error:'Método inválido'});
const s=session(req);if(!s)return res.status(401).json({error:'Entre no sistema'});
const c=db();const {data:actor,error:ae}=await c.from('os_users').select('id,perfil,ativo').eq('id',s.id).maybeSingle();if(ae)throw ae;if(!actor?.ativo)return res.status(401).json({error:'Conta inativa'});
const vid=String(req.method==='GET'?req.query?.vistoria_id:req.body?.vistoria_id||'');
if(!UUID.test(vid))return res.status(400).json({error:'Vistoria inválida'});
const {data:v,error:ve}=await c.from('os_vistorias').select('id,condominio_id').eq('id',vid).maybeSingle();if(ve)throw ve;if(!v)return res.status(404).json({error:'Vistoria não encontrada'});
if(!ADM.has(actor.perfil)){const {data:l,error:le}=await c.from('os_vinculos').select('user_id').eq('user_id',actor.id).eq('condominio_id',v.condominio_id).maybeSingle();if(le)throw le;if(!l)return res.status(403).json({error:'Sem acesso ao condomínio'})}
if(req.method==='GET'){const {data,error:e}=await c.from('os_vistoria_itens').select('id,vistoria_id,descricao,resultado,observacao,created_at').eq('vistoria_id',vid).order('created_at');if(e)throw e;return res.status(200).json({items:data||[]})}
const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host,proto=req.headers['x-forwarded-proto']||'https';
if(origin&&origin!==proto+'://'+host)return res.status(403).json({error:'Origem inválida'});
if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'Envie JSON'});
const id=String(req.body?.id||'');if(req.method!=='POST'&&!UUID.test(id))return res.status(400).json({error:'Item inválido'});
const descricao=String(req.body?.descricao||'').trim(),resultado=String(req.body?.resultado||'Pendente'),observacao=String(req.body?.observacao||'').trim();
if(req.method!=='DELETE'&&(!descricao||descricao.length>300||observacao.length>3000||!['Pendente','Conforme','Não conforme','Não se aplica'].includes(resultado)))return res.status(400).json({error:'Dados inválidos'});
let query;
if(req.method==='POST')query=c.from('os_vistoria_itens').insert({vistoria_id:vid,descricao,resultado,observacao}).select().single();
else{const {data:item,error:ie}=await c.from('os_vistoria_itens').select('id').eq('id',id).eq('vistoria_id',vid).maybeSingle();if(ie)throw ie;if(!item)return res.status(404).json({error:'Item não encontrado'});query=req.method==='PATCH'?c.from('os_vistoria_itens').update({descricao,resultado,observacao,updated_at:new Date().toISOString()}).eq('id',id).eq('vistoria_id',vid).select().single():c.from('os_vistoria_itens').delete().eq('id',id).eq('vistoria_id',vid)}
const {data,error:e}=await query;if(e)throw e;
return res.status(200).json({item:data||null,ok:true});
}catch(e){console.error('vistoria-itens',e.message);return res.status(503).json({error:'Serviço indisponível'})}
};