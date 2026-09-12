# Visualizador de PDF próprio da PROSFEC (substituir o iframe)

## Ponto a reverificar antes de construir

Na tentativa anterior o teste de leitura do arquivo foi feito **sem enviar o cabeçalho de origem**. Servidores só respondem com as permissões de leitura entre sites quando a origem é informada, então aquele resultado foi inconclusivo — não é prova de bloqueio.

Primeiro passo desta implementação: repetir o teste corretamente, informando a origem da aplicação.

- Se a leitura for autorizada: seguir com todo o restante do plano.
- Se realmente for bloqueada: **parar** e informar exatamente o status e o cabeçalho que bloquearam, sem tornar o arquivo público, sem criar cópia, proxy ou serviço externo, e sem alterar nenhuma permissão. O visualizador atual permanece como está.

## O que muda para o usuário

Ao clicar em "Ver relatório completo", o laudo passa a ser exibido dentro da própria PROSFEC:

- Cabeçalho PROSFEC com nome do laudo, titular, documento e data, botão fechar e botão de download (o mesmo de hoje).
- O documento aparece centralizado, em rolagem vertical contínua.
- Controles próprios: página anterior, próxima, indicador "atual / total", diminuir zoom, aumentar zoom, ajustar à largura e tela cheia.
- No celular: tela praticamente inteira, botões grandes para toque, rolagem própria do documento, sem abrir o leitor do aparelho e sem precisar de outra aba.
- Estados: carregando, "Relatório em preparação" quando ainda não há arquivo, e erro com mensagem clara, botão "Tentar novamente" e o download preservado.

## O que não muda

Envio do arquivo, armazenamento, endereço do PDF, nome do arquivo baixado, permissões, regras de acesso, leads, consultas, serviços, parceiros, administração, cobrança, contratos e simulador. As duas telas que já abrem o visualizador continuam funcionando sem alteração.

## Detalhes técnicos

- Dependência: `react-pdf` (PDF.js), com o worker servido localmente via `import.meta.url` (sem CDN externo).
- Arquivo alterado: `src/components/RelatorioPdfViewerModal.tsx` — remoção do `<iframe>`, dos estados `previewLoaded`/`previewFailed`/`fallbackTimerRef` e do timer de 8s.
- Novo arquivo: `src/components/PdfDocumentViewer.tsx`, somente cliente, carregado por `React.lazy` dentro de `<ClientOnly>` para não ser avaliado na renderização no servidor.
- Renderização em canvas, uma página por vez conforme entra na área visível (`IntersectionObserver`), com placeholder de altura fixa para as demais — PDFs extensos não são renderizados de uma vez.
- Largura inicial calculada pelo contêiner (ajustar à largura); zoom por multiplicador sobre essa largura.
- Tela cheia pela API `requestFullscreen` do navegador, quando disponível.
- Fonte do arquivo: exclusivamente `consulta.relatorioPdfUrl`; nenhum campo para informar caminhos.
- Validação: `bunx tsgo --noEmit`, build, e conferência visual em desktop e em viewport de celular (1 página, várias páginas e arquivo grande), navegação, zoom, rolagem, tela cheia, fechamento, erro de carregamento e ausência de PDF.
