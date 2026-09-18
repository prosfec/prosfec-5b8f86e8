# Status do serviço controlado só pelo botão "Confirmar Serviço Pago"

## O que foi verificado

- Na janela Operacional, a etiqueta "Pagamento do Serviço (Passo 6)" mostra "Pago pelo Cliente" ou "Pendente de Pagamento" lendo o mesmo campo do botão "Confirmar Serviço Pago".
- Esse campo também é gravado automaticamente pelo Workspace: sempre que o Passo 6 é salvo com algum serviço cobrável marcado como pago, o sistema grava "pago" no lead sozinho — por isso o status aparece "pago" sem ninguém ter clicado no botão do Operacional, e volta a "pago" no próximo salvamento mesmo depois de desfeito.

## O que será feito

1. **Somente o botão decide o status**
   - O Workspace (Passo 6) deixa de gravar e de apagar o marcador de "Serviço Pago" do lead.
   - A confirmação Pix/Cartão serviço a serviço continua exatamente como está, registrada em cada serviço.

2. **Estado inicial é Pendente**
   - Enquanto o botão "Confirmar Serviço Pago" não for clicado no Operacional, a etiqueta fica "Pendente de Pagamento".
   - Clicar confirma e mostra "Pago pelo Cliente"; clicar de novo desfaz e volta para pendente (com as confirmações já existentes).

## Limites

- Nenhuma mudança no cálculo de comissões, nos percentuais, no contador de serviços do parceiro ou nas regras do Firestore.
- Nenhuma mudança na confirmação de pagamento serviço a serviço do Passo 6.
- Leads que hoje já estão marcados como pagos continuam marcados; o Admin pode desfazer pelo botão.

## Detalhes técnicos

- Arquivo: `src/components/LeadWorkspaceModal.tsx`, em `handleSaveSubEtapasLocal` (~linhas 720-755).
- Remover `servicoPago` e `dataConfirmacaoPagamentoServico` do objeto `firestoreUpdate` e do payload de `onLeadUpdated`, junto com o cálculo `algumPago`/`datasPagamento` que só serve a esses campos.
- Esses campos passam a ser escritos exclusivamente por `handleToggleServicoPago` em `src/components/AdminDashboard.tsx`.

## Validação

- Salvar o Passo 6 com um serviço marcado como pago: a etiqueta no Operacional continua "Pendente de Pagamento".
- Clicar em "Confirmar Serviço Pago": etiqueta vira "Pago pelo Cliente".
- Salvar o Passo 6 de novo: a etiqueta permanece como o Admin deixou.
- Desfazer pelo botão: volta para pendente e não é reescrita pelo Workspace.
- Typecheck e build sem erros.
