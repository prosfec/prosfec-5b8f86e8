# Diagnóstico: link do cliente oferece pagamento de serviço já pago

Análise apenas. Nenhum arquivo do sistema foi alterado.

## Respostas às 7 perguntas

1. **Onde o ADM marca como pago**
   `src/components/AdminDashboard.tsx` — função `toggleManualPaymentForSubEtapa`
   (linhas ~2114-2170), usada no bloco de sub-etapas do Passo 6 (~linha 6794).
   O mesmo padrão existe no workspace (`LeadWorkspaceModal.tsx`, ~4279-4286).
   A baixa só é liberada quando o lead está no Passo 6.

2. **Onde isso é gravado**
   Coleção `leads`, documento `leads/{leadId}`, campo **`subEtapasPasso6`**
   (array). São gravados junto `comissaoMultinivel` e as datas de liberação
   de comissão.

3. **Campo que representa pagamento confirmado**
   Dentro de cada item de `subEtapasPasso6`: `statusPagamento: "pago"` e
   `pago: true` (mais `formaPagamento`, `dataPagamento`, `dataLiberacaoSaque`,
   `origemConfirmacao: "manual_adm"`).

4. **Como o link do cliente carrega os serviços**
   `GET /api/public/proposta/:leadId` em `src/lib/prosfec-server.ts`
   (linhas ~2866-2895). Ele lê **`lead.servicosRecomendados`** — um array
   diferente — e calcula `pago` com
   `statusPagamento === "pago" || pago === true` (linha 2877-2878).
   O painel de acompanhamento do mesmo endpoint (linhas ~2934-2949) lê
   `subEtapasPasso6`, que é o array correto.

5. **Componente que renderiza "Serviços e pagamento"**
   `src/routes/proposta.$leadId.tsx`, Bloco 3 (linhas ~515-535).

6. **Condição atual do botão**
   `s.pago ? selo "Pago" : s.linkPagamento ? botão "Realizar Pagamento" : aviso`
   — ou seja, depende exclusivamente do `pago` vindo de `servicosRecomendados`.

7. **Diferença entre o status do ADM e o do cliente**
   Sim, e é exatamente a causa. O ADM confirma o pagamento em
   `subEtapasPasso6`; o bloco de pagamento do cliente lê `servicosRecomendados`,
   que **não é atualizado** pela baixa manual (a sincronização existente é de
   mão única: serviços → sub-etapas, nas linhas 505-536 do AdminDashboard).
   Resultado: no mesmo link, o Bloco 1 já mostra "Pago" (lê sub-etapas) e o
   Bloco 3 continua oferecendo "Realizar Pagamento" (lê serviços).

## Menor correção necessária

Um único ponto, **somente no endpoint público de leitura**
(`GET /api/public/proposta/:leadId`, `src/lib/prosfec-server.ts`):

Ao montar cada serviço, além de checar as flags do próprio item, procurar a
sub-etapa correspondente em `subEtapasPasso6` (casando por `id` ou por
`titulo === nome`, exatamente o mesmo critério já usado na sincronização do
AdminDashboard) e considerar pago se qualquer um dos dois estiver pago:

```text
pago = isPagoFlag(servico) || isPagoFlag(subEtapaCorrespondente)
```

Com isso:
- serviço marcado como pago pelo ADM → Bloco 3 mostra o selo "Pago" e o botão
  "Realizar Pagamento" desaparece (a condição do componente já faz isso);
- serviço não pago → nada muda, o botão continua aparecendo.

Não é preciso tocar em: checkout, Lastlink, fluxo de pagamento, painel ADM,
Firestore Rules, serviços, comissão, PDF, diagnóstico ou qualquer outro fluxo.
Nenhuma gravação nova é feita — só a leitura passa a considerar a fonte
correta do status.
