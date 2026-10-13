const {db,session}=require('../lib/access');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADM=new Set(['Master','Gerente','Administrativo']);
module.exports=async(req,res)=>{
res.setHeader('Cache-Control','no-store');
try{
if(!['GET','POST','DELETE'].includes(req.method))return res.status(405).json({error:'Método inválido'});
const s=session(req);if(!s)return res.status(401).json({error:'Entre no sistema'});
const c=db();
const a=await c.from('os_users').select('id,perfil,ativo').eq('id',s.id).maybeSingle();
if(a.error)throw a.error;
if(!a.data?.ativo)return res.status(401).json({error:'Conta inativa'});
if(!ADM.has(a.data.perfil))return res.status(403).json({error:'Sem permissão'});
if(req.method==='GET'){
const [u,v]=await Promise.all([c.from('os_users').select('id,nome,perfil,ativo').order('nome').limit(500),c.from('os_vinculos').select('user_id,condominio_id').limit(2000)]);
if(u.error)throw u.error;if(v.error)throw v.error;
return res.status(200).json({users:u.data||[],links:v.data||[]});
}
const origin=req.headers.origin;
const host=req.headers['x-forwarded-host']||req.headers.host;
const proto=req.headers['x-forwarded-proto']||'https';
if(origin&&origin!==proto+'://'+host)return res.status(403).json({error:'Origem não autorizada'});
if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'Envie JSON'});
const user_id=String(req.body?.user_id||''),condominio_id=String(req.body?.condominio_id||'');
if(!UUID.test(user_id)||!UUID.test(condominio_id))return res.status(400).json({error:'ID inválido'});
if(req.method==='POST'){
const u=await c.from('os_users').select('id,ativo').eq('id',user_id).maybeSingle();
if(u.error)throw u.error;if(!u.data?.ativo)return res.status(400).json({error:'Usuário inativo'});
const d=await c.from('os_vinculos').upsert({user_id,condominio_id},{onConflict:'user_id,condominio_id'});
if(d.error)throw d.error;
}else{
const d=await c.from('os_vinculos').delete().eq('user_id',user_id).eq('condominio_id',condominio_id);
if(d.error)throw d.error;
}
return res.status(200).json({ok:true});
}catch(e){console.error('carteiras',e.message);return res.status(503).json({error:'Serviço indisponível'})}
};