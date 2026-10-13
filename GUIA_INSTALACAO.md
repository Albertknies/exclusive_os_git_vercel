# Exclusive OS — Etapa 1: backend de usuários

## O que foi revisado
- API `api/access.js`: login com CPF, sessões HttpOnly/Secure, papéis Master e Gerente, cadastro e edição, validação de origem em operações de escrita e requisições JSON.
- `api/health.js`: indica se as variáveis essenciais foram configuradas, sem afirmar que o banco foi testado.
- `supabase/schema.sql`: tabelas `os_users` e `os_user_audit` com RLS sem políticas públicas.
- `public/admin.html`: painel de usuários separado do sistema demonstrativo.

## Como enviar ao GitHub
1. Faça backup ou baixe o ZIP do repositório atual.
2. Extraia este ZIP e copie **o conteúdo** (não a pasta externa) para a raiz de `Albertknies/exclusive_os_git_vercel`.
3. Faça commit dos arquivos e aguarde a publicação na Vercel. Não envie `.env` nem chaves secretas.
4. No Vercel, confirme que `Output Directory` está `public` e que a instalação das dependências do `package.json` está habilitada. A função `/api/access` depende de `@supabase/supabase-js`.

## Para ativar o backend (obrigatório)
1. Crie um projeto no Supabase e execute `supabase/schema.sql` no SQL Editor.
2. Configure no Vercel as variáveis `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SESSION_SECRET` (aleatória com 32+ caracteres). Não use prefixo `NEXT_PUBLIC_` na chave de serviço.
3. Faça novo deploy após salvar as variáveis.
4. Crie o primeiro CEO **localmente** com Node: `npm install`, configure `CEO_CPF`, `CEO_EMAIL`, `CEO_INITIAL_PASSWORD` (12+ caracteres), `CEO_NOME` e as variáveis Supabase, depois execute `npm run bootstrap:ceo`. Nunca coloque CPF real nem senha no GitHub.
5. Entre em `https://exclusive-os.vercel.app/admin.html` usando CPF e senha do CEO.

## Limitações importantes
- O `index.html` ainda é uma demonstração local e **não usa a autenticação do backend**. Não cadastre moradores, fotos, documentos ou informações sensíveis nele.
- Não foi possível executar testes com banco Supabase real ou Vercel neste ambiente.
- Antes do uso real: implementar limitação de tentativas de login no servidor, MFA, recuperação de senha, auditoria transacional, gestão de sessões e migração de condomínios/chamados para banco.
- A rota `/api/health` mostra apenas a presença de configuração; não testa a conectividade do banco.
