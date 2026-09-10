# Plano: Remover limite de gerações do Diagnóstico IA para Administradores

## Objetivo
Permitir que Administradores gerem/refaçam o Diagnóstico PROSFEC IA sem limite de tentativas, mantendo a trava de 2 gerações exclusivamente para Parceiros comuns.

## Estado atual (verificado no código)

**Backend — `src/lib/prosfec-server.ts`, rota `POST /api/credit/diagnostico-prosfec`:**
- Linhas 1001–1012: se `geracoesCount >= 2`, retorna erro 400 "limite máximo de reanálises atingido".
- A função `authenticateApiCaller` (linha 2815) já retorna `isAdmin` — identifica admin pelo UID `Nso5FBoBVHXNY60RDw6NNKeaCC23` ou e-mail `prosfec.tesouraria@gmail.com`. Nenhuma nova consulta de permissão é necessária.
- A trava de concorrência (lock em `consultas_realizadas/ia_diagnostico_<leadId>_<geracao>`) usa o contador no ID do documento, então continua única a cada nova geração do admin — sem risco de colisão.

**Frontend — `src/components/LeadWorkspaceModal.tsx`:**
- Linhas 863–867: `handleGeneratePROSFECDiagnostico` aborta com erro quando `currentCount >= 2`.
- Linhas 3750–3769: quando o limite é atingido, o botão "Refazer Diagnóstico" é substituído por um botão desabilitado "Refazer Bloqueado (1/1 usado)".
- O componente já calcula `isAdminUser` (linha 230): prop `isAdmin`, `currentPartner.id === "admin"`, `role === "admin"` ou `isAdmin`.

## Alterações

### 1. Backend (`src/lib/prosfec-server.ts`)
- No bloco do limite (linhas 1000–1014), só aplicar a validação `previousGeracoesCount >= 2` quando `!caller.isAdmin`.
- Para admin: pular o bloqueio e seguir com `newGeracoesCount = previousGeracoesCount + 1` normalmente (o contador continua sendo gravado, o lock continua funcionando e o controle anti-duplicata por concorrência permanece).
- Nenhuma outra lógica da rota muda (débito não existe nesta rota; lock, estorno e validações de laudo vazio permanecem).

### 2. Frontend (`src/components/LeadWorkspaceModal.tsx`)
- Na função `handleGeneratePROSFECDiagnostico`: a checagem `currentCount >= 2` só bloqueia quando `!isAdminUser`.
- Na renderização (linha 3750): a condição do botão bloqueado passa a ser `count >= 2 && !isAdminUser`; para admin, o botão "Refazer Diagnóstico" continua visível e clicável independentemente do número de gerações.
- Ajustar o `title`/tooltip do botão de refazer para admin (sem menção ao limite), mantendo o texto atual para parceiros.

## O que NÃO muda
- Limite de 2 gerações para parceiros (regra preservada).
- Trava anti-duplicata (lock de concorrência), validação de laudo vazio, timeouts, modelos Gemini e regras de acesso ao lead (`assertLeadAccess`).
- Nenhuma alteração em `firestore.rules`, APIs RedeBE ou layout visual.

## Verificação
- `bunx tsgo --noEmit` e checagem do log de build.
- Revisão estática dos dois fluxos: parceiro (bloqueio mantido na 2ª reanálise) e admin (botão sempre ativo, backend sem erro 400 por limite).
