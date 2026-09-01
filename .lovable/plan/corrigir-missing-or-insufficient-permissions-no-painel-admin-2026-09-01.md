# Corrigir "Missing or insufficient permissions" no Painel Admin

## Diagnóstico (confirmado no código)

| Erro | Origem | Coleção | Regra exigida |
|---|---|---|---|
| `Error loading lead queries` | `LeadWorkspaceModal.tsx` (linha 497-531) | `consultas_realizadas` — query `where("documento", "in", [...])` | `read` (hoje: `isSignedIn()`) |
| `Error saving prices` | `AdminDashboard.tsx` (linha 811-852, `handleSavePrices`) | `configuracoes` → doc `precos_consultas` — `setDoc(..., merge)`; depois sync em lote em `leads` | `write` (hoje: `isAdmin()`) |

Ponto-chave: **as duas coleções já possuem blocos `match` no `firestore.rules` do repositório** (`consultas_realizadas` com `read: isSignedIn()` e `configuracoes` com `write: isAdmin()`). Ou seja, a falha vem de uma destas causas:

1. A versão **publicada** no console do Firebase não é a mesma do repositório (publicação parcial/antiga).
2. Para o erro de preços: `isAdmin()` retorna `false` — o usuário logado não bate com o UID `Nso5FBoBVHXNY60RDw6NNKeaCC23` nem com o e-mail `prosfec.tesouraria@gmail.com` (ex.: conta criada no Auth com e-mail diferente ou com letra maiúscula).
3. Para o erro de consultas: a query roda antes do Firebase Auth resolver a sessão (request sem `auth`).

## Plano

1. **Reforçar as regras** (sem abrir nada além do necessário):
   - Manter `consultas_realizadas`: `read/create/update: isSignedIn()`, `delete: isAdmin()`.
   - Manter `configuracoes`: `read: isSignedIn()`, `write: isAdmin()`.
   - Robustez extra no `isAdmin()`/`isContador()`: comparação de e-mail em `lower()` dos dois lados (hoje `userEmail()` compara sem normalizar), eliminando falha por capitalização.
2. **Blindar o timing no frontend**: em `LeadWorkspaceModal.tsx`, aguardar o estado de auth do Firebase (`onAuthStateChanged`/usuário resolvido) antes de disparar `loadLeadConsultas()`, evitando query anônima na primeira renderização.
3. **Entregar o `firestore.rules` completo no chat** para publicação no console.
4. **Validação pelo usuário após publicar**:
   - Confirmar no Firebase Auth que a conta admin é exatamente `prosfec.tesouraria@gmail.com` (ou anotar o UID real e me informar para eu adicionar ao `isAdmin()`).
   - Recarregar `/admin`, abrir a aba Preços, salvar, e abrir o workspace de um lead na aba Diagnóstico — ambos sem erro de permissão.

## Detalhes técnicos

- Arquivos alterados: `firestore.rules` (normalização de e-mail em `isAdmin()`/`isContador()`), `src/components/LeadWorkspaceModal.tsx` (gate de auth antes da query de consultas).
- Nenhuma coleção nova será criada; nenhuma regra existente será afrouxada.
- O sync em lote de leads (`syncAllExistingLeadsWithCatalog`) já é permitido: `leads` update cobre `isStaff()`.
