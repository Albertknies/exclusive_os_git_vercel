const fs=require('node:fs');const {db}=require('../lib/access');
const html=fs.readFileSync(require('node:path').join(__dirname,'../public/index.html'),'utf8');
const match=html.match(/const IMPORTED_CONDOS=(\[[^;]+\]);/);if(!match)throw Error('Lista de demonstração não encontrada');
const rows=JSON.parse(match[1]);
(async()=>{
 if(process.env.CONFIRM_IMPORT!=='SIM')throw Error('Defina CONFIRM_IMPORT=SIM para importar os 103 registros mínimos');
 const c=db();let created=0,skipped=0;
 for(const row of rows){const codigo=String(row.id);const {data,error:e}=await c.from('os_condominios').select('id').eq('codigo',codigo).maybeSingle();if(e)throw e;
  if(data){skipped++;continue;}
  const {error}=await c.from('os_condominios').insert({codigo,nome:row.nome,sindico:row.sindico||'',classe:row.classe||'B',status:row.status==='Inativo'?'Inativo':'Ativo'});if(error)throw error;created++;
 }
 console.log(`Importação concluída: ${created} criados, ${skipped} existentes.`);
})().catch(e=>{console.error(e.message);process.exitCode=1});
