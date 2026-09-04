# Faturamento recorrente da Assessoria (12 mensalidades) com comissão automática

Nova aba **Faturamento (Mensalidades)** na ficha do lead, visível apenas para o Administrador, onde ele dá baixa manual em cada mensalidade e o sistema gera a comissão do parceiro usando exatamente a mesma regra de divisão já existente.

## O que foi confirmado no código

- O motor de comissão (`src/utils/commissionUtils.ts`) calcula tudo a partir da lista de itens `subEtapasPasso6` do lead: aplica os percentuais por plano (consultor + override do Master), grava data de pagamento e calcula a liberação do saque (2 dias para Pix, 15 dias para Cartão).
- O extrato do parceiro (`PartnerPortal.tsx`) lê essa mesma lista, então qualquer item pago nela já aparece no saldo, sem tela nova.
- O contrato de Assessoria já grava no lead: `modeloContratacao`, `planoEscolhido`, `valorMensalidade`, `contratoAssinado` e `contratoAssinadoData`.
- O Workspace já sabe quem é Administrador (`isAdminUser`) e o Passo 6 já usa dois botões de baixa manual (Pix / Cartão) — o mesmo padrão será reaproveitado.

## Como vai funcionar

1. Aba **Faturamento (Mensalidades)** aparece na ficha do lead somente para o Admin, e somente quando o contrato é de Assessoria e já está assinado.
2. A aba mostra as 12 parcelas em grade: "Parcela 3/12", valor da mensalidade, vencimento (a partir da data da assinatura, de 30 em 30 dias), e o status Pendente ou Pago.
3. Em cada parcela pendente há dois botões: **Confirmar Pagamento no Pix** (verde) e **Confirmar Pagamento no Cartão** (azul).
4. Ao clicar, aparece a confirmação: "Tem certeza que deseja confirmar o recebimento desta mensalidade? Isso irá gerar as comissões automaticamente."
5. Confirmando, a parcela vira Paga com data do recebimento, e a comissão do parceiro é gerada na hora com os mesmos percentuais de sempre — liberada para saque em 48h (Pix) ou 15 dias (Cartão).
6. A comissão aparece no extrato do parceiro já existente, descrita como "Comissão Assessoria - Parcela 3/12 - {razão social}".
7. Parcela já paga mostra selo "Pago" com a data e um botão de **Estornar**, igual ao padrão do Passo 6.

## Detalhes técnicos

- Novo campo no lead: `parcelasAssessoria` — array de 12 objetos (`numero`, `valor`, `vencimento`, `status`, `dataPagamento`, `formaPagamento`, `dataLiberacaoSaque`, `origemConfirmacao: "manual_adm"`). Gerado sob demanda na primeira abertura da aba, a partir de `valorMensalidade` e `contratoAssinadoData`.
- Reaproveitamento da comissão: ao confirmar uma parcela, um item espelho é acrescentado a `subEtapasPasso6` com `tipo: "mensalidade"`, `titulo: "Comissão Assessoria - Parcela X/12 - {razaoSocial}"`, `preco: valorMensalidade`, `statusPagamento: "pago"`, `formaPagamento: "PIX" | "CARTAO"`, e em seguida roda `buildLeadMultilevelFirestorePayload` — o mesmo caminho já usado hoje. Nenhuma alteração em percentuais nem no cálculo.
- No estorno, o item espelho da parcela é removido da lista e o payload é recalculado.
- Nas listas visuais do Passo 6 (Workspace e Admin), os itens com `tipo === "mensalidade"` são filtrados para não poluir a lista de serviços de estruturação — filtro apenas de exibição.
- Arquivos alterados: `src/components/LeadWorkspaceModal.tsx` (aba, grade das parcelas, handlers, filtro do Passo 6) e `src/types.ts` (tipagem de `parcelasAssessoria`).

## Fora de escopo

- Nenhuma tela nova no portal do parceiro; nenhuma cobrança automática ou webhook.
- Nenhuma mudança em percentuais de comissão, preços de estruturação, diagnóstico, RedeBE ou nos pagamentos do Passo 6.

## Validação

1. Lead de Assessoria assinado: abrir a ficha como Admin e conferir as 12 parcelas com valor e vencimento corretos.
2. Confirmar a parcela 1 no Pix e a 2 no Cartão; conferir status, datas e liberação de 48h / 15 dias.
3. Conferir no extrato do parceiro que as comissões entraram com a descrição por parcela.
4. Conferir que a lista de serviços do Passo 6 continua sem os itens de mensalidade.
