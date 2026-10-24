# Cadastro de condomínios — código, endereço e início da gestão

## O que foi alterado
- API: `api/operacoes.js` aceita, valida e retorna `codigo`, `endereco_completo`, `data_inicio_exclusive`.
- Operacional: `public/operacional.html` exibe os novos campos no cadastro, na listagem, na visão geral e no CSV de condomínios.
- Demonstração: `public/demo.html` adiciona os campos no cadastro e na edição, inclusive para cadastros importados, e exporta CSV com seis colunas.
- Banco: `supabase/migrations/20261023_cadastro_condominios.sql` adiciona três colunas e índice de unicidade sem apagar dados históricos.

## Exportação CSV
Ordem das colunas: Código; Nome completo; Endereço completo; Unidades; Síndico responsável; Data em que a Exclusive assumiu.

## Procedimento
1. Faça backup do Supabase e dos dados locais antes de alterar o sistema.
2. Execute a migração no SQL Editor do Supabase de homologação.
3. Baixe a branch de desenvolvimento, instale dependências e configure o backend.
4. Teste cadastrar dois condomínios com códigos iguais (o segundo deve ser recusado).
5. Teste a edição, os filtros, a visão geral e o CSV.
6. Revise os cadastros legados e preencha os novos campos.

## Limitações e atenção
- O PDF nativo não foi implementado nesta entrega; CSV pode ser aberto no Excel e exportado para PDF.
- A migração não preenche automaticamente códigos ou datas históricas, para não inventar informações.
- As alterações foram verificadas por análise de código e sintaxe JavaScript, não por testes E2E no Supabase ou navegador.
- Não faça merge em produção sem homologar.
