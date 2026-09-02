# Baixa manual de pagamento por método (Pix/Cartão) + remoção de botão duplicado de saque

## O que foi confirmado no código

- **AdminDashboard.tsx (linhas 6520-6586):** existe um único botão "Confirmar Pagamento Manual" por sub-etapa do Passo 6, que chama `toggleManualPaymentForSubEtapa(idx)` (linha 1926). Hoje essa função grava `statusPagamento: "pago"`, `formaPagamento: "manual_adm"`, `dataPagamento: now` e recalcula o comissionamento via `buildLeadMultilevelFirestorePayload`.
- **commissionUtils.ts (linhas 351-364):** a trava de liberação já existe — o sistema calcula `dataLiberacaoSaque` a partir de `formaPagamento` ("PIX" → 2 dias, senão 15 dias) somando a `dataPagamento`. Hoje, como a baixa manual grava `"manual_adm"`, o método cai no fallback de 15 dias — por isso é preciso gravar o método correto.
- **PartnerPortal.tsx (linhas 5815-5840):** o "Banner Informativo de Liquidação" (texto que explica 48h PIX / 15 dias Cartão) tem um botão extra "Solicitar Comissão" — é o duplicado a remover. O botão principal fica no card "Saldo Disponível" (linha 5778) e será mantido intacto.
- Os botões "Confirmar Pagamento Realizado" em PartnerPortal (12035/12420) são de recarga de créditos/Caça-Leads e **não** serão tocados.

## Alterações

### 1. AdminDashboard.tsx — dois botões de baixa manual no Passo 6

- Refatorar `toggleManualPaymentForSubEtapa(idx)` para receber o método: `confirmManualPayment(idx, metodo: "PIX" | "CARTAO")`.
- Ao confirmar, gravar na sub-etapa:
  - `statusPagamento: "pago"`, `pago: true`, `dataPagamento: now`
  - `formaPagamento: "PIX"` ou `"CARTAO"` (em vez de `"manual_adm"`)
  - `dataLiberacaoSaque`: calculada e gravada explicitamente — `now + 48h` para Pix, `now + 15 dias` para Cartão — garantindo a trava mesmo que o cálculo derivado mude no futuro.
  - `origemConfirmacao: "manual_adm"` (campo novo, para rastreabilidade de que a baixa foi manual).
- Manter o fluxo de estorno: quando já está pago, continua exibindo o selo "Pago (Manual ADM)" + botão "Estornar", que limpa `dataLiberacaoSaque` junto dos demais campos.
- Substituir o botão único por dois, lado a lado (linhas 6575-6584):
  - **"Confirmar Pagamento no Pix"** — verde esmeralda (primário), com tooltip "Libera a comissão em 48h".
  - **"Confirmar Pagamento no Cartão"** — azul (secundário), com tooltip "Libera a comissão em 15 dias corridos".
- A exibição da data de compensação já existente no PartnerPortal ("Compensação até … 48h PIX / 15 dias Cartão", linha 6095) passa a refletir corretamente o método escolhido, sem alterações adicionais.

### 2. PartnerPortal.tsx — remover botão duplicado de saque

- Remover apenas o bloco do botão "Solicitar Comissão" dentro do banner informativo de liquidação (linhas 5826-5839), mantendo o texto explicativo da regra.
- Manter intactos o botão "Solicitar Saque" do card Saldo Disponível e o botão do card de comissões de vendas.

## Fora de escopo

- Nenhuma alteração em webhooks (Lastlink/Hubla) — a Etapa 6 já é 100% manual; nada a remover.
- Nenhuma mudança nas regras de comissão, percentuais ou no `firestore.rules`.

## Validação

- Conferir build sem erros.
- No painel ADM, simular baixa Pix e Cartão em sub-etapas distintas e verificar no Firestore os campos `formaPagamento` e `dataLiberacaoSaque` corretos.
