# Passo 3 sem inteligência artificial: só o relatório da RedeBE

## Objetivo

Tirar o diagnóstico automático do Passo 3. O sistema passa a mostrar exatamente o
resultado que a RedeBE entrega, consulta por consulta (empresa e cada sócio),
sem cruzar dados e sem depender da IA. A escolha dos serviços passa a ser feita
manualmente pelo Admin, depois da análise humana.

## O que muda na ficha do lead (Passo 3)

1. O bloco "Diagnóstico de Soluções Inteligentes PROSFEC IA" sai da tela,
   junto com o botão de gerar/refazer diagnóstico, o contador de gerações e as
   mensagens de erro da IA.
2. No lugar fica a lista das consultas já executadas. Cada consulta mostra o
   titular, o documento, a data e o resumo (score, rating, pendências), com o
   botão "Ver relatório completo" abrindo o relatório no mesmo formato do PDF da
   RedeBE — o visualizador que já existe hoje.
3. Nada é cruzado entre empresa e sócios: cada documento aparece com o resultado
   dele, individualmente.
4. Laudos de IA salvos em leads antigos deixam de ser exibidos em todas as telas
   (ficha do lead e painel administrativo). O dado continua gravado no banco,
   apenas não é mostrado.

## Avanço de etapa

O Passo 3 fica concluído quando existir pelo menos uma consulta de crédito
executada no lead. Não é mais necessário gerar diagnóstico para liberar o
Passo 4.

## Serviços (Passo 6)

- A seleção automática de serviços pela IA deixa de existir.
- Continua valendo apenas a inclusão manual de serviços no painel administrativo
  ("Adicionar Serviço ao Lead"), que já sincroniza sub-etapas, preços do catálogo
  oficial e comissões.
- Quando o Admin ainda não incluiu serviços, o Passo 6 mostra um aviso claro de
  "aguardando análise da equipe" no lugar de lista vazia sem explicação.

## O que NÃO muda

Consulta de crédito da RedeBE, cobrança e saldo, catálogo de preços, contratos,
autenticação, permissões, regras do banco, painel do parceiro fora do Passo 3,
site público e simulador.

## Detalhes técnicos

- `src/components/LeadWorkspaceModal.tsx`: remover a seção 2 do Passo 3
  (motor de diagnóstico IA), `handleGeneratePROSFECDiagnostico`, estados
  `diagnosticoPROSFEC`/`generatingDiagnostico`/`canGenerateDiagnostico` e a
  renderização de `FintechDiagnosisView`. Manter e destacar a lista de consultas
  com `RedeBEReportViewerModal`.
- `src/components/DiagnosticStep3Viewer.tsx`: passa a renderizar a lista de
  consultas + visualizador RedeBE em vez de `FintechDiagnosisView`.
- `src/components/AdminDashboard.tsx`: remover o bloco que renderiza
  `FintechDiagnosisView` (linha ~6389) e, no lugar, listar as consultas RedeBE do
  lead com o visualizador. Manter intacta a área de serviços/sub-etapas.
- `src/utils/stepValidation.ts`: o desbloqueio do Passo 4 passa a considerar
  apenas a existência de consulta executada, não `diagnosticoPROSFEC`.
- `src/utils/serviceUtils.ts` e `src/utils/commissionUtils.ts`: parar de derivar
  serviços de `diagnosticoPROSFEC.servicosRecomendados`, usando somente
  `lead.servicosRecomendados` (a lista mantida pelo Admin).
- `src/lib/prosfec-server.ts`: remover a rota `POST /api/credit/diagnostico-prosfec`
  e todo o pipeline Gemini associado (prompts, fallback de modelos, locks de
  geração, seleção automática de serviços). Nenhuma outra rota é tocada.
- `src/components/FintechDiagnosisView.tsx` deixa de ser usado e é removido.
- Validação: `bunx tsgo --noEmit` e build.
