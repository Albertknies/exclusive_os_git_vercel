'use strict';
const {db,session}=require('../lib/access');
const UUID=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
const ADM=new Set(['Master','Gerente']);
const fail=(res,code,error)=>res.status(code).json({error});
const clean=(x,n=500)=>typeof x==='string'?x.trim().slice(0,n):'';
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
   const {error}=await c.from('os_veiculo_audit').insert({actor_id:user.id,acao,veiculo_id,registro_id,detalhes});if(error)throw error;
  };
  if(req.method==='GET'){
   if(action==='veiculos'){
    const {data,error}=await c.from('os_veiculos').select('id,placa,modelo,marca,identificacao,status').order('placa').limit(500);
    if(error)throw error;return res.json({items:data||[]});
   }
   if(action==='sindicos'){
    if(!admin)return fail(res,403,'Sem permissão');
    const {data,error}=await c.from('os_sindicos_cadastro').select('id,nome').eq('ativo',true).order('nome').limit(500);
    if(error)throw error;return res.json({items:data||[]});
   }
   if(action==='abastecimentos'){
    let q=c.from('os_veiculo_abastecimentos').select('id,veiculo_id,registrado_por,data_abastecimento,km,litros,valor_total,tanque_cheio,posto,observacoes').order('data_abastecimento',{ascending:false}).limit(1000);
    if(req.query?.veiculo_id){if(!UUID.test(String(req.query.veiculo_id)))return fail(res,400,'Veículo inválido');q=q.eq('veiculo_id',req.query.veiculo_id)}
    if(!admin)q=q.eq('registrado_por',user.id);
    const {data,error}=await q;if(error)throw error;return res.json({items:data||[]});
   }
   if(action==='usos'){
    let q=c.from('os_veiculo_usos').select('id,veiculo_id,sindico_id,sindico_cadastro_id,registrado_por,inicio,fim,km_inicial,km_final,destino,finalidade,observacoes').order('inicio',{ascending:false}).limit(1000);
    if(!admin)q=q.eq('sindico_id',user.id);
    else if(req.query?.sindico_id){if(!UUID.test(req.query.sindico_id))return fail(res,400,'Síndico inválido');q=q.eq('sindico_cadastro_id',req.query.sindico_id)}
    if(req.query?.veiculo_id){if(!UUID.test(req.query.veiculo_id))return fail(res,400,'Veículo inválido');q=q.eq('veiculo_id',req.query.veiculo_id)}
    const {data,error}=await q;if(error)throw error;return res.json({items:data||[]});
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
  if(req.method==='POST'&&action==='abastecimento'){
   const veiculo_id=String(b.veiculo_id||''),km=Number(b.km),litros=Number(b.litros),valor_total=Number(b.valor_total),quando=Date.parse(b.data_abastecimento),posto=clean(b.posto,120),observacoes=clean(b.observacoes,2000);
   if(!UUID.test(veiculo_id)||!Number.isFinite(km)||km<0||!Number.isFinite(litros)||litros<=0||litros>1000||!Number.isFinite(valor_total)||valor_total<0||valor_total>100000||!Number.isFinite(quando)||quando>Date.now()+86400000||typeof b.tanque_cheio!=='boolean')return fail(res,400,'Dados de abastecimento inválidos');
   const {data:v,error:ve}=await c.from('os_veiculos').select('id,status').eq('id',veiculo_id).maybeSingle();if(ve)throw ve;if(!v||v.status==='Inativo')return fail(res,400,'Veículo não disponível para abastecimento');
   const {data:last,error:le}=await c.from('os_veiculo_abastecimentos').select('km').eq('veiculo_id',veiculo_id).order('km',{ascending:false}).limit(1);if(le)throw le;
   if(last?.length&&km<Number(last[0].km))return fail(res,400,'Quilometragem inferior ao último abastecimento');
   const {data,error}=await c.from('os_veiculo_abastecimentos').insert({veiculo_id,registrado_por:user.id,data_abastecimento:new Date(quando).toISOString(),km,litros,valor_total,tanque_cheio:b.tanque_cheio,posto,observacoes}).select('id,veiculo_id,data_abastecimento,km,litros,valor_total,tanque_cheio,posto').single();if(error)throw error;
   await audit('abastecimento',veiculo_id,data.id,{km,litros,tanque_cheio:b.tanque_cheio});return res.status(201).json({item:data});
  }
  if(req.method==='POST'&&action==='uso'){
   const veiculo_id=String(b.veiculo_id||''),sindico_id=admin?null:user.id,sindico_cadastro_id=admin?String(b.sindico_id||''):null;
   if(!UUID.test(veiculo_id)||(admin?!UUID.test(sindico_cadastro_id):!UUID.test(sindico_id)))return fail(res,400,'Veículo ou síndico inválido');
   const {data:sindico,error:se}=await c.from(admin?'os_sindicos_cadastro':'os_users').select('id').eq('id',admin?sindico_cadastro_id:sindico_id).eq('ativo',true).maybeSingle();
   if(se)throw se;if(!sindico)return fail(res,400,'Síndico não encontrado');
   const {data:v,error:ve}=await c.from('os_veiculos').select('status').eq('id',veiculo_id).maybeSingle();
   if(ve)throw ve;if(!v||v.status!=='Disponível')return fail(res,409,'Veículo indisponível');
   const km=Number(b.km_inicial),inicio=Date.parse(b.inicio),destino=clean(b.destino,200),finalidade=clean(b.finalidade,500);
   if(!Number.isFinite(km)||km<0||!Number.isFinite(inicio)||destino.length<2||finalidade.length<2)return fail(res,400,'Dados de retirada inválidos');
   const {data,error}=await c.from('os_veiculo_usos').insert({veiculo_id,sindico_id,sindico_cadastro_id,registrado_por:user.id,inicio:new Date(inicio).toISOString(),km_inicial:km,destino,finalidade,observacoes:clean(b.observacoes,2000)}).select('*').single();
   if(error){if(error.code==='23505')return fail(res,409,'Veículo já em uso');throw error}
   await audit('retirada',veiculo_id,data.id,{sindico_id});return res.status(201).json({item:data});
  }
  if(req.method==='PATCH'&&action==='devolucao'){
   const id=String(b.id||'');if(!UUID.test(id))return fail(res,400,'Registro inválido');
   const {data:u,error:ue2}=await c.from('os_veiculo_usos').select('*').eq('id',id).maybeSingle();
   if(ue2)throw ue2;if(!u)return fail(res,404,'Registro inexistente');
   if(!admin&&u.sindico_id!==user.id)return fail(res,403,'Registro de outro síndico');
   if(u.fim)return fail(res,409,'Já devolvido');
   const km=Number(b.km_final),fim=Date.parse(b.fim);
   if(!Number.isFinite(km)||km<Number(u.km_inicial)||!Number.isFinite(fim)||fim<Date.parse(u.inicio))return fail(res,400,'KM ou data inválidos');
   const {data,error}=await c.from('os_veiculo_usos').update({fim:new Date(fim).toISOString(),km_final:km,updated_at:new Date().toISOString()}).eq('id',id).is('fim',null).select('*').maybeSingle();
   if(error)throw error;if(!data)return fail(res,409,'Já devolvido');
   await audit('devolucao',u.veiculo_id,id,{km_final:km});return res.json({item:data});
  }
  return fail(res,404,'Operação desconhecida');
 }catch(e){console.error('veiculos:',e.message);return fail(res,503,'Serviço indisponível; verifique configuração do banco')}
};