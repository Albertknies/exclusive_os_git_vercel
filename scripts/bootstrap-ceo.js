const {db,digits,validCpf,hash}=require('../lib/access');
(async()=>{let cpf=digits(process.env.CEO_CPF),email=process.env.CEO_EMAIL,nome=process.env.CEO_NOME||'Direção / CEO',senha=process.env.CEO_INITIAL_PASSWORD;
if(!validCpf(cpf)||!email||!senha||senha.length<12)throw Error('Configure CEO_CPF, CEO_EMAIL, CEO_INITIAL_PASSWORD (12+ caracteres) e opcional CEO_NOME');
let c=db();let {data:exists,error:e}=await c.from('os_users').select('id').eq('perfil','Master').limit(1);if(e)throw e;if(exists.length)throw Error('Já existe CEO/Master; bootstrap não será repetido');
let {error}=await c.from('os_users').insert({nome,email,cpf,perfil:'Master',ativo:true,password_hash:hash(senha)});if(error)throw error;console.log('CEO criado. Não exiba nem compartilhe a senha.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
