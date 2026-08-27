# Anexos por link de nuvem (Google Drive) na Ficha de Rating

Trocar o mecanismo de anexo do formulário do cliente: em vez de converter o arquivo em base64 e gravar no Firestore, o cliente cola o link do documento (Google Drive, OneDrive, Dropbox etc.). Os nomes dos campos no Firestore permanecem idênticos — muda apenas o conteúdo gravado (URL em vez de base64).

## Etapas

### Etapa 1 — Campo de link reutilizável (formulário do cliente)
Em `FichaRatingCreditoForm.tsx`, criar um componente interno `DocLinkInput` (título, valor, callback) que substitui cada bloco de upload:
- input de URL com placeholder "Cole aqui o link do Google Drive...";
- validação leve: precisa começar com `http://` ou `https://` (aviso inline se inválido);
- selo "Anexado" quando há link;
- botão "Abrir" que abre o link em nova aba (`target="_blank"`, `rel="noopener noreferrer"`);
- botão para limpar o link.

### Etapa 2 — Trocar os handlers de gravação
- Substituir `handleSocioFileUpload` por `handleSocioLinkChange(socioIndex, fieldName, url)`: grava a URL em `fieldName` e um rótulo padrão do documento em `fieldNameNome` (ex.: "CNH/RG Frente — link externo"), mantendo a compatibilidade com o Admin.
- Substituir `handleCNPJFileUpload` por `handleCNPJLinkChange(fieldName, url)` com a mesma lógica.
- Remover `readFileAsBase64` e as chamadas a `validateUploadedFile` que ficarem sem uso.

### Etapa 3 — Aplicar aos 4 documentos de sócio (CPF)
`fotoCnhRgFrente`, `fotoCnhRgVerso`, `selfieComDocumento`, `fotoTituloEleitor` passam a usar `DocLinkInput`.

### Etapa 4 — Aplicar aos documentos de CNPJ
`documentoFotoFrenteTodosSocios`, `documentoFotoVersoTodosSocios`, `selfieTodosSocios`, `cartaoCnpjPdf`, `contratoSocialPdf`, `comprovanteResidenciaPdf`, `faturamento12MesesPdf`, `drePdf`, `balancoPatrimonialPdf`.

### Etapa 5 — Ajuste mínimo no visualizador do Admin
`FichaRatingAdmViewer.tsx` continua lendo os mesmos campos e mantendo aprovar/rejeitar. Único ajuste: quando o valor do campo for um link externo (não começa com `data:`), o botão "Visualizar" abre o link em nova aba e o botão de download vira "Abrir link" — o preview em `<img>`/`<iframe>` só é usado para valores base64 legados. Nenhuma mudança de layout, navegação ou estrutura de dados.

## Ponto de atenção: CCB / módulo RTB

O campo `ccbContratoPdf` é o único que **não** pode virar link: o conteúdo em base64 é enviado para a PROSFEC IA em `/api/credit/analise-rtb-ccb` para a perícia do contrato. Esse bloco continua com upload de arquivo como está hoje. Todos os demais viram link.

## Detalhes técnicos

- Somente `src/components/FichaRatingCreditoForm.tsx` e um ajuste pontual em `src/components/FichaRatingAdmViewer.tsx`.
- Nenhuma mudança em `src/types.ts` (os campos já são `string`), nem em `validacoesDocumentos`, nem no cálculo de progresso (`calculateProgress` continua checando "campo preenchido").
- Sem migração de dados: campos base64 legados continuam sendo exibidos normalmente pelo Admin.
