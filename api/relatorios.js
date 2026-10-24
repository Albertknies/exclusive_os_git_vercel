const {db,session}=require('../lib/access');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES={
 condominios:{title:'Condomínios',table:'os_condominios',fields:['nome','sindico','status','codigo','unidades'],key:'id'},
 manutencoes:{title:'Manutenções',table:'os_manutencoes',fields:['titulo','tipo','fornecedor','status','prazo'],key:'condominio_id'},
 chamados:{title:'Chamados',table:'os_chamados',fields:['protocolo','titulo','categoria','status','created_at','encerrado_em','avaliacao_nota'],key:'condominio_id'},
 vistorias:{title:'Vistorias',table:'os_vistorias',fields:['titulo','status','data_vistoria','created_at'],key:'condominio_id'},
 tarefas:{title:'Tarefas históricas',table:'os_tarefas',fields:['titulo','status','prazo','created_at'],key:'condominio_id'},
 processos:{title:'Processos históricos',table:'os_processos',fields:['titulo','status','prazo','created_at'],key:'condominio_id'},
 financeiro:{title:'Financeiro',table:'os_financeiro',fields:['titulo','tipo','valor','vencimento','status'],key:'condominio_id',master:true}
};
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 try{
  const auth=session(req);if(!auth)return res.status(401).json({error:'Entre no sistema'});
  const client=db();const {data:user,error:ue}=await client.from('os_users').select('id,perfil,ativo').eq('id',auth.id).maybeSingle();if(ue)throw ue;
  if(!user?.ativo||!['Master','Gerente','Síndico'].includes(user.perfil))return res.status(403).json({error:'Sem permissão'});
  const types=Object.entries(TYPES).filter(([,v])=>!v.master||user.perfil==='Master').map(([id,v])=>({id,title:v.title}));
  const kind=String(req.query?.tipo||'');if(!kind)return res.status(200).json({perfil:user.perfil,tipos:types});
  const spec=TYPES[kind];if(!spec)return res.status(404).json({error:'Relatório inexistente'});
  if(spec.master&&user.perfil!=='Master')return res.status(403).json({error:'Relatório exclusivo do Master'});
  let ids=null;
  if(user.perfil==='Síndico'){
   const {data:links,error:le}=await client.from('os_vinculos').select('condominio_id').eq('user_id',user.id);if(le)throw le;
   ids=[...new Set((links||[]).map(x=>x.condominio_id))];if(!ids.length)return res.status(200).json({title:spec.title,columns:['Condomínio',...spec.fields],rows:[],total:0});
  }
  const requested=String(req.query?.condominio_id||'');if(requested&&!UUID.test(requested))return res.status(400).json({error:'Condomínio inválido'});
  if(requested&&ids&&!ids.includes(requested))return res.status(403).json({error:'Condomínio fora da carteira'});
  const {data:condos,error:ce}=await client.from('os_condominios').select('id,nome').limit(1000);if(ce)throw ce;
  const names=new Map((condos||[]).map(c=>[c.id,c.nome]));
  let q=client.from(spec.table).select([spec.key,...spec.fields].join(',')).limit(2000);
  if(ids)q=q.in(spec.key,ids);
  if(requested)q=q.eq(spec.key,requested);
  const {data,error:e}=await q;if(e)throw e;
  const rows=(data||[]).map(item=>[names.get(item[spec.key])||'—',...spec.fields.map(field=>item[field]??'')]);
  return res.status(200).json({title:spec.title,columns:['Condomínio',...spec.fields.map(x=>x.replaceAll('_',' '))],rows,total:rows.length,limit:2000});
 }catch(e){console.error('relatorios:',e.message);return res.status(503).json({error:'Falha ao gerar relatório'})}
};