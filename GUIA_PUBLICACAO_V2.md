# Exclusive OS — Entrega operacional V2

## O que funciona após configuração
- `/admin.html`: login real com CPF e senha, gestão de usuários (Master/Gerente).
- `/operacional.html`: condomínios, processos e vistorias compartilhados em PostgreSQL; criação, listagem e edição; dashboard por síndico e pontos.
- A API aplica sessão HttpOnly, verifica usuário ativo e restringe dados por vínculos (`os_vinculos`) para perfis não administrativos.
- `/index.html` é a **demonstração legada**. Continua independente e NÃO grava no banco. Um link leva ao módulo seguro.

## Publicação (passo a passo)
1. Faça backup do repositório. Envie **o conteúdo da pasta** ao GitHub privado, mantendo a estrutura de diretórios.
2. Crie um projeto no Supabase. No SQL Editor execute `supabase/schema.sql` e DEPOIS `supabase/operacoes.sql`.
3. Na Vercel (Project > Settings > Environment Variables), cadastre `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SESSION_SECRET` aleatório com 32+ caracteres. **Nunca** use prefixo `NEXT_PUBLIC_` na chave de serviço. Faça novo deploy.
4. Num computador confiável com Node 18+, execute `npm install`. Defina no ambiente `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CEO_CPF`, `CEO_EMAIL`, `CEO_INITIAL_PASSWORD` (12+ caracteres), opcional `CEO_NOME`; execute `npm run bootstrap:ceo`. **Não envie essas informações para o GitHub nem para esta conversa.**
5. Opcional: importe os 103 registros mínimos da demonstração com `CONFIRM_IMPORT=SIM npm run import:condos` (também requer as variáveis Supabase). Não importa endereços, CNPJs ou contratos.
6. Acesse `https://exclusive-os.vercel.app/operacional.html` e `https://exclusive-os.vercel.app/admin.html`. Teste com conta CEO.
7. Em `os_vinculos`, cadastre os vínculos de cada usuário não administrativo com seus condomínios, para que possa visualizá-los e trabalhar neles.

## Testes
`npm run check`, `npm run test:flows`, `npm run test:backend`. Estes são testes estáticos/locais, **não** testes de produção com Supabase.

## Limites importantes
- O backend **não** foi ativado no seu Supabase nem testado em produção; depende de configuração real e testes E2E.
- Login do `/index.html` continua DEMO; **não insira dados reais ali**.
- Fotos e PDFs da demonstração continuam no navegador, sem sincronização segura. Upload privado, anexos, importação completa de vistorias, recuperação de senha, MFA, monitoramento, rate limit transacional e backups ainda precisam de implementação/validação.
- O limitador de tentativas usa tabela no banco e não é atomicamente seguro contra concorrência. Antes de liberar usuários reais, configure também WAF/rate limiting no perímetro.
- Revise LGPD, permissões, logs, testes de autorização e retenção antes de operar com dados pessoais.
