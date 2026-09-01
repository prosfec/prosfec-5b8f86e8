# Blindagem de callbacks — eliminar o "duplo toast" (sucesso + erro)

## Causa raiz (confirmada por leitura do código)

- `src/components/AdminDashboard.tsx:7660` renderiza `<LeadWorkspaceModal>` **sem** a prop `onRefreshLeads`.
- `src/components/LeadWorkspaceModal.tsx` tem 6 chamadas **desprotegidas** `onRefreshLeads()` (linhas 563, 1754, 1797, 1845, 1944, 2000). No Admin, a prop é `undefined` → `TypeError: onRefreshLeads is not a function` dentro do `try`, após o `updateDoc`/`setDoc` já ter gravado → cai no `catch` e exibe o toast de erro logo depois do de sucesso.
- O `PartnerPortal.tsx` (linha 10400) passa a prop corretamente, mas a blindagem será aplicada no modal para cobrir qualquer caller.

## Escopo da correção

### 1. `src/components/LeadWorkspaceModal.tsx`
- Substituir todas as chamadas `onRefreshLeads()` por `onRefreshLeads?.()` (6 ocorrências, incluindo a de `handleSaveCredenciais` e demais salvamentos de etapa).
- Padronizar as chamadas de `onLeadUpdated(...)` com guarda `if (typeof onLeadUpdated === "function")` ou `onLeadUpdated?.(...)` — hoje há guardas em 2 pontos (3770, 4585); uniformizar qualquer outra ocorrência.
- Garantir que nenhum `toast.success` seja seguido de queda no `catch` por callback ausente: opcionalmente envolver callbacks de pós-save em seu próprio `try/catch` com `console.warn`, para que um erro no callback nunca apresente erro de gravação ao usuário.

### 2. `src/components/AdminDashboard.tsx`
- Repassar `onRefreshLeads` ao `<LeadWorkspaceModal>` com uma função real que recarregue a lista de leads do Admin (reuso da função de fetch existente no dashboard), além da blindagem do item 1 — assim a lista do Admin também reflete o save imediatamente.

### 3. `src/components/PartnerPortal.tsx`
- Confirmar o repasse existente (já correto na linha 10400) e apenas garantir que nada quebra com a nova assinatura; nenhuma mudança funcional prevista.

### 4. Captação: `src/components/Simulador.tsx` e `src/components/LeadRegisterForm.tsx`
- Blinda r as chamadas de transição/sucesso: `onLeadCaptured(finalLead)` (linhas 596 e 818) com `typeof onLeadCaptured === "function"` (prop hoje obrigatória; torná-la opcional na interface para consistência).
- Em `LeadRegisterForm.tsx`: blindar `onSuccess(...)` (linha 412) com optional chaining e tornar a prop opcional na interface.
- Observação: `LeadRegisterForm` está importado no `PartnerPortal` mas aparentemente não é mais renderizado — a blindagem será aplicada mesmo assim, sem removê-lo (remoção exigiria confirmação separada).

## Validação
- Typecheck + build de produção.
- Teste manual orientado: salvar credenciais/etapas no workspace **pelo painel Admin** (caminho do bug) e pelo PartnerPortal; concluir simulação no Simulador e no cadastro — verificar que aparece apenas o toast de sucesso e a tela não trava.

## Fora de escopo
- Nenhuma remoção de componentes/rotas; nenhuma alteração de regras do Firestore.
