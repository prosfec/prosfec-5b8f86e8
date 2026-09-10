# Destravar consulta de crédito e botão do Diagnóstico IA

## Causa confirmada

A tabela de preços no banco (`configuracoes/precos_consultas`) guarda apenas os **preços personalizados** que o Admin editou, no campo `precos`. Quando esse campo está vazio (nunca editado, ou após "Restaurar padrão", que grava `precos: {}`), o servidor passou a responder "Tabela oficial de preços indisponível" tanto na listagem do catálogo quanto na execução da consulta. Sem catálogo, o modal não mostra o valor e o botão "Confirmar & Executar Consulta" fica desativado.

O botão do Diagnóstico PROSFEC IA não foi removido: ele fica cinza/bloqueado porque depende do histórico de consultas do lead (CNPJ + um CPF). Se esse histórico não carregar, o botão nunca libera.

## O que será feito

### 1. Preço volta a ter base oficial (servidor)
- O preço de cada consulta passa a ser: preço personalizado do Admin quando existir, senão o preço base oficial do catálogo do sistema.
- O erro "tabela indisponível" só aparece se realmente não houver nenhum preço válido para o produto escolhido.
- O valor cobrado continua sendo calculado **somente no servidor** — a tela nunca envia preço, então não há brecha de segurança.

### 2. Modal de consulta volta a exibir valor e liberar o botão
- Corrigir a leitura da resposta do catálogo e mostrar o valor da consulta.
- Se a lista vier vazia por falha momentânea, exibir aviso com botão "Tentar novamente" em vez de travar a tela.
- Botão "Confirmar & Executar Consulta" fica ativo assim que houver um produto com preço válido.

### 3. Histórico e botão do Diagnóstico IA
- Recarregar o histórico de consultas do lead depois que o login termina de resolver, com nova tentativa automática em caso de bloqueio momentâneo.
- Adicionar um botão "Atualizar histórico" ao lado do Diagnóstico IA, para o parceiro reabilitar o botão sem F5 após executar as consultas.
- O botão do Diagnóstico continua visível sempre, com a explicação do que falta quando ainda estiver bloqueado.

## Detalhes técnicos

- `src/lib/prosfec-server.ts`
  - `GET /api/credit/catalogo`: montar a lista a partir de `FALLBACK_CATALOG`, aplicando `configData.precos[code]` como override; remover o 503 quando o mapa `precos` estiver vazio.
  - `POST /api/credit/consultas`: `origPrice = Number(configData?.precos?.[code] ?? catalogItem.price)`; manter validação `Number.isFinite` e o markup de 1,40; manter débito atômico, idempotência e estorno como estão.
- `src/components/LeadWorkspaceModal.tsx`
  - Extrair o fetch do catálogo em função reutilizável com estado de carregamento e ação de retry; ajustar a condição `disabled` do botão de consulta.
  - `loadLeadConsultas`: manter o filtro por `partnerId`, adicionar retry após `onAuthStateChanged` e expor recarga manual próxima ao bloco do Diagnóstico IA.
- Sem mudanças em `firestore.rules`, na integração RedeBE/Gemini ou no fluxo de débito.
