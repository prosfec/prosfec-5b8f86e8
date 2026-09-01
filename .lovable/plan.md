# Atualização consolidada: desempenho, travas e documentos

Quatro frentes em um único commit. Abaixo o que foi confirmado no código atual e o que muda.

## 1. Desempenho do Firebase (trocar tempo real por carga sob demanda)

Confirmado: `AdminServicosContabilidadeTab.tsx`, `PartnerServicosContabilidadeTab.tsx` e `AdminPedidosContabilidadeTab.tsx` mantêm listeners `onSnapshot` abertos (o de pedidos ainda abre um segundo listener de fallback).

- Trocar cada `onSnapshot` por `getDocs` executado uma vez na montagem, mantendo o fallback sem `orderBy` (também com `getDocs`) e a ordenação em memória.
- Adicionar botão "Atualizar dados" no topo de cada lista, com estado de carregando e horário da última atualização.
- Recarregar automaticamente após ações de escrita da própria tela (aprovar/atualizar pedido), já que não há mais listener.

Sobre o "lixo do TrackingPortal": não existe mais nenhuma importação ou referência a `TrackingPortal` em `src/App.tsx` nem no restante do `src/` — a remoção anterior foi completa. Nada a limpar aqui; se você estiver vendo algo em produção, é build antigo em cache.

## 2. Trava de 3 dias — Master reativando o consultor

Causa real confirmada: o botão de reativar já existe e grava os campos certos, mas a gravação é **rejeitada pelas regras do Firestore**. Em `firestore.rules`, um parceiro só pode escrever no próprio documento (`isOwnPartnerDoc`) e ainda assim `partnerSafeUpdate()` bloqueia `status`. Como o Master escreve no documento **do consultor**, cai no deny — por isso só o Admin consegue.

Duas mudanças:

- **Regras**: liberar que o parceiro pai atualize apenas os campos de acesso do consultor direto (`status`, `inativoPorInatividade`, `motivoInativacao`, `dataUltimoAcesso`, `dataReativacao`), exigindo que o documento alvo tenha `parentPartnerId` igual ao Master autenticado. Vou te entregar o `firestore.rules` completo no chat para publicar no console — sem isso o botão continua falhando.
- **UI**: no painel de equipe, botão explícito "Reativar acesso (trava de 3 dias)" no card do consultor inativo por inatividade, com confirmação, mensagem de erro real em caso de permissão negada e atualização otimista da lista.

## 3. Notificações que não limpam

Causa real confirmada: o sino do parceiro chama `deleteDoc` em `notificacoes`, mas a regra permite `delete` somente para staff — a exclusão sempre falha silenciosamente (o erro é engolido no `catch`).

- Trocar exclusão por marcação de leitura: `updateDoc` com `lida: true` + `dataLeitura` (update é permitido a qualquer autenticado).
- "Marcar todas como lidas" passa a fazer o mesmo em lote, com feedback de erro visível caso alguma falhe.
- A lista do sino passa a filtrar `lida !== true`, então some da bandeja como o usuário espera.
- Staff (Admin) mantém a opção de excluir de fato, já que a regra permite.

## 4. Link da pasta de documentos na Etapa 6

Já existe hoje: o campo `pastaDocumentosUrl` é salvo dentro de `fichaRatingCredito` pelo formulário de rating renderizado no Passo 6, e o Admin já vê o link no Dossiê e no card do lead. Para não criar dois campos concorrentes, mantenho `fichaRatingCredito.pastaDocumentosUrl` como fonte de verdade e:

- Adiciono, no topo do Passo 6 do `LeadWorkspaceModal`, um input de URL direto ("Link da Pasta de Documentos") com salvamento imediato por `updateDoc`, gravando também um espelho em `linkDocumentos` na raiz do lead para leitura rápida.
- No `AdminDashboard` (detalhes do lead), renderizo o link condicionalmente como `Abrir pasta de documentos` em nova aba, aceitando qualquer um dos dois campos.

## Detalhes técnicos

- Arquivos: `AdminServicosContabilidadeTab.tsx`, `PartnerServicosContabilidadeTab.tsx`, `AdminPedidosContabilidadeTab.tsx`, `PartnerPortal.tsx`, `LeadWorkspaceModal.tsx`, `AdminDashboard.tsx`, `types.ts`, `firestore.rules`.
- Nenhuma mudança em rotas de API.
- Ação sua ao final: publicar o novo `firestore.rules` no console do Firebase (item 2 depende disso).
