# Separar as duas solicitações de saque no Portal do Parceiro

## O que está acontecendo hoje

Existem três botões "Solicitar Comissão" no painel do parceiro (no card "Suas Comissões & Repasses", no bloco "Desempenho & Controle Financeiro de Serviços (Passo 6)" e na barra de regra de liquidação). Todos executam exatamente o mesmo código: `setShowCommissionPayoutModal(true)`.

Só existe **uma** caixa flutuante de saque, e o saldo dela é calculado apenas com base nos serviços do Passo 6 (comissão liberada após compensação). Por isso, quando o parceiro clica no botão do card de comissões de planos/vendas (valores que vêm dos webhooks Lastlink/Hubla), a caixa abre mostrando saldo zerado — ela nunca olhou para esse saldo.

Confirmado no código: o card superior exibe `totalPaidCommissions` / `totalPendingCommissions`, enquanto o modal calcula `totalLiberada` a partir dos serviços do Passo 6 e deduz os saques de `solicitacoes_comissao`.

## O que vou fazer

Criar **duas caixas de saque independentes**, cada uma com sua própria origem de saldo, seu próprio formulário e seu próprio registro:

1. **Saque de Comissões de Vendas (Planos / Lastlink-Hubla)** — aberta pelo botão do card "Suas Comissões & Repasses". Saldo = comissões pagas e liberadas de vendas/planos, menos os saques já solicitados dessa mesma origem.
2. **Saque de Comissões de Serviços (Passo 6)** — aberta pelos botões do bloco "Desempenho & Controle Financeiro de Serviços". Saldo = a regra atual (serviços quitados e compensados: 48h PIX / 15 dias cartão), menos os saques já solicitados dessa origem.

Cada caixa mostra:
- Título e descrição próprios, deixando claro de qual saldo se trata
- O saldo disponível correto daquela origem
- Campo de valor validado contra aquele saldo
- Chave Pix do parceiro
- Mensagem de sucesso própria

Cada solicitação passa a gravar um campo de **origem** (`vendas` ou `servicos`), para que:
- os saldos não se contaminem (um saque de vendas não reduz o saldo de serviços e vice-versa);
- o histórico "Histórico de Solicitações de Saque & Repasses PIX" mostre uma etiqueta indicando a origem;
- o Admin veja de onde veio cada pedido.

## Detalhes técnicos

- Substituir o estado único `showCommissionPayoutModal` por um estado de origem (`payoutModalOrigin: null | "vendas" | "servicos"`), mantendo os estados de envio/sucesso/valor/chave Pix reaproveitados e resetados na abertura.
- Extrair o cálculo do saldo de vendas (hoje só usado na exibição do card) para ficar acessível ao novo modal.
- Ambos os modais deduzem saques com `status` `pendente`/`pago` filtrando por `origem`. Solicitações antigas sem o campo `origem` serão tratadas como `servicos` (comportamento atual), para não alterar saldos já existentes.
- `addDoc` em `solicitacoes_comissao` passa a incluir `origem` e `detalhes` específicos de cada fluxo.
- No `AdminDashboard`, exibir a etiqueta de origem na lista de solicitações (mudança visual apenas, sem alterar aprovação/pagamento).
- Nada muda nos webhooks, no cálculo de comissão em si, nem nas regras de liquidação.
