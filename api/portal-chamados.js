const crypto=require('node:crypto');
const {db,validCpf}=require('../lib/access');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const categories=['Manutenção','Perturbação','Elevador','Segurança','Limpeza','Áreas comuns','Outros'];
const recent=new Map();
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método não permitido'});
 try{
  const client=db();
  if(req.method==='GET'){
   const {data,error}=await client.from('os_condominios').select('id,nome').eq('status','Ativo').order('nome');
   if(error)throw error;
   return res.status(200).json({condominios:data||[],categorias:categories,plantao_telefone:process.env.PLANTAO_TELEFONE||null});
  }
  const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host,proto=req.headers['x-forwarded-proto']||'https';
  if(origin&&origin!==proto+'://'+host)return res.status(403).json({error:'Origem não autorizada'});
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return res.status(415).json({error:'Envie JSON'});
  const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].trim();
  const key=crypto.createHash('sha256').update(ip).digest('hex');
  const now=Date.now();if(recent.size>5000)recent.clear();
  if(now-(recent.get(key)||0)<30000)return res.status(429).json({error:'Aguarde 30 segundos antes de enviar outro chamado'});
  const b=req.body||{};
  if(b.website)return res.status(400).json({error:'Envio inválido'});
  const condo=String(b.condominio_id||''),apto=String(b.apartamento||'').trim(),nome=String(b.nome||'').trim(),cpf=String(b.cpf||'').replace(/\D/g,''),categoria=String(b.categoria||''),obs=String(b.observacoes||'').trim(),urgente=b.urgente===true;
  if(!UUID.test(condo)||apto.length<1||apto.length>30||nome.length<5||nome.length>150||!validCpf(cpf)||!categories.includes(categoria)||obs.length<10||obs.length>3000)return res.status(400).json({error:'Confira condomínio, apartamento, nome completo, CPF válido, categoria e observações (mínimo 10 caracteres)'});
  if(urgente)return res.status(400).json({error:'Em urgências, entre em contato com o plantão antes de abrir um chamado comum'});
  const {data:c,error:ce}=await client.from('os_condominios').select('id').eq('id',condo).eq('status','Ativo').maybeSingle();if(ce)throw ce;if(!c)return res.status(400).json({error:'Condomínio indisponível'});
  const protocolo='OS-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+crypto.randomBytes(4).toString('hex').toUpperCase();
  const {error:e}=await client.from('os_chamados').insert({condominio_id:condo,titulo:categoria+' · Apto '+apto,descricao:obs,status:'Aberto',prioridade:'Normal',protocolo,categoria,apartamento:apto,solicitante_nome:nome,solicitante_cpf_ultimos4:cpf.slice(-4),origem:'morador',prazo_resposta:new Date(now+48*3600000).toISOString()});
  if(e)throw e;recent.set(key,now);return res.status(201).json({protocolo,status:'Aberto',prazo_resposta:new Date(now+48*3600000).toISOString()});
 }catch(e){console.error('portal-chamados:',e.message);return res.status(503).json({error:'Não foi possível registrar o chamado. Tente novamente.'})}
};