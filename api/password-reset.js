const crypto=require('node:crypto');
const {db,hash}=require('../lib/access');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const send=(res,status,body)=>res.status(status).json(body);
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return send(res,405,{error:'Método não permitido'});
 const host=req.headers['x-forwarded-host']||req.headers.host,proto=req.headers['x-forwarded-proto']||'https';
 if(!req.headers.origin||req.headers.origin!==proto+'://'+host)return send(res,403,{error:'Origem não autorizada'});
 if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return send(res,415,{error:'Envie JSON'});
 const action=String(req.query.action||'');
 try{
 const client=db();
 if(action==='request'){
 const email=String(req.body?.email||'').trim().toLowerCase();
 if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return send(res,400,{error:'E-mail inválido'});
 const generic={ok:true,message:'Se houver uma conta ativa com esse e-mail, você receberá as instruções.'};
 const {data:u,error:e}=await client.from('os_users').select('id,email').eq('email',email).eq('ativo',true).maybeSingle();if(e)throw e;
 if(!u)return send(res,200,generic);
 const {data:recent,error:re}=await client.from('os_password_resets').select('created_at').eq('user_id',u.id).order('created_at',{ascending:false}).limit(1);if(re)throw re;
 if(recent?.length&&Date.now()-new Date(recent[0].created_at).getTime()<120000)return send(res,200,generic);
 const key=process.env.RESEND_API_KEY,from=process.env.PASSWORD_RESET_FROM;
 if(!key||!from)return send(res,503,{error:'Recuperação por e-mail ainda não configurada'});
 const token=crypto.randomBytes(32).toString('hex');
 const link='https://'+host+'/redefinir-senha.html?token='+encodeURIComponent(token);
 const {error:ie}=await client.from('os_password_resets').insert({user_id:u.id,token_hash:digest(token),expires_at:new Date(Date.now()+15*60*1000).toISOString()});if(ie)throw ie;
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject:'Exclusive OS — redefinição de senha',text:'Você solicitou redefinir sua senha do Exclusive OS. Abra este link em até 15 minutos: '+link+'\n\nSe não solicitou, ignore esta mensagem.'})});
 if(!response.ok)throw Error('Falha no serviço de e-mail');
 
 return send(res,200,generic);
 }
 if(action==='confirm'){
 const token=req.body?.token,senha=req.body?.senha;
 if(typeof token!=='string'||!/^[0-9a-f]{64}$/.test(token)||typeof senha!=='string'||senha.length<12||senha.length>256)return send(res,400,{error:'Link ou senha inválidos (mínimo 12 caracteres)'});
 const {data,error}=await client.rpc('os_consume_password_reset',{p_token_hash:digest(token),p_password_hash:hash(senha)});if(error)throw error;
 if(!data)return send(res,400,{error:'Link expirado ou já utilizado. Solicite outro.'});
 return send(res,200,{ok:true,message:'Senha redefinida. Entre com seu CPF e a nova senha.'});
 }
 return send(res,404,{error:'Operação desconhecida'});
 }catch(e){console.error('password reset:',e.message);return send(res,503,{error:'Serviço temporariamente indisponível'})}
};