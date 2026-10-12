# Exclusive OS — Pacote consolidado para GitHub e Vercel

Este pacote reúne o painel com gráfico colorido, carteiras clicáveis, vistorias com importação de PDF textual, fotos nos processos e estrutura inicial do backend de usuários.

## Atualização correta

1. Faça uma cópia do repositório atual.
2. No repositório GitHub `exclusive_os_git_vercel`, substitua **todos os arquivos do projeto** pelos arquivos desta pasta, preservando a mesma estrutura (public/, api/, lib/, scripts/, supabase/, etc.). Não envie a pasta `exclusive_os_consolidado_corrigido` como uma pasta extra na raiz.
3. Faça commit na branch `main` e aguarde o novo deployment ficar `Ready` na Vercel.
4. Na Vercel: Framework Other, Root Directory `./`, Output Directory `public`.
5. Abra o site com Ctrl+Shift+R e procure **Distribuição da carga das carteiras** na Visão geral.
6. Teste também carteiras, abertura de processos com fotos e importação de vistoria.

## Testes locais

`npm run check` e `npm run test:flows`. A validação de código não substitui testes de navegador ou do Supabase real.

## Limitações importantes

O login operacional antigo continua demonstrativo e inseguro para dados reais. O backend de usuários em api/ exige configuração de Supabase e variáveis de ambiente; não está ativado automaticamente por publicar o ZIP. Não envie CPFs, senhas ou documentos reais ao ambiente demonstrativo. Fotos e registros locais não sincronizam entre computadores.

Os 103 registros públicos foram mantidos em formato mínimo. Endereço e CNPJ não podem ser restaurados sem base de dados privada.
