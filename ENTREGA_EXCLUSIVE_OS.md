# EXCLUSIVE OS — ENTREGA INTEGRADA (16/10/2026)

## Escopo efetivamente presente no repositório

- Painel operacional: visão geral, condomínios, carteiras e acessos, tarefas, processos, chamados, vistorias, financeiro, indicadores e manutenção operacional.
- Equipe: distribuição por síndico, pontos de complexidade, condomínios vinculados, pendências, atrasos e redistribuição auditável.
- Frota: cadastro de veículos, retirada, devolução, exigência de tanque cheio, fotos, quilometragem, abastecimentos, consumo, custos, relatórios e manutenção preventiva.
- Administração: usuários, acesso e recuperação de senha conforme APIs existentes.
- Interface: menu lateral esquerdo no desktop; no celular o menu **continua lateral** e abre por botão, sem virar abas horizontais. Paleta azul-marinho/dourado.

**Nota:** Os módulos operacionais acima são os que já existiam no repositório e foram preservados. Esta entrega aprimora a navegação compartilhada de Equipe, Frota e Operacional; não significa que cada módulo foi reescrito ou testado ponta a ponta.

## Baixar e abrir no VS Code

1. No GitHub, selecione a branch `feature/frota-tanque-cheio-20261016` e escolha **Code → Download ZIP**.
2. Extraia o ZIP e abra a pasta no VS Code.
3. Instale Node.js 18+ e execute `npm install`.
4. Copie `.env.example` para configuração local e defina as variáveis de ambiente no seu terminal. O servidor Node não carrega automaticamente um arquivo .env.
5. Execute `npm run check`, `npm run test:flows` e `npm start`. Acesse `http://localhost:3000/operacional.html`, `/equipe.html` e `/veiculos.html`.

## Supabase

**Antes de qualquer SQL, faça backup.** Em banco novo, use os esquemas básicos conforme `GUIA_PUBLICACAO_V2.md`. Para o novo conjunto, aplique e revise:
- `supabase/veiculos.sql` (estrutura inicial, se ainda não existir);
- `supabase/migrations/20261016_frota_tanque_cheio.sql`;
- `supabase/migrations/20261016_equipe_carteiras.sql`.

Confira as dependências, o estado atual do banco e os perfis autorizados antes de executar. Não execute automaticamente em produção.

## Vercel

1. Faça commit e push da branch no GitHub, se ainda não estiver sincronizada.
2. Na Vercel, importe o repositório ou abra o projeto existente e selecione a branch de desenvolvimento para **Preview Deployment**.
3. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SESSION_SECRET` em **Environment Variables**. A chave service role é **segredo de servidor**; nunca deve ser exposta no frontend, repositório ou variáveis `NEXT_PUBLIC_`.
4. Publique primeiro como Preview, teste autenticação, permissões, cadastros, transferências, fotos, combustível, relatório e uso no celular.
5. Somente depois de validar e aprovar, promova para produção.

## Arquivos de interface adicionados

- `public/os-sidebar.css` e `public/os-sidebar.js`: menu lateral compartilhado de Equipe e Frota.
- `public/os-operacional.css` e `public/os-operacional.js`: correção do menu lateral responsivo do painel operacional.
- `public/equipe.html`, `public/veiculos.html`, `public/operacional.html`: integração visual preservando formulários e chamadas existentes.
- `scripts/server.js`: inclusão dos assets no servidor local.

## Cuidados / pendências reais

- Não foi feito teste E2E com seu Supabase nem deploy na Vercel.
- O projeto ainda contém `/demo.html` e componentes legados de demonstração que **não** são o banco real; não insira dados sensíveis neles.
- A atribuição de síndico no cadastro de condomínios ainda usa nome em texto em alguns fluxos, o que requer revisão para mudanças de nome ou duplicidade.
- Fotos e dados pessoais precisam de revisão de LGPD, retenção e políticas de acesso.
- Revisar os testes de permissões, transações e concorrência, backups, monitoramento, performance e eventuais limites de paginação antes de produção.
- Para segurança, não rode migrações sem backup, não compartilhe credenciais e não faça merge na branch principal antes da homologação.

## URLs de teste

- `/operacional.html` — painel geral e módulos operacionais.
- `/equipe.html` — equipe e carteiras.
- `/veiculos.html` — frota.
- `/admin.html` — usuários e acessos.

