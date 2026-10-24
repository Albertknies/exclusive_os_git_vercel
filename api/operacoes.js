const {db,session,publicUser}=require('../lib/access');
const ROLES_ADMIN=new Set(['Master','Gerente','Administrativo']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONFIG={
 condominios:{table:'os_condominios',fields:['codigo','nome','endereco_completo','data_inicio_exclusive','sindico','sindico_user_id','classe','status','unidades','regiao','equipamentos'],select:'id,codigo,nome,endereco_completo,data_inicio_exclusive,sindico,sindico_user_id,classe,status,unidades,regiao,equipamentos,updated_at'},
 financeiro:{table:'os_financeiro',fields:['condominio_id','titulo','descricao','tipo','valor','vencimento','status'],select:'id,condominio_id,titulo,descricao,tipo,valor,vencimento,status,created_at,updated_at'},
 tarefas:{table:'os_tarefas',fields:['condominio_id','titulo','descricao','status','prioridade','responsavel_id','categoria','prazo'],select:'id,condominio_id,titulo,descricao,status,prioridade,responsavel_id,created_at,updated_at,categoria,prazo'},
 chamados:{table:'os_chamados',fields:['condominio_id','titulo','descricao','status','prioridade','responsavel_id','resposta_sindico'],select:'id,condominio_id,titulo,descricao,status,prioridade,responsavel_id,protocolo,categoria,apartamento,solicitante_nome,origem,resposta_sindico,respondido_em,prazo_resposta,created_at,updated_at'},
 processos:{table:'os_processos',fields:['condominio_id','titulo','descricao','status','prioridade','responsavel_id','categoria','prazo'],select:'id,condominio_id,titulo,descricao,status,prioridade,responsavel_id,created_at,updated_at,categoria,prazo'},
 vistorias:{table:'os_vistorias',fields:['condominio_id','titulo','data_vistoria','observacoes','status'],select:'id,condominio_id,titulo,data_vistoria,observacoes,status,created_at,updated_at'}
};
function error(res,n,msg){return res.status(n).json({error:msg})}
function clean(entity,body){
 const out={};for(const key of CONFIG[entity].fields)if(Object.prototype.hasOwnProperty.call(body,key))out[key]=body[key];
 for(const [k,v] of Object.entries(out))if(typeof v==='string')out[k]=v.trim();
 if(out.codigo!==undefined){if(typeof out.codigo!=='string'||out.codigo.length>40||!(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(out.codigo)))throw Error('Código do condomínio inválido');}
 if(out.endereco_completo!==undefined&&(typeof out.endereco_completo!=='string'||out.endereco_completo.length>500))throw Error('Endereço completo inválido');
 if(out.data_inicio_exclusive!==undefined){if(out.data_inicio_exclusive==='')out.data_inicio_exclusive=null;else if(typeof out.data_inicio_exclusive!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(out.data_inicio_exclusive)||Number.isNaN(Date.parse(out.data_inicio_exclusive)))throw Error('Data de início inválida');}
 if(out.sindico_user_id!==undefined&&out.sindico_user_id==='')out.sindico_user_id=null;
 if(out.sindico_user_id!==undefined&&out.sindico_user_id!==null&&!UUID.test(out.sindico_user_id))throw Error('Síndico inválido');
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
 if(out.categoria!==undefined&&(typeof out.categoria!=='string'||out.categoria.length>100))throw Error('Categoria inválida');
 if(out.prazo!==undefined&&out.prazo!==''&&(!/^\d{4}-\d{2}-\d{2}$/.test(out.prazo)||Number.isNaN(Date.parse(out.prazo))))throw Error('Prazo inválido');
 if(out.prazo==='')out.prazo=null;
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
async function resolveSindico(client,entity,record){
 if(entity!=='condominios'||!record.sindico_user_id)return;
 const {data:user,error:e}=await client.from('os_users').select('id,nome,perfil,ativo').eq('id',record.sindico_user_id).maybeSingle();
 if(e)throw e;
 if(!user||!user.ativo||user.perfil!=='Síndico')throw Error('Síndico cadastrado inválido');
 record.sindico=user.nome;
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const method=req.method,entity=String(req.query?.entity||'');if(!CONFIG[entity])return error(res,404,'Módulo desconhecido');
  if(!['GET','POST','PATCH','DELETE'].includes(method))return error(res,405,'Método não permitido');
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
   const b=clean(entity,req.body||{});await resolveSindico(client,entity,b);
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
  if(method==='DELETE'){
   if(entity!=='condominios')return error(res,405,'Exclusão não disponível neste módulo');
   if(actor.perfil!=='Master')return error(res,403,'Somente Master pode excluir condomínios');
   // Exclusão física somente para cadastro sem dependências. Nunca remover registros associados.
   for(const table of ['os_vinculos','os_tarefas','os_processos','os_chamados','os_vistorias','os_financeiro','os_manutencoes','os_transferencias_carteira']){
    const {count,error:ce}=await client.from(table).select('condominio_id',{count:'exact',head:true}).eq('condominio_id',id);
    if(ce)throw ce;
    if(count>0)return error(res,409,'Este condomínio possui vínculos ou registros relacionados. Inative-o para preservar o histórico.');
   }
   const {error:de}=await client.from(cfg.table).delete().eq('id',id);
   if(de){if(de.code==='23503')return error(res,409,'Há dados vinculados. Inative o condomínio para preservar o histórico.');throw de;}
   await audit(client,actor,entity,id,'delete');
   return res.status(200).json({deleted:true});
  }
  const patch=clean(entity,req.body||{});await resolveSindico(client,entity,patch);delete patch.condominio_id;
  if(entity==='chamados'&&patch.resposta_sindico!==undefined){if(typeof patch.resposta_sindico!=='string'||patch.resposta_sindico.length<5||patch.resposta_sindico.length>3000)return error(res,400,'Resposta deve ter entre 5 e 3000 caracteres');patch.respondido_em=new Date().toISOString();if(patch.status===undefined)patch.status='Em andamento';}
  if(!Object.keys(patch).length)return error(res,400,'Nada para atualizar');patch.updated_at=new Date().toISOString();
  const {data,error:e}=await client.from(cfg.table).update(patch).eq('id',id).select(cfg.select).single();if(e)throw e;
  await audit(client,actor,entity,id,'update');return res.status(200).json({item:data});
 }catch(e){if(/inválid|excede limite/.test(e.message))return error(res,400,e.message);console.error('operacoes:',e.message);return error(res,503,'Serviço indisponível ou banco não configurado')}
};
async function audit(c,a,entity,id,action){const {error:e}=await c.from('os_operacoes_audit').insert({actor_id:a.id,entidade:entity,registro_id:id,acao:action});if(e)console.error('Auditoria:',e.message)}
