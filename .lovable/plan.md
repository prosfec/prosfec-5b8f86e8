# Realocar Ficha & Documentos para o Passo 6 (Estruturação)

## O que muda

A aba solta "Ficha & Documentos" sai da navegação superior do Workspace do Lead. Todo o conteúdo (o `FichaRatingCreditoForm`, incluindo o campo "Link da Pasta de Documentos") passa a ser renderizado dentro do Passo 6 (Estruturação), logo abaixo do cabeçalho do passo e antes/depois do bloco de sub-etapas e simulação — o parceiro abre o Passo 6 e já encontra a coleta documental no lugar certo do funil.

Nada é apagado: o formulário continua o mesmo componente, o mesmo salvamento por `updateDoc` e os mesmos nomes de campo no Firestore.

### Detalhes da realocação
- Remover o botão da aba `rating_form` da barra de abas.
- Remover o bloco de renderização `workspaceTab === "rating_form"` e mover o `FichaRatingCreditoForm` para dentro do bloco `workspaceTab === "simulador"` (Passo 6), em um cartão próprio com título "Ficha de Rating & Documentos do Cliente".
- Manter `rating_form` como valor aceito de `initialTab`, redirecionando internamente para `simulador`, para não quebrar links/atalhos existentes que já apontem para a aba.
- Indicador de pasta preenchida (bolinha verde) passa para a aba "Passo 6: Estruturação".

## Sobre o "Dossiê Rating (ADM)" — onde ele reflete hoje

O `FichaRatingAdmViewer` (aba exclusiva do Admin) lê e escreve exclusivamente em `lead.fichaRatingCredito`: documentos (links de nuvem e legado base64), validação por documento (aprovado / rejeitado / pendente), `status`, `faseRating` e a conclusão do rating. Ele já consulta `lead.subEtapasPasso6` e `lead.servicosRecomendados` apenas para saber se há serviço pago — mas não reflete o andamento real do Passo 6.

Ou seja: hoje o Dossiê ADM e o Passo 6 vivem em silos. O parceiro preenche a ficha e marca sub-etapas no Passo 6; o Admin valida documentos no Dossiê; nenhum dos dois vê o estado do outro.

## Sincronização proposta (esteira organizada)

1. **Passo 6 mostra o veredito do Admin.** Dentro do Passo 6, acima do formulário, uma faixa de status derivada de `fichaRatingCredito`: fase atual, quantos documentos aprovados / rejeitados / pendentes, e destaque para os rejeitados com o motivo — o parceiro corrige sem precisar de aviso por fora.
2. **Dossiê ADM mostra o andamento do Passo 6.** No topo do `FichaRatingAdmViewer`, um cartão com as sub-etapas do Passo 6 (concluídas / total, percentual) e o "Link da Pasta de Documentos", para o Admin validar no mesmo contexto do serviço contratado.
3. **Fase do rating acompanha o funil.** Ao concluir todas as sub-etapas do Passo 6, `fichaRatingCredito.faseRating` avança para `em_aplicacao`; quando o Admin conclui o rating, o Passo 6 exibe "Rating concluído" e libera visualmente o Passo 7.

Os itens 1 e 2 são leitura cruzada, sem risco. O item 3 escreve em `fichaRatingCredito.faseRating` a partir do Passo 6 — implemento se você confirmar.

## Arquivos tocados

- `src/components/LeadWorkspaceModal.tsx` — remoção da aba, realocação do formulário no Passo 6, faixa de status do rating.
- `src/components/FichaRatingAdmViewer.tsx` — cartão de andamento do Passo 6 no topo.
