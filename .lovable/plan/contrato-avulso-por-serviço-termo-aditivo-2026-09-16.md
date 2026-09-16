# Contrato Avulso por serviço + Termo Aditivo

## Varredura do sistema atual (respostas às 10 perguntas)

1. **Módulo de contratos**: não existe coleção própria. O contrato hoje é um conjunto de campos dentro do próprio lead (`modeloContratacao`, `planoEscolhido`, `valorMensalidade`, `contratoAssinado*`). Os textos ficam em `src/components/AvulsoContractText.tsx` e `src/components/AssessoriaContractText.tsx`, e a página pública é `src/routes/contrato.$leadId.tsx`.
2. **Assinatura eletrônica**: `src/components/SignaturePad.tsx` (desenho em Base64) + `POST /api/public/contrato/:leadId/assinar`, que grava assinatura, nome, CPF, IP, dispositivo e data no lead, avança a etapa e cria notificação para o Admin.
3. **Serviços cadastrados**: catálogo em `src/utils/serviceUtils.ts` (`ServiceCatalogItem`: id, nome, valor, descricao, hublaLink, semCustoInicial), editável na aba "Preços e Serviços" do Admin e persistido no Firestore.
4. **Vínculo com o lead**: os serviços entram em `servicosRecomendados` do lead e viram subetapas do Passo 6.
5. **Valores**: no catálogo (`valor`) e copiados para cada serviço do lead no momento da inclusão.
6. **PDF contratual**: não existe geração de PDF do contrato. Só há upload de PDF de relatório RedeBE (assunto diferente).
7. **Versionamento**: não existe. Hoje o contrato é renderizado a partir do código-fonte atual, então um contrato antigo passa a exibir o texto novo.
8. **Status de assinatura**: booleano `contratoAssinado` no lead — um único contrato por lead, sem rascunho/cancelado.
9. **Reutilizáveis**: `SignaturePad`, rota pública `/contrato/$leadId`, endpoints públicos em `src/lib/prosfec-server.ts`, catálogo de serviços, aba "contrato" do `LeadWorkspaceModal`.
10. **Menor arquitetura**: uma coleção `contratos` (documento imutável após assinado, com snapshot do texto e das versões), cláusulas específicas vindas do catálogo, e a página pública atual passando a listar documentos pendentes.

## O que será construído

### 1. Catálogo: cláusulas e versão (menor alteração)

Em `ServiceCatalogItem`, três campos novos e opcionais:
- `clausulas` — texto jurídico específico do serviço;
- `templateId` — ex.: `AVULSO_REABILITACAO`;
- `templateVersao` — inteiro, incrementado automaticamente sempre que `clausulas` for alterado e salvo.

Na aba "Preços e Serviços" do Admin: um campo de texto por serviço para as cláusulas, com o selo da versão atual (ex.: `AVULSO_REABILITACAO_V1`).

Eu redijo as cláusulas V1 de cada serviço existente (Reabilitação Financeira e Creditícia, Rating/Score, Recuperação de Tarifas Bancárias, Serviços Contábeis, Dossiê/Projeto) com objeto, atividades incluídas, condições, prazo, remuneração, limitações e responsabilidades. O ADM pode editar depois; serviços sem cláusula usam um bloco genérico padrão.

### 2. Coleção `contratos`

Cada documento guarda: `leadId`, `tipo` (`avulso` | `aditivo`), `contratoOrigemId` (nos aditivos), `status` (`rascunho` | `aguardando_assinatura` | `assinado` | `cancelado`), lista de serviços com nome, valor, descrição, cláusulas e versão **congeladas no momento da geração**, valor total, dados do cliente, datas e bloco de assinatura (nome, CPF, IP, dispositivo, desenho, data).

Regra de imutabilidade: depois de `assinado`, o servidor recusa qualquer alteração de conteúdo. Alterar texto no catálogo não afeta contratos já gerados.

### 3. Painel do Admin — aba "Contratos Avulsos" no Workspace do lead

Criar contrato: seleção de um ou mais serviços do catálogo (com valor de cada um e total somado), botão "Gerar contrato", pré-visualização e "Enviar para assinatura" (muda para `aguardando_assinatura` e libera o link). Lista de contratos do lead com status, valor, data e visualização do contrato assinado. Se já houver contrato avulso assinado, o botão passa a ser "Gerar Termo Aditivo", que cria um documento novo referenciando o original, com somente o serviço novo e suas cláusulas.

### 4. Página pública de assinatura

`/contrato/{leadId}` passa a listar todos os documentos pendentes do cliente: Assessoria (fluxo atual, intacto), Contrato Avulso e Aditivos. Com um documento pendente, abre direto nele — mesma experiência de hoje. Com vários, mostra a lista com status e o cliente escolhe qual assinar. Documentos já assinados ficam visíveis em modo leitura com o recibo (signatário, CPF mascarado, data, IP, dispositivo).

O Contrato Avulso renderiza: cláusulas gerais → para cada serviço, suas cláusulas específicas, valor e condições → valor total → assinatura. Serviços não contratados nunca aparecem.

### 5. Assessoria intacta

`AssessoriaContractText.tsx`, o fluxo mensal, preços, comissões e faturamento não são tocados. Um mesmo cliente pode ter contrato de Assessoria, contrato avulso e vários aditivos convivendo.

## Detalhes técnicos

- `src/utils/serviceUtils.ts`: campos novos em `ServiceCatalogItem` + sanitização (`clausulas` limitado, versão numérica) e cláusulas V1 nos serviços padrão.
- `src/lib/prosfec-server.ts`: endpoints autenticados `POST /api/contratos` (gerar), `PATCH /api/contratos/:id/status`, `GET /api/contratos?leadId=`; públicos `GET /api/public/contrato/:leadId` (passa a devolver a lista de documentos, mantendo o campo atual da Assessoria por compatibilidade) e `POST /api/public/contrato/:leadId/assinar` aceitando `contratoId` opcional — sem `contratoId` o comportamento atual da Assessoria é preservado.
- `firestore.rules`: coleção `contratos` legível/gravável somente por equipe autenticada; cliente acessa exclusivamente pelos endpoints públicos.
- Novos componentes: `src/components/AvulsoServicoContractText.tsx` (cláusulas gerais + blocos por serviço) e `src/components/AditivoContractText.tsx`.
- `src/routes/contrato.$leadId.tsx`: seletor de documentos pendentes; ramo Assessoria inalterado.
- Notificação ao Admin na assinatura, no mesmo padrão já existente.

## Etapas de entrega

1. Campos de cláusulas/versão no catálogo + textos V1 + UI no Admin.
2. Coleção `contratos`, endpoints e regras do Firestore.
3. Aba "Contratos Avulsos" no Workspace (criar, valores, total, status, aditivo).
4. Página pública com lista de documentos e assinatura por documento.
5. Typecheck, build e teste ponta a ponta: contrato com 3 serviços, assinatura, aditivo posterior e conferência de que o contrato original não mudou.
