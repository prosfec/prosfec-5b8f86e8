# Confirmação de pagamento só no Passo 6, com Pix ou Cartão

## Situação atual (verificada)

Hoje existem três lugares que confirmam pagamento de serviço de estruturação:

1. **Passo 3 da ficha do lead** — botão "✓ Confirmar Pgt Manual" ao lado de cada serviço (só ADM). Ele marca o serviço como pago sem informar o meio de pagamento e **sem data de liberação**, então a comissão fica disponível para saque na hora, furando as regras de 48h (Pix) e 15 dias (Cartão).
2. **Passo 6 da ficha do lead** — botão único "✓ Confirmar Pgt Manual", com o mesmo problema: sem meio de pagamento e sem prazo de liberação.
3. **Painel Financeiro do lead (ADM)** — botão "Serviço Pendente / Serviço Pago ✓" que marca **todos** os serviços de uma vez, também sem meio e sem prazo.

A lista de serviços do Passo 6 dentro do painel do ADM já funciona do jeito certo (dois botões, Pix e Cartão, com prazo). O que falta é unificar tudo nesse padrão.

## O que será feito

1. **Passo 3 passa a ser só leitura**
   - Sai o botão de confirmar/estornar pagamento.
   - Fica o selo de situação ("Pago" / "Pendente") e o link de contratação, como informação.

2. **Passo 6 ganha os dois botões de meio de pagamento**
   - Em cada serviço pendente: **"Confirmar Pagamento no Pix (48h)"** e **"Confirmar Pagamento no Cartão (15 dias)"**.
   - Ao confirmar, o sistema grava o meio escolhido, a data do pagamento e a data em que a comissão fica liberada para saque (48 horas para Pix, 15 dias corridos para Cartão).
   - Serviço já pago mostra o selo com o meio e a data de liberação, mais o botão "Estornar", que volta para pendente e limpa meio, data e liberação.

3. **Botão que marcava tudo pago de uma vez vira apenas indicador**
   - No Painel Financeiro do lead, o botão passa a ser um selo de situação (Pago / Pendente), sem ação — a confirmação acontece serviço a serviço no Passo 6.

4. Nada muda nas parcelas de mensalidade da assessoria (que já têm Pix e Cartão), nem nos percentuais de comissão, nem no painel do parceiro.

## Detalhes técnicos

- `src/components/LeadWorkspaceModal.tsx`
  - Passo 3 (~4226-4257): remover o botão de confirmar/estornar; manter o selo de status.
  - Passo 6 (~4697-4730): substituir o botão único por dois botões (PIX / CARTAO) gravando `statusPagamento: "pago"`, `formaPagamento`, `dataPagamento`, `dataLiberacaoSaque` (+48h ou +15 dias), `origemConfirmacao: "manual_adm"` e `concluida: true`; o "Estornar Pgt" limpa esses campos. Salvar por `handleSaveSubEtapasLocal`, que já recalcula a comissão.
  - Exibir no selo de pago o meio e a data de liberação.
- `src/components/AdminDashboard.tsx`
  - Trocar o botão de `handleToggleServicoPago` (~5983-6005) por um selo de status; manter a função para compatibilidade apenas se ainda for usada, senão removê-la.
  - A lista do Passo 6 no ADM (`toggleManualPaymentForSubEtapa`) fica como está — é a referência do comportamento correto.
- Sem mudanças em Firestore Rules, saques já registrados ou regras de comissão.
- Validação: `bunx tsgo --noEmit` e build limpo.
