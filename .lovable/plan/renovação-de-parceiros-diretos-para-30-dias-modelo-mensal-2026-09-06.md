# Renovação de Parceiros Diretos para 30 Dias (Modelo Mensal)

## Contexto

Hoje o painel Admin renova/ativa parceiros com `duracaoDias = 365` (1 ano). O objetivo é aplicar **30 dias** apenas a **parceiros diretos** (Starter/Executive/Master sem superior), mantendo a regra atual (365 dias) para **parceiros de rede** (equipe abaixo de um Master).

O bloqueio automático já funciona pela função `calculateSubscription`, que calcula a expiração como `dataUltimoPagamento + duracaoDias`. Portanto, basta gravar `duracaoDias: 30` na renovação para o bloqueio ocorrer sozinho em 30 dias — sem mexer na lógica de bloqueio do PartnerPortal.

## Como identificar parceiro direto vs. rede

Regra já existente no código (linhas ~275 e ~2500 do AdminDashboard):

- **Rede (equipe)**: `parentPartnerId` preenchido, ou `isTeamMember === true`, ou plano contendo "CONSULTOR"/"EQUIPE".
- **Direto**: todos os demais (Starter, Executive, Master sem superior).

Será criada uma função auxiliar única `isParceiroDeRede(partner)` reutilizando exatamente essa condição, para não haver divergência entre os pontos de uso.

## Alterações (src/components/AdminDashboard.tsx + src/components/UserRegistrationForm.tsx)

### 1. Helper de classificação
- Nova função `isParceiroDeRede(partner: Partner): boolean` com a condição acima, definida junto das demais funções utilitárias do componente.

### 2. `handleTogglePartnerStatus` (~linha 2215)
- Ao ativar/desbloquear (`newStatus === "ativo"`): grava `duracaoDias: 30` para parceiro direto e `duracaoDias: 365` para parceiro de rede. `dataUltimoPagamento` continua sendo o momento atual (equivalente a "data atual + 30 dias" de expiração).

### 3. `handleRenewSubscription` (~linha 2254)
- Recebe o objeto parceiro (em vez de só o id) e aplica a mesma condicional: `duracaoDias: 30` (direto) ou `365` (rede), atualizando o estado local com o mesmo valor.

### 4. Rótulos inteligentes dos botões (~linhas 7226–7236)
No modal de detalhes do parceiro selecionado:
- Botão de ativação (quando bloqueado/vencido):
  - Direto: **"Ativar / Liberar Acesso (30 dias)"**
  - Rede: **"Ativar / Liberar Acesso (Rede — 1 Ano)"**
- Botão de renovação (quando ativo):
  - Direto: **"Renovar Acesso (30 dias)"**
  - Rede: **"Renovar Acesso (Rede — 1 Ano)"**

### 5. Outros pontos de escrita de `duracaoDias`
Varredura confirma que as únicas escritas de `duracaoDias` no Admin são as duas funções acima — nenhum outro caminho concede 365 dias manualmente.

## AÇÃO 4 — Garantia do teste grátis de 3 dias no cadastro (src/components/UserRegistrationForm.tsx)

**Problema confirmado por leitura do código:** o documento criado no cadastro (`newUserDoc`, ~linha 187) **não grava o campo `duracaoDias`** e ainda marca `status: "ativo"`. Na função `calculateSubscription`, a ausência de `duracaoDias` cai no fallback `hasPaid || isManualActive ? 365 : 3` — e como `status: "ativo"` torna `isManualActive` verdadeiro, todo parceiro recém-cadastrado recebe **365 dias** em vez dos 3 dias de teste grátis.

**Correção:**

1. No `newUserDoc` do `UserRegistrationForm.tsx`, adicionar explicitamente `duracaoDias: 3`, garantindo que a expiração seja `dataCriacao + 3 dias` para todo novo parceiro.
2. Como `duracaoDias` passa a existir desde a criação, o fallback de 365 dias deixa de ser aplicado — sem necessidade de alterar `status` ou qualquer outra regra do cadastro (comissão, vínculo com Master, etc. permanecem intactos).
3. Conferir se há outro caminho de criação de parceiro (ex: cadastro via Master no PartnerPortal) com o mesmo problema; se existir e estiver no mesmo padrão, aplicar o mesmo ajuste e reportar.

## AÇÃO 3 — Bloqueio automático (verificação, sem mudança prevista)

- `PartnerPortal.tsx` (~linha 347) usa a mesma `calculateSubscription`: se `hoje > dataUltimoPagamento + duracaoDias`, o status vira `"vencida"` e o portal exibe a tela de acesso expirado/assinatura pendente.
- Como a renovação passará a gravar `duracaoDias: 30`, o bloqueio em 30 dias acontece automaticamente, inclusive para o próprio parceiro e para a visão do Admin (que usa a mesma função).
- Será apenas conferido que a tela de "Acesso Expirado" é efetivamente exibida quando `status === "vencida"`; se houver brecha, o ajuste será reportado antes de qualquer mudança extra.

## Validação

1. `bunx tsgo --noEmit` sem erros.
2. `bun run build` passando.
3. Revisão visual dos dois botões no modal do parceiro com um parceiro direto e um de rede.

## Fora de escopo

- Nenhuma alteração em PartnerPortal, regras Firestore, cobrança, comissões ou webhooks.
- Parceiros já ativos com `duracaoDias: 365` gravado mantêm o valor atual até a próxima renovação manual.
