# Impedir que laudo vazio da IA apague o diagnóstico válido

## Situação verificada

- Em `src/lib/prosfec-server.ts`, rota `POST /api/credit/diagnostico-prosfec`, a Etapa 2 valida apenas `if (!responseText)`. Um texto curto demais (ex.: `{}` ou poucas dezenas de caracteres) passa pela validação, é salvo em `leads/{leadId}.diagnosticoPROSFEC.texto` e sobrescreve o laudo bom anterior.
- Não há validação de tamanho mínimo antes do `patchDocRest` que grava o laudo no banco.
- No frontend (`LeadWorkspaceModal.tsx`), a renderização usa `diagnosticoPROSFEC ?` como condição — um objeto com texto vazio ainda é tratado como diagnóstico existente e exibido vazio.

## O que será feito

### 1. Validação vital no backend (antes de salvar)

Logo após a limpeza dos blocos JSON (`cleanText` final), validar o texto do laudo:

- Se estiver vazio, nulo, só com espaços ou com **menos de 50 caracteres**, lançar erro explícito `Laudo vazio gerado pela IA` (código `GEMINI_EMPTY_REPORT`, status 502).
- O erro cai no `catch` já existente da rota, que marca o lock como `falha` e devolve JSON de erro — **nenhum dado é gravado no banco**, então o laudo válido anterior permanece intacto.

### 2. Mensagem de fallback no frontend

Em `LeadWorkspaceModal.tsx`, onde o diagnóstico é exibido, tratar `texto` em branco/ausente como "sem diagnóstico": exibir a mensagem "Nenhuma análise gerada. Clique em gerar diagnóstico." em vez do conteúdo vazio, mantendo o botão de gerar disponível.

## Detalhes técnicos

- `src/lib/prosfec-server.ts`: após a extração de `json_servicos`/`json_subetapas` e antes de montar `currentDiagnostico`, adicionar guarda `if (!cleanText || cleanText.trim().length < 50) throw Object.assign(new Error("Laudo vazio gerado pela IA. Tente novamente."), { statusCode: 502, code: "GEMINI_EMPTY_REPORT" })`. O `catch` existente já marca o lock como `falha` e libera nova tentativa.
- `src/components/LeadWorkspaceModal.tsx`: condição de exibição passa a verificar `diagnosticoPROSFEC?.texto?.trim().length > 0`; caso contrário mostra o estado vazio com a mensagem de fallback e o botão de gerar.

Sem mudanças visuais além da mensagem de fallback; nenhuma alteração em regras, cobrança, RedeBE ou locks.
