# Painel Financeiro & Controle de Comissão: 100% Crédito Real Aprovado

## O que foi verificado na janela Operacional

Dentro do painel hoje existem três coisas que não pertencem ao crédito:

- O botão "Confirmar Serviço Pago" e a etiqueta "Pagamento do Serviço (Passo 6)" — são do Passo 6, não do crédito.
- O valor do repasse é calculado com "Crédito Real Aprovado **ou** limite estimado da simulação". Sem o crédito preenchido, ele mostra uma comissão que não existe (mesma origem do valor fantasma no portal do parceiro).
- A etiqueta "Status Repasse" muda para "Pendente" por causa da etapa 7/status concluído, mesmo sem crédito aprovado.

## O que será feito

1. **Tirar o Passo 6 do painel**
   - Remover o botão "Confirmar Serviço Pago / Desfazer" e o bloco "Pagamento do Serviço (Passo 6)" desta janela.
   - A confirmação de pagamento dos serviços continua onde sempre esteve: serviço a serviço no Passo 6 do Workspace. Nada é apagado.

2. **Repasse sempre sobre o Crédito Real Aprovado**
   - O valor do repasse passa a ser calculado só sobre o Crédito Real Aprovado. Campo vazio, zerado ou crédito recusado: R$ 0,00.
   - Texto de apoio abaixo do valor: "Calculado sobre o Crédito Real Aprovado."

3. **Status do repasse coerente com o crédito**
   - Sem crédito aprovado (ou crédito recusado): "Aguardando Crédito Aprovado".
   - Com crédito aprovado e sem baixa: "Pendente".
   - Com a baixa marcada pelo Admin: "Pago".
   - O botão de marcar/estornar a comissão continua como está, liberado só com crédito aprovado.

## Limites

- Nada muda nos percentuais por plano (10/20/30%), no Workspace, no Passo 6, nos contratos ou nas regras do Firestore.
- O campo de pagamento de serviço do lead continua existindo no banco; apenas deixa de aparecer nesta janela.

## Detalhes técnicos

- Arquivo: `src/components/AdminDashboard.tsx`.
- Remover o bloco do botão de serviço pago (~linhas 5999-6037) e o indicador "Pagamento do Serviço (Passo 6)" (~linhas 6040-6053). A grade de ações fica só com o botão de recusa (passa a `grid-cols-1`).
- `directCommissionValue` (~6061): trocar `(selectedLead.valorAprovado || selectedLead.limiteEstimado || 0)` por `creditoBase`, onde `creditoBase = creditoRecusado ? 0 : Number(selectedLead.valorAprovado || 0)`.
- Substituir `isConcluidoOrAprovado` na etiqueta de status (~6089) por `creditoBase > 0`, com o terceiro estado rotulado "Aguardando Crédito Aprovado".
- `handleToggleServicoPago` e `savingServicoPagoId` ficam sem uso nesta janela; remover apenas se não houver outro consumidor no arquivo.

## Validação

- Lead sem Crédito Real Aprovado: repasse R$ 0,00, status "Aguardando Crédito Aprovado", botão de comissão desabilitado.
- Lead com crédito aprovado: repasse = crédito × percentual do plano; marcar e estornar funcionam.
- Lead recusado: repasse R$ 0,00 e botão bloqueado.
- Nenhum item de Passo 6 visível na janela Operacional.
- Typecheck e build sem erros.
