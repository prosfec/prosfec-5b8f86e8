# Aviso de "relatório pendente de anexo" no card do lead (painel ADM)

## Objetivo

Assim que uma consulta é executada e ainda não tem o PDF anexado, o lead
correspondente passa a exibir um sinal discreto no painel administrativo,
para a equipe saber onde falta anexar o arquivo.

## Como fica na prática

1. Ao carregar a aba de Leads, o painel também lê as consultas executadas e
   descobre quais estão sem PDF anexado.
2. Cada lead com consulta sem PDF ganha:
   - uma **bolinha vermelha pulsante** no canto superior do card (modo grade)
     e ao lado do nome da empresa (modo lista);
   - um selo discreto **"PDF pendente (N)"** dentro do card, onde N é a
     quantidade de consultas aguardando anexo (só aparece quando N > 0);
   - o mesmo selo na linha da tabela, na coluna "Preparação".
3. Passar o mouse mostra: "N consulta(s) executada(s) aguardando o relatório
   PDF".
4. Assim que a equipe anexa o PDF pela ficha do lead, o sinal some (some ao
   reabrir/atualizar a lista, e imediatamente após o upload feito no painel).
5. Um contador no topo da aba de Leads — botão-filtro **"Aguardando PDF (N)"**
   — permite mostrar só os leads pendentes de anexo, junto dos filtros que já
   existem.

## O que NÃO muda

Consulta de crédito, cobrança, saldo, catálogo de preços, contratos,
permissões, painel do parceiro, ficha do lead, site público e simulador.
Nenhuma alteração no armazenamento nem nas regras.

## Detalhes técnicos

- `src/components/AdminDashboard.tsx`:
  - No carregamento inicial (mesmo bloco que já busca `leads`, `parceiros`,
    `recargas`), adicionar `getDocs(collection(db, "consultas_realizadas"))`.
  - Construir `pendingReportsByLead: Record<string, number>`: ignorar registros
    de controle (id iniciado por `ia_diagnostico_` ou `resultado` vazio/nulo) e
    contar apenas os que **não** têm `relatorioPdfUrl`. Chave primária:
    `leadId`; para registros antigos sem `leadId`, casar `documento`
    (só dígitos) com o `cnpj` do lead.
  - Guardar em estado `pendingReports` e expor um helper
    `getPendingReports(lead)`.
  - Card em grade (a partir da linha ~3508): ponto vermelho absoluto no canto
    superior direito (`animate-pulse`) e selo `PDF pendente (N)` junto dos
    demais selos do card.
  - Tabela (coluna "Preparação"): mesmo selo compacto + ponto ao lado do nome.
  - Filtro: novo estado `onlyPendingPdf`; quando ativo, `filteredLeads` mantém
    só leads com `getPendingReports(lead) > 0`. Botão com o total ao lado dos
    controles de visualização.
  - Após upload/remoção de PDF no `RelatorioPdfUploader`, recarregar o mapa:
    passar um callback já existente (`onUpdated`) até o painel, ou simplesmente
    recontar ao fechar o workspace do lead.
- `src/components/RelatorioPdfUploader.tsx`: sem mudança de lógica; apenas
  garantir que `onUpdated` seja propagado a partir de `LeadWorkspaceModal`
  para o painel, quando esse encadeamento ainda não existir.
- Cores por token existentes no painel (rose/amber), sem novo CSS global.
- Validação: `bunx tsgo --noEmit` e build.
