# Permissões do Master + Contratos GOV.br no Passo 4

## 1. Exclusão de descartados no Caça-Leads (Master)

Confirmado no código: os descartes ficam na coleção `leads_distribuidos`, e as regras atuais permitem `delete` apenas para staff (`allow delete: if isStaff();`). Por isso tanto o botão "Excluir Definitivo" quanto o "Excluir Descartados (N)" em lote falham para o Master com `permission-denied`.

Correção nas regras: permitir `delete` em `leads_distribuidos` quando o solicitante for:
- o Master dono da distribuição — o documento em `parceiros/{parentPartnerId}` tem `authUid` igual ao usuário autenticado; ou
- o próprio consultor da carteira (`teamMemberId`), pelo mesmo critério de `authUid`.

Correção na UI (`PartnerPortal.tsx`): os handlers `handleDeleteDistributedLeadPermanent` e `handleBulkDeleteDiscardedLeadsForConsultant` passam a exibir a mensagem real de erro (incluindo `permission-denied`) em vez de um alerta genérico, e o lote deixa de abortar tudo quando uma exclusão falha (contabiliza sucessos e falhas).

## 2. Reativação de consultores pelo Master (trava de 3 dias)

Causa confirmada: a regra `isMyDirectConsultant()` compara `resource.data.parentPartnerId == request.auth.uid`, mas no código o `parentPartnerId` é gravado com o **ID do documento** do Master (`currentPartner.id`), não com o UID do Firebase Auth — os dois só coincidem por acaso. Resultado: a escrita do Master no documento do consultor sempre cai no deny.

Correção definitiva: `isMyDirectConsultant()` passa a resolver o documento do Master referenciado por `parentPartnerId` (via `get()` em `parceiros/{parentPartnerId}`) e conferir `authUid == request.auth.uid`, mantendo também os caminhos atuais (`parentPartnerId == uid`, `masterId`, `parceiroMasterId`) como alternativas.

A lista de campos liberada (`masterConsultantUpdate`) continua restrita a `status`, `inativoPorInatividade`, `motivoInativacao`, `dataUltimoAcesso`, `dataReativacao`, `dataInativacao`, `plano`, `planoComissao`, `tipoConsultor` — senha, saldo, papel e `authUid` seguem bloqueados.

## 3. Passo 4 — Contratos assinados via GOV.br

Na aba "Passo 4: Termos & Contratos" do `LeadWorkspaceModal`, acima do bloco de assinatura eletrônica:

- Novo campo de URL rotulado **"Link da Pasta do Drive (Contratos Assinados GOV.br)"**, no mesmo padrão visual do link de pasta de documentos do Passo 6: input, botão **Salvar**, selo "Anexado" e botão **Abrir** (nova aba).
- Ao salvar: valida que começa com `http://` ou `https://`, grava no lead `contratosAssinadosUrl` + `contratosAssinadosAtualizadoEm` e, se a etapa atual for menor que 5, grava `etapa: 5` no mesmo `updateDoc`, avançando o fluxo automaticamente.
- Feedback inline de sucesso/erro (com código real em caso de permissão negada) e atualização do estado local para o Passo 5 destravar sem recarregar.

Em `stepValidation.ts`, `isStep4Complete` passa a aceitar também `contratosAssinadosUrl` preenchido, para o Passo 5 destravar mesmo sem a assinatura eletrônica interna.

## Detalhes técnicos

- Arquivos: `firestore.rules`, `src/components/LeadWorkspaceModal.tsx`, `src/components/PartnerPortal.tsx`, `src/utils/stepValidation.ts`, `src/types.ts` (campos `contratosAssinadosUrl` / `contratosAssinadosAtualizadoEm`).
- Nenhuma mudança em rotas de API.
- Ação sua ao final: publicar o `firestore.rules` completo (será entregue no chat) no console do Firebase — os itens 1 e 2 só funcionam após essa publicação.
