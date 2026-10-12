# Exclusive OS — Backend de usuários (primeira etapa)

**Entregue:** API serverless `/api/access`, tabela SQL, autenticação com senha derivada por scrypt, sessão HttpOnly Secure SameSite, perfis Master/Gerente, cadastro, edição, bloqueio e redefinição de senha, auditoria básica, página `/admin.html`.

**Não entregue:** integração do login do aplicativo legado com esta API, migração de condomínios/chamados/vistorias para o banco, recuperação de senha por e-mail, rate limiting distribuído, MFA, testes E2E no ambiente Vercel. O painel antigo permanece DEMONSTRATIVO e NÃO deve receber dados reais. Não liberar a operação real sem essas etapas.

## Instalação
1. Crie um projeto Supabase privado e execute `supabase/schema.sql` no SQL Editor.
2. Na Vercel, configure **Environment Variables**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (segredo, NUNCA `NEXT_PUBLIC_`), `SESSION_SECRET` (string aleatória de pelo menos 32 caracteres). Configure os três ambientes conforme necessário.
3. No GitHub, atualize **todos** os arquivos deste ZIP, não apenas o index.html. A Vercel deve instalar `@supabase/supabase-js` automaticamente. Em Build Command deixe vazio; Output Directory `public`.
4. Para criar o primeiro CEO, no computador local, com Node instalado, execute `npm install`, configure variáveis de ambiente `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CEO_CPF`, `CEO_EMAIL`, `CEO_INITIAL_PASSWORD` (mínimo 12 caracteres), `CEO_NOME` (opcional), e rode `npm run bootstrap:ceo`. **Nunca coloque CPF, senha ou chave de serviço no repositório ou na conversa.** O script recusa criar outro CEO se já existir um.
5. Acesse `https://SEU-DOMINIO/admin.html`, entre com o CEO e gerencie os usuários. Essa página é separada do protótipo antigo até concluirmos a migração de autenticação.

## Permissões
Master pode criar e alterar todos os perfis. Gerente pode criar e editar perfis operacionais, mas não Master ou Gerente. Outros perfis não acessam a API de gestão. O backend recusa bloquear o último Master ativo. O acesso é validado no servidor a cada requisição.

## Segurança e limites
O login usa CPF como identificador, mas não exibe senhas existentes. Não coloque dados reais na aplicação legada, cujo armazenamento ainda é local. Ative proteção contra força bruta/WAF e MFA antes do uso produtivo. Registros de auditoria não incluem conteúdo da senha. A API não envia e-mail de convite nem aplica restrições operacionais nos módulos antigos.
