# Passo 6 — "Recolher" esconde a lista de clientes

## Objetivo
No bloco "Desempenho & Controle Financeiro de Serviços (Passo 6)" do Dashboard do parceiro, o botão global "Recolher" deve ocultar inteiramente a lista de clientes (linhas/LEDs da tabela), para o dashboard ficar limpo. Hoje ele apenas fecha os detalhamentos individuais, mas a tabela de clientes continua visível.

## Comportamento novo
- **Recolher** (botão global): fecha todos os detalhamentos **e** esconde a tabela de clientes. Permanecem visíveis: cartões de totais (valores pendentes/pagos, comissões) e filtros/status.
- Enquanto a lista estiver oculta, no lugar da tabela aparece uma faixa compacta discreta: "X clientes ocultos — Recolhido para deixar o painel limpo".
- **Todos os detalhes** (botão global): volta a exibir a lista e abre todos os detalhamentos de uma vez (comportamento atual + reexibir).
- Se os filtros de status ou a busca forem alterados enquanto a lista está oculta, a lista é reexibida automaticamente (para o parceiro ver o resultado do filtro).
- O botão "Detalhes/Recolher" de cada linha da tabela não muda.
- Nenhuma mudança no desktop além desse comportamento; sem alterações no ADM.

## Escopo técnico
- Arquivo único: `src/components/PartnerPortal.tsx`.
- Novo estado local: `passo6ListaVisivel` (boolean, padrão `true`), junto dos estados existentes (`expandedServiceLeadIds`, `dashboardServiceFilter`, ~linha 1007–1010).
- Ajustes nos dois botões globais (~linhas 5898–5917) e na renderização condicional da tabela/estado vazio (~linhas 5931–5948), com a faixa "X clientes ocultos" quando oculto.
- `useEffect` leve: ao mudar `dashboardServiceFilter` ou `dashboardServiceSearch`, reexibir a lista.
- Nenhuma alteração de dados, endpoints ou lógica financeira.

## Validação
- `bunx tsgo --noEmit` e conferência do build (`tail /tmp/observability/build-errors.log`).
- Playwright: abrir o Dashboard do parceiro, clicar "Recolher" (lista some, faixa de contagem aparece), clicar "Todos os detalhes" (lista volta expandida), mudar filtro (lista reaparece).
