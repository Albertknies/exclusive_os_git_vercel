const {db,session,publicUser}=require('../lib/access');
const ROLES_ADMIN=new Set(['Master','Gerente','Administrativo']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONFIG={
 condominios:{table:'os_condominios',fields:['nome','sindico','classe','status','unidades','regiao','equipamentos'],select:'id,codigo,nome,sindico,classe,status,unidades,regiao,equipamentos,updated_at'},
 financeiro:{table:'os_financeiro',fields:['condominio_id','titulo','descricao','tipo','valor','vencimento','status'],select:'id,condominio_id,titulo,descricao,tipo,valor,vencimento,status,created_at,updated_at'},
 tarefas:{table:'os_tarefas',fields:['condominio_id','titulo','descricao','status','prioridade','responsavel_id'],select:'id,condominio_id,titulo,descricao,status,prioridade,responsavel_id,created_at,updated_at'},
 chamados:{table:'os_chamados',fields:['condominio_id','titulo','descricao','status','prioridade','responsavel_id'],select:'id,condominio_id,titulo,descricao,status,prioridade,responsavel_id,created_at,updated_at'},
 processos:{table:'os_processos',fields:['condominio_id','titulo','descricao','status','prioridade','responsavel_id'],select:'id,condominio_id,titulo,descricao,status,prioridade,responsavel_id,created_at,updated_at'},
 vistorias:{table:'os_vistorias',fields:['condominio_id','titulo','data_vistoria','observacoes','status'],select:'id,condominio_id,titulo,data_vistoria,observacoes,status,created_at,updated_at'}
};
function error(res,n,msg){return res.status(n).json({error:msg})}
function clean(entity,body){
 const out={};for(const key of CONFIG[entity].fields)if(Object.prototype.hasOwnProperty.call(body,key))out[key]=body[key];
 for(const [k,v] of Object.entries(out))if(typeof v==='string')out[k]=v.trim();
 if(out.nome!==undefined&&(!out.nome||out.nome.length>180||out.nome.length<2))throw Error('Nome inválido');
 if(out.titulo!==undefined&&(!out.titulo||out.titulo.length<3||out.titulo.length>180))throw Error('Título inválido');
 for(const k of ['descricao','observacoes'])if(out[k]!==undefined&&(typeof out[k]!=='string'||out[k].length>10000))throw Error('Texto excede limite');
 if(out.sindico!==undefined&&(typeof out.sindico!=='string'||out.sindico.length>150))throw Error('Síndico inválido');
 if(out.unidades!==undefined){if(out.unidades===''||!Number.isInteger(Number(out.unidades))||Number(out.unidades)<0||Number(out.unidades)>100000)throw Error('Quantidade de unidades inválida');out.unidades=Number(out.unidades)}
 if(out.regiao!==undefined&&(typeof out.regiao!=='string'||out.regiao.length>120))throw Error('Região inválida');
 if(out.equipamentos!==undefined){if(typeof out.equipamentos==='string')out.equipamentos=out.equipamentos.split(',').map(x=>x.trim()).filter(Boolean);if(!Array.isArray(out.equipamentos)||out.equipamentos.length>30||out.equipamentos.some(x=>typeof x!=='string'||x.length>100))throw Error('Equipamentos inválidos')}
 if(out.classe!==undefined&&!['A','B','C','D'].includes(out.classe))throw Error('Classe inválida');
 if(out.tipo!==undefined&&!['Receita','Despesa'].includes(out.tipo))throw Error('Tipo inválido');
 if(out.valor!==undefined){if(out.valor===''||!Number.isFinite(Number(out.valor))||Number(out.valor)<0||Number(out.valor)>1000000000)throw Error('Valor inválido');out.valor=Number(out.valor)}
 if(out.vencimento!==undefined&&(!/^\d{4}-\d{2}-\d{2}$/.test(out.vencimento)||Number.isNaN(Date.parse(out.vencimento))))throw Error('Vencimento inválido');
 if(out.prioridade!==undefined&&!['Baixa','Normal','Alta','Urgente'].includes(out.prioridade))throw Error('Prioridade inválida');
 if(out.status!==undefined&&!({condominios:['Ativo','Inativo'],processos:['Aberto','Em andamento','Concluído','Cancelado'],chamados:['Aberto','Em andamento','Concluído','Cancelado'],tarefas:['Aberto','Em andamento','Concluído','Cancelado'],financeiro:['Pendente','Pago','Cancelado'],vistorias:['Pendente','Em andamento','Concluída']}[entity].includes(out.status)))throw Error('Status inválido');
 for(const k of ['condominio_id','responsavel_id'])if(out[k]!==undefined&&out[k]!==null&&!UUID.test(out[k]))throw Error('Identificador inválido');
 if(out.data_vistoria!==undefined&&(!/^\d{4}-\d{2}-\d{2}$/.test(out.data_vistoria)||Number.isNaN(Date.parse(out.data_vistoria))))throw Error('Data inválida');
 return out;
}
async function allowed(dbClient,actor,condoId){
 if(ROLES_ADMIN.has(actor.perfil))return true;
 if(!condoId||!UUID.test(condoId))return false;
 const {data,error:e}=await dbClient.from('os_vinculos').select('condominio_id').eq('user_id',actor.id).eq('condominio_id',condoId).maybeSingle();if(e)throw e;return !!data;
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const method=req.method,entity=String(req.query?.entity||'');if(!CONFIG[entity])return error(res,404,'Módulo desconhecido');
  if(!['GET','POST','PATCH'].includes(method))return error(res,405,'Método não permitido');
  if(method!=='GET'){
   const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host,proto=req.headers['x-forwarded-proto']||'https';
   if(origin&&origin!==`${proto}://${host}`)return error(res,403,'Origem não autorizada');
   if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return error(res,415,'Envie JSON');
  }
  const s=session(req);if(!s)return error(res,401,'Entre no sistema');
  const client=db();const {data:actor,error:ae}=await client.from('os_users').select('id,nome,perfil,ativo').eq('id',s.id).maybeSingle();if(ae)throw ae;
  if(!actor||!actor.ativo)return error(res,401,'Conta inativa');
  const cfg=CONFIG[entity];
  if(method==='GET'){
   let q=client.from(cfg.table).select(cfg.select).order('created_at',{ascending:false}).limit(500);
   if(entity==='condominios')q=client.from(cfg.table).select(cfg.select).order('nome').limit(500);
   if(!ROLES_ADMIN.has(actor.perfil)){
    const {data:links,error:le}=await client.from('os_vinculos').select('condominio_id').eq('user_id',actor.id);if(le)throw le;
    const ids=(links||[]).map(x=>x.condominio_id);if(!ids.length)return res.status(200).json({items:[]});
    q=q.in(entity==='condominios'?'id':'condominio_id',ids);
   }
   const {data,error:e}=await q;if(e)throw e;return res.status(200).json({items:data||[]});
  }
  if(!ROLES_ADMIN.has(actor.perfil)&&['condominios','financeiro'].includes(entity))return error(res,403,'Sem permissão para alterar este módulo');
  if(method==='POST'){
   const b=clean(entity,req.body||{});
   if(entity!=='condominios'&&(!b.condominio_id||!await allowed(client,actor,b.condominio_id)))return error(res,403,'Condomínio não autorizado');
   if(entity==='condominios'&&!b.nome)return error(res,400,'Informe o nome');
   if(entity!=='condominios'&&!b.titulo)return error(res,400,'Informe o título');
   if(entity==='financeiro'&&!b.vencimento)return error(res,400,'Informe o vencimento');
   if(entity==='vistorias'&&!b.data_vistoria)return error(res,400,'Informe a data');
   if(entity!=='condominios')b.created_by=actor.id;
   const {data,error:e}=await client.from(cfg.table).insert(b).select(cfg.select).single();if(e){if(e.code==='23503')return error(res,400,'Condomínio ou responsável não encontrado');throw e;}
   await audit(client,actor,entity,data.id,'create');return res.status(201).json({item:data});
  }
  const id=String(req.body?.id||'');if(!UUID.test(id))return error(res,400,'ID inválido');
  const lookup=entity==='condominios'?'id':'id,condominio_id';
  const {data:target,error:fe}=await client.from(cfg.table).select(lookup).eq('id',id).maybeSingle();if(fe)throw fe;
  if(!target)return error(res,404,'Registro não encontrado');
  if(entity!=='condominios'&&!await allowed(client,actor,target.condominio_id))return error(res,403,'Sem acesso ao condomínio');
  const patch=clean(entity,req.body||{});delete patch.condominio_id;
  if(!Object.keys(patch).length)return error(res,400,'Nada para atualizar');patch.updated_at=new Date().toISOString();
  const {data,error:e}=await client.from(cfg.table).update(patch).eq('id',id).select(cfg.select).single();if(e)throw e;
  await audit(client,actor,entity,id,'update');return res.status(200).json({item:data});
 }catch(e){if(/inválid|excede limite/.test(e.message))return error(res,400,e.message);console.error('operacoes:',e.message);return error(res,503,'Serviço indisponível ou banco não configurado')}
};
async function audit(c,a,entity,id,action){const {error:e}=await c.from('os_operacoes_audit').insert({actor_id:a.id,entidade:entity,registro_id:id,acao:action});if(e)console.error('Auditoria:',e.message)}
