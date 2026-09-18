# Direcionar lead para qualquer parceiro direto (Painel do ADM)

## Situação atual (verificada no código)

No `AdminDashboard.tsx`, a janela "Direcionar Lead para Parceiro Master" monta a lista com `masterPartners = partners.filter(isMasterPartner)`, e `isMasterPartner` só aceita planos que contenham FRANQUIA, DIGITAL, MASTER ou PLATINUM. Por isso o ADM só consegue direcionar para Masters.

## O que muda

A lista passa a mostrar **todos os parceiros diretos** — ou seja, parceiros cadastrados sem vínculo com um Master (Starter, Executive e Master, desde que não sejam consultores de equipe).

Ficam **fora** da lista:
- consultores vinculados a um Master (têm parceiro superior);
- parceiros marcados como membros de equipe;
- parceiros com plano de Consultor / Equipe.

Nada muda para o Master: ele continua direcionando leads para os consultores dele no portal dele.

## Ajustes na janela

- Título: "Direcionar Lead para Parceiro".
- Subtítulo: "Vincule este lead a um parceiro direto para atendimento dedicado."
- Rótulo do campo: "Selecione o Parceiro Responsável".
- Opção inicial: "-- Selecione um Parceiro --".
- Aviso quando vazio: "Nenhum parceiro direto encontrado no sistema."
- Nota de rodapé: "* Apenas parceiros diretos (sem vínculo com Master) recebem leads direcionados pelo Administrador."
- Cada linha continua mostrando nome, cidade e contato, e passa a mostrar também o nível do parceiro (Starter / Executive / Master).
- Mensagem de sucesso e dicas dos botões do card ("Reatribuir" / "Alterar") deixam de citar "Master".

## Detalhes técnicos

- Nova função `isParceiroDireto(p)`: `!p.parentPartnerId && p.isTeamMember !== true && !/CONSULTOR|EQUIPE/.test((p.plano || "").toUpperCase())`.
- `masterPartners` é substituída por `parceirosDiretos = partners.filter(isParceiroDireto)`, ordenada por nome.
- `handleConfirmAssignMaster` mantém a mesma gravação (`parceiroId`, `parceiroNome`), atualização de estado local e notificação ao parceiro; apenas textos mudam.
- `isMasterPartner` permanece no arquivo se usada em outros pontos; nenhuma outra tela é alterada.

## Fora de escopo

Regras do Firestore, comissões, portal do parceiro/Master e qualquer outra tela do ADM.
