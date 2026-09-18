# Correções: "Crédito Recusado" reversível e comissão fantasma de R$ 2.160

## O que a varredura encontrou (confirmado no código)

**1. O botão "Marcar Recusado" não desfaz de verdade**
Ao clicar de novo em "✓ Crédito Recusado", o sistema só muda o status para "em atendimento" e **deixa a marca de recusa gravada** no lead (o campo de resultado da análise continua "recusado"). Por isso a etiqueta continua "Crédito Recusado", o botão nunca volta ao normal e a comissão segue travada. Também não há confirmação nem aviso ao parceiro no desfazer.

**2. De onde vem o R$ 2.160 no painel do parceiro**
O card "Suas Comissões & Repasses" **não usa o Crédito Real Aprovado quando ele está vazio**: o cálculo é `valor aprovado OU limite estimado da simulação × percentual do plano`. Com um limite simulado de R$ 72.000 e 3%, aparece exatamente R$ 2.160 — dinheiro que nunca existiu.

**3. Por que aparece como "liberado" mesmo com crédito recusado**
Esse mesmo card considera a comissão como **paga/liberada** quando o lead tem `servicoPago = true` — ou seja, o pagamento de um serviço do Passo 6 libera indevidamente a comissão do crédito. E leads recusados **não são excluídos** desse cálculo.

## O que será feito

### A. Botão "Crédito Recusado" reversível (janela Operacional do ADM)
- Ao desfazer, pedir confirmação: "Deseja desfazer a recusa de crédito deste lead? Ele volta para 'Em Análise Bancária'."
- Ao confirmar, limpar de verdade a recusa: resultado da análise volta para "em análise", motivo da recusa apagado, status volta para "em atendimento".
- Notificar o parceiro: "A recusa de crédito do indicado {nome} foi revista e o lead voltou para análise."
- Trava contra clique duplo ("Processando...") e rótulos claros: "Marcar Recusado" / "Desfazer Recusa".

### B. "Suas Comissões & Repasses" passa a refletir só o Crédito Real Aprovado
- **Nunca mais usar o limite estimado da simulação** como base de comissão — se o ADM não escreveu o Crédito Real Aprovado, a comissão é R$ 0,00.
- **Excluir leads recusados** de pago, pendente e do saldo de saque.
- **Separar as duas coisas**: o pagamento de serviço do Passo 6 deixa de marcar a comissão do crédito como paga. Comissão de crédito só fica "paga/liberada" quando o ADM marca a baixa no Painel Financeiro.
- Com isso o saldo disponível para saque de vendas cai para R$ 0,00 nos casos sem crédito aprovado, incluindo o lead recusado.
- Texto de apoio no card: "Base: Crédito Real Aprovado informado pela administração."

## Limites
- Nada muda nos percentuais 10/20/30% nem na comissão de serviços do Passo 6 (aba própria, que continua baseada nos serviços pagos).
- Nenhuma alteração em regras do Firestore, Workspace ou contratos.
- Saques já solicitados/pagos continuam registrados no histórico.

## Detalhes técnicos
- `src/components/AdminDashboard.tsx`: nova `handleDesfazerCreditoRecusado(id)` gravando `{ status: "em atendimento", resultadoAnaliseCredito: "em_analise", motivoRecusa: "" , dataResultadoAnalise: now }`, com `window.confirm`, `createNotification` (warning) ao `parceiroId` e estado `savingRecusaId`; o `onClick` do botão (~5929) passa a chamá-la em vez de `handleUpdateStatus`.
- `src/components/PartnerPortal.tsx`:
  - `salesCommissionStats` (~1494) e o bloco de métricas (~5106-5150): base vira `Number(l.valorAprovado || 0)` (sem `|| limiteEstimado`); adicionar filtro `!isRecusado(l)` (`status === "recusado" || resultadoAnaliseCredito === "recusado"`); `isPaidLead` deixa de aceitar `servicoPago === true` (mantém `comissaoPaga === true`); `isPendingLead` exige `Number(valorAprovado) > 0`.
  - Fallback `comissaoMultinivel?.valorComissaoDireta/Equipe` só é usado quando há crédito aprovado e o lead não está recusado.

## Validação
- Lead recusado: desfazer volta a etiqueta para "Em Análise Bancária" e libera o botão nos dois sentidos.
- Lead sem Crédito Real Aprovado: card do parceiro mostra R$ 0,00 e saldo de saque zerado (fim do R$ 2.160).
- Lead com crédito aprovado e baixa marcada pelo ADM: valor aparece como pago/liberado normalmente.
- Typecheck e build sem erros.
