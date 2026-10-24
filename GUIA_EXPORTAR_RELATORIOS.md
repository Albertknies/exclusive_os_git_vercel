# Exportar relatório — PDF e CSV sem sair da página

## Interface
- O botão **Exportar relatório** fica no canto superior direito do Operacional e da Demonstração.
- Ao clicar, o usuário escolhe **Baixar PDF** ou **Baixar CSV**.
- O navegador inicia o download diretamente; não há redirecionamento, nova aba ou janela de impressão.
- O PDF usa A4 horizontal, cabeçalho Exclusive Síndicos, data/hora e paginação automática para linhas usuais.
- O CSV é UTF-8 com BOM e delimitador ponto e vírgula, compatível com Excel em pt-BR.

## Dados
- Na Visão Geral, Condomínios e Carteiras: Código, Nome completo, Endereço completo, Unidades, Síndico responsável e Início Exclusive.
- Nos demais módulos do Operacional: campos da seção ativa; filtros de registros são considerados quando aplicáveis.
- Na Demonstração: condomínios, tarefas/chamados/manutenções e vistorias, conforme a seção.
- Seções sem relatório definido na demonstração exibem aviso; não fabricam dados.

## Verificações efetuadas
- Sintaxe JavaScript dos arquivos alterados: passou.
- Teste isolado da geração de PDF e CSV com 180 linhas: passou, com cabeçalho %PDF-1.4 e CSV UTF-8/BOM.
- Integração real no navegador e Supabase: **não executada**. Testar manualmente no Chrome/Edge antes de produção.
- PDF usa fontes padrão Helvetica/WinAnsi; caracteres não representáveis podem aparecer como '?'.
- Verificar impressão em muitas páginas, nomes longos, filtros, perfis e dispositivos móveis.

## Como testar
1. Baixe a branch de desenvolvimento e execute `npm start`.
2. Acesse `/demo.html` para testes com dados fictícios.
3. Acesse `/operacional.html` para testes com backend de homologação configurado.
4. Abra Visão Geral, clique no botão superior direito, selecione PDF e confira o arquivo baixado.
5. Repita para CSV e confira seis colunas, acentos, códigos e datas.
6. Repita em Condomínios, Processos, Chamados e Vistorias, incluindo filtros.
7. Confira comportamento responsivo, permissões e relatórios vazios.
8. Não publique em produção sem validação no ambiente real.

## Correções e validações adicionais (23/10/2026)
- Corrigidos os offsets da tabela xref e o comprimento dos streams PDF para contagem de bytes Latin-1. Isso evita arquivos PDF estruturalmente inconsistentes quando há acentos.
- Corrigida a alternância de linhas duplicadas na tabela PDF.
- Adicionada proteção básica contra fórmulas em células CSV iniciadas por =, +, -, @.
- Botão de exportação ocultado quando não há sessão autenticada no Operacional.
- Removido o botão antigo de exportação CSV da demonstração, mantendo um único acesso no canto superior direito.
- Teste isolado executado com 180 registros: PDF de 11 páginas, offsets e streams consistentes; CSV com acentos e neutralização de fórmula.
- Teste automatizado adicionado em `scripts/test-relatorios.js`, executável com `npm run test:reports`.
- Workflow GitHub Actions adicionado em `.github/workflows/validar-exclusive-os.yml`; no momento da entrega **não havia execução de workflow confirmada**.
- **Ainda pendente:** validação ponta a ponta no navegador real, Supabase e Vercel, incluindo permissões e download em celular. Sem isso não declarar pronto para produção.
