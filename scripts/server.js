'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.env.PORT || 3000);
const root = path.resolve(__dirname, '..', 'public');
const allowed = new Map([
  ['/', 'index.html'], ['/index.html','index.html'], ['/robots.txt','robots.txt'],
  ['/enhancements.js','enhancements.js'],
  ['/vistoria_carteiras.js','vistoria_carteiras.js'],
  ['/painel_condominios.js','painel_condominios.js'],
  ['/mobile_fixes.css','mobile_fixes.css'],
  ['/pdf_profissional.js','pdf_profissional.js'],
  ['/vistoria_avancada.js','vistoria_avancada.js']
]);
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server = http.createServer((req,res)=>{
  let pathname;
  try {pathname = new URL(req.url,'http://localhost').pathname;} catch {res.writeHead(400);return res.end('Requisição inválida');}
  const filename=allowed.get(pathname);
  if (!filename || !['GET','HEAD'].includes(req.method)) {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Página não encontrada');}
  const target=path.join(root,filename);
  fs.readFile(target,(err,body)=>{
    if(err){res.writeHead(500);return res.end('Erro ao abrir arquivo');}
    res.writeHead(200,{'Content-Type':types[path.extname(target)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'});
    res.end(req.method==='HEAD'?undefined:body);
  });
});
server.listen(port,'127.0.0.1',()=>console.log(`Exclusive OS: http://localhost:${port}`));
