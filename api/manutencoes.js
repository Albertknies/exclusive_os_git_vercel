const {db,session}=require('../lib/access');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN=new Set(['Master','Gerente']);
const fields=['condominio_id','titulo','tipo','fornecedor','valor','forma_pagamento','observacoes','status','prazo'];
const cols='id,condominio_id,titulo,tipo,fornecedor,valor,forma_pagamento,observacoes,status,prazo,created_by,pedido_ajuda,ajuda_solicitada_em,ajuda_solicitada_por,ajuda_email_status,created_at,updated_at';
function fail(res,status,error){return res.status(status).json({error})}
function validate(b,creating){
 const p={};for(const f of fields)if(Object.prototype.hasOwnProperty.call(b,f))p[f]=b[f];
 if(creating&&(!UUID.test(p.condominio_id||'')||typeof p.titulo!=='string'))throw Error('Informe condomínio e título');
 if(p.condominio_id!==undefined&&!UUID.test(p.condominio_id))throw Error('Condomínio inválido');
 if(p.titulo!==undefined){p.titulo=String(p.titulo).trim();if(p.titulo.length<3||p.titulo.length>180)throw Error('Título inválido')}
 for(const f of ['tipo','fornecedor','forma_pagamento','observacoes'])if(p[f]!==undefined){if(typeof p[f]!=='string'||p[f].length>(f==='observacoes'?5000:180))throw Error('Campo '+f+' inválido');p[f]=p[f].trim()}
 if(p.status!==undefined&&!['Aberta','Em andamento','Finalizada','Cancelada'].includes(p.status))throw Error('Situação inválida');
 if(p.valor!==undefined){if(p.valor==='')p.valor=null;else if(!Number.isFinite(Number(p.valor))||Number(p.valor)<0||Number(p.valor)>999999999)throw Error('Valor inválido');else p.valor=Number(p.valor)}
 if(p.prazo!==undefined){if(p.prazo==='')p.prazo=null;else if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(p.prazo))throw Error('Prazo inválido')}
 return p;
}
async function notifyManagers(client,item,actor){
 const {data:managers,error:err}=await client.from('os_users').select('email,nome').eq('perfil','Gerente').eq('ativo',true);
 if(err)throw err;
 const recipients=[...new Set((managers||[]).map(x=>x.email).filter(Boolean))];
 if(!recipients.length)return 'Sem gerente com e-mail cadastrado';
 if(!process.env.RESEND_API_KEY||!process.env.MANUTENCOES_EMAIL_FROM)return 'E-mail não configurado';
 const {data:condo}=await client.from('os_condominios').select('nome').eq('id',item.condominio_id).maybeSingle();
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.MANUTENCOES_EMAIL_FROM,to:recipients,subject:'[URGENTE] Ajuda solicitada — '+(condo?.nome||'Condomínio'),text:'Solicitação de apoio à gerência\\nCondomínio: '+(condo?.nome||item.condominio_id)+'\\nManutenção: '+item.titulo+'\\nSolicitante: '+actor.nome+'\\nAcesse o Exclusive OS para acompanhar.'})});
 if(!response.ok){console.error('Falha e-mail manutenção',response.status);return 'Falha no envio do e-mail'}
 return 'Enviado';
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try{
  const method=req.method;if(!['GET','POST','PATCH'].includes(method))return fail(res,405,'Método não permitido');
  if(method!=='GET'){
   const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host,proto=req.headers['x-forwarded-proto']||'https';
   if(origin&&origin!==proto+'://'+host)return fail(res,403,'Origem não autorizada');
   if(!String(req.headers['content-type']||'').startsWith('application/json'))return fail(res,415,'Envie JSON');
  }
  const s=session(req);if(!s)return fail(res,401,'Entre no sistema');
  const client=db();const {data:actor,error:ae}=await client.from('os_users').select('id,nome,perfil,ativo').eq('id',s.id).maybeSingle();
  if(ae)throw ae;if(!actor?.ativo)return fail(res,401,'Acesso inativo');
  let permitted=null;
  if(!ADMIN.has(actor.perfil)){
   const {data:links,error:le}=await client.from('os_vinculos').select('condominio_id').eq('user_id',actor.id);if(le)throw le;
   permitted=new Set((links||[]).map(x=>x.condominio_id));
  }
  if(method==='GET'){
   if(permitted&&!permitted.size)return res.status(200).json({items:[]});
   let q=client.from('os_manutencoes').select(cols).order('created_at',{ascending:false}).limit(1000);
   if(permitted)q=q.in('condominio_id',[...permitted]);
   const {data,error:e}=await q;if(e)throw e;return res.status(200).json({items:data||[]});
  }
  if(method!=='GET'&&!ADMIN.has(actor.perfil)&&actor.perfil!=='Síndico')return fail(res,403,'Sem permissão para alterar manutenções');
  if(method==='POST'){
   const body=validate(req.body||{},true);
   if(permitted&&!permitted.has(body.condominio_id))return fail(res,403,'Condomínio fora da sua carteira');
   body.created_by=actor.id;
   const {data,error:e}=await client.from('os_manutencoes').insert(body).select(cols).single();if(e)throw e;
   return res.status(201).json({item:data});
  }
  const id=String(req.body?.id||'');if(!UUID.test(id))return fail(res,400,'ID inválido');
  const {data:current,error:ce}=await client.from('os_manutencoes').select(cols).eq('id',id).maybeSingle();if(ce)throw ce;
  if(!current)return fail(res,404,'Manutenção não encontrada');
  if(permitted&&!permitted.has(current.condominio_id))return fail(res,403,'Manutenção fora da sua carteira');
  if(req.body?.action==='help'){
   if(actor.perfil!=='Síndico')return fail(res,403,'Pedido de ajuda reservado ao síndico');
   if(current.pedido_ajuda)return fail(res,409,'A gerência já foi acionada');
   if(['Finalizada','Cancelada'].includes(current.status))return fail(res,409,'Manutenção encerrada');
   const {data:updated,error:ue}=await client.from('os_manutencoes').update({pedido_ajuda:true,ajuda_solicitada_em:new Date().toISOString(),ajuda_solicitada_por:actor.id,ajuda_email_status:'Pendente',updated_at:new Date().toISOString()}).eq('id',id).eq('pedido_ajuda',false).select(cols).maybeSingle();
   if(ue)throw ue;if(!updated)return fail(res,409,'A gerência já foi acionada');
   let emailStatus='Falha no envio do e-mail';try{emailStatus=await notifyManagers(client,updated,actor)}catch(e){console.error('Aviso manutenção:',e.message)}
   await client.from('os_manutencoes').update({ajuda_email_status:emailStatus}).eq('id',id);
   return res.status(200).json({item:{...updated,ajuda_email_status:emailStatus},emailStatus});
  }
  const patch=validate(req.body||{},false);delete patch.condominio_id;
  if(!Object.keys(patch).length)return fail(res,400,'Nenhuma alteração');
  patch.updated_at=new Date().toISOString();
  const {data,error:e}=await client.from('os_manutencoes').update(patch).eq('id',id).select(cols).single();if(e)throw e;
  return res.status(200).json({item:data});
 }catch(e){if(/inválid|Informe|Campo/.test(e.message))return fail(res,400,e.message);console.error('manutencoes:',e.message);return fail(res,503,'Falha ao acessar manutenções')}
};