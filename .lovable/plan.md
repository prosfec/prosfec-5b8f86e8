# Restaurar coleta de documentos e Ficha de Rating dentro do PartnerPortal

O formulário `FichaRatingCreditoForm.tsx` foi apagado na remoção do Portal do Cliente, mas o histórico do projeto ainda tem a versão completa (1.531 linhas, com o `DocLinkInput` e os links de nuvem). A restauração parte desse arquivo, não de um componente novo.

Hoje o `LeadWorkspaceModal` só tem a aba `rating_adm` (somente admin, apenas leitura/aprovação via `FichaRatingAdmViewer`). Falta o lado de preenchimento.

## Etapa 1 — Restaurar o formulário

- Recuperar `src/components/FichaRatingCreditoForm.tsx` na íntegra a partir do commit anterior à remoção.
- Ajustar o cabeçalho/textos para o contexto B2B: o preenchimento é feito pelo Parceiro em nome do cliente (nada de "envie seus documentos").
- Manter intactos: `DocLinkInput`, os nomes de campo do Firestore (`fichaRatingCredito.sociosCPF`, `dadosCNPJ`, etc.), o cálculo de progresso, o aviso de "link inacessível" e o upload de arquivo do CCB (necessário para a perícia RTB pela IA).
- A gravação continua por `updateDoc` no documento do lead, como já era.

## Etapa 2 — Novo campo "Link da Pasta de Documentos"

- Adicionar `pastaDocumentosUrl` (+ `pastaDocumentosAtualizadoEm`) dentro de `fichaRatingCredito`, em `src/types.ts`.
- No topo do formulário, um bloco em destaque com `DocLinkInput` para o link único da pasta (Drive, Dropbox, OneDrive), com botão "Testar link" abrindo em nova aba.
- Os links por documento continuam existindo — o link da pasta é um atalho consolidado, não substitui.

## Etapa 3 — Aba no Workspace do lead

- Nova aba `rating_form` ("Ficha & Documentos") em `LeadWorkspaceModal.tsx`, visível para Parceiro e Admin, ao lado da aba `rating_adm` (que segue exclusiva do Admin).
- A aba renderiza `FichaRatingCreditoForm` com o lead atual e o callback de atualização já existente no modal, para o painel refletir o salvamento sem recarregar.
- Estilo seguindo o design system atual (`panel`, `field-shell`, pílulas de status).

## Etapa 4 — Visibilidade para o Admin

- Em `FichaRatingAdmViewer.tsx`: cartão no topo mostrando o "Link da Pasta de Documentos" com botão "Abrir pasta" (quando preenchido) ou aviso de pendente.
- Em `AdminDashboard.tsx`: indicador na listagem/detalhe do lead sinalizando que há pasta de documentos, com link direto.

## Notas técnicas

- Arquivos tocados: `src/components/FichaRatingCreditoForm.tsx` (restaurado), `src/components/LeadWorkspaceModal.tsx`, `src/components/FichaRatingAdmViewer.tsx`, `src/components/AdminDashboard.tsx`, `src/types.ts`.
- Nada do Portal do Cliente volta: sem rota `/portal-cliente`, sem `TrackingPortal`, sem rotas `/api/portal/*` nem senhas de cliente.
- Sem mudança de schema no Firestore além do campo novo; documentos legados em base64 continuam sendo exibidos.
- As regras do Firestore já permitem escrita do parceiro/staff no documento do lead — nenhuma republicação de regras deve ser necessária; se a gravação for bloqueada em teste, sinalizo antes de mudar qualquer regra.
