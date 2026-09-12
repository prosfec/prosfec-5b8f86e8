# Visualizador profissional de PDF integrado à PROSFEC

## Objetivo

Substituir exclusivamente a visualização nativa do laudo por um leitor próprio da PROSFEC, baseado em PDF.js, mantendo intactos upload, armazenamento, vínculo, autenticação, permissões e regras comerciais.

## Estado atual confirmado

- O botão **“Ver relatório completo”** abre `RelatorioPdfViewerModal.tsx` tanto na ficha do lead quanto na visualização do Passo 3.
- O modal recebe a consulta já selecionada e usa somente `consulta.relatorioPdfUrl`, criada pelo fluxo atual de upload.
- A exibição atual usa um `<iframe>` no desktop e um card de download no celular ou em falha.
- O projeto ainda não possui PDF.js nem biblioteca React baseada nele.
- O envio e a remoção do arquivo permanecem isolados em `RelatorioPdfUploader.tsx` e não serão alterados.

## Implementação

1. Adicionar `react-pdf`/PDF.js como dependência de visualização e configurar o worker de forma compatível com o carregamento no navegador.
2. Criar um componente cliente dedicado ao documento, carregado apenas no navegador para preservar a renderização atual da aplicação.
3. Reestruturar somente `RelatorioPdfViewerModal.tsx` como uma tela interna ampla da PROSFEC:
   - cabeçalho fixo com nome do laudo, titular e documento;
   - fechar e retornar ao lead;
   - download preservado, usando exatamente a URL e o nome já existentes;
   - barra de controles fixa e adequada para toque;
   - página anterior/próxima e indicador `atual / total`;
   - zoom de reduzir, aumentar e ajustar à largura;
   - modo tela cheia pela API do navegador, quando disponível.
4. Renderizar as páginas em canvas dentro da aplicação, sem `iframe`, `embed`, `object` ou abertura nativa como forma principal.
5. Exibir as páginas em sequência vertical, com ajuste inicial à largura disponível e atualização da página atual durante a rolagem.
6. Manter dimensões estáveis e carregamento progressivo para PDFs extensos, evitando que todas as páginas pesadas sejam processadas ao mesmo tempo.
7. Tratar estados sem alterar o acesso ao arquivo:
   - carregamento do documento e das páginas;
   - arquivo ausente, preservando “Relatório em preparação”;
   - erro de leitura ou acesso negado, com mensagem clara e opção de tentar novamente;
   - download apenas onde ele já existe hoje.
8. Preservar os props e callbacks atuais, portanto as duas integrações existentes continuam funcionando sem mudanças no fluxo do lead.

## Segurança e escopo preservado

- A única origem aceita continuará sendo `consulta.relatorioPdfUrl`; não haverá campo para informar caminhos ou URLs.
- O PDF será lido diretamente da URL autorizada já entregue pelo sistema, sem cópia, proxy novo ou serviço externo.
- Nenhuma alteração em Firebase Storage, Firestore, autenticação, permissões, upload, exclusão, parceiros, painel administrativo ou regras comerciais.
- Nenhuma URL pública permanente será criada.

## Validação obrigatória

- Validar compilação e funcionamento sem erros.
- Conferir visualmente em desktop e celular real/simulado.
- Testar PDF de uma página, várias páginas e arquivo grande.
- Testar rolagem, página anterior/próxima, indicador, zoom, ajuste à largura e tela cheia.
- Testar fechamento e retorno ao lead sem perder o contexto.
- Testar carregamento, URL inválida e documento sem autorização.
- Confirmar que o iframe e o leitor nativo foram removidos deste fluxo e que upload/download permanecem intactos.

## Entrega

Informar os componentes alterados/criados, a biblioteca usada, como o PDF é renderizado, os controles disponíveis, a remoção do leitor nativo e o resultado dos testes em desktop e celular.
