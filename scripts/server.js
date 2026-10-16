'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const port=Number(process.env.PORT||3000);
const root=path.resolve(__dirname,'..','public');
const pages=new Set(['index.html','demo.html','admin.html','ativar-master.html','operacional.html','veiculos.html','redefinir-senha.html']);
const assets=new Set(['robots.txt','enhancements.js','vistoria_carteiras.js','painel_condominios.js','mobile_fixes.css','pdf_profissional.js','vistoria_avancada.js','navegacao_carteiras.js','frota-v2.js']);
const apiFiles=new Set(['access','bootstrap-master','carteiras','health','operacoes','password-reset','veiculos','vistoria-itens']);
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');
 let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end('Requisição inválida')}
 const pathname=url.pathname;
 if(pathname.startsWith('/api/')){
  const name=pathname.slice(5);if(!apiFiles.has(name)){res.writeHead(404);return res.end('API não encontrada')}
  if(!['GET','POST','PATCH','PUT','DELETE'].includes(req.method)){res.writeHead(405);return res.end('Método não permitido')}
  let body='';
  if(req.method!=='GET'){
   try{for await(const chunk of req){body+=chunk;if(body.length>3900000)throw Error('Payload excede 3,9 MB')}}catch(e){res.writeHead(413);return res.end(e.message)}
  }
  try{
   req.headers['x-forwarded-proto']='http';
   req.query=Object.fromEntries(url.searchParams);
   req.body=body?JSON.parse(body):{};
   res.status=function(code){res.statusCode=code;return res};
   res.json=function(data){res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(data))};
   await require('../api/'+name)(req,res);
  }catch(e){console.error('Erro local:',e);if(!res.headersSent){res.statusCode=500;res.json({error:'Erro interno'})}else res.end()}
  return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Método não permitido')}
 const name=pathname==='/'?'index.html':pathname.slice(1);
 if(name.includes('/')||!(pages.has(name)||assets.has(name))){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Página não encontrada')}
 fs.readFile(path.join(root,name),(err,body)=>{
  if(err){res.writeHead(500);return res.end('Erro ao abrir arquivo')}
  res.writeHead(200,{'Content-Type':types[path.extname(name)]||'application/octet-stream'});
  res.end(req.method==='HEAD'?undefined:body);
 });
});
server.listen(port,'127.0.0.1',()=>console.log('Exclusive OS: http://localhost:'+port+' | Frota: http://localhost:'+port+'/veiculos.html'));
