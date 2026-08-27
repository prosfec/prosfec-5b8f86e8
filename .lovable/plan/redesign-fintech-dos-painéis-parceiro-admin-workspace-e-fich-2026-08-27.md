# Redesign fintech dos painéis (Parceiro, Admin, Workspace e Ficha)

## O que encontrei hoje

Os tokens "Luminous Glass" já existem em `src/styles.css`, mas quase não são usados: só 3 ocorrências de `glass-panel`/`glass-raise` em todo o `src/components`. Na prática os painéis ainda são um mosaico de classes utilitárias soltas (`bg-white`, `bg-slate-50`, `bg-slate-900`, sombras diferentes por tela), o que faz o sistema parecer montado em épocas diferentes.

Volume envolvido: `PartnerPortal.tsx` (12.424 linhas), `AdminDashboard.tsx` (8.298), `LeadWorkspaceModal.tsx` (4.662), `FichaRatingAdmViewer.tsx` (1.567), `FichaRatingCreditoForm.tsx` (1.529).

## Direção escolhida

- **Paleta:** verde Prosfec escuro — `#02241a` (base), `#0A3D2E` (superfície), `#00A86B` (acento), `#E8F5EF` (texto claro/superfície clara).
- **Tipografia:** Sora nos títulos e números, Manrope no corpo.
- **Estrutura:** sidebar fixa com ícones + área de trabalho ampla, nos dois portais.
- **Escopo:** tudo nesta rodada — Parceiro, Admin, Workspace do lead e Ficha de Rating.

## Etapa 1 — Fundação visual

- Tokens novos em `src/styles.css`: superfícies (`--surface-base`, `--surface-raised`, `--surface-sunken`), bordas, texto, estados (sucesso/alerta/erro) e sombras em duas alturas, todos em oklch.
- Carregar Sora + Manrope por `<link>` no `src/routes/__root.tsx` e apontar `--font-display`/`--font-sans` para elas.
- Utilitários reutilizáveis: `panel`, `panel-raised`, `stat-tile`, `data-table`, `pill-status`, `field-shell`, `sidebar-item` — para que as telas parem de repetir combinações de classe.
- Números em `font-variant-numeric: tabular-nums` para valores, comissões e datas.

## Etapa 2 — Casca dos dois portais

- Sidebar fixa escura (`#02241a`) com ícone + rótulo, item ativo marcado por barra de acento `#00A86B`, recolhível para só ícones em telas menores e virando gaveta no mobile.
- Topbar enxuta: título da seção, busca, saldo/identidade e ações rápidas.
- Área de conteúdo em fundo claro (`#F6F8F7`) com cards brancos e cantos generosos.
- Nada de mudança de rota ou de aba: as mesmas abas existentes passam a ser itens da sidebar.

## Etapa 3 — Dashboards

- Faixa de KPIs em tiles: rótulo pequeno em caixa alta, número grande em Sora, variação com seta e cor semântica, gráfico sparkline discreto onde já existe dado.
- Tabelas de leads/pedidos: cabeçalho fixo, linhas com hover, status como pílula com bolinha colorida, ações alinhadas à direita, paginação limpa.
- Cards de serviço (Pronampe, FINEP, BNDES, Caça Leads, Contabilidade) com elevação no hover e hierarquia consistente.

## Etapa 4 — Workspace do lead e Ficha de Rating

- `LeadWorkspaceModal`: cabeçalho fixo com identidade do lead + status, abas em barra segmentada, corpo com rolagem própria e rodapé de ações fixo.
- Timeline de etapas com trilho vertical, marcos concluídos em verde e etapa atual destacada.
- `FichaRatingCreditoForm`: seções em cartões, campos com `field-shell` padronizado, o aviso de "links inacessíveis" reaproveitando o token de erro em vez do rose solto.
- `FichaRatingAdmViewer`: grid de documentos com cartões uniformes, badge de status por documento e botões de aprovar/rejeitar/sinalizar com o mesmo padrão de ação.

## Etapa 5 — Consistência e verificação

- Passar por modais, toasts, estados vazios e de carregamento (skeletons em vez de spinner nu).
- Conferir contraste dos textos sobre o verde escuro e o foco visível no teclado.
- Percorrer no navegador: login parceiro → dashboard → serviços → saque; login admin → leads → workspace → dossiê de rating.

## Notas técnicas

- Só camada de apresentação: nenhuma regra de negócio, chamada Firestore, rota de API ou nome de campo muda.
- Os arquivos são muito grandes, então o trabalho é feito por seções (casca → dashboard → tabelas → modais), verificando o build entre blocos.
- Os arquivos espelhados mantêm o `// @ts-nocheck` do topo.
- As classes glass antigas (`glass-card-*`, `glass-modal-*`) ficam em `styles.css` até a última varredura, para não quebrar telas ainda não migradas; removo as que sobrarem sem uso no fim.
