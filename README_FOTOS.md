# Fotos em processos (demonstração)

No formulário **Registrar processo**, selecione até 8 fotos JPG, PNG ou WebP (máximo 5 MB cada), revise as miniaturas e clique **Criar processo**. Ao abrir o processo novamente, a galeria permite visualizar e excluir as imagens.

As fotos ficam no **IndexedDB do navegador**, vinculadas ao ID local do processo. Não são enviadas ao Supabase, à Vercel ou ao GitHub. Outros dispositivos não verão as fotos. Limpar os dados do navegador pode apagá-las. Não use fotos reais ou sensíveis até implementar armazenamento privado e permissões no backend.

## Publicação

Atualize `public/index.html` e adicione `public/fotos_processos.js` no GitHub. Faça commit e aguarde o deploy na Vercel.
