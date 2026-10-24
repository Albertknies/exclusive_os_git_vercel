'use strict';
const {db,session}=require('../lib/access');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
  const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host,proto=req.headers['x-forwarded-proto']||'https';
  if(origin&&origin!==proto+'://'+host)return res.status(403).json({error:'Origem não autorizada'});
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return res.status(415).json({error:'Envie JSON'});
  const s=session(req);if(!s)return res.status(401).json({error:'Entre no sistema'});
  const client=db();
  const {data:actor,error:ae}=await client.from('os_users').select('id,perfil,ativo').eq('id',s.id).maybeSingle();
  if(ae)throw ae;
  if(!actor?.ativo)return res.status(401).json({error:'Conta inativa'});
  if(!['Master','Gerente'].includes(actor.perfil))return res.status(403).json({error:'Apenas Master e Gerente podem transferir carteiras'});
  const ids=req.body?.ids,origem=req.body?.origem,destino=req.body?.destino;
  if(!Array.isArray(ids)||ids.length<1||ids.length>100||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!UUID.test(id)))return res.status(400).json({error:'Selecione de 1 a 100 condomínios válidos, sem repetição'});
  if(typeof origem!=='string'||typeof destino!=='string'||!origem.trim()||!destino.trim()||origem!==origem.trim()||destino!==destino.trim()||destino.length>150||origem===destino)return res.status(400).json({error:'Informe responsáveis diferentes e válidos'});
  const {data,error:e}=await client.rpc('os_transferir_carteira',{p_ids:ids,p_origem:origem,p_destino:destino,p_actor:actor.id});
  if(e){
   if(/permissão|inválid|não cadastrado|carteira mudou|não pertencentes/.test(e.message))return res.status(409).json({error:e.message});
   throw e;
  }
  return res.status(200).json({ok:true,quantidade:data});
 }catch(e){console.error('transferencia-carteira',e.message);return res.status(503).json({error:'Não foi possível concluir a transferência'});}
};
