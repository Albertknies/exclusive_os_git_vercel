const crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
function db(){if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Backend não configurado');return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})}
const digits=s=>String(s||'').replace(/\D/g,'');
function validCpf(x){let c=digits(x);if(!/^\d{11}$/.test(c)||/^(\d)\1{10}$/.test(c))return false;for(let n=9;n<11;n++){let sum=0;for(let i=0;i<n;i++)sum+=+c[i]*(n+1-i);let v=sum*10%11;if(v===10)v=0;if(v!==+c[n])return false}return true}
function hash(p){let salt=crypto.randomBytes(16).toString('hex');return 'scrypt$'+salt+'$'+crypto.scryptSync(p,salt,64).toString('hex')}
function verify(p,h){if(typeof h!=='string')return false;let [alg,salt,key]=h.split('$');if(alg!=='scrypt'||!salt||!key||key.length!==128)return false;return crypto.timingSafeEqual(crypto.scryptSync(p,salt,64),Buffer.from(key,'hex'))}
function sign(payload){let secret=process.env.SESSION_SECRET;if(!secret||secret.length<32)throw Error('SESSION_SECRET não configurado');let body=Buffer.from(JSON.stringify(payload)).toString('base64url');let sig=crypto.createHmac('sha256',secret).update(body).digest('base64url');return body+'.'+sig}
function session(req){let token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('os_session='))?.slice(11);if(!token)return null;let [body,sig]=token.split('.');if(!body||!sig)return null;let expected=crypto.createHmac('sha256',process.env.SESSION_SECRET||'').update(body).digest();let got;try{got=Buffer.from(sig,'base64url')}catch{return null}if(got.length!==expected.length||!crypto.timingSafeEqual(got,expected))return null;try{let s=JSON.parse(Buffer.from(body,'base64url'));return s.exp>Date.now()?s:null}catch{return null}}
function cookie(token){return 'os_session='+token+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age='+(token?'28800':'0')}
function publicUser(u){return {id:u.id,nome:u.nome,email:u.email,cpf:u.cpf,perfil:u.perfil,ativo:u.ativo}}
module.exports={db,digits,validCpf,hash,verify,sign,session,cookie,publicUser};
