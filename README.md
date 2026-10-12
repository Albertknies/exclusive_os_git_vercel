# Exclusive OS — GitHub + Vercel (prévia pública SEM dados operacionais)

## Estado do projeto

Esta entrega é **uma demonstração estática**, preparada para subir no GitHub e Vercel sem publicar a planilha operacional original. **NÃO É SISTEMA DE PRODUÇÃO**. O login é simulado em `localStorage`, senhas são armazenadas em texto puro no navegador, as permissões são visuais, e os dados de teste ficam no navegador do visitante. **Não cadastre pessoas reais, CPF real, fotos privadas ou documentos verdadeiros.**

Os 103 condomínios foram reduzidos a **nome, ID, responsável, classe e status** para a prévia pública. CNPJ, endereço, números de contas e contratos foram retirados da versão destinada ao Git. As carteiras e nomes de condomínios ainda são visíveis publicamente; revise se isso é aceitável antes de publicar. Caso contrário, substitua a base por dados totalmente fictícios.

## Teste local

Requer Node 18+. Execute `npm run check`, depois `npm start` e abra `http://localhost:3000`. Login de demonstração: `111.444.777-35` / `admin123`. Não reutilize essa senha.

## Publicar no GitHub

1. Extraia o ZIP em uma pasta, abra no VS Code e execute `git init`, `git add .`, `git commit -m "Primeira versão de demonstração do Exclusive OS"`.
2. Crie um repositório **privado** no GitHub (recomendado). Associe-o com `git remote add origin URL_DO_SEU_REPOSITORIO`, `git branch -M main`, `git push -u origin main`.
3. Não envie arquivos CSV originais, backups locais ou `.env`.

## Vercel

1. Em Vercel, **Add New > Project > Import Git Repository** e selecione o repositório.
2. Framework Preset: **Other**; Root Directory: raiz do projeto; Build Command: **em branco**; Output Directory: `public`; Install Command: **em branco** (sem dependências).
3. O `vercel.json` configura cabeçalhos HTTP. A pasta `api/` fornece a primeira função serverless `GET /api/health`.
4. Após deploy, abra `/api/health`: a resposta `mode: demo`, `database: false`, `authentication: false` é proposital.
5. A Vercel disponibiliza HTTPS. Antes de convidar funcionários ou clientes, implemente o backend real.

## Backend — ordem sugerida

- Banco PostgreSQL (por exemplo, Vercel Postgres/Neon/Supabase), migrações, backups e isolamento por condomínio.
- Autenticação segura no servidor (hash de senhas, sessões HTTP-only, proteção contra força bruta, recuperação de acesso).
- Autorização por perfil e vínculo condomínio/usuário em **todas** as rotas da API.
- Tabelas: users, condominiums, memberships, tickets, ticket_messages, tasks, inspections, inspection_items, attachments, audit_logs.
- Armazenamento privado de fotos e PDFs, URLs assinadas, limite de upload e antivírus conforme o risco.
- Importação de PDFs no backend com validação humana, incluindo suporte posterior a OCR e fotos embutidas.
- Conformidade com LGPD, controle de retenção, consentimento/base legal e logs de auditoria.

**A função `/api/health` é apenas o primeiro endpoint de infraestrutura, não um backend funcional.**

## Limitações conhecidas

- PDF.js para importação textual carrega por CDN e requer conexão. PDF digitalizado sem OCR não é suportado.
- Fotos de vistoria ficam no IndexedDB local, não no backend.
- Geração de PDF é via impressão do navegador.
- Nenhum teste completo de segurança ou E2E de produção foi realizado.
