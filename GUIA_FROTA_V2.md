# Exclusive OS — Frota Inteligente (16/10/2026)

Esta atualização foi criada sobre o repositório existente, em uma branch separada da main. Nenhuma alteração foi publicada em produção.

## Instalar no VS Code

1. Baixe o ZIP da branch feature/frota-tanque-cheio-20261016 no GitHub e extraia.
2. Abra a pasta no VS Code. Instale Node.js 18+ e execute npm install.
3. Copie .env.example para .env e configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SESSION_SECRET. Nunca compartilhe ou publique o .env.
4. Faça backup do Supabase. No SQL Editor, execute supabase/migrations/20261016_frota_tanque_cheio.sql.
5. Execute npm run check e npm start.
6. Acesse http://localhost:3000/admin.html e depois http://localhost:3000/veiculos.html.
7. Valide retirada e devolução com perfis Síndico e Gerente/Master antes de publicar.
8. Quando aprovado, integre a branch à main por pull request. A Vercel poderá publicar automaticamente após o merge. Pré-visualizações de branch podem ser criadas pela Vercel conforme configuração.

## Fluxo da frota

Retirada: KM inicial, data/hora, destino, finalidade, confirmação de tanque cheio e foto do painel obrigatória. O banco impede duas retiradas abertas para o mesmo veículo.

Devolução: KM final, litros, valor pago, posto, foto do painel e foto do comprovante quando houver abastecimento. Tanque cheio por padrão. Se não for possível completar, o síndico registra uma exceção com justificativa.

Cálculos válidos somente com tanque cheio na retirada e devolução:
- KM rodados = KM final menos KM inicial.
- Média de consumo = KM rodados divididos pelos litros abastecidos.
- Custo por KM = valor pago dividido pelos KM rodados.
- Média consolidada = soma dos KM válidos dividida pela soma dos litros válidos.

Os relatórios apresentam histórico, filtros por período, veículo e síndico (gerência), custo e CSV compatível com Excel.

## Manutenções

Gerência/Master registra tipo, KM do último serviço e intervalo. O sistema indica Em dia, Próxima (até 500 KM) e Vencida. São alertas na tela, não notificações push ou e-mail. Use sempre o mesmo nome para o tipo de serviço.

## Segurança e compatibilidade

A migração é aditiva: não exclui dados antigos. Fotos são guardadas em bucket privado no Supabase Storage e acessadas por URL assinada por 60 segundos, mediante sessão autorizada. O frontend comprime imagens; a API limita o arquivo recebido a 950 KB.

O projeto mantém a demonstração legada baseada em dados locais, que não é apropriada para informações pessoais reais. O módulo de frota usa API autenticada e Supabase. O ZIP não contém credenciais, registros do banco ou fotos de usuários.

Se houver erro de serviço indisponível, verifique o SQL, Storage e as variáveis de ambiente. Se a média estiver vazia, confira o tanque cheio nas duas etapas e os litros abastecidos.

## Arquivos alterados ou adicionados

- api/veiculos.js
- public/veiculos.html
- public/frota-v2.js
- scripts/server.js
- supabase/migrations/20261016_frota_tanque_cheio.sql
- GUIA_FROTA_V2.md
