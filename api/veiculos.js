'use strict';
const crypto=require('node:crypto');
const {db,session}=require('../lib/access');
const UUID=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
const ADM=new Set(['Master','Gerente']);
const BUCKET='os-frota-comprovantes';
const fail=(res,code,error)=>res.status(code).json({error});
const clean=(x,n=500)=>typeof x==='string'?x.trim().slice(0,n):'';
const num=x=>x===''||x===null||x===undefined?NaN:Number(x);
const positive=x=>Number.isFinite(x)&&x>0;
function photoData(raw){
 if(typeof raw!=='string')throw Error('Foto obrigatória');
 const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(raw);
 if(!match)throw Error('Formato de foto inválido (JPEG, PNG ou WebP)');
 const buf=Buffer.from(match[2],'base64');
 if(buf.length<100||buf.length>950000)throw Error('Foto deve ter até 950 KB');
 const type=match[1],ok=type==='jpeg'?buf[0]===255&&buf[1]===216&&buf[2]===255:type==='png'?buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP';
 if(!ok)throw Error('Conteúdo da imagem não corresponde ao formato');
 return {buf,type};
}
async function savePhoto(c,raw,prefix){
 const {buf,type}=photoData(raw);
 const path=prefix+'/'+crypto.randomUUID()+'.'+(type==='jpeg'?'jpg':type);
 const {error}=await c.storage.from(BUCKET).upload(path,buf,{contentType:'image/'+type,upsert:false});
 if(error)throw Error('Falha ao salvar foto: '+error.message);
 return path;
}
async function removePhotos(c,paths){if(paths.length)await c.storage.from(BUCKET).remove(paths).catch(()=>{});}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST','PATCH'].includes(req.method))return fail(res,405,'Método não permitido');
 if(req.method!=='GET'){
  const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host,proto=req.headers['x-forwarded-proto']||'https';
  if(origin&&origin!==proto+'://'+host)return fail(res,403,'Origem não autorizada');
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return fail(res,415,'JSON obrigatório');
 }
 try{
  const s=session(req);if(!s)return fail(res,401,'Faça login em /admin.html');
  const c=db(),{data:user,error:ue}=await c.from('os_users').select('id,nome,perfil,ativo').eq('id',s.id).maybeSingle();
  if(ue)throw ue;
  if(!user||!user.ativo||!(ADM.has(user.perfil)||user.perfil==='Síndico'))return fail(res,403,'Sem permissão');
  const admin=ADM.has(user.perfil),action=String(req.query?.action||''),b=req.body||{};
  const audit=async(acao,veiculo_id,registro_id,detalhes={})=>{
   const {error}=await c.from('os_veiculo_audit').insert({actor_id:user.id,acao,veiculo_id,registro_id,detalhes});if(error)console.error('Falha auditoria frota',error.message);
  };
  if(req.method==='GET'){
   if(action==='veiculos'){
    const {data,error}=await c.from('os_veiculos').select('id,placa,modelo,marca,identificacao,status').order('placa').limit(500);
    if(error)throw error;return res.json({items:data||[]});
   }
   if(action==='sindicos'){
    if(!admin)return fail(res,403,'Sem permissão');
    const {data,error}=await c.from('os_users').select('id,nome').eq('perfil','Síndico').eq('ativo',true).order('nome').limit(500);
    if(error)throw error;return res.json({items:data||[]});
   }
   if(action==='usos'){
    let q=c.from('os_veiculo_usos').select('id,veiculo_id,sindico_id,registrado_por,inicio,fim,km_inicial,km_final,destino,finalidade,observacoes,combustivel_retirada,combustivel_devolucao,litros_abastecidos,valor_abastecimento,posto_abastecimento,justificativa_excecao,foto_painel_retirada,foto_painel_devolucao,foto_comprovante').order('inicio',{ascending:false}).limit(1000);
    if(!admin)q=q.eq('sindico_id',user.id);
    else if(req.query?.sindico_id){if(!UUID.test(req.query.sindico_id))return fail(res,400,'Síndico inválido');q=q.eq('sindico_id',req.query.sindico_id)}
    if(req.query?.veiculo_id){if(!UUID.test(req.query.veiculo_id))return fail(res,400,'Veículo inválido');q=q.eq('veiculo_id',req.query.veiculo_id)}
    const {data,error}=await q;if(error)throw error;
    return res.json({items:(data||[]).map(u=>({...u,km_rodados:u.km_final===null?null:Number((u.km_final-u.km_inicial).toFixed(1)),media_km_l:u.fim&&u.combustivel_retirada==='cheio'&&u.combustivel_devolucao==='cheio'&&positive(num(u.litros_abastecidos))?Number(((u.km_final-u.km_inicial)/u.litros_abastecidos).toFixed(2)):null,custo_por_km:u.fim&&u.combustivel_retirada==='cheio'&&u.combustivel_devolucao==='cheio'&&u.km_final>u.km_inicial?Number((u.valor_abastecimento/(u.km_final-u.km_inicial)).toFixed(2)):null}))});
   }
   if(action==='foto'){
    const id=String(req.query?.id||''),tipo=String(req.query?.tipo||'');
    const fields={retirada:'foto_painel_retirada',devolucao:'foto_painel_devolucao',comprovante:'foto_comprovante'};
    if(!UUID.test(id)||!fields[tipo])return fail(res,400,'Foto inválida');
    const {data:u,error}=await c.from('os_veiculo_usos').select('sindico_id,'+fields[tipo]).eq('id',id).maybeSingle();
    if(error)throw error;
    if(!u||(!admin&&u.sindico_id!==user.id))return fail(res,404,'Foto não encontrada');
    const path=u[fields[tipo]];if(!path)return fail(res,404,'Foto não registrada');
    const signed=await c.storage.from(BUCKET).createSignedUrl(path,60);
    if(signed.error)throw signed.error;return res.json({url:signed.data.signedUrl});
   }
   if(action==='manutencoes'){
    if(!admin)return fail(res,403,'Sem permissão');
    const {data:services,error:me}=await c.from('os_veiculo_manutencoes').select('*').order('realizado_em',{ascending:false}).limit(1000);
    if(me)throw me;
    const {data:vehicles,error:ve}=await c.from('os_veiculos').select('id,placa,modelo').limit(500);if(ve)throw ve;
    const {data:uses,error:ue2}=await c.from('os_veiculo_usos').select('veiculo_id,km_inicial,km_final').order('inicio',{ascending:false}).limit(5000);if(ue2)throw ue2;
    const kmByVehicle={};for(const u of uses||[])kmByVehicle[u.veiculo_id]=Math.max(kmByVehicle[u.veiculo_id]||0,Number(u.km_final??u.km_inicial));
    const latest=new Map();for(const m of services||[]){const key=m.veiculo_id+'|'+m.tipo;if(!latest.has(key))latest.set(key,m)}
    const alerts=[...latest.values()].map(m=>{const kmAtual=kmByVehicle[m.veiculo_id]||m.km_servico,kmRestantes=m.km_servico+m.intervalo_km-kmAtual;return {...m,placa:vehicles.find(v=>v.id===m.veiculo_id)?.placa||'—',km_atual:kmAtual,proximo_km:m.km_servico+m.intervalo_km,km_restantes:kmRestantes,situacao:kmRestantes<=0?'Vencida':kmRestantes<=500?'Próxima':'Em dia'}});
    return res.json({items:services||[],alerts});
   }
  }
  if(req.method==='POST'&&action==='veiculo'){
   if(!admin)return fail(res,403,'Somente gerência e Master');
   const placa=clean(b.placa,8).toUpperCase().replace(/[^A-Z0-9]/g,''),modelo=clean(b.modelo,120);
   if(!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)||modelo.length<2)return fail(res,400,'Placa ou modelo inválido');
   const {data,error}=await c.from('os_veiculos').insert({placa,modelo,marca:clean(b.marca,80),identificacao:clean(b.identificacao,120)}).select('*').single();
   if(error){if(error.code==='23505')return fail(res,409,'Placa já cadastrada');throw error}
   await audit('cadastro',data.id,null);return res.status(201).json({item:data});
  }
  if(req.method==='POST'&&action==='uso'){
   const veiculo_id=String(b.veiculo_id||''),sindico_id=admin?String(b.sindico_id||''):user.id;
   if(!UUID.test(veiculo_id)||!UUID.test(sindico_id))return fail(res,400,'Veículo ou síndico inválido');
   const {data:sindico,error:se}=await c.from('os_users').select('id').eq('id',sindico_id).eq('perfil','Síndico').eq('ativo',true).maybeSingle();
   if(se)throw se;if(!sindico)return fail(res,400,'Síndico não encontrado');
   const {data:v,error:ve}=await c.from('os_veiculos').select('status').eq('id',veiculo_id).maybeSingle();
   if(ve)throw ve;if(!v||v.status!=='Disponível')return fail(res,409,'Veículo indisponível');
   const km=num(b.km_inicial),inicio=Date.parse(b.inicio),destino=clean(b.destino,200),finalidade=clean(b.finalidade,500);
   if(!Number.isFinite(km)||km<0||!Number.isFinite(inicio)||inicio>Date.now()+300000||destino.length<2||finalidade.length<2)return fail(res,400,'Dados de retirada inválidos');
   if(b.combustivel_retirada!=='cheio')return fail(res,400,'A retirada exige confirmação de tanque cheio');
   let foto;try{foto=await savePhoto(c,b.foto_painel_retirada,'retiradas')}catch(e){return fail(res,400,e.message)}
   const {data,error}=await c.from('os_veiculo_usos').insert({veiculo_id,sindico_id,registrado_por:user.id,inicio:new Date(inicio).toISOString(),km_inicial:km,destino,finalidade,observacoes:clean(b.observacoes,2000),combustivel_retirada:'cheio',foto_painel_retirada:foto}).select('*').single();
   if(error){await removePhotos(c,[foto]);if(error.code==='23505')return fail(res,409,'Veículo já em uso');throw error}
   await audit('retirada',veiculo_id,data.id,{sindico_id,km_inicial:km,tanque_cheio:true});return res.status(201).json({item:data});
  }
  if(req.method==='PATCH'&&action==='devolucao'){
   const id=String(b.id||'');if(!UUID.test(id))return fail(res,400,'Registro inválido');
   const {data:u,error:ue2}=await c.from('os_veiculo_usos').select('*').eq('id',id).maybeSingle();
   if(ue2)throw ue2;if(!u)return fail(res,404,'Registro inexistente');
   if(!admin&&u.sindico_id!==user.id)return fail(res,403,'Registro de outro síndico');
   if(u.fim)return fail(res,409,'Já devolvido');
   const km=num(b.km_final),fim=Date.parse(b.fim),litros=num(b.litros_abastecidos),valor=num(b.valor_abastecimento),cheio=b.combustivel_devolucao==='cheio',justificativa=clean(b.justificativa_excecao,1000);
   if(!Number.isFinite(km)||km<Number(u.km_inicial)||!Number.isFinite(fim)||fim<Date.parse(u.inicio)||fim>Date.now()+300000)return fail(res,400,'KM ou data inválidos');
   if(!Number.isFinite(litros)||litros<0||litros>300||!Number.isFinite(valor)||valor<0||valor>10000)return fail(res,400,'Informe litros e valor do abastecimento');
   if(cheio&&km>u.km_inicial&&litros<=0)return fail(res,400,'Informe os litros para completar o tanque');
   if(!cheio&&justificativa.length<10)return fail(res,400,'Justifique a devolução sem tanque cheio (mínimo 10 caracteres)');
   if(litros===0&&valor!==0||litros>0&&valor<=0)return fail(res,400,'Litros e valor devem ser coerentes');
   if(litros>0&&!clean(b.posto_abastecimento,120))return fail(res,400,'Informe o posto de abastecimento');
   const saved=[];
   try{
    saved.push(await savePhoto(c,b.foto_painel_devolucao,'devolucoes'));
    if(litros>0)saved.push(await savePhoto(c,b.foto_comprovante,'comprovantes'));
   }catch(e){await removePhotos(c,saved);return fail(res,400,e.message)}
   const update={fim:new Date(fim).toISOString(),km_final:km,combustivel_devolucao:cheio?'cheio':'incompleto',litros_abastecidos:litros,valor_abastecimento:valor,posto_abastecimento:clean(b.posto_abastecimento,120),justificativa_excecao:cheio?'':justificativa,foto_painel_devolucao:saved[0],foto_comprovante:litros>0?saved[1]:null,updated_at:new Date().toISOString()};
   const {data,error}=await c.from('os_veiculo_usos').update(update).eq('id',id).is('fim',null).select('*').maybeSingle();
   if(error||!data){await removePhotos(c,saved);if(error)throw error;return fail(res,409,'Já devolvido')}
   await audit('devolucao',u.veiculo_id,id,{km_final:km,km_rodados:km-u.km_inicial,litros,valor,tanque_cheio:cheio});
   return res.json({item:data,km_rodados:km-u.km_inicial,media_km_l:cheio&&u.combustivel_retirada==='cheio'&&litros>0?(km-u.km_inicial)/litros:null});
  }
  if(req.method==='POST'&&action==='manutencao'){
   if(!admin)return fail(res,403,'Somente gerência e Master');
   const veiculo_id=String(b.veiculo_id||''),km=num(b.km_servico),intervalo=num(b.intervalo_km),tipo=clean(b.tipo,80);
   if(!UUID.test(veiculo_id)||!Number.isFinite(km)||km<0||!Number.isInteger(intervalo)||intervalo<100||intervalo>100000||tipo.length<3)return fail(res,400,'Dados de manutenção inválidos');
   const {data,error}=await c.from('os_veiculo_manutencoes').insert({veiculo_id,km_servico:km,intervalo_km:intervalo,tipo,observacoes:clean(b.observacoes,1000),registrado_por:user.id}).select('*').single();
   if(error)throw error;await audit('manutencao',veiculo_id,null,{tipo,km,intervalo});return res.status(201).json({item:data});
  }
  return fail(res,404,'Operação desconhecida');
 }catch(e){console.error('veiculos:',e.message);return fail(res,503,'Serviço indisponível; verifique migração SQL, Storage e configuração do banco')}
};
