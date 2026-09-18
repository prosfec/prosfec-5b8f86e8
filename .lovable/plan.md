# Padrão visual Premium no Painel ADM

Levar o mesmo acabamento visual já aprovado no Portal do Parceiro (aparência Clara e aparência Tecnológica) para o Painel do Administrador e suas telas internas. Mudança puramente visual.

## O que muda

1. **Botão de aparência (Sol/Lua)** no rodapé do menu lateral do ADM, igual ao do parceiro, com a escolha memorizada no navegador. A aparência Clara continua sendo o padrão do ADM.
2. **Fundos, cartões e menu lateral**: fundo geral claro/escuro conforme o tema; no escuro o menu deixa de ter blocos brancos e o item ativo fica com destaque verde translúcido; cartões de métricas sem bordas duras nem sombras pesadas.
3. **Tipografia**: rótulos em caixa alta, cinza discreto; valores (R$ e quantidades) em alto contraste e negrito.
4. **Tabelas e listas** (Leads, Usuários, Saques): cabeçalho com fundo sutil e texto em caixa alta, linhas com realce leve ao passar o mouse e texto legível no escuro.
5. **Etiquetas de status** ("Aprovado", "Pendente", "Bloqueado", "Aguardando Saque" etc.) passam a usar as etiquetas semânticas já criadas: no escuro, fundo translúcido em vez de fundo sólido claro.

## O que não muda

Nenhuma regra de negócio, permissão, rota, cálculo de comissão ou acesso a dados. Só aparência.

## Detalhes técnicos

- `AdminDashboard.tsx`: adicionar estado de tema (`prosfec_admin_theme` no localStorage) aplicando/removendo a classe `dark` no `<html>`, com padrão `light`; aplicar a classe de escopo `soft-ui` na raiz do painel para reaproveitar os tokens já definidos em `src/styles.css`.
- Raiz: `bg-slate-50 dark:bg-zinc-950`; sidebar com fundo transparente/`dark:bg-zinc-950` e item ativo `dark:bg-emerald-500/10 dark:text-emerald-400`; topbar `dark:bg-zinc-950/80 dark:border-white/10`.
- Cartões: padrão `soft-card` com `dark:bg-zinc-900 dark:border-white/10` e sem sombra no escuro.
- Rótulos: `text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400`; valores: `text-slate-900 dark:text-white font-bold tracking-tight`.
- Tabelas: `th` com `bg-slate-100 dark:bg-zinc-900/50` + `uppercase tracking-wider`; `tr` com `dark:hover:bg-white/5`; células `dark:text-zinc-300`.
- Badges: substituir classes `bg-*-50/100` por `pf-badge-success | pf-badge-warning | pf-badge-neutral | pf-badge-danger | pf-badge-info`.
- Escopo dos componentes filhos: `AdminPedidosContabilidadeTab.tsx`, `AdminServicosContabilidadeTab.tsx`, `FunnelAnalyticsDashboard.tsx`, `TeamPerformanceChart.tsx`, `FichaRatingAdmViewer.tsx`, `ContratosAssinadosResumo.tsx` e os modais abertos pelo ADM.
- Validação: typecheck, build e conferência visual das duas aparências com captura de tela.
