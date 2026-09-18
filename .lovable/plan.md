# Trava e reversão do "Marcar Pago" da comissão (botão Operacional)

## O que foi verificado no código

No "Painel Financeiro & Controle de Comissão" (janela Operacional do card do lead):

- O botão ao lado de "Status Repasse" alterna entre **Marcar Pago** e **Marcar Pendente** — tecnicamente ele já reverte, mas **sem nenhuma confirmação**: um clique acidental grava "Comissão Paga" e dispara imediatamente um aviso ao parceiro ("Comissão Paga! ... foi realizado e liquidado com sucesso"). Por isso a sensação de não ter como desfazer: o parceiro já foi avisado e nada sinaliza que dá para voltar.
- O botão fica **sempre habilitado**, mesmo com o campo "Crédito Real Aprovado" vazio ou zerado, e mesmo com o crédito marcado como recusado.
- O bloco "Pagamento do Serviço (Passo 6)" logo acima já é apenas indicador (sem clique) — a confirmação Pix/Cartão acontece serviço a serviço no Workspace. Nada muda ali.

## O que será feito

1. **Só libera com crédito aprovado**
   - O botão fica desabilitado enquanto "Crédito Real Aprovado" estiver vazio ou igual a zero, e também quando o lead estiver como crédito recusado.
   - Nesse estado aparece a dica: "Preencha o Crédito Real Aprovado para liberar a baixa da comissão."

2. **Mesmo botão confirma e desfaz, com confirmação em tela**
   - Ao marcar pago: "Confirmar a baixa da comissão de {valor} para o parceiro {nome}? O parceiro será avisado."
   - Ao desfazer: "Deseja realmente estornar a comissão já marcada como paga deste lead? O status volta para Pendente."
   - Só depois do "Sim" a gravação acontece; cancelar não altera nada.
   - O rótulo do botão fica explícito nos dois estados: "Marcar Comissão Paga" e "Estornar Comissão".

3. **Aviso ao parceiro no estorno**
   - Hoje só existe aviso quando marca pago. No estorno o parceiro passa a receber um aviso de correção: "A baixa da comissão do indicado {nome} foi estornada pela administração e voltou para análise."

4. **Proteção contra clique duplo**
   - O botão fica desabilitado enquanto a gravação estiver em andamento, exibindo "Processando...".

## Detalhes técnicos

- Arquivo: `src/components/AdminDashboard.tsx`.
- `handleUpdateComissaoPaga` ganha `window.confirm` com texto distinto por sentido, estado local `savingComissao` (id do lead em gravação) e, quando `paga === false`, envio de `createNotification` do tipo aviso ao `parceiroId`.
- Condição de habilitação: `Number(selectedLead.valorAprovado) > 0 && selectedLead.status !== "recusado" && selectedLead.resultadoAnaliseCredito !== "recusado"`.
- Sem alteração nas regras de comissão, nos percentuais, no Passo 6, no Workspace ou no Portal do Parceiro; nenhuma mudança no Firestore Rules.

## Validação

- Lead sem valor aprovado: botão desabilitado com a dica.
- Lead recusado: botão desabilitado.
- Lead com valor aprovado: marcar pago pedindo confirmação, conferir aviso ao parceiro, estornar pelo mesmo botão e conferir volta para "Pendente".
- Typecheck e construção sem erros.
