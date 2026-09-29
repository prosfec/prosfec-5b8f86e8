# Impedir pagamento duplicado de comissões solares

## Resultado esperado
- Um contrato solar só poderá ser quitado por um dos dois caminhos: solicitação do parceiro ou pagamento direto pela Mesa.
- Solicitações já associadas a contratos pagos não permanecerão disponíveis para uma segunda confirmação de PIX.
- O painel do parceiro continuará exibindo o estado correto da comissão, inclusive quando uma solicitação for recusada.

## Implementação técnica
- Conciliar as solicitações solares pendentes com os IDs dos leads e os valores efetivamente disponíveis antes de permitir qualquer pagamento. Tratar pedidos históricos sem `detalhes.leadIds` usando o vínculo por data já existente; bloquear a liquidação se o vínculo ou o valor não puder ser confirmado.
- Fazer a transição de solicitação e leads juntos em uma transação Firestore com conferência do estado atual, tanto no pagamento pela solicitação quanto na liquidação direta. Na liquidação direta, encerrar a solicitação correspondente no mesmo ato e registrar a referência do pagamento; não pagar automaticamente uma solicitação com total divergente.
- Aplicar a mesma checagem de estado atual na recusa, para nunca devolver à condição de acumulada uma comissão já paga. Impedir solicitações concorrentes ou repetidas do parceiro durante o envio.
- Manter as informações históricas e os demais tipos de comissão inalterados. Validar estados pendente, pago e recusado, os dois caminhos de pagamento e a atualização nos dois painéis, sem executar PIX real.