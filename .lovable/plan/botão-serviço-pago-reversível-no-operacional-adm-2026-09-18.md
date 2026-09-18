# Botão "Serviço Pago" reversível no Operacional (ADM)

## Contexto confirmado

- O "Painel Financeiro & Controle de Comissão" (janela Operacional) é vinculado ao **Crédito Real Aprovado**, não aos serviços da Etapa 6 — a trava/estorno da comissão aprovada anteriormente permanece como está.
- O bloco "Serviço Pago / Serviço Pendente" hoje é apenas um **indicador sem clique**: reflete a confirmação feita serviço a serviço no Passo 6 do Workspace, e não tem como desfazer pelo Operacional.

## O que será feito

1. **Indicador vira botão com dois sentidos**
   - O bloco "Serviço Pago ✓ / Serviço Pendente" passa a ser clicável.
   - Quando estiver "Serviço Pendente": clicar pede confirmação — "Confirmar o pagamento do serviço do cliente {nome}?" — e grava "Serviço Pago".
   - Quando estiver "Serviço Pago": clicar pede confirmação — "Deseja desfazer o pagamento do serviço deste lead? O status volta para Pagamento Pendente." — e volta para "Pagamento Pendente".
   - Cancelar a confirmação não altera nada.

2. **Proteção contra clique duplo**
   - Enquanto a gravação estiver em andamento, o botão fica desabilitado exibindo "Processando...".

3. **Rótulos claros nos dois estados**
   - "Confirmar Serviço Pago" e "Desfazer Pagamento" (ou equivalente no mesmo estilo visual atual dos dois estados, mantendo cores verde/âmbar).

## Limites

- Alteração restrita ao botão "Serviço Pago" na janela Operacional do ADM.
- Não altera o Painel de Comissão (trava por Crédito Real Aprovado já aprovada), o Workspace, o Passo 6 serviço a serviço, o Portal do Parceiro ou regras do Firestore.
- A gravação usa o mesmo campo já existente (`servicoPago` e `dataConfirmacaoPagamentoServico` no lead); nenhum campo novo.

## Detalhes técnicos

- Arquivo: `src/components/AdminDashboard.tsx`.
- Substituir o `<div>` indicador (~linha 5932-5953) por um `<button>` que chama uma nova função `handleToggleServicoPago(id, pago)` com `window.confirm` por sentido e estado local `savingServicoPagoId` (mesmo padrão do `savingComissaoId` já criado).
- `handleToggleServicoPago`: `updateDoc(doc(db,"leads",id), { servicoPago: pago, dataConfirmacaoPagamentoServico: pago ? new Date().toISOString() : null })`, atualiza `setLeads` e `setSelectedLead`, e `finally` limpa o estado de gravação.

## Validação

- Lead com "Serviço Pendente": clicar, confirmar, vira "Serviço Pago".
- Lead com "Serviço Pago": clicar, confirmar, volta para "Pagamento Pendente".
- Cancelar a confirmação em ambos os sentidos não grava nada.
- Typecheck e build sem erros.
