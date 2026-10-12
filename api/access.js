const {db,digits,validCpf,hash,verify,sign,session,cookie,publicUser}=require('../lib/access');
const ROLES=['Master','Gerente','Administrativo','Síndico','Vistoriador','Cliente'];
const fail=(res,status,error)=>res.status(status).json({error});
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
 const action=String(req.query?.action||'');const method=req.method;
 if(method==='POST'&&action==='logout'){res.setHeader('Set-Cookie',cookie(''));return res.status(200).json({ok:true})}
 const client=db();
 if(method==='POST'&&action==='login'){
   const cpf=digits(req.body?.cpf),senha=String(req.body?.senha||'');
   if(!validCpf(cpf)||!senha||senha.length>256)return fail(res,401,'Credenciais inválidas');
   const {data:u,error}=await client.from('os_users').select('*').eq('cpf',cpf).maybeSingle();
   if(error)throw error;
   if(!u||!u.ativo||!verify(senha,u.password_hash))return fail(res,401,'Credenciais inválidas');
   res.setHeader('Set-Cookie',cookie(sign({id:u.id,exp:Date.now()+8*60*60*1000})));
   return res.status(200).json({user:publicUser(u)});
 }
 const s=session(req);if(!s)return fail(res,401,'Sessão expirada. Entre novamente.');
 const {data:actor,error:actorError}=await client.from('os_users').select('*').eq('id',s.id).maybeSingle();
 if(actorError)throw actorError;if(!actor||!actor.ativo)return fail(res,401,'Acesso inativo');
 if(method==='GET'&&action==='me')return res.status(200).json({user:publicUser(actor)});
 if(!['Master','Gerente'].includes(actor.perfil))return fail(res,403,'Sem permissão para administrar usuários');
 if(method==='GET'&&action==='users'){
  const {data,error}=await client.from('os_users').select('id,nome,email,cpf,perfil,ativo').order('nome');if(error)throw error;return res.status(200).json({users:data});
 }
 if(method==='POST'&&action==='users'){
  let b=req.body||{};let cpf=digits(b.cpf),nome=String(b.nome||'').trim(),email=String(b.email||'').trim().toLowerCase(),perfil=String(b.perfil||''),senha=String(b.senha||'');
  if(!validCpf(cpf)||nome.length<2||nome.length>150||!/^\S+@\S+\.\S+$/.test(email)||!ROLES.includes(perfil)||senha.length<12||senha.length>256)return fail(res,400,'Revise nome, CPF, e-mail, perfil e senha (mínimo 12 caracteres)');
  if(actor.perfil==='Gerente'&&['Master','Gerente'].includes(perfil))return fail(res,403,'Gerente não pode criar perfis de direção ou gerência');
  const {data,error}=await client.from('os_users').insert({nome,email,cpf,perfil,ativo:b.ativo!==false,password_hash:hash(senha)}).select('id,nome,email,cpf,perfil,ativo').single();
  if(error){if(error.code==='23505')return fail(res,409,'CPF ou e-mail já cadastrado');throw error}
  await client.from('os_user_audit').insert({actor_id:actor.id,target_id:data.id,action:'create'});
  return res.status(201).json({user:data});
 }
 if(method==='PATCH'&&action==='users'){
  let b=req.body||{};let id=String(b.id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return fail(res,400,'ID inválido');
  const {data:target,error:te}=await client.from('os_users').select('*').eq('id',id).maybeSingle();if(te)throw te;if(!target)return fail(res,404,'Usuário não encontrado');
  if(actor.perfil==='Gerente'&&['Master','Gerente'].includes(target.perfil))return fail(res,403,'Gerente não pode editar direção ou gerência');
  let patch={updated_at:new Date().toISOString()};
  if(b.nome!==undefined){patch.nome=String(b.nome).trim();if(patch.nome.length<2||patch.nome.length>150)return fail(res,400,'Nome inválido')}
  if(b.cpf!==undefined){patch.cpf=digits(b.cpf);if(!validCpf(patch.cpf))return fail(res,400,'CPF inválido')}
  if(b.email!==undefined){patch.email=String(b.email).trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(patch.email))return fail(res,400,'E-mail inválido')}
  if(b.perfil!==undefined){if(!ROLES.includes(b.perfil))return fail(res,400,'Perfil inválido');if(actor.perfil==='Gerente'&&['Master','Gerente'].includes(b.perfil))return fail(res,403,'Perfil não permitido');patch.perfil=b.perfil}
  if(b.ativo!==undefined)patch.ativo=b.ativo===true;
  if(b.senha){if(typeof b.senha!=='string'||b.senha.length<12||b.senha.length>256)return fail(res,400,'Nova senha deve ter no mínimo 12 caracteres');patch.password_hash=hash(b.senha)}
  if(actor.id===target.id&&(patch.ativo===false||patch.perfil&&patch.perfil!=='Master'))return fail(res,400,'Não é possível retirar seu próprio acesso de direção');
  if(target.perfil==='Master'&&(patch.ativo===false||patch.perfil&&patch.perfil!=='Master')){
    const {count,error:ce}=await client.from('os_users').select('*',{count:'exact',head:true}).eq('perfil','Master').eq('ativo',true);if(ce)throw ce;if(count<=1)return fail(res,400,'Não é possível desativar o último CEO ativo');
  }
  const {data,error}=await client.from('os_users').update(patch).eq('id',id).select('id,nome,email,cpf,perfil,ativo').single();
  if(error){if(error.code==='23505')return fail(res,409,'CPF ou e-mail já cadastrado');throw error}
  await client.from('os_user_audit').insert({actor_id:actor.id,target_id:id,action:'update'});
  return res.status(200).json({user:data});
 }
 return fail(res,405,'Operação não permitida');
 }catch(e){console.error('access api:',e.message);return fail(res,503,'Serviço indisponível ou não configurado')}
};
