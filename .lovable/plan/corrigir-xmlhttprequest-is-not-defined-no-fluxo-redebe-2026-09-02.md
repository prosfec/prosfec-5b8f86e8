# Corrigir "XMLHttpRequest is not defined" no fluxo RedeBE

## Diagnóstico

A chamada à RedeBE **já usa `fetch` nativo** (`src/lib/prosfec-server.ts`, linhas ~1079-1098): a requisição sai e a resposta é lida com `await redebeRes.json()`. Portanto o `XMLHttpRequest` não vem do cliente HTTP da RedeBE.

O que quebra é a etapa seguinte: logo depois de receber o payload, a rota grava a consulta no Firestore usando o **SDK web do Firebase** (`addDoc(collection(db, "consultas_realizadas"), ...)`, linha ~1155, e a notificação na linha ~1160). O SDK web usa o transporte WebChannel, que depende de `XMLHttpRequest` — API que não existe no runtime do servidor (Edge/Worker). Por isso o pipeline morre antes de chegar ao Gemini.

Observação: o erro exato ainda não foi visto em log nesta sessão (os logs atuais não contêm a ocorrência), então o primeiro passo da execução é reproduzir a rota e confirmar o stack trace.

## Solução proposta

O projeto já tem o caminho certo pronto: um cliente Firestore via **REST + `fetch`** com token de serviço (`getServiceIdToken`, `firestoreDocUrl`, `getLeadRest`, `patchLeadRest` no fim do arquivo). Vamos generalizar e usar esse caminho nas escritas do fluxo de consulta.

1. Reproduzir `POST /api/credit/executar-consulta` e confirmar em qual linha o `ReferenceError` estoura.
2. Criar helpers REST genéricos ao lado dos existentes: `createDocRest(collection, data)`, `patchDocRest(path, fields, masks)` e `queryDocsRest(collection, filtros)`, com conversão automática JS -> formato `fields` do Firestore (string/number/boolean/null/timestamp/array/map).
3. Trocar, **somente no caminho da consulta de crédito e nas gravações que ele dispara**, as chamadas `addDoc`/`updateDoc`/`getDocs` do SDK pelos helpers REST:
   - gravação em `consultas_realizadas`;
   - notificação em `notificacoes`;
   - débito/atualização de saldo do parceiro usado por essa rota, se houver.
4. Reexecutar a rota e confirmar: resposta da RedeBE recebida, documento gravado, e o pipeline seguindo para o diagnóstico Gemini.
5. Verificar se as demais rotas de IA (`diagnostico-prosfec`, `passo7`, `simulador`) atravessam as mesmas gravações; se sim, apontá-las para os helpers REST também.

Nenhuma regra de negócio, prompt do Gemini, cálculo de preço/comissão ou contrato de resposta muda — apenas o meio de transporte das gravações no Firestore.

## Detalhes técnicos

- Arquivo principal: `src/lib/prosfec-server.ts`.
- Autenticação REST: reutiliza `getServiceIdToken()` (identidade de serviço já existente), respeitando as regras do Firestore como usuário autenticado — sem chave admin e sem bypass de segurança.
- Endpoints: `https://firestore.googleapis.com/v1/projects/{project}/databases/{db}/documents/...` (`POST` para criar, `PATCH` com `updateMask` para atualizar, `:runQuery` para consultas).
- Os helpers REST ficam declarados antes das rotas que os usam (hoje estão no fim do `createExpressApp`); será feita a realocação mínima necessária.
- `cleanForFirestore` continua sendo aplicado antes da conversão para o formato `fields`.
