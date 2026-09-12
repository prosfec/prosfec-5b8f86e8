# Por que o relatório não abre — e como corrigir

## O que foi verificado

- O arquivo existe e está íntegro: o servidor de arquivos responde 200, tipo `application/pdf`, 1.025.676 bytes.
- O erro registrado na tela do usuário é sempre o mesmo: "Failed to fetch" ao carregar o documento (6 ocorrências entre 12:12 e 12:15 de hoje).
- O projeto compila sem erros ("build OK").

## Causa confirmada

O serviço que guarda os arquivos **não autoriza a leitura direta pela página**. Ao pedir o arquivo informando o endereço do site, a resposta vem sem a permissão de leitura entre domínios (o cabeçalho `access-control-allow-origin` está ausente na resposta do arquivo; só a checagem prévia responde com ele).

Consequência: o leitor de PDF da PROSFEC, que precisa ler o arquivo em pedaços para desenhar as páginas, é bloqueado pelo navegador e mostra "Não foi possível carregar o documento". Um link de download comum funciona porque não passa por essa checagem.

Isso não é falha do código do visualizador, nem das regras de acesso, nem do envio do arquivo.

## Como corrigir

Servir o arquivo **pelo próprio domínio da PROSFEC**, através de um endereço interno do sistema que busca o arquivo no armazenamento e entrega para a tela. Como a entrega passa a vir do mesmo domínio, o bloqueio deixa de existir — sem tornar nada público, sem mudar permissões, sem serviço externo e sem alterar o envio dos arquivos.

Alternativa possível (não recomendada agora): configurar manualmente a liberação entre domínios no console do Google Cloud. Depende de acesso administrativo externo e de uma ferramenta de linha de comando; a solução interna resolve sem essa dependência.

## Detalhes técnicos

1. Nova rota de servidor `src/routes/api/relatorio-pdf.ts` (TanStack server route, retorna `Response` bruta — o `mini-express` atual só trabalha com JSON):
   - Aceita `GET` com o parâmetro `path` (ex.: `relatorios_consultas/<id>.pdf`) e, quando houver, `token`.
   - Valida estritamente o caminho: precisa começar com `relatorios_consultas/`, terminar em `.pdf`, sem `..` nem barras extras. Qualquer outro caminho retorna 400 — impossível apontar para outro arquivo do armazenamento.
   - Busca o arquivo no Firebase Storage pela URL de download já existente e repassa o corpo, preservando `Content-Type`, `Content-Length`, `Accept-Ranges` e o cabeçalho `Range` (necessário para o carregamento por páginas).
   - Define `Content-Disposition: inline` e `Cache-Control: private, max-age=0`.
2. `src/components/RelatorioPdfViewerModal.tsx`: converte `consulta.relatorioPdfUrl` para o endereço interno (`/api/relatorio-pdf?path=...&token=...`) apenas para alimentar o visualizador. O botão "Baixar PDF Completo" continua usando a URL original, que já funciona.
3. `src/components/PdfDocumentViewer.tsx`: sem mudança de lógica; apenas passa a receber a URL interna.
4. Validação: `bunx tsgo --noEmit`, build, e teste real de abertura do relatório em desktop e celular, conferindo rolagem, zoom, navegação de páginas e o aviso de erro quando a URL é inválida.

Nada de upload, armazenamento, regras do Firebase, Firestore, autenticação, painéis ou regras comerciais é alterado.
